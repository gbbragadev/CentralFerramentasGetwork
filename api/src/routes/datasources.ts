// ============================================================
// Data Sources Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, apiError, ErrorCodes } from '../lib/response.js';
import { modulePresets } from '../modules/data-sources/modulePresets.js';
import { collectPaths, resolvePath } from '../utils/dataPaths.js';

const defaultRecipientsSchema = z.object({
  phonePath: z.string().min(1, 'Campo de telefone obrigatorio'),
  namePath: z.string().optional().nullable(),
  iterateOverPath: z.string().optional().nullable(),
  filterExpression: z.string().optional().nullable(),
});

const defaultMappingsSchema = z.object({
  employeeNamePath: z.string().optional().nullable(),
  companyNamePath: z.string().optional().nullable(),
  defaultRecipients: defaultRecipientsSchema,
});

const dataSourceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  module: z.enum(['HCM_GED', 'HCM_EMPLOYEEJOURNEY', 'PLATFORM_SIGN', 'PLATFORM_USER', 'PLATFORM_AUTHORIZATION']),
  apiModule: z.string().min(1, 'Módulo da API obrigatório'), // sign, ecm_ged, hcm
  apiMethod: z.enum(['GET', 'POST']).default('POST'),
  apiEndpoint: z.string().min(1, 'Endpoint obrigatório'),
  apiParams: z.record(z.any()).optional(),
  apiHeaders: z.record(z.string()).optional(),
  responseDataPath: z.string().optional(),
  responseMapping: z.record(z.any()).optional(),
  defaultMappings: defaultMappingsSchema.optional(),
  isActive: z.boolean().optional().default(true),
});

const testQuerySchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
  dataSourceId: z.string().uuid().optional(),
  dataSource: z.object({
    apiModule: z.string().min(1),
    apiMethod: z.enum(['GET', 'POST']).default('POST'),
    apiEndpoint: z.string().min(1),
    apiParams: z.record(z.any()).optional(),
    apiHeaders: z.record(z.string()).optional(),
    responseDataPath: z.string().optional(),
  }).optional(),
});

// Constrói a URL completa da API Senior
// Formato: https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform/{module}/{endpoint}
function buildSeniorUrl(apiModule: string, apiEndpoint: string): string {
  const baseUrl = 'https://platform.senior.com.br/t/senior.com.br/bridge/1.0/rest/platform';
  // Remove barra inicial se houver
  const endpoint = apiEndpoint.startsWith('/') ? apiEndpoint.slice(1) : apiEndpoint;
  // Se já contém o módulo, usa direto
  if (endpoint.startsWith(apiModule)) {
    return `${baseUrl}/${endpoint}`;
  }
  return `${baseUrl}/${apiModule}/${endpoint}`;
}

type DataSourceTestConfig = {
  apiModule: string;
  apiMethod: 'GET' | 'POST';
  apiEndpoint: string;
  apiParams?: Record<string, unknown> | null;
  apiHeaders?: Record<string, string> | null;
  responseDataPath?: string | null;
};

async function executeDataSourceTest({
  dataSource,
  tenantId,
  dataSourceId,
}: {
  dataSource: DataSourceTestConfig;
  tenantId: string;
  dataSourceId?: string;
}) {
  const credentials = await prisma.seniorCredentials.findUnique({
    where: { tenantId },
  });

  if (!credentials) {
    throw { statusCode: 400, payload: apiError(ErrorCodes.CREDENTIALS_NOT_CONFIGURED, 'Credenciais Senior não configuradas para este tenant') };
  }

  if (!credentials.authToken || credentials.authToken === 'PENDING_AUTH') {
    throw { statusCode: 400, payload: apiError(ErrorCodes.INVALID_CREDENTIALS, 'Token não disponível. Execute o teste de login primeiro.') };
  }

  const url = buildSeniorUrl(dataSource.apiModule, dataSource.apiEndpoint);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': credentials.authToken.startsWith('Bearer ')
      ? credentials.authToken
      : `Bearer ${credentials.authToken}`,
    ...(dataSource.apiHeaders || {}),
  };

  const params = dataSource.apiParams || {};
  const startTime = Date.now();

  let response: Response;
  let responseData: any;
  let httpStatus: number;

  try {
    if (dataSource.apiMethod === 'GET') {
      const queryString = new URLSearchParams(params as Record<string, string>).toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      response = await fetch(fullUrl, { method: 'GET', headers });
    } else {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
    }

    httpStatus = response.status;
    responseData = await response.json().catch(() => null);
  } catch (error: any) {
    if (dataSourceId) {
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'ERROR',
        },
      });
    }
    throw {
      statusCode: 500,
      payload: {
        success: false,
        error: 'REQUEST_FAILED',
        message: error.message || 'Falha ao executar requisição',
        duration: Date.now() - startTime,
      },
    };
  }

  const duration = Date.now() - startTime;
  const isSuccess = httpStatus >= 200 && httpStatus < 300;
  const extractedData = dataSource.responseDataPath
    ? resolvePath(responseData, dataSource.responseDataPath)
    : responseData;
  const detectedPaths = collectPaths(extractedData ?? responseData);

  if (dataSourceId) {
    await prisma.dataSource.update({
      where: { id: dataSourceId },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: isSuccess ? 'SUCCESS' : 'ERROR',
        lastTestResponse: responseData || null,
        lastTestExtractedData: extractedData ?? null,
        lastTestPaths: detectedPaths,
      },
    });
  }

  return {
    success: isSuccess,
    httpStatus,
    duration,
    url,
    method: dataSource.apiMethod,
    requestBody: params,
    response: responseData,
    extractedData,
    recordCount: Array.isArray(extractedData) ? extractedData.length : null,
    detectedPaths,
  };
}

