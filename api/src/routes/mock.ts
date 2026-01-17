// ============================================================
// Mock Routes (Simulação WhatsApp)
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, send400, ErrorCodes } from '../lib/response.js';

const updateStatusSchema = z.object({
  status: z.enum(['SENT', 'DELIVERED', 'READ', 'FAILED']),
  errorMessage: z.string().optional(),
});

export async function mockRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate as any);

  // POST /mock/outbox/:id/status
  app.post('/outbox/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateStatusSchema.parse(request.body);

    const message = await prisma.outboxMessage.findUnique({
      where: { id },
    });

    if (!message) {
      return send404(reply, 'Mensagem');
    }

    const updateData: any = {
      status: body.status,
    };

    switch (body.status) {
      case 'SENT':
        updateData.sentAt = new Date();
        break;
      case 'DELIVERED':
        updateData.deliveredAt = new Date();
        if (!message.sentAt) updateData.sentAt = new Date();
        break;
      case 'READ':
        updateData.readAt = new Date();
        if (!message.sentAt) updateData.sentAt = new Date();
        if (!message.deliveredAt) updateData.deliveredAt = new Date();
        break;
      case 'FAILED':
        updateData.failedAt = new Date();
        updateData.errorMessage = body.errorMessage || 'Falha simulada';
        break;
    }

    await prisma.outboxMessage.update({
      where: { id },
      data: updateData,
    });

    await prisma.deliveryLog.create({
      data: {
        tenantId: message.tenantId,
        ruleId: message.ruleId,
        outboxId: id,
        status: body.status === 'FAILED' ? 'ERROR' : 'INFO',
        message: `Status alterado para ${body.status} (simulação)`,
        error: body.errorMessage,
      },
    });

    return success({
      message: `Status atualizado para ${body.status}`,
      outboxId: id,
    });
  });

  // POST /mock/webhook
  app.post('/webhook', async (request, reply) => {
    const { eventType, messageId, timestamp } = (request.body || {}) as {
      eventType?: string;
      messageId?: string;
      timestamp?: string;
    };

    if (!eventType || !messageId) {
      return send400(reply, ErrorCodes.INVALID_INPUT, 'eventType e messageId são obrigatórios');
    }

    const message = await prisma.outboxMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      return send404(reply, 'Mensagem');
    }

    const statusMap: Record<string, string> = {
      'message.sent': 'SENT',
      'message.delivered': 'DELIVERED',
      'message.read': 'READ',
      'message.failed': 'FAILED',
    };

    const newStatus = statusMap[eventType];
    if (!newStatus) {
      return send400(reply, ErrorCodes.INVALID_INPUT, `Tipo de evento desconhecido: ${eventType}`);
    }

    // Chamar endpoint de status
    return app.inject({
      method: 'POST',
      url: `/mock/outbox/${messageId}/status`,
      headers: request.headers as any,
      payload: { status: newStatus },
    });
  });

  // GET /mock/send-test
  app.get('/send-test', async (request, reply) => {
    const { tenantId, to, text } = request.query as {
      tenantId?: string;
      to?: string;
      text?: string;
    };

    if (!tenantId) {
      return send400(reply, ErrorCodes.INVALID_INPUT, 'tenantId é obrigatório');
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      return send404(reply, 'Tenant');
    }

    const message = await prisma.outboxMessage.create({
      data: {
        tenantId,
        to: to || '5511999999999',
        text: text || 'Mensagem de teste do GetWork Portal',
        status: 'QUEUED',
        providerType: 'MOCK_WHATSAPP',
        eventId: `test-${Date.now()}`,
        metadata: { isTest: true, source: 'mock-endpoint' },
      },
    });

    // Simular envio imediato
    await prisma.outboxMessage.update({
      where: { id: message.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    await prisma.deliveryLog.create({
      data: {
        tenantId,
        outboxId: message.id,
        status: 'SUCCESS',
        message: 'Mensagem de teste enviada via Mock',
      },
    });

    return success({
      message: 'Mensagem de teste criada e enviada',
      outboxId: message.id,
    });
  });
}
