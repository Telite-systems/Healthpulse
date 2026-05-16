// ============================================
// Database Initializer
// Now triggers fetching from the real backend API.
// The backend seeds its own data on startup,
// so this just primes the local cache.
// ============================================

import { db } from '../services/realtimeDb';
import { mockDoctors, mockDepartments, mockAppointments, mockPrescriptions, mockVisits, mockPatients, mockStaff, mockBilling, mockNotifications } from '../data/mockData';

export function initializeDatabase(): void {
  // These calls will fetch from the backend API.
  // The mock data arrays are passed as fallback for when the backend is unreachable.
  db.initCollection('patients', mockPatients);
  db.initCollection('doctors', mockDoctors);
  db.initCollection('staff', mockStaff);
  db.initCollection('departments', mockDepartments);
  db.initCollection('appointments', mockAppointments);
  db.initCollection('visits', mockVisits);
  db.initCollection('billing', mockBilling);
  db.initCollection('prescriptions', mockPrescriptions);
  db.initCollection('users', []);
  db.initCollection('notifications', mockNotifications);
}

