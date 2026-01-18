import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, apiError, ErrorCodes } from '../lib/response.js';

const productCreateSchema = z.object({
  code: z
    .string()
    .min(2, 'Código obrigatório')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Código inválido'),
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const productUpdateSchema = productCreateSchema
  .omit({ code: true })
  .partial();

// Schema para vincular tenant a produto
const tenantProductSchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  monthlyValue: z.number().min(0, 'Valor mensal deve ser positivo').default(0),
  acquisitionDate: z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  notes: z.string().optional().nullable(),
});

const tenantProductUpdateSchema = tenantProductSchema.omit({ tenantId: true }).partial();

export async function productsRoutes(app: FastifyInstance) {
  // Middleware de autenticação
  app.addHook('preHandler', app.authenticate as any);

  // GET /products - Listar todos os produtos
  app.get('/', async () => {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return success(products);
  });

  // GET /products/:id - Buscar produto por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return send404(reply, 'Produto');
    }

    return success(product);
  });

  // POST /products - Criar produto
  app.post('/', async (request, reply) => {
    const body = productCreateSchema.parse(request.body);

    const existingProduct = await prisma.product.findUnique({
      where: { code: body.code },
    });

    if (existingProduct) {
      return reply.status(409).send(apiError(ErrorCodes.CONFLICT, 'Código já cadastrado'));
    }

    const product = await prisma.product.create({
      data: {
        code: body.code,
        name: body.name,
        description: body.description?.trim() || null,
        icon: body.icon?.trim() || null,
        isActive: body.isActive ?? true,
      },
    });

    return reply.status(201).send(success(product));
  });

  // PUT /products/:id - Atualizar produto
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = productUpdateSchema.parse(request.body);

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return send404(reply, 'Produto');
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name ?? existingProduct.name,
        description: body.description?.trim() ?? existingProduct.description,
        icon: body.icon?.trim() ?? existingProduct.icon,
        isActive: body.isActive ?? existingProduct.isActive,
      },
    });

    return success(product);
  });

  // DELETE /products/:id - Remover produto
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return send404(reply, 'Produto');
    }

    await prisma.product.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ========================================
  // Rotas de vínculo Produto <-> Tenant
  // ========================================

  // GET /products/:id/tenants - Listar tenants vinculados ao produto
  app.get('/:id/tenants', async (request, reply) => {
    const { id } = request.params as { id: string };

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return send404(reply, 'Produto');
    }

    const tenantProducts = await prisma.tenantProduct.findMany({
      where: { productId: id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            active: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(tenantProducts);
  });

  // POST /products/:id/tenants - Vincular tenant ao produto
  app.post('/:id/tenants', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = tenantProductSchema.parse(request.body);

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return send404(reply, 'Produto');
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: body.tenantId } });
    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    // Verificar se já existe vínculo
    const existing = await prisma.tenantProduct.findUnique({
      where: {
        tenantId_productId: {
          tenantId: body.tenantId,
          productId: id,
        },
      },
    });

    if (existing) {
      return reply.status(409).send(apiError(ErrorCodes.CONFLICT, 'Tenant já vinculado a este produto'));
    }

    const tenantProduct = await prisma.tenantProduct.create({
      data: {
        tenantId: body.tenantId,
        productId: id,
        monthlyValue: body.monthlyValue,
        acquisitionDate: body.acquisitionDate ? new Date(body.acquisitionDate) : null,
        expirationDate: body.expirationDate ? new Date(body.expirationDate) : null,
        isActive: body.isActive ?? true,
        notes: body.notes || null,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return reply.status(201).send(success(tenantProduct));
  });

  // PUT /products/:id/tenants/:tenantId - Atualizar vínculo
  app.put('/:id/tenants/:tenantId', async (request, reply) => {
    const { id, tenantId } = request.params as { id: string; tenantId: string };
    const body = tenantProductUpdateSchema.parse(request.body);

    const existing = await prisma.tenantProduct.findUnique({
      where: {
        tenantId_productId: {
          tenantId,
          productId: id,
        },
      },
    });

    if (!existing) {
      return send404(reply, 'Vínculo');
    }

    const tenantProduct = await prisma.tenantProduct.update({
      where: {
        tenantId_productId: {
          tenantId,
          productId: id,
        },
      },
      data: {
        monthlyValue: body.monthlyValue ?? existing.monthlyValue,
        acquisitionDate: body.acquisitionDate !== undefined
          ? (body.acquisitionDate ? new Date(body.acquisitionDate) : null)
          : existing.acquisitionDate,
        expirationDate: body.expirationDate !== undefined
          ? (body.expirationDate ? new Date(body.expirationDate) : null)
          : existing.expirationDate,
        isActive: body.isActive ?? existing.isActive,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return success(tenantProduct);
  });

  // DELETE /products/:id/tenants/:tenantId - Remover vínculo
  app.delete('/:id/tenants/:tenantId', async (request, reply) => {
    const { id, tenantId } = request.params as { id: string; tenantId: string };

    const existing = await prisma.tenantProduct.findUnique({
      where: {
        tenantId_productId: {
          tenantId,
          productId: id,
        },
      },
    });

    if (!existing) {
      return send404(reply, 'Vínculo');
    }

    await prisma.tenantProduct.delete({
      where: {
        tenantId_productId: {
          tenantId,
          productId: id,
        },
      },
    });

    return reply.status(204).send();
  });
}
