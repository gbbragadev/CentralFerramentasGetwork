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
}
