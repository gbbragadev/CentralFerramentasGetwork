// ============================================================
// Message Templates Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, apiError, ErrorCodes } from '../lib/response.js';
import { resolvePath } from '../utils/dataPaths.js';
import { extractPlaceholders, renderTemplate } from '../utils/templateRenderer.js';
import { modulePresets } from '../modules/data-sources/modulePresets.js';

const templateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatorio'),
  description: z.string().optional(),
  dataSourceId: z.string().uuid().optional().nullable(),
  messageBody: z.string().min(1, 'Corpo da mensagem obrigatorio'),
  isActive: z.boolean().default(true),
});

const previewSchema = z.object({
  tenantId: z.string().uuid('ID do tenant invalido'),
});

function buildSeniorUrl(apiModule: string, apiEndpoint: string): string {
  const baseUrl = 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform';
  const endpoint = apiEndpoint.startsWith('/') ? apiEndpoint.slice(1) : apiEndpoint;
  if (endpoint.startsWith(apiModule)) {
    return `${baseUrl}/${endpoint}`;
  }
  return `${baseUrl}/${apiModule}/${endpoint}`;
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

  // GET /templates/presets - Modelos de texto por modulo
  app.get('/presets', async () => {
    const presets = modulePresets.flatMap((modulePreset) =>
      modulePreset.templatePresets.map((preset) => ({
        ...preset,
        module: modulePreset.id,
      }))
    );

    return success(presets);
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

    if (!body.dataSourceId) {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_INPUT, 'Fonte de dados obrigatoria')
      );
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

    const template = await prisma.messageTemplate.create({
      data: {
        name: body.name,
        description: body.description,
        dataSourceId: body.dataSourceId,
        messageBody: body.messageBody,
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

    if (body.dataSourceId === null) {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_INPUT, 'Fonte de dados obrigatoria')
      );
    }

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

    const template = await prisma.messageTemplate.findUnique({
      where: { id },
      include: { dataSource: true },
    });

    if (!template) {
      return send404(reply, 'Template');
    }

    if (!template.dataSourceId || !template.dataSource) {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_INPUT, 'Template sem fonte de dados. Vincule uma fonte para preview.')
      );
    }

    const credentials = await prisma.seniorCredentials.findUnique({
      where: { tenantId: body.tenantId },
    });

    if (!credentials || !credentials.authToken || credentials.authToken === 'PENDING_AUTH') {
      return reply.status(400).send(
        apiError(ErrorCodes.CREDENTIALS_NOT_CONFIGURED, 'Credenciais Senior nao configuradas ou token nao disponivel')
      );
    }

    const url = buildSeniorUrl(template.dataSource.apiModule, template.dataSource.apiEndpoint);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': credentials.authToken.startsWith('Bearer ')
        ? credentials.authToken
        : `Bearer ${credentials.authToken}`,
      ...(template.dataSource.apiHeaders as Record<string, string> | null || {}),
    };

    const params = template.dataSource.apiParams || {};
    let responseData: any;

    try {
      if (template.dataSource.apiMethod === 'GET') {
        const queryString = new URLSearchParams(params as Record<string, string>).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        const response = await fetch(fullUrl, { method: 'GET', headers });
        responseData = await response.json().catch(() => null);
      } else {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(params),
        });
        responseData = await response.json().catch(() => null);
      }
    } catch (error: any) {
      return reply.status(500).send(
        apiError(ErrorCodes.INTERNAL_ERROR, error.message || 'Falha ao executar requisicao')
      );
    }

    const extractedData = template.dataSource.responseDataPath
      ? resolvePath(responseData, template.dataSource.responseDataPath)
      : responseData;

    const sampleItem = Array.isArray(extractedData) ? extractedData[0] : extractedData;
    const placeholders = extractPlaceholders(template.messageBody);
    const rendered = sampleItem ? renderTemplate(template.messageBody, sampleItem) : template.messageBody;

    return success({
      template: template.messageBody,
      rendered,
      placeholders,
      sampleData: sampleItem ?? null,
      totalRecords: Array.isArray(extractedData) ? extractedData.length : (extractedData ? 1 : 0),
    });
  });

}
