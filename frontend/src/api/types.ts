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
