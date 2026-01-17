// ============================================================
// Tenants Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { 
  success, 
  send404, 
  send400, 
  ErrorCodes,
  alreadyExists 
} from '../lib/response.js';

const createTenantSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  slug: z.string()
    .min(1, 'Slug obrigatório')
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  metadata: z.record(z.any()).optional(),
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  active: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const credentialsSchema = z.object({
  baseUrl: z.string().url('URL inválida'),
  authToken: z.string().min(1, 'Token obrigatório'),
  demoMode: z.boolean().default(true),
});

export async function tenantsRoutes(app: FastifyInstance) {
  // Middleware de autenticação
  app.addHook('preHandler', app.authenticate as any);

  // GET /tenants - Listar todos
  app.get('/', async () => {
    const tenants = await prisma.tenant.findMany({
      include: {
        seniorCredentials: {
          select: {
            id: true,
            baseUrl: true,
            demoMode: true,
          },
        },
        _count: {
          select: {
            rules: true,
            schedules: true,
            outboxMessages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(tenants);
  });

  // GET /tenants/:id - Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        seniorCredentials: {
          select: {
            id: true,
            baseUrl: true,
            demoMode: true,
          },
        },
        notificationChannels: true,
        _count: {
          select: {
            rules: true,
            schedules: true,
            outboxMessages: true,
          },
        },
      },
    });

    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    return success(tenant);
  });

  // POST /tenants - Criar
  app.post('/', async (request, reply) => {
    const body = createTenantSchema.parse(request.body);

    // Verificar slug único
    const existing = await prisma.tenant.findUnique({
      where: { slug: body.slug },
    });

    if (existing) {
      return reply.status(409).send(alreadyExists('Slug'));
    }

    const tenant = await prisma.tenant.create({
      data: body,
    });

    // Criar canal de notificação Mock por padrão
    await prisma.notificationChannel.create({
      data: {
        tenantId: tenant.id,
        type: 'MOCK_WHATSAPP',
        enabled: true,
      },
    });

    return reply.status(201).send(success(tenant));
  });

  // PUT /tenants/:id - Atualizar
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateTenantSchema.parse(request.body);

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Tenant');
    }

    // Se mudar slug, verificar se novo slug é único
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.tenant.findUnique({
        where: { slug: body.slug },
      });
      if (slugExists) {
        return reply.status(409).send(alreadyExists('Slug'));
      }
    }

    const tenant = await prisma.tenant.update({
      where: { id },
      data: body,
    });

    return success(tenant);
  });

  // DELETE /tenants/:id - Excluir
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.tenant.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Tenant');
    }

    await prisma.tenant.delete({ where: { id } });

    return success({ message: 'Tenant excluído com sucesso' });
  });

  // ========================================
  // Credenciais do Senior
  // ========================================

  // GET /tenants/:id/senior-credentials
  app.get('/:id/senior-credentials', async (request, reply) => {
    const { id } = request.params as { id: string };

    const credentials = await prisma.seniorCredentials.findUnique({
      where: { tenantId: id },
    });

    if (!credentials) {
      return send400(reply, ErrorCodes.CREDENTIALS_NOT_CONFIGURED, 'Credenciais não configuradas');
    }

    // Mascarar token
    return success({
      id: credentials.id,
      baseUrl: credentials.baseUrl,
      demoMode: credentials.demoMode,
      authToken: credentials.authToken.substring(0, 20) + '***',
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    });
  });

  // POST /tenants/:id/senior-credentials - Criar/Atualizar
  app.post('/:id/senior-credentials', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = credentialsSchema.parse(request.body);

    // Verificar se tenant existe
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    // Upsert
    const credentials = await prisma.seniorCredentials.upsert({
      where: { tenantId: id },
      create: {
        tenantId: id,
        baseUrl: body.baseUrl,
        authToken: body.authToken,
        demoMode: body.demoMode,
      },
      update: {
        baseUrl: body.baseUrl,
        authToken: body.authToken,
        demoMode: body.demoMode,
      },
    });

    return success({
      id: credentials.id,
      baseUrl: credentials.baseUrl,
      demoMode: credentials.demoMode,
      authToken: credentials.authToken.substring(0, 20) + '***',
    });
  });

  // DELETE /tenants/:id/senior-credentials
  app.delete('/:id/senior-credentials', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.seniorCredentials.findUnique({
      where: { tenantId: id },
    });

    if (!existing) {
      return send404(reply, 'Credenciais');
    }

    await prisma.seniorCredentials.delete({ where: { tenantId: id } });

    return success({ message: 'Credenciais excluídas com sucesso' });
  });
}
