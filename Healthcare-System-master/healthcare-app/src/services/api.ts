// ============================================
// Backend API Client
// Real HTTP client connecting to FastAPI backend
// at http://localhost:8000
// ============================================

const API_BASE = 'http://localhost:8000';

export interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: number;
  requestId: string;
}

export interface ApiError {
  status: number;
  message: string;
  code: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

class ApiService {
  private requestLog: { endpoint: string; method: string; timestamp: number; duration: number; status: number }[] = [];

  // ========= Core HTTP Methods =========

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const token = localStorage.getItem('hp_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async request<T>(method: string, endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const start = Date.now();
    const url = `${API_BASE}${endpoint}`;

    try {
      const options: RequestInit = {
        method,
        headers: this.getAuthHeaders(),
      };

      if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json();

      const duration = Date.now() - start;
      this.logRequest(endpoint, method, duration, response.status);

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          message: data?.detail || data?.message || 'Request failed',
          code: response.status === 404 ? 'NOT_FOUND' : response.status === 401 ? 'AUTH_FAILED' : 'ERROR',
          timestamp: Date.now(),
        };
        throw error;
      }

      return data;
    } catch (err: any) {
      // If it's already an ApiError, re-throw
      if (err?.status && err?.code) throw err;

      // Network error
      const duration = Date.now() - start;
      this.logRequest(endpoint, method, duration, 0);
      throw {
        status: 0,
        message: 'Network error — is the backend running on localhost:8000?',
        code: 'NETWORK_ERROR',
        timestamp: Date.now(),
      } as ApiError;
    }
  }

  getRequestLog() {
    return [...this.requestLog].reverse().slice(0, 30);
  }

  private logRequest(endpoint: string, method: string, duration: number, status: number): void {
    this.requestLog.push({ endpoint, method, timestamp: Date.now(), duration, status });
    if (this.requestLog.length > 100) {
      this.requestLog = this.requestLog.slice(-100);
    }
  }

  // ========= CRUD Operations =========

  async getAll<T>(collection: string, page = 1, pageSize = 50): Promise<ApiResponse<PaginatedResponse<T>>> {
    return this.request<PaginatedResponse<T>>('GET', `/api/${collection}?page=${page}&pageSize=${pageSize}`);
  }

  async getById<T extends { id: string }>(collection: string, id: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', `/api/${collection}/${id}`);
  }

  async create<T extends { id: string }>(collection: string, data: T): Promise<ApiResponse<T>> {
    return this.request<T>('POST', `/api/${collection}`, data);
  }

  async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', `/api/${collection}/${id}`, updates);
  }

  async delete(collection: string, id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request<{ deleted: boolean }>('DELETE', `/api/${collection}/${id}`);
  }

  async search<T extends Record<string, unknown>>(collection: string, query: string): Promise<ApiResponse<T[]>> {
    return this.request<T[]>('GET', `/api/${collection}/search?q=${encodeURIComponent(query)}`);
  }

  // ========= Auth Endpoints =========

  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: any; expiresAt: number }>> {
    const response = await this.request<{ token: string; user: any; expiresAt: number }>(
      'POST',
      '/api/auth/login',
      { username, password }
    );

    // Store token locally
    const { token, expiresAt } = response.data;
    localStorage.setItem('hp_auth_token', token);
    localStorage.setItem('hp_token_expires', expiresAt.toString());

    return response;
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await this.request<{ success: boolean }>('POST', '/api/auth/logout');
      return response;
    } finally {
      localStorage.removeItem('hp_auth_token');
      localStorage.removeItem('hp_token_expires');
    }
  }

  async validateToken(): Promise<ApiResponse<{ valid: boolean; user?: any }>> {
    const token = localStorage.getItem('hp_auth_token');
    const expires = localStorage.getItem('hp_token_expires');

    if (!token || !expires) {
      return {
        data: { valid: false },
        status: 200,
        message: 'No token',
        timestamp: Date.now(),
        requestId: `req_${Date.now()}`,
      };
    }

    if (Date.now() > parseInt(expires)) {
      localStorage.removeItem('hp_auth_token');
      localStorage.removeItem('hp_token_expires');
      return {
        data: { valid: false },
        status: 200,
        message: 'Token expired',
        timestamp: Date.now(),
        requestId: `req_${Date.now()}`,
      };
    }

    try {
      return await this.request<{ valid: boolean; user?: any }>('GET', '/api/auth/validate');
    } catch {
      return {
        data: { valid: false },
        status: 200,
        message: 'Token validation failed',
        timestamp: Date.now(),
        requestId: `req_${Date.now()}`,
      };
    }
  }

  getLoginHistory(): any[] {
    // This is now fetched async — kept for backward compat
    return [];
  }

  async fetchLoginHistory(): Promise<any[]> {
    try {
      const response = await this.request<any[]>('GET', '/api/auth/login-history');
      return response.data;
    } catch {
      return [];
    }
  }

  // ========= Dashboard Stats =========

  async getDashboardStats(): Promise<ApiResponse<any>> {
    return this.request<any>('GET', '/api/dashboard/stats');
  }

  async getDashboardCharts(): Promise<ApiResponse<any>> {
    return this.request<any>('GET', '/api/dashboard/charts');
  }

  // ========= Health Check =========

  async checkHealth(): Promise<{ status: string; database: string }> {
    try {
      const response = await fetch(`${API_BASE}/api/health`);
      return await response.json();
    } catch {
      return { status: 'unreachable', database: 'unknown' };
    }
  }
}

// Singleton
export const api = new ApiService();
export default api;
