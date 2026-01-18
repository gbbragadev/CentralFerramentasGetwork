// ============================================================
// Message Templates Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, apiError, ErrorCodes } from '../lib/response.js';

const templateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  dataSourceId: z.string().uuid().optional().nullable(),
  messageBody: z.string().min(1, 'Corpo da mensagem obrigatório'),
  recipientField: z.string().default('signers[].phoneNumber'),
  recipientNameField: z.string().optional().nullable(),
  signUrlEnabled: z.boolean().default(true),
  signUrlBaseField: z.string().optional().nullable(),
  signUrlTemplate: z.string().optional().nullable(),
  iterateOverField: z.string().optional().nullable(),
  filterExpression: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

const previewSchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  sampleData: z.record(z.any()).optional(),
});

// Função para extrair placeholders de um template
function extractPlaceholders(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const placeholders: string[] = [];
  let match;
  while ((match = regex.exec(template)) !== null) {
    placeholders.push(match[1].trim());
  }
  return [...new Set(placeholders)];
}

// Função para substituir placeholders por valores
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const value = getNestedValue(data, path.trim());
    return value !== undefined ? String(value) : match;
  });
}

// Função para acessar valores aninhados (ex: "signer.name", "envelope.documents[0].title")
function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Verificar se é acesso a array (ex: documents[0])
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current[key]?.[parseInt(index, 10)];
    } else {
      current = current[part];
    }
  }

  return current;
}

