export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeniorCredentials {
  id: string;
  tenantId: string;
  baseUrl: string;
  authToken: string;
  demoMode: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export interface OutboxMessage {
  id: string;
  tenantId: string;
  ruleId: string;
  to: string;
  text: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  providerType: 'MOCK_WHATSAPP' | 'META_WHATSAPP';
  meta: Record<string, unknown>;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  rule?: Rule;
}

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

export interface Product {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TenantProduct {
  id: string;
  tenantId: string;
  productId: string;
  isActive: boolean;
  expiresAt: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  tenant?: Tenant;
  product?: Product;
}

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
  sent: { bg: 'bg-blue-50', text: 'text-blue-700', ring: 'ring-blue-600/20' },
  delivered: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20' },
  read: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-600/20' },
  failed: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20' },
  success: { bg: 'bg-green-50', text: 'text-green-700', ring: 'ring-green-600/20' },
  error: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-600/20' },
};

export const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  sent: 'Enviado',
  delivered: 'Entregue',
  read: 'Lido',
  failed: 'Falhou',
  success: 'Sucesso',
  error: 'Erro',
};
