// ============================================
// Local Storage Utility
// ============================================

const STORAGE_KEYS = {
  PATIENTS: 'hp_patients',
  DOCTORS: 'hp_doctors',
  STAFF: 'hp_staff',
  DEPARTMENTS: 'hp_departments',
  APPOINTMENTS: 'hp_appointments',
  VISITS: 'hp_visits',
  BILLING: 'hp_billing',
  PRESCRIPTIONS: 'hp_prescriptions',
  USER: 'hp_current_user',
  THEME: 'hp_theme',
  NOTIFICATIONS: 'hp_notifications',
};

export function getData<T>(key: string, fallback: T[]): T[] {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    return fallback;
  } catch {
    return fallback;
  }
}

export function setData<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export function getItem<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
    return fallback;
  } catch {
    return fallback;
  }
}

export function setItem<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export { STORAGE_KEYS };