export async function templatesRoutes(app: FastifyInstance) {
  // Middleware de autenticação
  app.addHook('preHandler', app.authenticate as any);

  // GET /templates - Listar todos
  app.get('/', async () => {
    const templates = await prisma.messageTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        dataSource: {
          select: { id: true, name: true, apiModule: true },
        },
        _count: {
          select: { rules: true },
        },
      },
    });
    return success(templates);
  });

  // GET /templates/:id - Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const template = await prisma.messageTemplate.findUnique({
      where: { id },
      include: {
        dataSource: true,
        rules: {
          select: {
            id: true,
            name: true,
            enabled: true,
            tenant: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!template) {
      return send404(reply, 'Template');
    }

    // Extrair placeholders do template
    const placeholders = extractPlaceholders(template.messageBody);

    return success({
      ...template,
      placeholders,
    });
  });

  // POST /templates - Criar
  app.post('/', async (request, reply) => {
    const body = templateSchema.parse(request.body);

    // Verificar se dataSource existe
    if (body.dataSourceId) {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: body.dataSourceId },
      });
      if (!dataSource) {
        return reply.status(400).send(
          apiError(ErrorCodes.INVALID_INPUT, 'Fonte de dados não encontrada')
        );
      }
    }

    const template = await prisma.messageTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        dataSourceId: body.dataSourceId,
        messageBody: body.messageBody,
        recipientField: body.recipientField,
        recipientNameField: body.recipientNameField,
        signUrlEnabled: body.signUrlEnabled,
        signUrlBaseField: body.signUrlBaseField,
        signUrlTemplate: body.signUrlTemplate,
        iterateOverField: body.iterateOverField,
        filterExpression: body.filterExpression,
        isActive: body.isActive,
      },
      include: {
        dataSource: {
          select: { id: true, name: true },
        },
      },
    });

    return reply.status(201).send(success(template));
  });

  // PUT /templates/:id - Atualizar
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = templateSchema.partial().parse(request.body);

    const existing = await prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Template');
    }

    // Verificar se dataSource existe
    if (body.dataSourceId) {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: body.dataSourceId },
      });
      if (!dataSource) {
        return reply.status(400).send(
          apiError(ErrorCodes.INVALID_INPUT, 'Fonte de dados não encontrada')
        );
      }
    }

    const template = await prisma.messageTemplate.update({
      where: { id },
      data: body,
      include: {
        dataSource: {
          select: { id: true, name: true },
        },
      },
    });

    return success(template);
  });

  // DELETE /templates/:id - Excluir
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.messageTemplate.findUnique({
      where: { id },
      include: { _count: { select: { rules: true } } },
    });

    if (!existing) {
      return send404(reply, 'Template');
    }

    if (existing._count.rules > 0) {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_INPUT, `Não é possível excluir. Existem ${existing._count.rules} regra(s) usando este template.`)
      );
    }

    await prisma.messageTemplate.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ========================================
  // POST /templates/:id/preview - Preview com dados reais
  // ========================================
  app.post('/:id/preview', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = previewSchema.parse(request.body);

    // Buscar template
    const template = await prisma.messageTemplate.findUnique({
      where: { id },
      include: { dataSource: true },
    });

    if (!template) {
      return send404(reply, 'Template');
    }

    // Se não tem DataSource vinculado, usar sampleData
    if (!template.dataSourceId || !template.dataSource) {
      if (!body.sampleData) {
        return reply.status(400).send(
          apiError(ErrorCodes.INVALID_INPUT, 'Template sem fonte de dados. Forneça sampleData para preview.')
        );
      }

      const rendered = renderTemplate(template.messageBody, body.sampleData);
      const placeholders = extractPlaceholders(template.messageBody);

      return success({
        template: template.messageBody,
        rendered,
        placeholders,
        sampleData: body.sampleData,
        recipients: [],
      });
    }

    // Buscar credenciais do tenant
    const credentials = await prisma.seniorCredentials.findUnique({
      where: { tenantId: body.tenantId },
    });

    if (!credentials || !credentials.authToken || credentials.authToken === 'PENDING_AUTH') {
      return reply.status(400).send(
        apiError(ErrorCodes.CREDENTIALS_NOT_CONFIGURED, 'Credenciais Senior não configuradas ou token não disponível')
      );
    }

    // Construir URL da API
    const baseUrl = 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform';
    const endpoint = template.dataSource.apiEndpoint.startsWith('/')
      ? template.dataSource.apiEndpoint.slice(1)
      : template.dataSource.apiEndpoint;
    const url = `${baseUrl}/${template.dataSource.apiModule}/${endpoint}`;

    // Preparar headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': credentials.authToken.startsWith('Bearer ')
        ? credentials.authToken
        : `Bearer ${credentials.authToken}`,
    };

    // Executar requisição
    const params = template.dataSource.apiParams || {};
    let response: Response;
    let responseData: any;

    try {
      response = await fetch(url, {
        method: template.dataSource.apiMethod === 'GET' ? 'GET' : 'POST',
        headers,
        body: template.dataSource.apiMethod === 'POST' ? JSON.stringify(params) : undefined,
      });
      responseData = await response.json().catch(() => null);
    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        error: 'REQUEST_FAILED',
        message: error.message || 'Falha ao executar requisição',
      });
    }

    // Extrair dados usando o path configurado
    let extractedData = responseData;
    if (template.dataSource.responseDataPath) {
      const paths = template.dataSource.responseDataPath.split('.');
      for (const path of paths) {
        extractedData = extractedData?.[path];
      }
    }

    // Pegar primeiro item se for array (para preview)
    const sampleItem = Array.isArray(extractedData) ? extractedData[0] : extractedData;

    // Gerar preview
    const placeholders = extractPlaceholders(template.messageBody);
    const rendered = sampleItem ? renderTemplate(template.messageBody, sampleItem) : template.messageBody;

    // Extrair destinatários se iterateOverField estiver configurado
    let recipients: any[] = [];
    if (template.iterateOverField && sampleItem) {
      const items = getNestedValue(sampleItem, template.iterateOverField);
      if (Array.isArray(items)) {
        recipients = items.map((item: any, index: number) => {
          const phone = getNestedValue(item, template.recipientField.replace(`${template.iterateOverField}[].`, ''));
          const name = template.recipientNameField
            ? getNestedValue(item, template.recipientNameField.replace(`${template.iterateOverField}[].`, ''))
            : null;
          const itemData = { ...sampleItem, [template.iterateOverField.split('.').pop()!]: item };
          return {
            index,
            phone,
            name,
            message: renderTemplate(template.messageBody, itemData),
          };
        });
      }
    }

    return success({
      template: template.messageBody,
      rendered,
      placeholders,
      sampleData: sampleItem,
      totalRecords: Array.isArray(extractedData) ? extractedData.length : 1,
      recipients,
    });
  });

  // ========================================
  // GET /templates/placeholders - Lista placeholders comuns
  // ========================================
  app.get('/placeholders/common', async () => {
    const commonPlaceholders = {
      sign: {
        envelope: [
          { path: 'id', description: 'ID do envelope' },
          { path: 'name', description: 'Nome do envelope' },
          { path: 'status', description: 'Status (PENDING, SIGNED, etc)' },
          { path: 'createdBy', description: 'Quem criou o envelope' },
          { path: 'createdDate', description: 'Data de criação' },
          { path: 'expirationDate', description: 'Data de expiração' },
          { path: 'instructionsToSigner', description: 'Instruções para o assinante' },
        ],
        signer: [
          { path: 'signers[0].name', description: 'Nome do signatário' },
          { path: 'signers[0].email', description: 'Email do signatário' },
          { path: 'signers[0].phoneNumber', description: 'Telefone do signatário' },
          { path: 'signers[0].status', description: 'Status da assinatura' },
        ],
        document: [
          { path: 'documents[0].originalFilename', description: 'Nome do arquivo' },
          { path: 'documents[0].id', description: 'ID do documento' },
        ],
      },
      special: [
        { path: '{{signUrl}}', description: 'Link para assinatura (gerado automaticamente)' },
        { path: '{{tenantName}}', description: 'Nome da empresa/tenant' },
        { path: '{{currentDate}}', description: 'Data atual formatada' },
      ],
    };

    return success(commonPlaceholders);
  });
}