export async function dataSourcesRoutes(app: FastifyInstance) {
  // Middleware de autenticação
  app.addHook('preHandler', app.authenticate as any);

  // GET /datasources - Listar todas
  app.get('/', async () => {
    const dataSources = await prisma.dataSource.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { rules: true },
        },
      },
    });
    return success(dataSources);
  });

  // GET /datasources/:id - Buscar por ID
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const dataSource = await prisma.dataSource.findUnique({
      where: { id },
      include: {
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

    if (!dataSource) {
      return send404(reply, 'Fonte de Dados');
    }

    return success(dataSource);
  });

  // POST /datasources - Criar
  app.post('/', async (request, reply) => {
    const body = dataSourceSchema.parse(request.body);

    const dataSource = await prisma.dataSource.create({
      data: {
        name: body.name,
        description: body.description,
        module: body.module,
        apiModule: body.apiModule,
        apiMethod: body.apiMethod,
        apiEndpoint: body.apiEndpoint,
        apiParams: body.apiParams || null,
        apiHeaders: body.apiHeaders || null,
        responseDataPath: body.responseDataPath,
        responseMapping: body.responseMapping || null,
        defaultMappings: body.defaultMappings || null,
        isActive: body.isActive ?? true,
      },
    });

    return reply.status(201).send(success(dataSource));
  });

  // PUT /datasources/:id - Atualizar
  app.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = dataSourceSchema.partial().parse(request.body);

    const existing = await prisma.dataSource.findUnique({ where: { id } });
    if (!existing) {
      return send404(reply, 'Fonte de Dados');
    }

    const dataSource = await prisma.dataSource.update({
      where: { id },
      data: body,
    });

    return success(dataSource);
  });

  // DELETE /datasources/:id - Excluir
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.dataSource.findUnique({
      where: { id },
      include: { _count: { select: { rules: true } } },
    });

    if (!existing) {
      return send404(reply, 'Fonte de Dados');
    }

    if (existing._count.rules > 0) {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_INPUT, `Não é possível excluir. Existem ${existing._count.rules} regra(s) usando esta fonte.`)
      );
    }

    await prisma.dataSource.delete({ where: { id } });
    return reply.status(204).send();
  });

  // ========================================
  // POST /datasources/:id/test - Testar Query
  // ========================================
  app.post('/:id/test', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = testQuerySchema.parse(request.body);

    // Buscar fonte de dados
    const dataSource = await prisma.dataSource.findUnique({ where: { id } });
    if (!dataSource) {
      return send404(reply, 'Fonte de Dados');
    }

    try {
      const result = await executeDataSourceTest({
        dataSource: {
          apiModule: dataSource.apiModule,
          apiMethod: dataSource.apiMethod,
          apiEndpoint: dataSource.apiEndpoint,
          apiParams: (dataSource.apiParams as Record<string, unknown> | null) || null,
          apiHeaders: (dataSource.apiHeaders as Record<string, string> | null) || null,
          responseDataPath: dataSource.responseDataPath,
        },
        tenantId: body.tenantId,
        dataSourceId: dataSource.id,
      });

      return success(result);
    } catch (error: any) {
      if (error?.statusCode && error?.payload) {
        return reply.status(error.statusCode).send(error.payload);
      }
      if (error?.errorCode) {
        return reply.status(400).send(error);
      }
      return reply.status(500).send(
        apiError(ErrorCodes.INTERNAL_ERROR, 'Falha ao testar fonte de dados')
      );
    }
  });

  // ========================================
  // POST /datasources/test - Testar Query (sem salvar)
  // ========================================
  app.post('/test', async (request, reply) => {
    const body = testQuerySchema.parse(request.body);

    let dataSource = body.dataSource;

    if (!dataSource && body.dataSourceId) {
      const stored = await prisma.dataSource.findUnique({ where: { id: body.dataSourceId } });
      if (!stored) {
        return send404(reply, 'Fonte de Dados');
      }
      dataSource = {
        apiModule: stored.apiModule,
        apiMethod: stored.apiMethod,
        apiEndpoint: stored.apiEndpoint,
        apiParams: (stored.apiParams as Record<string, unknown> | null) || null,
        apiHeaders: (stored.apiHeaders as Record<string, string> | null) || null,
        responseDataPath: stored.responseDataPath,
      };
    }

    if (!dataSource) {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_INPUT, 'Informe dataSourceId ou configuracao da fonte')
      );
    }

    try {
      const result = await executeDataSourceTest({
        dataSource,
        tenantId: body.tenantId,
        dataSourceId: body.dataSourceId,
      });
      return success(result);
    } catch (error: any) {
      if (error?.statusCode && error?.payload) {
        return reply.status(error.statusCode).send(error.payload);
      }
      if (error?.errorCode) {
        return reply.status(400).send(error);
      }
      return reply.status(500).send(
        apiError(ErrorCodes.INTERNAL_ERROR, 'Falha ao testar fonte de dados')
      );
    }
  });

  // ========================================
  // GET /datasources/presets/list - Presets baseados nas APIs Senior
  // ========================================
  app.get('/presets/list', async () => {
    const presets = modulePresets.flatMap((modulePreset) =>
      modulePreset.dataSourcePresets.map((preset) => ({
        ...preset,
        module: modulePreset.id,
        defaultMappings: preset.defaultMappings || modulePreset.defaultMappings,
      }))
    );

    return success(presets);
  });

  // ========================================
  // GET /datasources/modules - Lista módulos disponíveis com defaults
  // ========================================
  app.get('/modules', async () => {
    const modules = modulePresets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      description: preset.description,
      apiModule: preset.apiModule,
      defaultDataSource: preset.defaultDataSource,
      defaultMappings: preset.defaultMappings,
      endpoints: preset.endpoints,
    }));

    return success(modules);
  });
}




