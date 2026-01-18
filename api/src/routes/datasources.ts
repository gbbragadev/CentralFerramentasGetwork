// ============================================================
// Data Sources Routes
// ============================================================

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index.js';
import { success, send404, apiError, ErrorCodes } from '../lib/response.js';

const dataSourceSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  description: z.string().optional(),
  apiModule: z.string().min(1, 'Módulo da API obrigatório'), // sign, ecm_ged, hcm
  apiMethod: z.enum(['GET', 'POST']).default('POST'),
  apiEndpoint: z.string().min(1, 'Endpoint obrigatório'),
  apiParams: z.record(z.any()).optional(),
  apiHeaders: z.record(z.string()).optional(),
  responseDataPath: z.string().optional(),
  responseMapping: z.record(z.any()).optional(),
  isActive: z.boolean().optional().default(true),
});

const testQuerySchema = z.object({
  tenantId: z.string().uuid('ID do tenant inválido'),
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
        apiModule: body.apiModule,
        apiMethod: body.apiMethod,
        apiEndpoint: body.apiEndpoint,
        apiParams: body.apiParams || null,
        apiHeaders: body.apiHeaders || null,
        responseDataPath: body.responseDataPath,
        responseMapping: body.responseMapping || null,
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

    // Buscar credenciais do tenant
    const credentials = await prisma.seniorCredentials.findUnique({
      where: { tenantId: body.tenantId },
    });

    if (!credentials) {
      return reply.status(400).send(
        apiError(ErrorCodes.CREDENTIALS_NOT_CONFIGURED, 'Credenciais Senior não configuradas para este tenant')
      );
    }

    if (!credentials.authToken || credentials.authToken === 'PENDING_AUTH') {
      return reply.status(400).send(
        apiError(ErrorCodes.INVALID_CREDENTIALS, 'Token não disponível. Execute o teste de login primeiro.')
      );
    }

    // Construir URL
    const url = buildSeniorUrl(dataSource.apiModule, dataSource.apiEndpoint);

    // Preparar headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': credentials.authToken.startsWith('Bearer ')
        ? credentials.authToken
        : `Bearer ${credentials.authToken}`,
      ...(dataSource.apiHeaders as Record<string, string> || {}),
    };

    // Preparar body/params
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
      // Atualizar status do teste
      await prisma.dataSource.update({
        where: { id },
        data: {
          lastTestedAt: new Date(),
          lastTestStatus: 'ERROR',
        },
      });

      return reply.status(500).send({
        success: false,
        error: 'REQUEST_FAILED',
        message: error.message || 'Falha ao executar requisição',
        duration: Date.now() - startTime,
      });
    }

    const duration = Date.now() - startTime;
    const isSuccess = httpStatus >= 200 && httpStatus < 300;

    // Extrair dados usando o path configurado
    let extractedData = responseData;
    if (isSuccess && dataSource.responseDataPath && responseData) {
      const paths = dataSource.responseDataPath.split('.');
      for (const path of paths) {
        extractedData = extractedData?.[path];
      }
    }

    // Atualizar status do teste
    await prisma.dataSource.update({
      where: { id },
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: isSuccess ? 'SUCCESS' : 'ERROR',
      },
    });

    return success({
      success: isSuccess,
      httpStatus,
      duration,
      url,
      method: dataSource.apiMethod,
      requestBody: params,
      response: responseData,
      extractedData,
      recordCount: Array.isArray(extractedData) ? extractedData.length : null,
    });
  });

  // ========================================
  // GET /datasources/presets/list - Presets baseados nas APIs Senior
  // ========================================
  app.get('/presets/list', async () => {
    const presets = [
      // ===== Sign - Assinaturas =====
      {
        id: 'sign-list-envelopes-pending',
        name: 'Envelopes Pendentes de Assinatura',
        description: 'Lista envelopes aguardando assinatura - ideal para notificações WhatsApp',
        category: 'sign',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listEnvelopes',
        apiParams: {
          status: ['PENDING'],
          offset: 0,
          limit: 100,
        },
        responseDataPath: 'contents',
        availableFields: [
          'id', 'name', 'status', 'createdBy', 'createdDate', 'expirationDate',
          'signers[].name', 'signers[].email', 'signers[].phoneNumber', 'signers[].status',
          'documents[].id', 'documents[].originalFilename',
          'totalSigners', 'totalSignersCompleted'
        ],
      },
      {
        id: 'sign-list-envelopes-all',
        name: 'Todos os Envelopes',
        description: 'Lista todos os envelopes independente do status',
        category: 'sign',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/listEnvelopes',
        apiParams: {
          offset: 0,
          limit: 100,
        },
        responseDataPath: 'contents',
        availableFields: [
          'id', 'name', 'status', 'createdBy', 'createdDate', 'expirationDate',
          'signers[].name', 'signers[].email', 'signers[].phoneNumber', 'signers[].status',
          'documents[].id', 'documents[].originalFilename'
        ],
      },
      {
        id: 'sign-envelope-info',
        name: 'Detalhes do Envelope',
        description: 'Busca informações completas de um envelope específico',
        category: 'sign',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getEnvelopeInfo',
        apiParams: {
          envelopeId: '{{envelopeId}}',
        },
        responseDataPath: 'envelope',
        availableFields: [
          'id', 'name', 'status', 'createdBy', 'createdDate', 'instructionsToSigner',
          'signers[].name', 'signers[].email', 'signers[].phoneNumber',
          'documents[].id', 'documents[].originalFilename'
        ],
      },
      {
        id: 'sign-envelope-config',
        name: 'Configuração para Assinatura',
        description: 'Dados do envelope para um signatário específico',
        category: 'sign',
        apiModule: 'sign',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getSignatureEnvelopeConfiguration',
        apiParams: {
          envelopeId: '{{envelopeId}}',
          signerEmail: '{{signerEmail}}',
        },
        responseDataPath: '',
        availableFields: [
          'name', 'status', 'createdBy', 'createdDate', 'expirationDate',
          'instructionsToSigner', 'documents[].originalFilename'
        ],
      },
      // ===== ECM/GED - Documentos =====
      {
        id: 'ged-sign-urls',
        name: 'URLs de Assinatura',
        description: 'Retorna URLs base para requisição de token e assinatura',
        category: 'ecm_ged',
        apiModule: 'ecm_ged',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getSignUrls',
        apiParams: {},
        responseDataPath: '',
        availableFields: ['requestToken', 'sign'],
      },
      {
        id: 'ged-envelope-status',
        name: 'Status de Assinatura',
        description: 'Status detalhado dos signatários de um envelope',
        category: 'ecm_ged',
        apiModule: 'ecm_ged',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getEnvelopeSignStatus',
        apiParams: {
          envelopeId: '{{envelopeId}}',
        },
        responseDataPath: '',
        availableFields: [
          'envelopeId', 'status', 'isFinished',
          'signers[].email', 'signers[].name', 'signers[].status'
        ],
      },
      {
        id: 'ged-envelope-history',
        name: 'Histórico do Envelope',
        description: 'Timeline de eventos do envelope',
        category: 'ecm_ged',
        apiModule: 'ecm_ged',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getEnvelopeHistory',
        apiParams: {
          envelopeId: '{{envelopeId}}',
        },
        responseDataPath: 'envelopeTimeline',
        availableFields: ['action', 'date', 'userName', 'userEmail'],
      },
      {
        id: 'ged-signed-documents',
        name: 'Documentos Assinados',
        description: 'Documentos finalizados de um envelope',
        category: 'ecm_ged',
        apiModule: 'ecm_ged',
        apiMethod: 'POST',
        apiEndpoint: 'queries/getSignedDocuments',
        apiParams: {
          hashEnvelope: '{{hashEnvelope}}',
        },
        responseDataPath: 'documents',
        availableFields: ['title', 'url'],
      },
    ];

    return success(presets);
  });

  // ========================================
  // GET /datasources/modules - Lista módulos disponíveis com defaults
  // ========================================
  app.get('/modules', async () => {
    const modules = [
      {
        id: 'sign',
        name: 'Sign (Assinaturas)',
        description: 'APIs de assinatura eletrônica e digital',
        defaultEndpoint: 'queries/listEnvelopes',
        defaultMethod: 'POST',
        defaultParams: {
          status: ['PENDING'],
          offset: 0,
          limit: 100,
        },
        defaultResponsePath: 'contents',
        endpoints: [
          { path: 'queries/listEnvelopes', name: 'Listar Envelopes', method: 'POST' },
          { path: 'queries/getEnvelopeInfo', name: 'Info do Envelope', method: 'POST' },
          { path: 'queries/getSignatureEnvelopeConfiguration', name: 'Config para Assinatura', method: 'POST' },
          { path: 'queries/countListEnvelopes', name: 'Contar Envelopes', method: 'POST' },
          { path: 'actions/resendRequestSign', name: 'Reenviar Solicitação', method: 'POST' },
        ],
      },
      {
        id: 'ecm_ged',
        name: 'ECM/GED (Documentos)',
        description: 'Gestão eletrônica de documentos',
        defaultEndpoint: 'queries/getSignUrls',
        defaultMethod: 'POST',
        defaultParams: {},
        defaultResponsePath: '',
        endpoints: [
          { path: 'queries/getSignUrls', name: 'URLs de Assinatura', method: 'POST' },
          { path: 'queries/getEnvelopeSignStatus', name: 'Status do Envelope', method: 'POST' },
          { path: 'queries/getEnvelopeHistory', name: 'Histórico', method: 'POST' },
          { path: 'queries/getSignedDocuments', name: 'Docs Assinados', method: 'POST' },
          { path: 'queries/getEnvelopeSignature', name: 'Dados da Assinatura', method: 'POST' },
        ],
      },
      {
        id: 'hcm',
        name: 'HCM (Recursos Humanos)',
        description: 'APIs de gestão de pessoas',
        defaultEndpoint: 'queries/listEmployees',
        defaultMethod: 'POST',
        defaultParams: {
          offset: 0,
          limit: 100,
        },
        defaultResponsePath: 'contents',
        endpoints: [
          { path: 'queries/listEmployees', name: 'Listar Funcionários', method: 'POST' },
          { path: 'queries/getEmployee', name: 'Dados do Funcionário', method: 'POST' },
        ],
      },
    ];

    return success(modules);
  });
}
