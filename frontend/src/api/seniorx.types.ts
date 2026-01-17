/**
 * Tipos para integração com Senior X Platform
 * Baseado na documentação oficial e Swagger APIs
 */

// ============ AUTENTICAÇÃO ============

export interface SeniorLoginRequest {
  username: string; // formato: user@tenant
  password: string;
}

export interface SeniorLoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface SeniorUserInfo {
  data: {
    tenantDomain: string;
    tenantName?: string;
    username: string;
    email?: string;
    fullName?: string;
    locale?: string;
    timezone?: string;
  };
}

// ============ ECM/GED - DOCUMENTOS ============

export interface EnvelopeStatus {
  value: 'DRAFT' | 'PENDING' | 'SIGNED' | 'CANCELED' | 'EXPIRED' | 'REJECTED';
}

export interface EnvelopeDocument {
  id: string;
  name: string;
  type: string;
  size?: number;
  pages?: number;
  status?: string;
}

export interface SignatureEnvelope {
  envelopeId: string;
  name: string;
  status: string;
  createdBy: string;
  createdDate: string;
  expirationDate: string;
  authorEmail?: string;
  documents: EnvelopeDocument[];
  signers?: EnvelopeSigner[];
  askGeolocation?: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
  instructionsToSigner?: string;
  mandatoryView?: boolean;
  notificateAuthor?: boolean;
  digitalCertificate?: 'NONE' | 'OPTIONAL' | 'REQUIRED';
}

export interface EnvelopeSigner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: 'PENDING' | 'SIGNED' | 'REJECTED';
  signedAt?: string;
  signerType: 'INTERNAL' | 'EXTERNAL';
  signerSubType?: string;
  order?: number;
}

export interface ListEnvelopesRequest {
  offset?: number;
  limit?: number;
  envelopeName?: string;
  status: string[];
  createdDate?: string;
  orderByField?: 'name' | 'createdDate' | 'expirationDate' | 'status';
  order?: 'ASC' | 'DESC';
}

export interface ListEnvelopesResponse {
  contents: SignatureEnvelope[];
  totalElements: number;
  totalPages: number;
}

// ============ SIGN - ASSINATURAS ============

export interface GetSignedDocumentsRequest {
  hashEnvelope: string;
}

export interface GetSignedDocumentsResponse {
  envelopeId: string;
  documents: EnvelopeDocument[];
  status: string;
  authorEmail?: string;
  createdDate?: string;
  expirationDate?: string;
  digitalCertificate?: string;
}

// ============ HCM - PONTO MOBILE ============

export interface EmployeeFilter {
  activePlatformUser?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
  searchCompany?: string; // UUID da filial
  searchRegistrationNumber?: string; // Matrícula
  searchName?: string;
}

export interface EmployeesByFilterRequest {
  filter: EmployeeFilter;
  offset?: number;
  limit?: number;
}

export interface Employee {
  id: string;
  name: string;
  registrationNumber: string;
  email?: string;
  phone?: string;
  company?: {
    id: string;
    name: string;
    cnpj?: string;
  };
  department?: string;
  position?: string;
  status: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  tradeName?: string;
  address?: {
    street?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
}

// ============ CONFIGURAÇÃO DE CREDENCIAIS ============

export interface SeniorCredentialsConfig {
  baseUrl: string;
  authToken: string;
  demoMode: boolean;
  // Campos opcionais para Client ID/Secret (APIs privadas)
  clientId?: string;
  clientSecret?: string;
  // Tenant do Senior X
  seniorTenant?: string;
}

// ============ ENDPOINTS CONHECIDOS ============

export const SENIOR_ENDPOINTS = {
  // Autenticação
  LOGIN: '/platform/authentication/actions/login',
  
  // ECM/GED
  GET_SIGNED_DOCUMENTS: '/ecm_ged/queries/getSignedDocuments',
  GET_SIGNATURE_ENVELOPE_CONFIG: '/ecm_ged/queries/getSignatureEnvelopeConfiguration',
  REPORT_DOCUMENT_COUNT: '/ecm_ged/queries/getReportDocumentCountByRequester',
  
  // Sign
  LIST_ENVELOPES: '/sign/queries/listEnvelopes',
  GET_ENVELOPE_CONFIG: '/sign/queries/getSignatureEnvelopeConfiguration',
  
  // HCM Ponto Mobile
  EMPLOYEES_BY_FILTER: '/hcm/queries/employeesByFilterQuery',
  LIST_COMPANIES: '/hcm/queries/listCompanies',
} as const;

// ============ HELPERS ============

export function buildSeniorUrl(baseUrl: string, endpoint: string): string {
  // Remove trailing slash from baseUrl
  const base = baseUrl.replace(/\/$/, '');
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}/t/senior.com.br/bridge/1.0/rest${path}`;
}

export function extractTenantFromUrl(url: string): string | null {
  // Extrai tenant de URLs como: https://platform.senior.com.br/t/tenant.com.br/...
  const match = url.match(/\/t\/([^\/]+)\//);
  return match ? match[1] : null;
}

export function extractTenantFromUserInfo(userInfoJson: string): string | null {
  try {
    const obj = JSON.parse(userInfoJson);
    return obj?.data?.tenantDomain || null;
  } catch {
    return null;
  }
}
