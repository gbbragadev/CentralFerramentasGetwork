// ============================================================
// Schedules Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { Cron } from 'croner';
import { success, send404, send400, ErrorCodes } from '../lib/response.js';

const createScheduleSchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  name: z.string().min(1, 'Nome obrigatório'),
  enabled: z.boolean().default(true),
  cron: z.string().min(1, 'Expressão cron obrigatória'),
  timezone: z.string().default('America/Sao_Paulo'),
  ruleIds: z.array(z.string().uuid()).optional(),
});

const updateScheduleSchema = createScheduleSchema.partial().omit({ tenantId: true });

function validateCron(expression: string): boolean {
  try {
    new Cron(expression);
    return true;
  } catch {
    return false;
  }
}

function getNextRun(expression: string, timezone: string): Date | null {
  try {
    const cron = new Cron(expression, { timezone });
    return cron.nextRun() || null;
  } catch {
    return null;
  }
}

export async function schedulesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate as any);

  // GET /schedules
  app.get('/', async (request) => {
    const { tenantId } = request.query as { tenantId?: string };

    const schedules = await prisma.schedule.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        rules: {
          include: {
            rule: {
              select: { id: true, name: true, enabled: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(schedules);
  });

  // GET /schedules/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        tenant: true,
        rules: {
          include: { rule: true },
        },
      },
    });

    if (!schedule) {
      return send404(reply, 'Agendamento');
    }

    return success(schedule);
  });

  // POST /schedules
  app.post('/', async (request, reply) => {
    const body = createScheduleSchema.parse(request.body);

    if (!validateCron(body.cron)) {
      return send400(reply, ErrorCodes.INVALID_CRON, 'Expressão cron inválida');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: body.tenantId },
    });

    if (!tenant) {
      return send400(reply, ErrorCodes.NOT_FOUND, 'Tenant não encontrado');
    }

    const nextRun = getNextRun(body.cron, body.timezone);

    const schedule = await prisma.schedule.create({
      data: {
        tenantId: body.tenantId,
        name: body.name,
        enabled: body.enabled,
        cron: body.cron,
        timezone: body.timezone,
        nextRunAt: nextRun,
      },
    });

    if (body.ruleIds && body.ruleIds.length > 0) {
      await prisma.scheduleRule.createMany({
        data: body.ruleIds.map((ruleId) => ({
          scheduleId: schedule.id,
          ruleId,
        })),
        skipDuplicates: true,
      });
    }

    return reply.status(201).send(success(schedule));
  });

  // PUT /schedules/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateScheduleSchema.parse(request.body);

    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Agendamento');
    }

    if (body.cron && !validateCron(body.cron)) {
      return send400(reply, ErrorCodes.INVALID_CRON, 'Expressão cron inválida');
    }

    const cronToUse = body.cron || existing.cron;
    const tzToUse = body.timezone || existing.timezone;
    const nextRun = getNextRun(cronToUse, tzToUse);

    const schedule = await prisma.schedule.update({
      where: { id },
      data: {
        ...body,
        nextRunAt: nextRun,
      },
    });

    if (body.ruleIds !== undefined) {
      await prisma.scheduleRule.deleteMany({
        where: { scheduleId: id },
      });

      if (body.ruleIds.length > 0) {
        await prisma.scheduleRule.createMany({
          data: body.ruleIds.map((ruleId) => ({
            scheduleId: id,
            ruleId,
          })),
        });
      }
    }

    return success(schedule);
  });

  // DELETE /schedules/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Agendamento');
    }

    await prisma.schedule.delete({ where: { id } });

    return success({ message: 'Agendamento excluído com sucesso' });
  });

  // POST /schedules/:id/trigger
  app.post('/:id/trigger', async (request, reply) => {
    const { id } = request.params as { id: string };

    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        tenant: true,
        rules: {
          include: { rule: true },
        },
      },
    });

    if (!schedule) {
      return send404(reply, 'Agendamento');
    }

    const { Queue } = await import('bullmq');
    const { getRedisConnection } = await import('../utils/redis.js');

    const redis = getRedisConnection();
    const schedulerQueue = new Queue('scheduler', { connection: redis });

    const job = await schedulerQueue.add('process-schedule', {
      scheduleId: schedule.id,
      tenantId: schedule.tenantId,
      triggeredManually: true,
    });

    return success({
      message: 'Agendamento disparado manualmente',
      scheduleId: schedule.id,
      jobId: job.id,
    });
  });
}
