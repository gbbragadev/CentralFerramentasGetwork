// ============================================================================
// USUÁRIOS E AUTENTICAÇÃO
// ============================================================================

export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// ============================================================================
// TENANTS (CLIENTES)
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  // Compat com versões antigas
  domain?: string;
  displayName?: string | null;
  logoUrl?: string | null;
  active: boolean;
  // Compat com versões antigas
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Relações
  seniorCredentials?: {
    id: string;
    baseUrl: string;
  } | null;
  _count?: {
    rules: number;
    schedules: number;
    outboxMessages: number;
  };
}

// ============================================================================
// PRODUTOS
// ============================================================================

export type BillingType = 'free' | 'monthly' | 'yearly' | 'per_use';

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  price: number;
  billingType: BillingType;
  billingDetails: Record<string, unknown>;
  termsUrl: string | null;
  termsVersion: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantProduct {
  id: string;
  tenantId: string;
  productId: string;
  monthlyValue: number | string;
  acquisitionDate: string | null;
  expirationDate: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  product?: Product;
}

// ============================================================================
// CREDENCIAIS SENIOR X
// ============================================================================

export interface SeniorCredentials {
  id: string;
  tenantId: string;
  
  // Dados informados pelo usuário
  seniorTenant: string;       // domínio do tenant no Senior (ex: 'empresa.com.br')
  username: string;           // usuário de integração
  // password não retorna na API por segurança
  
  // Configurações
  environment: 'production' | 'sandbox';
  baseUrl: string;
  
  // Status (obtido automaticamente)
  isActive: boolean;
  lastAuthAt: string | null;
  lastAuthError: string | null;
  tokenExpiresAt: string | null;
  
  createdAt: string;
  updatedAt: string;
}

export interface SeniorCredentialsInput {
  seniorTenant: string;
  username: string;
  password?: string;
  environment: 'production' | 'sandbox';
  baseUrl?: string;
}

export interface TestConnectionResult {
  success: boolean;
  message: string;
  tokenExpiresAt?: string;
  tokenPreview?: string;  // Primeiros caracteres do token para validação visual
}

// ============================================================================
// CONFIGURAÇÃO WHATSAPP
// ============================================================================

export interface WhatsAppConfig {
  id: string;
  tenantId: string;
  
  // Modo de operação
  isMockMode: boolean;
  
  // Credenciais Meta (quando sair do modo mock)
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  // accessToken não retorna por segurança
  
  webhookVerifyToken: string | null;
  isActive: boolean;
  
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// WHATSAPP SOURCES (FONTES DE DADOS)
// ============================================================================

export type SourceType = 'ged' | 'sign' | 'ged_folder' | 'admission' | 'custom';

export interface WhatsAppSource {
  id: string;
  tenantId: string;
  
  name: string;
  description: string | null;
  
  // Tipo de fonte
  sourceType: SourceType;
  
  // Configuração da API
  apiModule: string;          // ecm_ged, sign, hcm, etc.
  apiEndpoint: string;        // /platform/ecm_ged/queries/listEnvelopes
  apiMethod: string;          // POST, GET
  
  // Parâmetros fixos da chamada
  apiParams: Record<string, unknown>;
  
  // Filtros adicionais
  filters: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
  
  // Mapeamento de resposta
  responseDataPath: string;   // onde estão os dados na resposta
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
}

// ============================================================================
// DATA SOURCES (FONTES DE DADOS REUTILIZÁVEIS)
// ============================================================================

export interface DataSource {
  id: string;
  name: string;
  description: string | null;

  // Configuração da API
  apiModule: string;          // sign, ecm_ged, hcm, etc.
  apiMethod: 'GET' | 'POST';
  apiEndpoint: string;
  apiParams: Record<string, unknown> | null;
  apiHeaders: Record<string, string> | null;

  // Mapeamento de resposta
  responseDataPath: string | null;
  responseMapping: Record<string, unknown> | null;

  // Status
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestStatus: 'SUCCESS' | 'ERROR' | null;

  createdAt: string;
  updatedAt: string;

