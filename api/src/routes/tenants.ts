// ============================================================
// Tenants Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { 
  success, 
  send404, 
  send400, 
  ErrorCodes,
  alreadyExists,
  apiError
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
  seniorTenant: z.string().min(1, 'Tenant Senior obrigatório'),
  authToken: z.string().min(1).optional(),
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1).optional(),
  environment: z.enum(['production', 'sandbox']).default('production'),
  demoMode: z.boolean().default(false),
}).refine((data) => {
  return Boolean(data.authToken || data.password);
}, {
  message: 'Informe authToken ou senha',
});

const testConnectionSchema = z.object({
  baseUrl: z.string().url('URL inválida'),
  seniorTenant: z.string().min(1, 'Tenant Senior obrigatório'),
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
  demoMode: z.boolean().default(false),
  environment: z.enum(['production', 'sandbox']).default('production'),
});

const normalizeAuthToken = (token: string) => (
  token.startsWith('Bearer ') ? token : `Bearer ${token}`
);

function buildSeniorBaseUrl(baseUrl: string, seniorTenant: string) {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  if (normalizedBase.includes('/bridge/1.0/rest')) {
    return normalizedBase;
  }
  if (normalizedBase.includes('/t/')) {
    return `${normalizedBase}/bridge/1.0/rest`;
  }
  return `${normalizedBase}/t/${seniorTenant}/bridge/1.0/rest`;
}

async function authenticateSenior(baseUrl: string, seniorTenant: string, username: string, password: string) {
  const loginUrl = `${buildSeniorBaseUrl(baseUrl, seniorTenant)}/platform/authentication/actions/login`;
  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  });

  const data = (await response.json().catch(() => null)) as any;

  if (!response.ok) {
    return {
      success: false,
      error: data?.message || `HTTP ${response.status}`,
    };
  }

  const accessToken =
    data?.jsonToken?.access_token ||
    data?.access_token ||
    data?.token;
  const expiresIn =
    data?.jsonToken?.expires_in ||
    data?.expires_in ||
    null;

  if (!accessToken) {
    return {
      success: false,
      error: 'Token não encontrado na resposta de autenticação',
    };
  }

  return {
    success: true,
    accessToken,
    expiresIn,
  };
}

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
      tenantId: credentials.tenantId,
      seniorTenant: credentials.seniorTenant,
      username: credentials.username,
      environment: credentials.environment as 'production' | 'sandbox',
      baseUrl: credentials.baseUrl,
      isActive: credentials.isActive,
      lastAuthAt: credentials.lastAuthAt,
      lastAuthError: credentials.lastAuthError,
      tokenExpiresAt: credentials.tokenExpiresAt,
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
    const baseUrl = body.baseUrl || 'https://platform.senior.com.br';
    const environment = body.environment || 'production';
    const hashedPassword = body.password ? await bcrypt.hash(body.password, 10) : undefined;

    // Verificar se tenant existe
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    let authToken = body.authToken;
    let tokenExpiresAt: Date | null = null;
    let lastAuthAt: Date | null = null;
    let lastAuthError: string | null = null;

    if (body.demoMode) {
      authToken = authToken ? normalizeAuthToken(authToken) : 'Bearer DEMO_TOKEN';
      lastAuthAt = new Date();
    } else if (!authToken && body.username && body.password) {
      const authResult = await authenticateSenior(baseUrl, body.seniorTenant, body.username, body.password);

      if (!authResult.success) {
        lastAuthError = authResult.error;
        return reply.status(401).send(apiError(ErrorCodes.INVALID_CREDENTIALS, authResult.error));
      }

      authToken = normalizeAuthToken(authResult.accessToken);
      if (authResult.expiresIn) {
        tokenExpiresAt = new Date(Date.now() + authResult.expiresIn * 1000);
      }
      lastAuthAt = new Date();
    } else if (authToken) {
      authToken = normalizeAuthToken(authToken);
    }

    if (!authToken) {
      return send400(reply, ErrorCodes.INVALID_INPUT, 'Token ou credenciais inválidas');
    }

    // Upsert
    const credentials = await prisma.seniorCredentials.upsert({
      where: { tenantId: id },
      create: {
        tenantId: id,
        seniorTenant: body.seniorTenant,
        username: body.username,
        ...(hashedPassword && { password: hashedPassword }),
        environment,
        baseUrl,
        authToken,
        demoMode: body.demoMode,
        isActive: true,
        lastAuthAt,
        lastAuthError,
        tokenExpiresAt,
      },
      update: {
        seniorTenant: body.seniorTenant,
        username: body.username,
        ...(hashedPassword && { password: hashedPassword }),
        environment,
        baseUrl,
        authToken,
        demoMode: body.demoMode,
        lastAuthAt,
        lastAuthError,
        tokenExpiresAt,
      },
    });

    return success({
      id: credentials.id,
      tenantId: credentials.tenantId,
      seniorTenant: credentials.seniorTenant,
      username: credentials.username,
      environment: credentials.environment as 'production' | 'sandbox',
      baseUrl: credentials.baseUrl,
      isActive: credentials.isActive,
      lastAuthAt: credentials.lastAuthAt,
      lastAuthError: credentials.lastAuthError,
      demoMode: credentials.demoMode,
      authToken: credentials.authToken.substring(0, 20) + '***',
      tokenExpiresAt: credentials.tokenExpiresAt ?? tokenExpiresAt,
    });
  });

  // POST /tenants/:id/test-senior-connection
  app.post('/:id/test-senior-connection', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = testConnectionSchema.parse(request.body);

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    if (body.demoMode) {
      return success({
        success: true,
        message: 'Token recebido com sucesso (modo demo)',
        tokenPreview: 'Bearer DEMO_TOKEN',
        tokenExpiresAt: null,
      });
    }

    const authResult = await authenticateSenior(body.baseUrl, body.seniorTenant, body.username, body.password);

    if (!authResult.success) {
      return reply.status(401).send(apiError(ErrorCodes.INVALID_CREDENTIALS, authResult.error));
    }

    const tokenPreview = normalizeAuthToken(authResult.accessToken).substring(0, 20) + '***';
    const tokenExpiresAt = authResult.expiresIn
      ? new Date(Date.now() + authResult.expiresIn * 1000)
      : null;

    return success({
      success: true,
      message: 'Token recebido com sucesso',
      tokenPreview,
      tokenExpiresAt,
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
