// ===========================================
// Notification Providers
// ===========================================

import { PrismaClient, ChannelType, MessageStatus } from '@prisma/client';

// Interface base para todos os providers
export interface NotificationProvider {
  type: ChannelType;
  
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>;
  
  getStatus(messageId: string): Promise<MessageStatus>;
}

export interface SendMessageParams {
  tenantId: string;
  ruleId?: string;
  to: string;
  text: string;
  eventId?: string;
  metadata?: Record<string, any>;
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  externalId?: string;
  error?: string;
}

// ===========================================
// WhatsApp Mock Provider
// ===========================================

export class WhatsAppMockProvider implements NotificationProvider {
  type: ChannelType = 'MOCK_WHATSAPP';
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    try {
      console.log(`📱 [MOCK] Enviando mensagem para ${params.to}`);
      console.log(`   Texto: ${params.text.substring(0, 50)}...`);

      // Criar mensagem no outbox
      const message = await this.prisma.outboxMessage.create({
        data: {
          tenantId: params.tenantId,
          ruleId: params.ruleId,
          to: params.to,
          text: params.text,
          status: 'QUEUED',
          providerType: this.type,
          eventId: params.eventId,
          metadata: params.metadata,
        },
      });

      // Simular delay de envio (50-200ms)
      await this.simulateDelay(50, 200);

      // Atualizar para SENT
      await this.prisma.outboxMessage.update({
        where: { id: message.id },
        data: {
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      // Registrar log de sucesso
      await this.prisma.deliveryLog.create({
        data: {
          tenantId: params.tenantId,
          ruleId: params.ruleId,
          outboxId: message.id,
          status: 'SUCCESS',
          message: `Mensagem enviada para ${params.to} (Mock)`,
        },
      });

      console.log(`✅ [MOCK] Mensagem enviada: ${message.id}`);

      return {
        success: true,
        messageId: message.id,
        externalId: `mock-${message.id}`,
      };
    } catch (error: any) {
      console.error(`❌ [MOCK] Erro ao enviar:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getStatus(messageId: string): Promise<MessageStatus> {
    const message = await this.prisma.outboxMessage.findUnique({
      where: { id: messageId },
    });

    return message?.status || 'QUEUED';
  }

  private simulateDelay(min: number, max: number): Promise<void> {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}

// ===========================================
// WhatsApp Meta Provider (Placeholder)
// ===========================================

export class WhatsAppMetaProvider implements NotificationProvider {
  type: ChannelType = 'META_WHATSAPP';
  private prisma: PrismaClient;

  // Configurações necessárias para implementação real:
  // - WHATSAPP_PHONE_NUMBER_ID: ID do número de telefone
  // - WHATSAPP_ACCESS_TOKEN: Token de acesso da Meta
  // - WHATSAPP_API_VERSION: Versão da API (ex: v18.0)
  // - WHATSAPP_WEBHOOK_VERIFY_TOKEN: Token de verificação do webhook

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    // TODO: Implementar chamada real para WhatsApp Cloud API
    // 
    // Endpoint: https://graph.facebook.com/{version}/{phone_number_id}/messages
    // Method: POST
    // Headers:
    //   - Authorization: Bearer {access_token}
    //   - Content-Type: application/json
    // Body:
    // {
    //   "messaging_product": "whatsapp",
    //   "to": "{recipient_phone}",
    //   "type": "text",
    //   "text": { "body": "{message_text}" }
    // }
    //
    // Para templates:
    // {
    //   "messaging_product": "whatsapp",
    //   "to": "{recipient_phone}",
    //   "type": "template",
    //   "template": {
    //     "name": "{template_name}",
    //     "language": { "code": "pt_BR" },
    //     "components": [...]
    //   }
    // }

    console.warn('⚠️ WhatsAppMetaProvider não implementado. Configure as credenciais da Meta.');

    return {
      success: false,
      error: 'WhatsApp Meta Provider não configurado. Credenciais da Meta necessárias.',
    };
  }

  async getStatus(messageId: string): Promise<MessageStatus> {
    // TODO: Implementar consulta de status via webhook ou API
    // O status geralmente é recebido via webhook da Meta
    
    const message = await this.prisma.outboxMessage.findUnique({
      where: { id: messageId },
    });

    return message?.status || 'QUEUED';
  }
}

// ===========================================
// Provider Factory
// ===========================================

export function createNotificationProvider(
  type: ChannelType,
  prisma: PrismaClient
): NotificationProvider {
  switch (type) {
    case 'MOCK_WHATSAPP':
      return new WhatsAppMockProvider(prisma);
    case 'META_WHATSAPP':
      return new WhatsAppMetaProvider(prisma);
    default:
      throw new Error(`Provider não implementado: ${type}`);
  }
}