  // Contagem de regras usando esta fonte
  _count?: {
    rules: number;
  };
}

export interface DataSourcePreset {
  id: string;
  name: string;
  description: string;
  apiModule: string;
  apiMethod: string;
  apiEndpoint: string;
  apiParams: Record<string, unknown>;
  responseDataPath: string;
}

export interface DataSourceTestResult {
  success: boolean;
  httpStatus: number;
  duration: number;
  url: string;
  method: string;
  requestBody: Record<string, unknown>;
  response: unknown;
  extractedData: unknown;
  recordCount: number | null;
}

// ============================================================================
// MESSAGE TEMPLATES (TEMPLATES DE MENSAGEM COM PLACEHOLDERS)
// ============================================================================

export interface MessageTemplate {
  id: string;
  name: string;
  description: string | null;

  // Vínculo com fonte de dados
  dataSourceId: string | null;
  dataSource?: DataSource | null;

  // Corpo da mensagem com placeholders
  messageBody: string;

  // Configuração do destinatário
  recipientField: string;
  recipientNameField: string | null;

  // Configuração do link de assinatura
  signUrlEnabled: boolean;
  signUrlBaseField: string | null;
  signUrlTemplate: string | null;

  // Iteração sobre array
  iterateOverField: string | null;
  filterExpression: string | null;

  // Status
  isActive: boolean;

  createdAt: string;
  updatedAt: string;

  // Contagem de regras usando este template
  _count?: {
    rules: number;
  };

  // Placeholders extraídos (retornado em GET /:id)
  placeholders?: string[];
}

export interface MessageTemplatePreview {
  template: string;
  rendered: string;
  placeholders: string[];
  sampleData: Record<string, unknown>;
  totalRecords?: number;
  recipients?: Array<{
    index: number;
    phone: string | null;
    name: string | null;
    message: string;
  }>;
}

// ============================================================================
// WHATSAPP TEMPLATES (MODELOS DE MENSAGEM) - LEGACY
// ============================================================================

export type TemplateType = 'meta_template' | 'custom_text' | 'senior_notification';

export interface WhatsAppTemplate {
  id: string;
  tenantId: string;
  
  name: string;
  displayName: string | null;
  
  // Tipo de template
  templateType: TemplateType;
  
  // Se template_type = 'meta_template'
  metaTemplateName: string | null;
  metaTemplateLanguage: string;
  
  // Se template_type = 'custom_text' ou 'senior_notification'
  messageBody: string | null;
  
  // Mapeamento de campos
  fieldMapping: Record<string, string>;
  
  // Se for pegar notificação existente do Senior X
  seniorNotificationEndpoint: string | null;
  
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
}

// ============================================================================
// WHATSAPP JOBS (CONFIGURAÇÃO DE EXECUÇÃO)
// ============================================================================

export interface ExecutionWindow {
  startTime: string;          // "08:00"
  endTime: string;            // "18:00"
  daysOfWeek: number[];       // [1, 2, 3, 4, 5] = seg-sex
}

export interface RecipientConfig {
  phoneField: string;         // campo com telefone
  nameField?: string;         // campo com nome (opcional)
  emailField?: string;        // para lookup se não tiver phone
  formatPhone: boolean;
  defaultCountryCode: string;
}

export interface ExecutionConfig {
  maxMessagesPerRun: number;
  delayBetweenMessages: number;
  idempotencyField: string;
  idempotencyTTLHours: number;
}

export interface WhatsAppJob {
  id: string;
  tenantId: string;
  
  name: string;
  description: string | null;
  
  // Vínculo com fonte e template
  sourceId: string;
  templateId: string;
  
  // Agendamento
  cronExpression: string;
  timezone: string;
  
  // Janela de execução (opcional)
  executionWindow: ExecutionWindow | null;
  
  // Configuração de destinatário
  recipientConfig: RecipientConfig;
  
  // Configuração de execução
  executionConfig: ExecutionConfig;
  
  // Status
  isActive: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  nextRunAt: string | null;
  
  // Estatísticas
  totalRuns: number;
  totalMessagesSent: number;
  
