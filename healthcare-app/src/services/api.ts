// ============================================
// Backend API Client
// Real HTTP client connecting to FastAPI backend
// Uses relative URLs — proxied by Vite (dev) or nginx (Docker)
// ============================================

import { 
  mockPatients, 
  mockDoctors, 
  mockStaff, 
  mockDepartments, 
  mockAppointments, 
  mockVisits, 
  mockBilling, 
  mockPrescriptions, 
  mockNotifications 
} from '../data/mockData';

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

  private isMock(): boolean {
    return !!localStorage.getItem('hp_mock_user');
  }

  private getCollectionMockData(collection: string): any[] {
    const key = `hp_mock_${collection}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }

    // Default static data if not in localStorage
    let defaults: any[] = [];
    switch (collection) {
      case 'patients':
        defaults = mockPatients;
        break;
      case 'doctors':
        defaults = mockDoctors;
        break;
      case 'staff':
        defaults = mockStaff;
        break;
      case 'departments':
        defaults = mockDepartments;
        break;
      case 'appointments':
        defaults = mockAppointments;
        break;
      case 'visits':
        defaults = mockVisits;
        break;
      case 'billing':
        defaults = mockBilling;
        break;
      case 'prescriptions':
        defaults = mockPrescriptions;
        break;
      case 'notifications':
        defaults = mockNotifications;
        break;
      case 'vendors':
        defaults = [
          { id: 'V001', name: 'Metro Pharmacy', username: 'vendor', email: 'metro.pharmacy@healthpulse.com', contact: '+91-9988776655', address: 'Block C, Metro Plaza, New Delhi', rating: 4.8, distance: '1.2 km', deliveryTime: '15-25 min', status: 'Active' },
          { id: 'V002', name: 'City Care Chemists', username: 'citycare', email: 'citycare@healthpulse.com', contact: '+91-9988776644', address: 'Shop 12, City Market, New Delhi', rating: 4.5, distance: '2.4 km', deliveryTime: '20-30 min', status: 'Active' },
          { id: 'V003', name: 'Apollo Pharmacy Express', username: 'apollo', email: 'apollo.express@healthpulse.com', contact: '+91-9988776633', address: '15 Ring Road, New Delhi', rating: 4.9, distance: '0.8 km', deliveryTime: '10-15 min', status: 'Active' },
        ];
        break;
      case 'inventory':
        defaults = [
          { id: 'I001', vendorId: 'V001', medicineName: 'Amlodipine 5mg', sku: 'AML-005', quantity: 150, expiryDate: '2027-12-31', price: 8.50, manufacturer: 'Sun Pharma', category: 'Cardiovascular', description: 'Used to treat high blood pressure and chest pain (angina).', dosageInfo: 'Take 1 tablet daily or as directed by physician.', isPrescriptionRequired: true },
          { id: 'I002', vendorId: 'V001', medicineName: 'Aspirin 75mg', sku: 'ASP-075', quantity: 200, expiryDate: '2027-06-30', price: 4.20, manufacturer: 'Bayer', category: 'Analgesic', description: 'Antiplatelet medicine used to prevent blood clots.', dosageInfo: 'Take 1 tablet daily after main meal.', isPrescriptionRequired: false },
          { id: 'I003', vendorId: 'V001', medicineName: 'Rosuvastatin 10mg', sku: 'ROS-010', quantity: 120, expiryDate: '2027-09-30', price: 14.50, manufacturer: 'Cipla', category: 'Cardiovascular', description: 'Statin medication used to lower bad cholesterol.', dosageInfo: 'Take 1 tablet at night.', isPrescriptionRequired: true },
          { id: 'I004', vendorId: 'V001', medicineName: 'Levothyroxine 50mcg', sku: 'LEV-050', quantity: 15, expiryDate: '2026-08-31', price: 9.00, manufacturer: 'Abbott', category: 'Thyroid', description: 'Hormone replacement for underactive thyroid glands.', dosageInfo: 'Take 1 tablet on an empty stomach in the morning.', isPrescriptionRequired: true },
          { id: 'I005', vendorId: 'V001', medicineName: 'Vitamin D3 60K IU', sku: 'VIT-D3', quantity: 80, expiryDate: '2026-07-31', price: 25.00, manufacturer: 'Cadila', category: 'Vitamins', description: 'Essential vitamin for calcium absorption and bone health.', dosageInfo: 'Take 1 capsule weekly with milk.', isPrescriptionRequired: false },
          { id: 'I006', vendorId: 'V002', medicineName: 'Amlodipine 5mg', sku: 'AML-005', quantity: 100, expiryDate: '2027-12-31', price: 9.00, manufacturer: 'Sun Pharma', category: 'Cardiovascular', description: 'Used to treat high blood pressure and chest pain (angina).', dosageInfo: 'Take 1 tablet daily or as directed by physician.', isPrescriptionRequired: true },
          { id: 'I007', vendorId: 'V002', medicineName: 'Aspirin 75mg', sku: 'ASP-075', quantity: 180, expiryDate: '2027-06-30', price: 4.50, manufacturer: 'Bayer', category: 'Analgesic', description: 'Antiplatelet medicine used to prevent blood clots.', dosageInfo: 'Take 1 tablet daily after main meal.', isPrescriptionRequired: false },
          { id: 'I008', vendorId: 'V002', medicineName: 'Metformin 500mg', sku: 'MET-500', quantity: 300, expiryDate: '2028-03-31', price: 6.00, manufacturer: 'Cipla', category: 'Diabetes', description: 'Oral diabetes medicine that helps control blood sugar levels.', dosageInfo: 'Take 1 tablet twice daily with meals.', isPrescriptionRequired: true },
          { id: 'I009', vendorId: 'V002', medicineName: 'Glimepiride 2mg', sku: 'GLI-002', quantity: 90, expiryDate: '2027-11-30', price: 11.20, manufacturer: 'Sandoz', category: 'Diabetes', description: 'Stimulates insulin release to manage type 2 diabetes.', dosageInfo: 'Take 1 tablet with breakfast.', isPrescriptionRequired: true },
          { id: 'I010', vendorId: 'V003', medicineName: 'Amlodipine 5mg', sku: 'AML-005', quantity: 250, expiryDate: '2027-12-31', price: 8.00, manufacturer: 'Sun Pharma', category: 'Cardiovascular', description: 'Used to treat high blood pressure and chest pain (angina).', dosageInfo: 'Take 1 tablet daily or as directed by physician.', isPrescriptionRequired: true },
          { id: 'I011', vendorId: 'V003', medicineName: 'Vitamin D3 60K IU', sku: 'VIT-D3', quantity: 150, expiryDate: '2026-07-31', price: 24.00, manufacturer: 'Cadila', category: 'Vitamins', description: 'Essential vitamin for calcium absorption and bone health.', dosageInfo: 'Take 1 capsule weekly with milk.', isPrescriptionRequired: false },
          { id: 'I012', vendorId: 'V003', medicineName: 'Diclofenac 75mg', sku: 'DIC-075', quantity: 200, expiryDate: '2027-10-31', price: 7.50, manufacturer: 'Novartis', category: 'Analgesic', description: 'NSAID pain reliever for joint pain and swelling.', dosageInfo: 'Take 1 tablet after food as needed.', isPrescriptionRequired: false },
        ];
        break;
      case 'orders':
        defaults = [];
        break;
    }

    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }

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
    const getMockData = () => {
      const mockList = this.getCollectionMockData(collection);
      return {
        data: mockList as T[],
        total: mockList.length,
        page,
        pageSize,
        totalPages: Math.ceil(mockList.length / pageSize) || 1
      };
    };

    if (this.isMock()) {
      return { data: getMockData(), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<PaginatedResponse<T>>('GET', `/api/${collection}?page=${page}&pageSize=${pageSize}`);
  }

  async getById<T extends { id: string }>(collection: string, id: string): Promise<ApiResponse<T>> {
    const getMockData = () => {
      const mockList = this.getCollectionMockData(collection);
      const found = mockList.find((item: any) => (item.id || item._id) === id);
      if (found) return found as T;
      throw { status: 404, message: `${collection} item not found offline` };
    };

    if (this.isMock()) {
      return { data: getMockData(), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<T>('GET', `/api/${collection}/${id}`);
  }

  async create<T extends { id: string }>(collection: string, data: T): Promise<ApiResponse<T>> {
    const runMockLogic = () => {
      const list = this.getCollectionMockData(collection);
      const prefix = {
        patients: 'P',
        doctors: 'D',
        staff: 'S',
        departments: 'DEP',
        appointments: 'APT',
        visits: 'V',
        billing: 'B',
        prescriptions: 'RX',
        notifications: 'N',
        vendors: 'VND',
        inventory: 'INV',
        orders: 'ORD'
      }[collection] || 'DOC';
      const newItem = {
        ...data,
        id: data.id || `${prefix}${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      };
      list.push(newItem);
      localStorage.setItem(`hp_mock_${collection}`, JSON.stringify(list));
      return newItem;
    };

    if (this.isMock()) {
      return { data: runMockLogic() as unknown as T, status: 201, message: 'Offline Created', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<T>('POST', `/api/${collection}`, data);
  }

  async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<ApiResponse<T>> {
    const runMockLogic = () => {
      const list = this.getCollectionMockData(collection);
      const idx = list.findIndex((item: any) => (item.id || item._id) === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updates };
        localStorage.setItem(`hp_mock_${collection}`, JSON.stringify(list));
        return list[idx];
      }
      throw { status: 404, message: `${collection} item not found offline` };
    };

    if (this.isMock()) {
      return { data: runMockLogic() as unknown as T, status: 200, message: 'Offline Updated', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<T>('PUT', `/api/${collection}/${id}`, updates);
  }

  async delete(collection: string, id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    const runMockLogic = () => {
      const list = this.getCollectionMockData(collection);
      const filtered = list.filter((item: any) => (item.id || item._id) !== id);
      localStorage.setItem(`hp_mock_${collection}`, JSON.stringify(filtered));
      return { deleted: true };
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 200, message: 'Offline Deleted', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<{ deleted: boolean }>('DELETE', `/api/${collection}/${id}`);
  }

  async search<T extends Record<string, unknown>>(collection: string, query: string): Promise<ApiResponse<T[]>> {
    return this.request<T[]>('GET', `/api/${collection}/search?q=${encodeURIComponent(query)}`);
  }

  // ========= Auth Endpoints =========

  async login(username: string, password: string): Promise<ApiResponse<{ token: string; user: any; expiresAt: number }>> {
    // ── Mock credentials table (works fully offline) ───────────────────────
    const MOCK_USERS: Record<string, { pass: string; user: any }> = {
      admin:   { pass: 'admin123',   user: { id: 'U001', username: 'admin',   name: 'Dr. Admin Singh',    role: 'Admin',   avatar: '🛡️',  department: 'Administration' } },
      // Doctor logins — each doctor has their own username (first name)
      doctor:  { pass: 'doctor123',  user: { id: 'U002', username: 'doctor',  name: 'Dr. Rajesh Kumar',   role: 'Doctor',  avatar: '👨‍⚕️', department: 'Cardiology',      specialization: 'Cardiologist' } },
      rajesh:  { pass: 'doctor123',  user: { id: 'U002', username: 'rajesh',  name: 'Dr. Rajesh Kumar',   role: 'Doctor',  avatar: '👨‍⚕️', department: 'Cardiology',      specialization: 'Cardiologist' } },
      priya:   { pass: 'doctor123',  user: { id: 'U004', username: 'priya',   name: 'Dr. Priya Sharma',   role: 'Doctor',  avatar: '👩‍⚕️', department: 'Endocrinology',   specialization: 'Endocrinology' } },
      amit:    { pass: 'doctor123',  user: { id: 'U005', username: 'amit',    name: 'Dr. Amit Singh',     role: 'Doctor',  avatar: '👨‍⚕️', department: 'Orthopedics',     specialization: 'Orthopedics' } },
      kavita:  { pass: 'doctor123',  user: { id: 'U006', username: 'kavita',  name: 'Dr. Kavita Negi',    role: 'Doctor',  avatar: '👩‍⚕️', department: 'Dermatology',     specialization: 'Dermatology' } },
      sunil:   { pass: 'doctor123',  user: { id: 'U007', username: 'sunil',   name: 'Dr. Sunil Verma',    role: 'Doctor',  avatar: '👨‍⚕️', department: 'Neurology',       specialization: 'Neurology' } },
      meena:   { pass: 'doctor123',  user: { id: 'U008', username: 'meena',   name: 'Dr. Meena Agarwal',  role: 'Doctor',  avatar: '👩‍⚕️', department: 'Pediatrics',      specialization: 'Pediatrics' } },
      rahul:   { pass: 'doctor123',  user: { id: 'U009', username: 'rahul',   name: 'Dr. Rahul Gupta',    role: 'Doctor',  avatar: '👨‍⚕️', department: 'Surgery',         specialization: 'General Surgery' } },
      anita:   { pass: 'doctor123',  user: { id: 'U010', username: 'anita',   name: 'Dr. Anita Malhotra', role: 'Doctor',  avatar: '👩‍⚕️', department: 'Gynecology',      specialization: 'Gynecology' } },
      vijay:   { pass: 'doctor123',  user: { id: 'U011', username: 'vijay',   name: 'Dr. Vijay Rao',      role: 'Doctor',  avatar: '👨‍⚕️', department: 'Radiology',       specialization: 'Radiology' } },
      ritu:    { pass: 'doctor123',  user: { id: 'U012', username: 'ritu',    name: 'Dr. Ritu Joshi',     role: 'Doctor',  avatar: '👩‍⚕️', department: 'Ophthalmology',   specialization: 'Ophthalmology' } },
      arun:    { pass: 'doctor123',  user: { id: 'U013', username: 'arun',    name: 'Dr. Arun Mishra',    role: 'Doctor',  avatar: '👨‍⚕️', department: 'Pulmonology',     specialization: 'Pulmonology' } },
      pooja:   { pass: 'doctor123',  user: { id: 'U014', username: 'pooja',   name: 'Dr. Pooja Sinha',    role: 'Doctor',  avatar: '👩‍⚕️', department: 'Psychiatry',      specialization: 'Psychiatry' } },
      staff:   { pass: 'staff123',   user: { id: 'U003', username: 'staff',   name: 'Priya Receptionist', role: 'Staff',   avatar: '👩‍💼', department: 'Reception' } },
      patient: { pass: 'patient123', user: { id: 'P001', username: 'patient', name: 'Rahul Sharma',       role: 'Patient', avatar: '👤' } },
      vendor:   { pass: 'vendor123',  user: { id: 'V001', username: 'vendor',  name: 'Metro Pharmacy',       role: 'Vendor',  avatar: '💊' } },
      citycare: { pass: 'vendor123',  user: { id: 'V002', username: 'citycare',name: 'City Care Chemists',  role: 'Vendor',  avatar: '💊' } },
      apollo:   { pass: 'vendor123',  user: { id: 'V003', username: 'apollo',  name: 'Apollo Pharmacy Express', role: 'Vendor', avatar: '💊' } },
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

  // ========= Vendor & Inventory Endpoints =========

  async getVendors(): Promise<ApiResponse<any[]>> {
    if (this.isMock()) {
      return { data: this.getCollectionMockData('vendors'), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any[]>('GET', '/api/vendors');
  }

  async getOrders(): Promise<ApiResponse<any[]>> {
    if (this.isMock()) {
      return { data: this.getCollectionMockData('orders'), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any[]>('GET', '/api/orders');
  }

  async createOrder(orderData: any): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const orders = this.getCollectionMockData('orders');
      const newOrder = {
        ...orderData,
        id: orderData.id || `ORD${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        status: 'Created',
        createdAt: new Date().toISOString(),
      };
      orders.push(newOrder);
      localStorage.setItem('hp_mock_orders', JSON.stringify(orders));
      
      // deduct quantities from local storage mock inventory
      this.deductMockInventory(newOrder);

      return newOrder;
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 201, message: 'Offline Created', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('POST', '/api/orders', orderData);
  }

  private deductMockInventory(order: any) {
    try {
      const storedInv = localStorage.getItem('hp_mock_inventory');
      if (storedInv) {
        const items = JSON.parse(storedInv);
        const medicines = order.medicines || [];
        const updated = items.map((item: any) => {
          if (item.vendorId === order.vendorId) {
            const match = medicines.find((m: any) => m.name.toLowerCase() === item.medicineName.toLowerCase());
            if (match) {
              return { ...item, quantity: Math.max(0, item.quantity - match.quantity) };
            }
          }
          return item;
        });
        localStorage.setItem('hp_mock_inventory', JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Error auto-deducting mock inventory:', e);
    }
  }

  async updateOrder(orderId: string, updates: any): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const orders = this.getCollectionMockData('orders');
      const idx = orders.findIndex((o: any) => o.id === orderId);
      if (idx !== -1) {
        orders[idx] = { ...orders[idx], ...updates };
        localStorage.setItem('hp_mock_orders', JSON.stringify(orders));
        return orders[idx];
      }
      throw { status: 404, message: 'Order not found offline' };
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 200, message: 'Offline Updated', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('PUT', `/api/orders/${orderId}`, updates);
  }

  async acceptOrder(orderId: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { status: 'Accepted', deliveryEta: '30-45 min' });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/accept`);
  }

  async rejectOrder(orderId: string, reason: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { status: 'Rejected', instructions: `Rejected: ${reason}` });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/reject`, { reason });
  }

  async dispatchOrder(orderId: string): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const orders = this.getCollectionMockData('orders');
      const order = orders.find((o: any) => o.id === orderId);
      if (order) {
        let nextStatus = 'Out for Delivery';
        const curr = order.status;
        if (curr === 'Accepted') nextStatus = 'Processing';
        else if (curr === 'Processing') nextStatus = 'Ready for Dispatch';
        else if (curr === 'Ready for Dispatch') nextStatus = 'Out for Delivery';
        return this.updateOrder(orderId, { status: nextStatus });
      }
      throw { status: 404, message: 'Order not found' };
    };

    if (this.isMock()) {
      const res = runMockLogic();
      return { data: res, status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/dispatch`);
  }

  async deliverOrder(orderId: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { status: 'Delivered', deliveryEta: 'Delivered' });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/deliver`);
  }

  async getInventory(): Promise<ApiResponse<any[]>> {
    if (this.isMock()) {
      return { data: this.getCollectionMockData('inventory'), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any[]>('GET', '/api/inventory');
  }

  async addInventoryItem(itemData: any): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const items = this.getCollectionMockData('inventory');
      const newItem = {
        ...itemData,
        id: itemData.id || `INV${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      };
      items.push(newItem);
      localStorage.setItem('hp_mock_inventory', JSON.stringify(items));
      return newItem;
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 201, message: 'Offline Created', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('POST', '/api/inventory', itemData);
  }

  async updateInventoryItem(itemId: string, updates: any): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const items = this.getCollectionMockData('inventory');
      const idx = items.findIndex((i: any) => i.id === itemId);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...updates };
        localStorage.setItem('hp_mock_inventory', JSON.stringify(items));
        return items[idx];
      }
      throw { status: 404, message: 'Inventory item not found offline' };
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 200, message: 'Offline Updated', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('PUT', `/api/inventory/${itemId}`, updates);
  }

  async deleteInventoryItem(itemId: string): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const items = this.getCollectionMockData('inventory');
      const filtered = items.filter((i: any) => i.id !== itemId);
      localStorage.setItem('hp_mock_inventory', JSON.stringify(filtered));
      return { deleted: true };
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 200, message: 'Offline Deleted', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('DELETE', `/api/inventory/${itemId}`);
  }

  async initiatePayment(orderId: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { paymentStatus: 'Processing', paymentMethod: 'Online' });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/initiate-payment`);
  }

  async verifyPayment(orderId: string): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const txId = 'TXN' + Math.random().toString(36).substring(2, 11).toUpperCase();
      const details = {
        method: 'UPI',
        upiId: 'healthpulse@axisbank',
        timestamp: new Date().toISOString(),
        gateway: 'SimulatedGateway'
      };
      
      this.updateOrder(orderId, { 
        paymentStatus: 'Paid', 
        transactionId: txId, 
        transactionDetails: details 
      });

      return {
        success: true,
        paymentStatus: 'Paid',
        transactionId: txId,
        transactionDetails: details
      };
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/verify-payment`);
  }

  async getPaymentStatus(orderId: string): Promise<ApiResponse<any>> {
    const runMockLogic = () => {
      const orders = this.getCollectionMockData('orders');
      const order = orders.find((o: any) => o.id === orderId);
      if (order) {
        return {
          orderId,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          transactionId: order.transactionId,
          transactionDetails: order.transactionDetails
        };
      }
      throw { status: 404, message: 'Order not found offline' };
    };

    if (this.isMock()) {
      return { data: runMockLogic(), status: 200, message: 'Offline Success', timestamp: Date.now(), requestId: `req_${Date.now()}` };
    }

    return await this.request<any>('GET', `/api/orders/${orderId}/payment-status`);
  }

  async paymentExpired(orderId: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { paymentStatus: 'Expired' });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/payment-expired`);
  }

  async retryPayment(orderId: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { 
        paymentStatus: 'Processing', 
        transactionId: '', 
        transactionDetails: null 
      });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/retry-payment`);
  }

  async switchToCod(orderId: string): Promise<ApiResponse<any>> {
    if (this.isMock()) {
      return this.updateOrder(orderId, { 
        paymentMethod: 'COD', 
        paymentStatus: 'Pending', 
        transactionId: '', 
        transactionDetails: null 
      });
    }

    return await this.request<any>('POST', `/api/orders/${orderId}/switch-to-cod`);
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
