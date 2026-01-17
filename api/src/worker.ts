// ============================================================
// GetWork Portal Worker
// ============================================================

import { Worker, Queue, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { Cron } from 'croner';
import crypto from 'crypto';
import { getRedisConnection, closeRedisConnection } from './utils/redis.js';
import { SeniorConnector } from './connectors/senior.js';
import { createNotificationProvider, SendMessageParams } from './providers/notification.js';

// Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// Redis connection
const redis = getRedisConnection();

// Queues
const schedulerQueue = new Queue('scheduler', { connection: redis });
const notificationQueue = new Queue('notification', { connection: redis });

// ============================================================
// Utilitários
// ============================================================

function generateIdempotencyKey(eventId: string, ruleId: string, recipient: string): string {
  const data = `${eventId}:${ruleId}:${recipient}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

async function isAlreadyProcessed(tenantId: string, key: string): Promise<boolean> {
  const existing = await prisma.idempotencyKey.findUnique({
    where: { key },
  });
  return !!existing;
}

async function markAsProcessed(tenantId: string, key: string): Promise<void> {
  await prisma.idempotencyKey.create({
    data: {
      tenantId,
      key,
    },
  });
}

function applyMessageTemplate(template: string, data: Record<string, any>): string {
  let message = template;
  const placeholders = template.match(/\{([^}]+)\}/g) || [];

  for (const placeholder of placeholders) {
    const field = placeholder.slice(1, -1);
    const value = getNestedValue(data, field);
    message = message.replace(placeholder, value?.toString() || '[N/A]');
  }

  return message;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

function extractRecipient(
  event: any,
  strategy: string,
  field?: string | null,
  staticValue?: string | null
): string | null {
  switch (strategy) {
    case 'STATIC':
      return staticValue || null;
    case 'FIELD':
      if (!field) return null;
      const value = getNestedValue(event.data, field);
      return value?.toString() || null;
    case 'LOOKUP':
      return null;
    default:
      return null;
  }
}

function getNextRunDate(expression: string, timezone: string): Date | null {
  try {
    const cron = new Cron(expression, { timezone });
    return cron.nextRun() || null;
  } catch {
    return null;
  }
}

// ============================================================
// Worker: Scheduler
// ============================================================

const schedulerWorker = new Worker(
  'scheduler',
  async (job: Job) => {
    const { scheduleId, tenantId, triggeredManually } = job.data;

    console.log(`\n📅 [SCHEDULER] Processando schedule: ${scheduleId}`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Manual: ${triggeredManually || false}`);

    try {
      const schedule = await prisma.schedule.findUnique({
        where: { id: scheduleId },
        include: {
          tenant: true,
          rules: {
            include: {
              rule: {
                include: { channel: true },
              },
            },
          },
        },
      });

      if (!schedule) {
        console.error(`❌ Schedule não encontrado: ${scheduleId}`);
        return { success: false, error: 'Schedule não encontrado' };
      }

      if (!schedule.enabled && !triggeredManually) {
        console.log(`⏸️ Schedule desabilitado, ignorando`);
        return { success: false, error: 'Schedule desabilitado' };
      }

      const connector = await SeniorConnector.fromTenant(tenantId, prisma);

      if (!connector) {
        console.warn(`⚠️ Credenciais Senior não configuradas`);
        await prisma.deliveryLog.create({
          data: {
            tenantId,
            status: 'WARNING',
            message: 'Credenciais Senior não configuradas',
          },
        });
        return { success: false, error: 'Credenciais não configuradas' };
      }

      for (const scheduleRule of schedule.rules) {
        const rule = scheduleRule.rule;

        if (!rule.enabled) {
          console.log(`⏸️ Regra ${rule.name} desabilitada, pulando`);
          continue;
        }

        console.log(`\n🔄 Processando regra: ${rule.name}`);

        const pollResult = await connector.pollEvents(
          rule.seniorEndpointPath || '/sign/queries/listEnvelopes',
          rule.pollStrategy,
          rule.metadata as any
        );

        if (!pollResult.success) {
          console.error(`❌ Erro no polling: ${pollResult.error}`);
          await prisma.deliveryLog.create({
            data: {
              tenantId,
              ruleId: rule.id,
              status: 'ERROR',
              error: pollResult.error,
              message: 'Erro ao consultar API Senior',
            },
          });
          continue;
        }

        console.log(`📥 ${pollResult.events.length} eventos encontrados`);

        for (const event of pollResult.events) {
          const recipient = extractRecipient(
            event,
            rule.recipientStrategy,
            rule.recipientField,
            rule.recipientStatic
          );

          if (!recipient) {
            console.warn(`⚠️ Não foi possível extrair destinatário do evento ${event.id}`);
            continue;
          }

          const idempotencyKey = generateIdempotencyKey(event.id, rule.id, recipient);

          if (await isAlreadyProcessed(tenantId, idempotencyKey)) {
            console.log(`⏭️ Evento ${event.id} já processado, pulando`);
            continue;
          }

          const messageText = applyMessageTemplate(rule.messageTemplate, event.data);

          await notificationQueue.add('send', {
            tenantId,
            ruleId: rule.id,
            channelType: rule.channel?.type || 'MOCK_WHATSAPP',
            to: recipient,
            text: messageText,
            eventId: event.id,
            idempotencyKey,
            metadata: {
              eventType: event.type,
              eventData: event.data,
            },
          });

          console.log(`📤 Mensagem enfileirada para ${recipient}`);
        }
      }

      const nextRun = getNextRunDate(schedule.cron, schedule.timezone);

      await prisma.schedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt: nextRun,
        },
      });

      console.log(`✅ Schedule ${schedule.name} processado com sucesso`);

      return { success: true };
    } catch (error: any) {
      console.error(`❌ Erro no scheduler:`, error);

      await prisma.deliveryLog.create({
        data: {
          tenantId,
          status: 'ERROR',
          error: error.message,
          message: 'Erro interno no scheduler',
        },
      });

      throw error;
    }
  },
  { connection: redis, concurrency: 2 }
);

