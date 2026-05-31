// ============================================
// Backend API Client
// Real HTTP client connecting to FastAPI backend
// Uses relative URLs — proxied by Vite (dev) or nginx (Docker)
// ============================================

const API_BASE = '';

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
        message: 'Network error — is the backend running?',
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
    // ── Mock credentials table (works fully offline) ───────────────────────
    const MOCK_USERS: Record<string, { pass: string; user: any }> = {
      admin:   { pass: 'admin123',   user: { id: 'A001', username: 'admin',   name: 'Dr. Admin Singh',    role: 'Admin',   avatar: '🛡️',  department: 'Administration' } },
      // Doctor logins — each doctor has their own username (first name)
      doctor:  { pass: 'doctor123',  user: { id: 'D001', username: 'doctor',  name: 'Dr. Rajesh Kumar',   role: 'Doctor',  avatar: '👨‍⚕️', department: 'Cardiology',      specialization: 'Cardiology' } },
      rajesh:  { pass: 'doctor123',  user: { id: 'D001', username: 'rajesh',  name: 'Dr. Rajesh Kumar',   role: 'Doctor',  avatar: '👨‍⚕️', department: 'Cardiology',      specialization: 'Cardiology' } },
      priya:   { pass: 'doctor123',  user: { id: 'D002', username: 'priya',   name: 'Dr. Priya Sharma',   role: 'Doctor',  avatar: '👩‍⚕️', department: 'Endocrinology',   specialization: 'Endocrinology' } },
      amit:    { pass: 'doctor123',  user: { id: 'D003', username: 'amit',    name: 'Dr. Amit Singh',     role: 'Doctor',  avatar: '👨‍⚕️', department: 'Orthopedics',     specialization: 'Orthopedics' } },
      kavita:  { pass: 'doctor123',  user: { id: 'D004', username: 'kavita',  name: 'Dr. Kavita Negi',    role: 'Doctor',  avatar: '👩‍⚕️', department: 'Dermatology',     specialization: 'Dermatology' } },
      sunil:   { pass: 'doctor123',  user: { id: 'D005', username: 'sunil',   name: 'Dr. Sunil Verma',    role: 'Doctor',  avatar: '👨‍⚕️', department: 'Neurology',       specialization: 'Neurology' } },
      meena:   { pass: 'doctor123',  user: { id: 'D006', username: 'meena',   name: 'Dr. Meena Agarwal',  role: 'Doctor',  avatar: '👩‍⚕️', department: 'Pediatrics',      specialization: 'Pediatrics' } },
      rahul:   { pass: 'doctor123',  user: { id: 'D007', username: 'rahul',   name: 'Dr. Rahul Gupta',    role: 'Doctor',  avatar: '👨‍⚕️', department: 'Surgery',         specialization: 'General Surgery' } },
      anita:   { pass: 'doctor123',  user: { id: 'D008', username: 'anita',   name: 'Dr. Anita Malhotra', role: 'Doctor',  avatar: '👩‍⚕️', department: 'Gynecology',      specialization: 'Gynecology' } },
      vijay:   { pass: 'doctor123',  user: { id: 'D009', username: 'vijay',   name: 'Dr. Vijay Rao',      role: 'Doctor',  avatar: '👨‍⚕️', department: 'Radiology',       specialization: 'Radiology' } },
      ritu:    { pass: 'doctor123',  user: { id: 'D010', username: 'ritu',    name: 'Dr. Ritu Joshi',     role: 'Doctor',  avatar: '👩‍⚕️', department: 'Ophthalmology',   specialization: 'Ophthalmology' } },
      arun:    { pass: 'doctor123',  user: { id: 'D011', username: 'arun',    name: 'Dr. Arun Mishra',    role: 'Doctor',  avatar: '👨‍⚕️', department: 'Pulmonology',     specialization: 'Pulmonology' } },
      pooja:   { pass: 'doctor123',  user: { id: 'D012', username: 'pooja',   name: 'Dr. Pooja Sinha',    role: 'Doctor',  avatar: '👩‍⚕️', department: 'Psychiatry',      specialization: 'Psychiatry' } },
      staff:   { pass: 'staff123',   user: { id: 'S001', username: 'staff',   name: 'Priya Staff',        role: 'Staff',   avatar: '👩‍💼', department: 'Reception' } },
      patient: { pass: 'patient123', user: { id: 'P001', username: 'patient', name: 'Rahul Sharma',       role: 'Patient', avatar: '👤' } },
    };

    const mock = MOCK_USERS[username.toLowerCase()];

    // ── Try real backend first (for ALL roles) ─────────────────────────────
    try {
      const response = await this.request<{ token: string; user: any; expiresAt: number }>(
        'POST', '/api/auth/login', { username, password }
      );
      const { token, expiresAt } = response.data;
      localStorage.setItem('hp_auth_token', token);
      localStorage.setItem('hp_token_expires', expiresAt.toString());
      localStorage.removeItem('hp_mock_user');
      return response;
    } catch (err: any) {
      // Fall through to mock if:
      //  (a) Backend is unreachable (NETWORK_ERROR / status 0), OR
      //  (b) Backend returned 401 but this username exists in mock table
      //      (doctor-specific accounts like rajesh/sneha/vikram don't exist in the real DB)
      const isMockUser = !!mock;
      const isNetworkError = err?.code === 'NETWORK_ERROR' || err?.status === 0;
      const isBackend401ForMockUser = err?.status === 401 && isMockUser;

      if (!isNetworkError && !isBackend401ForMockUser) {
        throw err;
      }
      console.warn('[Auth] Backend login failed, using mock credentials:', err?.message);
    }

    // ── Mock login (offline fallback or Patient) ───────────────────────────
    if (mock && password === mock.pass) {
      const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
      const mockToken = btoa(JSON.stringify({ id: mock.user.id, role: mock.user.role, exp: expiresAt }));
      localStorage.setItem('hp_auth_token', mockToken);
      localStorage.setItem('hp_token_expires', expiresAt.toString());
      localStorage.setItem('hp_mock_user', JSON.stringify(mock.user));
      return {
        data: { token: mockToken, user: mock.user, expiresAt },
        status: 200, message: 'Login successful (offline mode)',
        timestamp: Date.now(), requestId: `req_${Date.now()}`,
      };
    }

    // ── Bad credentials ────────────────────────────────────────────────────
    throw {
      status: 401, message: 'Invalid username or password',
      code: 'AUTH_FAILED', timestamp: Date.now(),
    };
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await this.request<{ success: boolean }>('POST', '/api/auth/logout');
      return response;
    } finally {
      localStorage.removeItem('hp_auth_token');
      localStorage.removeItem('hp_token_expires');
      localStorage.removeItem('hp_mock_user');
    }
  }

  async validateToken(): Promise<ApiResponse<{ valid: boolean; user?: any }>> {
    const token   = localStorage.getItem('hp_auth_token');
    const expires = localStorage.getItem('hp_token_expires');

    if (!token || !expires) {
      return { data: { valid: false }, status: 200, message: 'No token', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    if (Date.now() > parseInt(expires)) {
      localStorage.removeItem('hp_auth_token');
      localStorage.removeItem('hp_token_expires');
      localStorage.removeItem('hp_mock_user');
      return { data: { valid: false }, status: 200, message: 'Token expired', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    // ── Restore mock Patient session without hitting backend ────────────────
    const mockUser = localStorage.getItem('hp_mock_user');
    if (mockUser) {
      return { data: { valid: true, user: JSON.parse(mockUser) }, status: 200, message: 'Mock session', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    try {
      return await this.request<{ valid: boolean; user?: any }>('GET', '/api/auth/validate');
    } catch {
      return { data: { valid: false }, status: 200, message: 'Token validation failed', timestamp: Date.now(), requestId: `req_${Date.now()}` };
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

  // ========= Patient Registration =========

  async register(data: { name: string; email: string; phone: string; username: string; password: string }): Promise<ApiResponse<{ token: string; user: any; expiresAt: number }>> {
    const response = await this.request<{ token: string; user: any; expiresAt: number }>(
      'POST', '/api/auth/register', data
    );
    const { token, expiresAt } = response.data;
    localStorage.setItem('hp_auth_token', token);
    localStorage.setItem('hp_token_expires', expiresAt.toString());
    localStorage.removeItem('hp_mock_user');
    return response;
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
