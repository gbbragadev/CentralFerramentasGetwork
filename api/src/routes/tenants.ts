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
});

const testConnectionSchema = z.object({
  baseUrl: z.string().url('URL inválida'),
  seniorTenant: z.string().min(1, 'Tenant Senior obrigatório'),
  username: z.string().min(1, 'Usuário obrigatório'),
  password: z.string().min(1, 'Senha obrigatória'),
  environment: z.enum(['production', 'sandbox']).default('production'),
});

const normalizeAuthToken = (token: string) => (
  token.startsWith('Bearer ') ? token : `Bearer ${token}`
);

// URL fixa da API Senior para autenticação
const SENIOR_AUTH_URL = 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/authentication/actions/login';

async function authenticateSenior(seniorTenant: string, username: string, password: string) {
  // Monta o username no formato: usuario@tenant (ex: gci@holdingterraverde.com.br)
  const fullUsername = username.includes('@') ? username : `${username}@${seniorTenant}`;

  const response = await fetch(SENIOR_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username: fullUsername, password }),
  });

  const data = (await response.json().catch(() => null)) as any;

  if (!response.ok) {
    return {
      success: false,
      error: data?.message || `HTTP ${response.status}`,
    };
  }

  // jsonToken pode vir como string JSON - precisa parsear
  let jsonToken = data?.jsonToken;
  if (typeof jsonToken === 'string') {
    try {
      jsonToken = JSON.parse(jsonToken);
    } catch {
      jsonToken = null;
    }
  }

  const accessToken =
    jsonToken?.access_token ||
    data?.access_token ||
    data?.token;
  const expiresIn =
    jsonToken?.expires_in ||
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
      authToken: credentials.authToken.substring(0, 20) + '***',
      createdAt: credentials.createdAt,
      updatedAt: credentials.updatedAt,
    });
  });

  // POST /tenants/:id/senior-credentials - Criar/Atualizar (apenas salva no banco)
  // A autenticação real com a API Senior ocorre apenas em /test-senior-connection
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

    // Buscar credenciais existentes
    const existingCredentials = await prisma.seniorCredentials.findUnique({
      where: { tenantId: id },
    });

    // Usar token fornecido, existente ou placeholder
    let authToken = body.authToken
      ? normalizeAuthToken(body.authToken)
      : existingCredentials?.authToken ?? 'PENDING_AUTH';

    // Manter dados de autenticação existentes
    const tokenExpiresAt = existingCredentials?.tokenExpiresAt ?? null;
    const lastAuthAt = existingCredentials?.lastAuthAt ?? null;
    const lastAuthError = existingCredentials?.lastAuthError ?? null;

    // Upsert - apenas salva no banco
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
        isActive: false, // Inativo até testar conexão
        lastAuthAt: null,
        lastAuthError: null,
        tokenExpiresAt: null,
      },
      update: {
        seniorTenant: body.seniorTenant,
        username: body.username,
        ...(hashedPassword && { password: hashedPassword }),
        environment,
        baseUrl,
        ...(body.authToken && { authToken }), // Só atualiza token se fornecido explicitamente
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
      authToken: credentials.authToken === 'PENDING_AUTH' ? 'Não autenticado' : credentials.authToken.substring(0, 20) + '***',
      tokenExpiresAt: credentials.tokenExpiresAt,
    });
  });

  // POST /tenants/:id/test-senior-connection
  // Testa a conexão e salva o token quando bem-sucedido
  app.post('/:id/test-senior-connection', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = testConnectionSchema.parse(request.body);

    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    const authResult = await authenticateSenior(body.seniorTenant, body.username, body.password);

    if (!authResult.success) {
      // Atualizar erro nas credenciais se existirem
      await prisma.seniorCredentials.updateMany({
        where: { tenantId: id },
        data: {
          lastAuthError: authResult.error,
          isActive: false,
        },
      });
      return reply.status(401).send(apiError(ErrorCodes.INVALID_CREDENTIALS, authResult.error));
    }

    const authToken = normalizeAuthToken(authResult.accessToken);
    const tokenPreview = authToken.substring(0, 20) + '***';
    const tokenExpiresAt = authResult.expiresIn
      ? new Date(Date.now() + authResult.expiresIn * 1000)
      : null;

    // Atualizar credenciais com o token obtido (se existirem)
    await prisma.seniorCredentials.updateMany({
      where: { tenantId: id },
      data: {
        authToken,
        tokenExpiresAt,
        lastAuthAt: new Date(),
        lastAuthError: null,
        isActive: true,
      },
    });

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