  createdAt: string;
  updatedAt: string;
  
  tenant?: Tenant;
  source?: WhatsAppSource;
  template?: WhatsAppTemplate;
}

// ============================================================================
// OUTBOX MESSAGES (MENSAGENS)
// ============================================================================

export type MessageStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed';

export interface OutboxMessage {
  id: string;
  tenantId: string;
  jobId: string | null;
  
  // Destinatário
  recipientPhone: string;
  recipientName: string | null;
  
  // Conteúdo
  messageContent: string | null;
  templateName: string | null;
  templateParams: unknown[];
  
  // Link para documento no Senior X
  seniorDocumentId: string | null;
  seniorDocumentLink: string | null;
  seniorEnvelopeId: string | null;
  
  // Status
  status: MessageStatus;
  provider: 'mock' | 'meta';
  
  // IDs externos
  externalMessageId: string | null;
  
  // Timestamps
  queuedAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedAt: string | null;
  
  // Erro
  errorCode: string | null;
  errorMessage: string | null;
  
  idempotencyKey: string | null;
  
  createdAt: string;
  updatedAt: string;
  
  tenant?: Tenant;
  job?: WhatsAppJob;
}

// ============================================================================
// JOB EXECUTIONS (HISTÓRICO DE EXECUÇÕES)
// ============================================================================

export interface JobExecution {
  id: string;
  tenantId: string;
  jobId: string;
  
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  
  // Estatísticas
  recordsFound: number;
  messagesCreated: number;
  messagesSent: number;
  messagesFailed: number;
  messagesSkipped: number;
  
  errorMessage: string | null;
  
  createdAt: string;
  
  job?: WhatsAppJob;
}

// ============================================================================
// LOGS (LEGACY - para compatibilidade)
// ============================================================================

export interface Log {
  id: string;
  tenantId: string;
  ruleId: string;
  status: 'success' | 'error';
  attempts: number;
  error: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
  tenant?: Tenant;
  rule?: Rule;
}

// ============================================================================
// RULES (LEGACY - para compatibilidade)
// ============================================================================

export interface Rule {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  providerType: 'MOCK_WHATSAPP' | 'META_WHATSAPP';
  pollStrategy: 'POLL_ENDPOINT' | 'DEMO_FAKE';
  seniorEndpointPath: string;
  messageTemplate: string;
  recipientStrategy: string;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
}

// ============================================================================
// SCHEDULES (LEGACY - para compatibilidade)
// ============================================================================

export interface Schedule {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  cron: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string | null;
  
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  
  createdAt: string;
  
  user?: User;
}

// ============================================================================
// PAGINAÇÃO E UTILITÁRIOS
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Status colors for badges
export const statusColors: Record<string, { bg: string; text: string; ring: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', ring: 'ring-yellow-600/20' },
  queued: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20' },
  sent: { bg: 'bg-cyan-50', text: 'text-cyan-700', ring: 'ring-cyan-600/20' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20' },
  read: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20' },
  success: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20' },
  error: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20' },
  running: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20' },
  completed: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20' },
};

export const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  queued: 'Na fila',
  sent: 'Enviado',
  delivered: 'Entregue',
  read: 'Lido',
  failed: 'Falhou',
  success: 'Sucesso',
  error: 'Erro',
  running: 'Executando',
  completed: 'Concluído',
};

// Source type labels
export const sourceTypeLabels: Record<SourceType, string> = {
  ged: 'GED - Gestão de Documentos',
  sign: 'Sign - Assinaturas',
  ged_folder: 'Pasta do GED',
  admission: 'Admissão Digital',
  custom: 'Personalizado',
};

// Template type labels
export const templateTypeLabels: Record<TemplateType, string> = {
  meta_template: 'Template Meta (aprovado)',
  custom_text: 'Texto Personalizado',
  senior_notification: 'Notificação Senior X',
};

// Billing type labels
export const billingTypeLabels: Record<BillingType, string> = {
  free: 'Gratuito',
  monthly: 'Mensal',
  yearly: 'Anual',
  per_use: 'Por uso',
};
