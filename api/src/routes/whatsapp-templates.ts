// ============================================================
// WhatsApp Templates Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, apiError, ErrorCodes } from '../lib/response.js';
import { resolvePath } from '../utils/dataPaths.js';
import { extractPlaceholders, renderTemplate } from '../utils/templateRenderer.js';

const previewSchema = z.object({
  tenantId: z.string().uuid('ID do tenant invÃ¡lido'),
});

function buildSeniorUrl(apiModule: string, apiEndpoint: string): string {
  const baseUrl = 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform';
  const endpoint = apiEndpoint.startsWith('/') ? apiEndpoint.slice(1) : apiEndpoint;
  if (endpoint.startsWith(apiModule)) {
    return `${baseUrl}/${endpoint}`;
  }
  return `${baseUrl}/${apiModule}/${endpoint}`;
}

export async function whatsappTemplatesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.authenticate as any);

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
        apiError(ErrorCodes.CREDENTIALS_NOT_CONFIGURED, 'Credenciais Senior nÃ£o configuradas ou token nÃ£o disponÃ­vel')
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
        apiError(ErrorCodes.INTERNAL_ERROR, error.message || 'Falha ao executar requisiÃ§Ã£o')
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
