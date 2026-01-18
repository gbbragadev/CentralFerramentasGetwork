// ============================================================
// External Routes - Endpoints para consumo externo (extensões)
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, apiError, ErrorCodes } from '../lib/response.js';

// API Key para autenticação simples das extensões
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || 'gw-ext-2024-secure-key';

// Schema de validação
const validateProductSchema = z.object({
  tenant: z.string().min(1, 'Tenant obrigatório'),
  productCode: z.string().min(1, 'Código do produto obrigatório'),
});

const listProductsSchema = z.object({
  tenant: z.string().min(1, 'Tenant obrigatório'),
});

// Middleware de autenticação simples via API Key
async function validateApiKey(request: any, reply: any) {
  const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== EXTERNAL_API_KEY) {
    return reply.status(401).send(apiError(ErrorCodes.UNAUTHORIZED, 'API Key inválida'));
  }
}

// Função para encontrar tenant pelo identificador (email ou slug)
async function findTenantByIdentifier(identifier: string) {
  // Tentar encontrar pelo slug primeiro
  let tenant = await prisma.tenant.findUnique({
    where: { slug: identifier.toLowerCase() },
  });

  // Se não encontrar, tentar extrair o slug do email (parte antes do @)
  if (!tenant && identifier.includes('@')) {
    const slugFromEmail = identifier.split('@')[0].toLowerCase();
    tenant = await prisma.tenant.findUnique({
      where: { slug: slugFromEmail },
    });
  }

  // Se ainda não encontrar, buscar pelo seniorTenant nas credenciais
  if (!tenant) {
    const credentials = await prisma.seniorCredentials.findFirst({
      where: {
        OR: [
          { seniorTenant: identifier },
          { seniorTenant: identifier.toLowerCase() },
          { username: identifier },
        ],
      },
      include: { tenant: true },
    });
    tenant = credentials?.tenant || null;
  }

  return tenant;
}

export async function externalRoutes(app: FastifyInstance) {
  // Hook de autenticação para todas as rotas externas
  app.addHook('preHandler', validateApiKey);

  // ========================================
  // GET /external/validate
  // Valida se um tenant tem acesso a um produto específico
  // ========================================
  app.get('/validate', async (request, reply) => {
    const query = validateProductSchema.parse(request.query);

    // Encontrar tenant
    const tenant = await findTenantByIdentifier(query.tenant);

    if (!tenant) {
      return reply.status(404).send({
        valid: false,
        reason: 'TENANT_NOT_FOUND',
        message: 'Tenant não encontrado',
      });
    }

    if (!tenant.active) {
      return reply.status(403).send({
        valid: false,
        reason: 'TENANT_INACTIVE',
        message: 'Tenant inativo',
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
        },
      });
    }

    // Buscar produto
    const product = await prisma.product.findUnique({
      where: { code: query.productCode.toUpperCase() },
    });

    if (!product) {
      return reply.status(404).send({
        valid: false,
        reason: 'PRODUCT_NOT_FOUND',
        message: 'Produto não encontrado',
      });
    }

    if (!product.isActive) {
      return reply.status(403).send({
        valid: false,
        reason: 'PRODUCT_INACTIVE',
        message: 'Produto inativo',
        product: {
          code: product.code,
          name: product.name,
        },
      });
    }

    // Buscar vínculo tenant-produto
    const tenantProduct = await prisma.tenantProduct.findUnique({
      where: {
        tenantId_productId: {
          tenantId: tenant.id,
          productId: product.id,
        },
      },
    });

    if (!tenantProduct) {
      return reply.status(403).send({
        valid: false,
        reason: 'PRODUCT_NOT_LICENSED',
        message: 'Tenant não possui licença para este produto',
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
        },
        product: {
          code: product.code,
          name: product.name,
        },
      });
    }

    if (!tenantProduct.isActive) {
      return reply.status(403).send({
        valid: false,
        reason: 'LICENSE_INACTIVE',
        message: 'Licença inativa',
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
        },
        product: {
          code: product.code,
          name: product.name,
        },
      });
    }

    // Verificar expiração
    if (tenantProduct.expirationDate && new Date(tenantProduct.expirationDate) < new Date()) {
      return reply.status(403).send({
        valid: false,
        reason: 'LICENSE_EXPIRED',
        message: 'Licença expirada',
        expirationDate: tenantProduct.expirationDate,
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
        },
        product: {
          code: product.code,
          name: product.name,
        },
      });
    }

    // Tudo válido!
    return success({
      valid: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      product: {
        id: product.id,
        code: product.code,
        name: product.name,
      },
      license: {
        acquisitionDate: tenantProduct.acquisitionDate,
        expirationDate: tenantProduct.expirationDate,
        monthlyValue: tenantProduct.monthlyValue,
      },
    });
  });

  // ========================================
  // GET /external/products
  // Lista todos os produtos disponíveis para um tenant
  // ========================================
  app.get('/products', async (request, reply) => {
    const query = listProductsSchema.parse(request.query);

    // Encontrar tenant
    const tenant = await findTenantByIdentifier(query.tenant);

    if (!tenant) {
      return reply.status(404).send({
        success: false,
        reason: 'TENANT_NOT_FOUND',
        message: 'Tenant não encontrado',
        products: [],
      });
    }

    if (!tenant.active) {
      return reply.status(403).send({
        success: false,
        reason: 'TENANT_INACTIVE',
        message: 'Tenant inativo',
        tenant: {
          name: tenant.name,
          slug: tenant.slug,
        },
        products: [],
      });
    }

    // Buscar produtos do tenant
    const tenantProducts = await prisma.tenantProduct.findMany({
      where: { tenantId: tenant.id },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            icon: true,
            isActive: true,
          },
        },
      },
    });

    const now = new Date();
    const products = tenantProducts.map((tp) => {
      const isExpired = tp.expirationDate ? new Date(tp.expirationDate) < now : false;
      const isValid = tp.isActive && tp.product.isActive && !isExpired;

      return {
        code: tp.product.code,
        name: tp.product.name,
        description: tp.product.description,
        icon: tp.product.icon,
        isActive: isValid,
        status: !tp.product.isActive
          ? 'PRODUCT_INACTIVE'
          : !tp.isActive
          ? 'LICENSE_INACTIVE'
          : isExpired
          ? 'LICENSE_EXPIRED'
          : 'ACTIVE',
        license: {
          acquisitionDate: tp.acquisitionDate,
          expirationDate: tp.expirationDate,
          monthlyValue: tp.monthlyValue,
        },
      };
    });

    return success({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      products,
      activeProducts: products.filter((p) => p.isActive).map((p) => p.code),
    });
  });

  // ========================================
  // GET /external/health
  // Health check para extensões
  // ========================================
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'GetWork Portal - External API',
      timestamp: new Date().toISOString(),
    };
  });
}
