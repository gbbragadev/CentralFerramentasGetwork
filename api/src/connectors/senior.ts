// ===========================================
// Senior X Connector
// ===========================================

import { PrismaClient, SeniorCredentials } from '@prisma/client';

export interface SeniorEvent {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: Date;
}

export interface PollResult {
  success: boolean;
  events: SeniorEvent[];
  error?: string;
  nextCursor?: string;
}

export interface SeniorConnectorConfig {
  baseUrl: string;
  authToken: string;
  demoMode: boolean;
}

export class SeniorConnector {
  private config: SeniorConnectorConfig;
  private prisma: PrismaClient;

  constructor(config: SeniorConnectorConfig, prisma: PrismaClient) {
    this.config = config;
    this.prisma = prisma;
  }

  // Criar instância a partir de credenciais do tenant
  static async fromTenant(tenantId: string, prisma: PrismaClient): Promise<SeniorConnector | null> {
    const credentials = await prisma.seniorCredentials.findUnique({
      where: { tenantId },
    });

    if (!credentials) {
      console.warn(`⚠️ Credenciais Senior não configuradas para tenant ${tenantId}`);
      return null;
    }

    return new SeniorConnector({
      baseUrl: credentials.baseUrl,
      authToken: credentials.authToken,
      demoMode: credentials.demoMode,
    }, prisma);
  }

