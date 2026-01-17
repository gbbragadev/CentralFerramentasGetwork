// ============================================================
// Response Utilities - Padronização de respostas da API
// ============================================================

import { FastifyReply } from 'fastify';

// Códigos de erro padronizados
export const ErrorCodes = {
  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // Resources
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',
  
  // Business
  TENANT_INACTIVE: 'TENANT_INACTIVE',
  CREDENTIALS_NOT_CONFIGURED: 'CREDENTIALS_NOT_CONFIGURED',
  RULE_DISABLED: 'RULE_DISABLED',
  INVALID_CRON: 'INVALID_CRON',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Interface de erro
export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: unknown;
}

// Interface de resposta de sucesso
export interface ApiSuccess<T = unknown> {
  data: T;
}

// Interface de resposta de lista paginada
export interface ApiPaginatedSuccess<T = unknown> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Função para criar resposta de sucesso
export function success<T>(data: T): ApiSuccess<T> {
  return { data };
}

// Função para criar resposta de lista paginada
export function paginated<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number
): ApiPaginatedSuccess<T> {
  return {
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  };
}

// Função para criar erro
export function apiError(code: ErrorCode, message: string, details?: unknown): { error: ApiError } {
  return {
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
}

// Helpers para erros comuns
export function notFound(resource: string): { error: ApiError } {
  return apiError(ErrorCodes.NOT_FOUND, `${resource} não encontrado(a)`);
}

export function alreadyExists(field: string): { error: ApiError } {
  return apiError(ErrorCodes.ALREADY_EXISTS, `${field} já existe`);
}

export function unauthorized(message = 'Não autorizado'): { error: ApiError } {
  return apiError(ErrorCodes.UNAUTHORIZED, message);
}

export function invalidCredentials(): { error: ApiError } {
  return apiError(ErrorCodes.INVALID_CREDENTIALS, 'Credenciais inválidas');
}

export function validationError(details: unknown): { error: ApiError } {
  return apiError(ErrorCodes.VALIDATION_ERROR, 'Erro de validação', details);
}

export function internalError(message = 'Erro interno do servidor'): { error: ApiError } {
  return apiError(ErrorCodes.INTERNAL_ERROR, message);
}

// Função para enviar erro com status HTTP
export function sendError(
  reply: FastifyReply,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown
) {
  return reply.status(status).send(apiError(code, message, details));
}

// Helpers para enviar erros comuns
export function send404(reply: FastifyReply, resource: string) {
  return reply.status(404).send(notFound(resource));
}

export function send400(reply: FastifyReply, code: ErrorCode, message: string, details?: unknown) {
  return sendError(reply, 400, code, message, details);
}

export function send401(reply: FastifyReply, message = 'Não autorizado') {
  return reply.status(401).send(unauthorized(message));
}

export function send409(reply: FastifyReply, message: string) {
  return sendError(reply, 409, ErrorCodes.CONFLICT, message);
}

export function send500(reply: FastifyReply, message = 'Erro interno do servidor') {
  return reply.status(500).send(internalError(message));
}
