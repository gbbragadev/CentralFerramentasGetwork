// ============================================================
// Logs Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, paginated, send404 } from '../lib/response.js';

const querySchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: z.enum(['INFO', 'SUCCESS', 'WARNING', 'ERROR']).optional(),
  ruleId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(200).default(100),
  offset: z.coerce.number().min(0).default(0),
});

export async function logsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate as any);

  // GET /logs
  app.get('/', async (request) => {
    const query = querySchema.parse(request.query);

    const where: any = {};
    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.status) where.status = query.status;
    if (query.ruleId) where.ruleId = query.ruleId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.deliveryLog.findMany({
        where,
        include: {
          tenant: {
            select: { id: true, name: true, slug: true },
          },
          rule: {
            select: { id: true, name: true },
          },
          outbox: {
            select: { id: true, to: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      prisma.deliveryLog.count({ where }),
    ]);

    return paginated(logs, total, query.limit, query.offset);
  });

  // GET /logs/stats
  app.get('/stats', async (request) => {
    const { tenantId, period } = request.query as {
      tenantId?: string;
      period?: 'day' | 'week' | 'month';
    };

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;

    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    where.createdAt = { gte: startDate };

    const [info, successCount, warning, error] = await Promise.all([
      prisma.deliveryLog.count({ where: { ...where, status: 'INFO' } }),
      prisma.deliveryLog.count({ where: { ...where, status: 'SUCCESS' } }),
      prisma.deliveryLog.count({ where: { ...where, status: 'WARNING' } }),
      prisma.deliveryLog.count({ where: { ...where, status: 'ERROR' } }),
    ]);

    return success({
      period: period || 'month',
      startDate,
      endDate: now,
      counts: {
        info,
        success: successCount,
        warning,
        error,
        total: info + successCount + warning + error,
      },
    });
  });

  // GET /logs/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const log = await prisma.deliveryLog.findUnique({
      where: { id },
      include: {
        tenant: true,
        rule: true,
        outbox: true,
      },
    });

    if (!log) {
      return send404(reply, 'Log');
    }

    return success(log);
  });
}