  // Request genérico para API Senior
  async request<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: Record<string, any>,
    timeout: number = 30000
  ): Promise<{ success: boolean; data?: T; error?: string; status?: number }> {
    // Se modo demo, não faz request real
    if (this.config.demoMode) {
      console.log(`🎭 [DEMO] Request ignorado: ${method} ${path}`);
      return {
        success: true,
        data: { demo: true, path } as any,
      };
    }

    const url = `${this.config.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`📡 [SENIOR] ${method} ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': this.config.authToken,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          error: data?.message || `HTTP ${response.status}`,
          status: response.status,
        };
      }

      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        return {
          success: false,
          error: `Timeout após ${timeout}ms`,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Polling de eventos - método genérico
  async pollEvents(
    endpointPath: string,
    strategy: string,
    params?: Record<string, any>
  ): Promise<PollResult> {
    // Modo demo: gerar eventos fake
    if (this.config.demoMode) {
      return this.generateDemoEvents(endpointPath);
    }

    try {
      // Estratégia SIMPLE: apenas GET/POST no endpoint
      if (strategy === 'SIMPLE') {
        const result = await this.request('POST', endpointPath, params);
        
        if (!result.success) {
          return {
            success: false,
            events: [],
            error: result.error,
          };
        }

        // Tentar extrair eventos do response
        const events = this.extractEventsFromResponse(result.data, endpointPath);
        
        return {
          success: true,
          events,
        };
      }

      // Estratégia PAGINATION
      if (strategy === 'PAGINATION') {
        const allEvents: SeniorEvent[] = [];
        let offset = 0;
        const limit = 50;
        let hasMore = true;

        while (hasMore) {
          const result = await this.request('POST', endpointPath, {
            ...params,
            offset,
            limit,
          });

          if (!result.success) {
            return {
              success: false,
              events: allEvents,
              error: result.error,
            };
          }

          const events = this.extractEventsFromResponse(result.data, endpointPath);
          allEvents.push(...events);

          // Verificar se tem mais páginas
          const totalElements = result.data?.totalElements || 0;
          offset += limit;
          hasMore = offset < totalElements;

          // Limite de segurança
          if (allEvents.length >= 500) {
            console.warn('⚠️ Limite de 500 eventos atingido');
            break;
          }
        }

        return {
          success: true,
          events: allEvents,
        };
      }

      return {
        success: false,
        events: [],
        error: `Estratégia de polling desconhecida: ${strategy}`,
      };
    } catch (error: any) {
      return {
        success: false,
        events: [],
        error: error.message,
      };
    }
  }

  // Extrair eventos do response da API Senior
  private extractEventsFromResponse(data: any, endpointPath: string): SeniorEvent[] {
    if (!data) return [];

    // Tentar diferentes estruturas de response
    const possibleArrays = [
      data.contents,
      data.items,
      data.documents,
      data.envelopes,
      data.records,
      data.data,
    ].filter(Array.isArray);

    if (possibleArrays.length === 0) {
      // Se não encontrou array, tentar usar o próprio data como evento único
      if (typeof data === 'object' && data.id) {
        return [this.mapToEvent(data, endpointPath)];
      }
      return [];
    }

    // Usar primeiro array encontrado
    const items = possibleArrays[0];
    return items.map((item: any) => this.mapToEvent(item, endpointPath));
  }

  // Mapear item para SeniorEvent
  private mapToEvent(item: any, endpointPath: string): SeniorEvent {
    return {
      id: item.id || item.envelopeId || item.documentId || `${Date.now()}-${Math.random()}`,
      type: this.inferEventType(endpointPath),
      data: item,
      timestamp: item.createdDate ? new Date(item.createdDate) : new Date(),
    };
  }

  // Inferir tipo de evento baseado no endpoint
  private inferEventType(endpointPath: string): string {
    if (endpointPath.includes('sign')) return 'SIGNATURE';
    if (endpointPath.includes('ecm_ged')) return 'DOCUMENT';
    if (endpointPath.includes('envelope')) return 'ENVELOPE';
    return 'GENERIC';
  }

  // Gerar eventos fake para modo demo
  private generateDemoEvents(endpointPath: string): PollResult {
    const eventType = this.inferEventType(endpointPath);
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 eventos

    console.log(`🎭 [DEMO] Gerando ${count} eventos fake para ${endpointPath}`);

    const events: SeniorEvent[] = [];

    for (let i = 0; i < count; i++) {
      const event = this.generateDemoEvent(eventType, i);
      events.push(event);
    }

    return {
      success: true,
      events,
    };
  }

  private generateDemoEvent(type: string, index: number): SeniorEvent {
    const names = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa', 'Carlos Lima'];
    const name = names[Math.floor(Math.random() * names.length)];
    const phone = `55119${Math.floor(Math.random() * 90000000) + 10000000}`;

    const baseEvent = {
      id: `demo-${Date.now()}-${index}`,
      type,
      timestamp: new Date(),
    };

    switch (type) {
      case 'SIGNATURE':
        return {
          ...baseEvent,
          data: {
            envelopeId: `env-${Date.now()}-${index}`,
            envelopeName: `Contrato de Trabalho - ${name}`,
            status: 'PENDING_SIGNATURE',
            signerName: name,
            signerEmail: `${name.toLowerCase().replace(' ', '.')}@example.com`,
            signerPhone: phone,
            createdDate: new Date().toISOString(),
            expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        };

      case 'DOCUMENT':
        return {
          ...baseEvent,
          data: {
            documentId: `doc-${Date.now()}-${index}`,
            documentName: `Documento ${index + 1} - ${name}`,
            folderName: 'RH/Contratos',
            authorName: name,
            authorPhone: phone,
            createdDate: new Date().toISOString(),
          },
        };

      default:
        return {
          ...baseEvent,
          data: {
            eventId: `evt-${Date.now()}-${index}`,
            description: `Evento genérico ${index + 1}`,
            userName: name,
            userPhone: phone,
          },
        };
    }
  }

  // ========================================
  // Métodos específicos para APIs Senior
  // ========================================

  // Listar envelopes de assinatura
  async listSignatureEnvelopes(status: string[] = ['PENDING_SIGNATURE']): Promise<PollResult> {
    return this.pollEvents('/sign/queries/listEnvelopes', 'PAGINATION', {
      status,
      limit: 50,
      offset: 0,
    });
  }

  // Buscar documentos assinados
  async getSignedDocuments(hashEnvelope: string): Promise<PollResult> {
    const result = await this.request('GET', `/ecm_ged/queries/getSignedDocuments?hashEnvelope=${hashEnvelope}`);
    
    if (!result.success) {
      return {
        success: false,
        events: [],
        error: result.error,
      };
    }

    return {
      success: true,
      events: result.data?.documents?.map((doc: any) => ({
        id: doc.id,
        type: 'SIGNED_DOCUMENT',
        data: doc,
        timestamp: new Date(),
      })) || [],
    };
  }
}
