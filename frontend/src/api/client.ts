/**
 * API Client com detecção automática de ambiente
 * 
 * Prioridade de detecção:
 * 1. VITE_API_URL definida no .env
 * 2. Mesmo host do frontend com porta 4000 (para túneis)
 * 3. localhost:4000 (desenvolvimento local)
 */

function getApiUrl(): string {
  // 1. Se tem variável de ambiente, usa ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Detecta automaticamente baseado no host atual
  const { hostname, protocol } = window.location;

  // Se está em localhost, usa localhost:4000
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  // Se está em um domínio .trycloudflare.com, usa api-{domínio}
  if (hostname.endsWith('.trycloudflare.com')) {
    // getwork-portal.trycloudflare.com -> api-getwork-portal.trycloudflare.com
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      parts[0] = `api-${parts[0]}`;
      return `${protocol}//${parts.join('.')}`;
    }
  }

  // Se está em um domínio customizado, assume que a API está em api.{domínio}
  if (!hostname.includes('localhost')) {
    return `${protocol}//api.${hostname}`;
  }

  // Fallback: localhost
  return 'http://localhost:4000';
}

const API_URL = getApiUrl();

// Log para debug (apenas em desenvolvimento)
if (import.meta.env.DEV) {
  console.log('[API Client] URL detectada:', API_URL);
  console.log('[API Client] Host atual:', window.location.hostname);
}

export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  getBaseURL(): string {
    return this.baseURL;
  }

  private getToken(): string | null {
    return localStorage.getItem('token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle empty responses (204 No Content)
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        return {
          error: data.error || {
            code: `HTTP_${response.status}`,
            message: data.message || `Erro ${response.status}: ${response.statusText}`,
          },
        };
      }

      return data;
    } catch (error) {
      // Log detalhado do erro em desenvolvimento
      if (import.meta.env.DEV) {
        console.error('[API Client] Erro na requisição:', error);
        console.error('[API Client] URL:', `${this.baseURL}${endpoint}`);
      }

      return {
        error: {
          code: 'NETWORK_ERROR',
          message: 'Erro de conexão com o servidor. Verifique se a API está rodando.',
        },
      };
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Health check da API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient(API_URL);

// Exporta a URL para uso em outros lugares se necessário
export { API_URL };
