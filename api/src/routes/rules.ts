// ============================================================
// Rules Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, send400, ErrorCodes } from '../lib/response.js';

const createRuleSchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  channelId: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
  seniorEndpointPath: z.string().optional().nullable(),
  pollStrategy: z.enum(['SIMPLE', 'PAGINATION', 'WEBHOOK']).default('SIMPLE'),
  messageTemplate: z.string().min(1, 'Template obrigatório'),
  recipientStrategy: z.enum(['FIELD', 'STATIC', 'LOOKUP']).default('FIELD'),
  recipientField: z.string().optional().nullable(),
  recipientStatic: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().nullable(),
});

const updateRuleSchema = createRuleSchema.partial().omit({ tenantId: true });

export async function rulesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate as any);

  // GET /rules
  app.get('/', async (request) => {
    const { tenantId } = request.query as { tenantId?: string };

    const rules = await prisma.rule.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        channel: {
          select: { id: true, type: true, enabled: true },
        },
        schedules: {
          include: {
            schedule: {
              select: { id: true, name: true, enabled: true, cron: true },
            },
          },
        },
        _count: {
          select: { outboxMessages: true, deliveryLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(rules);
  });

  // GET /rules/:id
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const rule = await prisma.rule.findUnique({
      where: { id },
      include: {
        tenant: true,
        channel: true,
        schedules: {
          include: { schedule: true },
        },
      },
    });

    if (!rule) {
      return send404(reply, 'Regra');
    }

    return success(rule);
  });

  // POST /rules
  app.post('/', async (request, reply) => {
    const body = createRuleSchema.parse(request.body);

    // Verificar tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: body.tenantId },
    });

    if (!tenant) {
      return send400(reply, ErrorCodes.NOT_FOUND, 'Tenant não encontrado');
    }

    // Se não informou canal, usar Mock padrão
    let channelId = body.channelId;
    if (!channelId) {
      const mockChannel = await prisma.notificationChannel.findFirst({
        where: { tenantId: body.tenantId, type: 'MOCK_WHATSAPP' },
      });
      channelId = mockChannel?.id || null;
    }

    const rule = await prisma.rule.create({
      data: {
        ...body,
        channelId,
      },
    });

    return reply.status(201).send(success(rule));
  });

  // PUT /rules/:id
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateRuleSchema.parse(request.body);

    const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Regra');
    }

    const rule = await prisma.rule.update({
      where: { id },
      data: body,
    });

    return success(rule);
  });

  // DELETE /rules/:id
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.rule.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Regra');
    }

    await prisma.rule.delete({ where: { id } });

    return success({ message: 'Regra excluída com sucesso' });
  });

  // POST /rules/:id/test
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { recipient } = (request.body || {}) as { recipient?: string };

    const rule = await prisma.rule.findUnique({
      where: { id },
      include: { tenant: true, channel: true },
    });

    if (!rule) {
      return send404(reply, 'Regra');
    }

    const testRecipient = recipient || rule.recipientStatic || '5511999999999';

    const message = await prisma.outboxMessage.create({
      data: {
        tenantId: rule.tenantId,
        ruleId: rule.id,
        to: testRecipient,
        text: rule.messageTemplate.replace(/\{[^}]+\}/g, '[TESTE]'),
        status: 'QUEUED',
        providerType: rule.channel?.type || 'MOCK_WHATSAPP',
        eventId: `test-${Date.now()}`,
        metadata: { isTest: true },
      },
    });

    // Simular envio imediato (Mock)
    await prisma.outboxMessage.update({
      where: { id: message.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    await prisma.deliveryLog.create({
      data: {
        tenantId: rule.tenantId,
        ruleId: rule.id,
        outboxId: message.id,
        status: 'SUCCESS',
        message: 'Mensagem de teste enviada (Mock)',
      },
    });

    return success({
      message: 'Teste executado com sucesso',
      outboxId: message.id,
    });
  });
}