// ============================================================
// Worker: Notification
// ============================================================

const notificationWorker = new Worker(
  'notification',
  async (job: Job) => {
    const {
      tenantId,
      ruleId,
      channelType,
      to,
      text,
      eventId,
      idempotencyKey,
      metadata,
    } = job.data;

    console.log(`\n📱 [NOTIFICATION] Enviando mensagem`);
    console.log(`   Para: ${to}`);
    console.log(`   Canal: ${channelType}`);

    try {
      const provider = createNotificationProvider(channelType, prisma);

      const result = await provider.sendMessage({
        tenantId,
        ruleId,
        to,
        text,
        eventId,
        metadata,
      });

      if (result.success) {
        if (idempotencyKey) {
          await markAsProcessed(tenantId, idempotencyKey);
        }

        console.log(`✅ Mensagem enviada: ${result.messageId}`);
        return { success: true, messageId: result.messageId };
      } else {
        console.error(`❌ Falha no envio: ${result.error}`);

        await prisma.deliveryLog.create({
          data: {
            tenantId,
            ruleId,
            status: 'ERROR',
            error: result.error,
            message: `Falha ao enviar para ${to}`,
          },
        });

        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error(`❌ Erro no notification worker:`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
    limiter: {
      max: 10,
      duration: 1000,
    },
  }
);

// ============================================================
// Cron Scheduler
// ============================================================

async function checkAndQueueSchedules(): Promise<void> {
  console.log('\n⏰ [CRON] Verificando schedules pendentes...');

  try {
    const now = new Date();

    const dueSchedules = await prisma.schedule.findMany({
      where: {
        enabled: true,
        nextRunAt: {
          lte: now,
        },
      },
      include: {
        tenant: {
          select: { id: true, active: true },
        },
      },
    });

    console.log(`📋 ${dueSchedules.length} schedules pendentes`);

    for (const schedule of dueSchedules) {
      if (!schedule.tenant.active) {
        console.log(`⏸️ Tenant inativo, pulando schedule ${schedule.name}`);
        continue;
      }

      await schedulerQueue.add(
        'process-schedule',
        {
          scheduleId: schedule.id,
          tenantId: schedule.tenantId,
          triggeredManually: false,
        },
        {
          jobId: `schedule-${schedule.id}-${Date.now()}`,
          removeOnComplete: 100,
          removeOnFail: 50,
        }
      );

      console.log(`📤 Schedule ${schedule.name} enfileirado`);
    }
  } catch (error) {
    console.error('❌ Erro ao verificar schedules:', error);
  }
}

// Iniciar cron job
const cronJob = new Cron('* * * * *', { timezone: 'America/Sao_Paulo' }, async () => {
  await checkAndQueueSchedules();
});

// ============================================================
// Event Handlers
// ============================================================

schedulerWorker.on('completed', (job) => {
  console.log(`✅ [SCHEDULER] Job ${job.id} completado`);
});

schedulerWorker.on('failed', (job, err) => {
  console.error(`❌ [SCHEDULER] Job ${job?.id} falhou:`, err.message);
});

notificationWorker.on('completed', (job) => {
  console.log(`✅ [NOTIFICATION] Job ${job.id} completado`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`❌ [NOTIFICATION] Job ${job?.id} falhou:`, err.message);
});

// ============================================================
// Startup
// ============================================================

async function start() {
  console.log('🔌 Conectando ao banco de dados...');
  await prisma.$connect();
  console.log('✅ Banco de dados conectado');

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🔧 GetWork Portal Worker                                 ║
║                                                            ║
║   Scheduler Worker: ativo                                  ║
║   Notification Worker: ativo                               ║
║   Cron: verificando schedules a cada minuto                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  // Verificar schedules imediatamente
  setTimeout(checkAndQueueSchedules, 5000);
}

start().catch((err) => {
  console.error('❌ Erro ao iniciar worker:', err);
  process.exit(1);
});

// ============================================================
// Graceful Shutdown
// ============================================================

const shutdown = async () => {
  console.log('\n⏹️ Encerrando worker...');

  cronJob.stop();
  await schedulerWorker.close();
  await notificationWorker.close();
  await schedulerQueue.close();
  await notificationQueue.close();
  await closeRedisConnection();
  await prisma.$disconnect();

  console.log('✅ Worker encerrado');
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
