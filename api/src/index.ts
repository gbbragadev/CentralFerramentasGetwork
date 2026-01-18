// ============================================================
// GetWork Portal API - Entry Point
// ============================================================

import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { PrismaClient } from '@prisma/client';
import { ZodError } from 'zod';

// Routes
import { authRoutes } from './routes/auth.js';
import { tenantsRoutes } from './routes/tenants.js';
import { rulesRoutes } from './routes/rules.js';
import { schedulesRoutes } from './routes/schedules.js';
import { outboxRoutes } from './routes/outbox.js';
import { logsRoutes } from './routes/logs.js';
import { mockRoutes } from './routes/mock.js';
import { productsRoutes } from './routes/products.js';
import { externalRoutes } from './routes/external.js';
import { dataSourcesRoutes } from './routes/datasources.js';
import { templatesRoutes } from './routes/templates.js';
import { whatsappTemplatesRoutes } from './routes/whatsapp-templates.js';

// Lib
import { ErrorCodes, apiError, validationError } from './lib/response.js';

// Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

// Fastify instance
const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// Plugins
await app.register(cors, {
  origin: true,
  credentials: true,
});

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'development_secret_change_in_production',
});

// Decorators
app.decorate('prisma', prisma);

// Auth middleware decorator
app.decorate('authenticate', async function (request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    return reply.status(401).send(apiError(ErrorCodes.UNAUTHORIZED, 'Token inválido ou expirado'));
  }
});

// Rota raiz
app.get('/', async () => {
  return {
    name: 'GetWork Portal API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/auth',
      tenants: '/tenants',
      products: '/products',
      rules: '/rules',
      schedules: '/schedules',
      outbox: '/outbox',
      logs: '/logs',
    },
  };
});

// Health check
app.get('/health', async () => {
  // Testar conexão com banco
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  } catch (err) {
    return { 
      status: 'degraded', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    };
  }
});

// Register routes
await app.register(authRoutes, { prefix: '/auth' });
await app.register(tenantsRoutes, { prefix: '/tenants' });
await app.register(rulesRoutes, { prefix: '/rules' });
await app.register(schedulesRoutes, { prefix: '/schedules' });
await app.register(outboxRoutes, { prefix: '/outbox' });
await app.register(logsRoutes, { prefix: '/logs' });
await app.register(mockRoutes, { prefix: '/mock' });
await app.register(productsRoutes, { prefix: '/products' });
await app.register(externalRoutes, { prefix: '/external' });
await app.register(dataSourcesRoutes, { prefix: '/datasources' });
await app.register(templatesRoutes, { prefix: '/templates' });
await app.register(whatsappTemplatesRoutes, { prefix: '/whatsapp-templates' });

// Error handler global
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);

  // Erro de validação Zod
  if (error instanceof ZodError) {
    return reply.status(400).send(validationError(error.flatten().fieldErrors));
  }

  // Erro de validação Fastify
  if (error.validation) {
    return reply.status(400).send(validationError(error.validation));
  }

  // Erro com statusCode definido
  if (error.statusCode) {
    return reply.status(error.statusCode).send(
      apiError(
        error.statusCode === 401 ? ErrorCodes.UNAUTHORIZED : ErrorCodes.INTERNAL_ERROR,
        error.message
      )
    );
  }

  // Erro interno
  return reply.status(500).send(
    apiError(ErrorCodes.INTERNAL_ERROR, 'Erro interno do servidor')
  );
});

// Start server
const start = async () => {
  try {
    const host = process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.PORT || '4000', 10);

    // Testar conexão com banco antes de iniciar
    console.log('🔌 Conectando ao banco de dados...');
    await prisma.$connect();
    console.log('✅ Banco de dados conectado');

    await app.listen({ port, host });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 GetWork Portal API                                    ║
║                                                            ║
║   Server: http://${host}:${port}                          ║
║   Health: http://${host}:${port}/health                   ║
║                                                            ║
║   Endpoints:                                               ║
║   - POST /auth/login                                       ║
║   - GET  /auth/me                                          ║
║   - CRUD /tenants                                          ║
║   - CRUD /rules                                            ║
║   - CRUD /schedules                                        ║
║   - GET  /outbox                                           ║
║   - GET  /logs                                             ║
║   - POST /mock/outbox/:id/status                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('\n⏹️  Encerrando servidor...');
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start();
