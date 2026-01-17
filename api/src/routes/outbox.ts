// ============================================================
// Outbox Routes (WhatsApp Simulado)
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, paginated, send404, send400, ErrorCodes } from '../lib/response.js';

const querySchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z.enum(['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED']).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export async function outboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate as any);

  // GET /outbox
  app.get('/', async (request) => {
    const query = querySchema.parse(request.query);

    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status) where.status = query.status;

    const [messages, total] = await Promise.all([
      prisma.outboxMessage.findMany({
        where,
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          rule: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.outboxMessage.count({ where }),
    ]);

    return paginated(messages, total, query.limit, query.offset);
  });

  // GET /outbox/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const message = await prisma.outboxMessage.findUnique({
      where: { id },
      include: {
        tenant: true,
        rule: true,
        deliveryLogs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!message) {
      return send404(reply, 'Mensagem');
    }

    return success(message);
  });

  // GET /outbox/stats/summary
  app.get('/stats/summary', async (request) => {
    const { tenantId } = request.query as { tenantId?: string };

    const where = tenantId ? { tenantId } : {};

    const [queued, sent, delivered, read, failed] = await Promise.all([
      prisma.outboxMessage.count({ where: { ...where, status: 'QUEUED' } }),
      prisma.outboxMessage.count({ where: { ...where, status: 'SENT' } }),
      prisma.outboxMessage.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.outboxMessage.count({ where: { ...where, status: 'READ' } }),
      prisma.outboxMessage.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return success({
      queued,
      sent,
      delivered,
      read,
      failed,
      total: queued + sent + delivered + read + failed,
    });
  });

  // POST /outbox/:id/retry
  app.post('/:id/retry', async (request, reply) => {
    const { id } = request.params as { id: string };

    const message = await prisma.outboxMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return send404(reply, 'Mensagem');
    }

    if (message.status !== 'FAILED') {
      return send400(reply, ErrorCodes.INVALID_INPUT, 'Apenas mensagens com falha podem ser reprocessadas');
    }

    await prisma.outboxMessage.update({
      where: { id },
      data: {
        status: 'QUEUED',
        errorMessage: null,
        failedAt: null,
      },
    });

    await prisma.deliveryLog.create({
      data: {
        tenantId: message.tenantId,
        ruleId: message.ruleId,
        outboxId: id,
        status: 'INFO',
        message: 'Mensagem reenviada para processamento',
      },
    });

    return success({ message: 'Mensagem reenviada para processamento' });
  });
}
