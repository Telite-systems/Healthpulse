// ============================================
// Database Initializer
// Now triggers fetching from the real backend API.
// The backend seeds its own data on startup,
// so this just primes the local cache.
// ============================================

import { db } from '../services/realtimeDb';

export function initializeDatabase(): void {
  // These calls will fetch from the backend API instead of using localStorage.
  // The mock data arrays are passed but ignored — real data comes from MongoDB.
  const collections = [
    'patients', 'doctors', 'staff', 'departments',
    'appointments', 'visits', 'billing', 'prescriptions',
    'users', 'notifications',
  ];

  collections.forEach(name => {
    db.initCollection(name, []);
  });
}
