// ============================================
// Role-Based Security System
// Covers Admin, Doctor, Staff, Patient
// with feature-level + data-level permissions
// ============================================

export type Role = 'Admin' | 'Doctor' | 'Staff' | 'Patient' | 'Vendor';

export interface Permission {
  view:   boolean;
  create: boolean;
  edit:   boolean;
  delete: boolean;
}

export type Resource =
  | 'dashboard' | 'patients' | 'doctors' | 'staff' | 'departments'
  | 'appointments' | 'visits' | 'billing' | 'prescriptions'
  | 'reports' | 'settings' | 'telemedicine' | 'chatbot' | 'helpCenter'
  | 'ownRecords' | 'bookAppointment' | 'notifications' | 'medicineOrders' | 'inventory';

export type RolePermissions = Record<Resource, Permission>;

const FULL:  Permission = { view: true,  create: true,  edit: true,  delete: true  };
const READ:  Permission = { view: true,  create: false, edit: false, delete: false };
const WRITE: Permission = { view: true,  create: true,  edit: true,  delete: false };
const NONE:  Permission = { view: false, create: false, edit: false, delete: false };

const PERMISSIONS: Record<Role, RolePermissions> = {
  Admin: {
    dashboard:       FULL,
    patients:        FULL,
    doctors:         FULL,
    staff:           FULL,
    departments:     FULL,
    appointments:    FULL,
    visits:          WRITE,
    billing:         FULL,
    prescriptions:   FULL,
    reports:         READ,
    settings:        FULL,
    telemedicine:    WRITE,
    chatbot:         WRITE,
    helpCenter:      FULL,
    ownRecords:      READ,
    bookAppointment: FULL,
    notifications:   READ,
    medicineOrders:  FULL,
    inventory:       FULL,
  },
  Doctor: {
    dashboard:       READ,
    patients:        WRITE,
    doctors:         READ,
    staff:           READ,
    departments:     READ,
    appointments:    WRITE,
    visits:          WRITE,
    billing:         READ,
    prescriptions:   WRITE,
    reports:         READ,
    settings:        { view: true, create: false, edit: true, delete: false },
    telemedicine:    WRITE,
    chatbot:         WRITE,
    helpCenter:      READ,
    ownRecords:      READ,
    bookAppointment: { view: true, create: true, edit: false, delete: false },
    notifications:   READ,
    medicineOrders:  READ,
    inventory:       NONE,
  },
  Staff: {
    dashboard:       READ,
    patients:        WRITE,
    doctors:         READ,
    staff:           READ,
    departments:     READ,
    appointments:    WRITE,
    visits:          READ,
    billing:         { view: true, create: true, edit: false, delete: false },
    prescriptions:   READ,
    reports:         NONE,
    settings:        { view: true, create: false, edit: true, delete: false },
    telemedicine:    NONE,
    chatbot:         WRITE,
    helpCenter:      READ,
    ownRecords:      NONE,
    bookAppointment: NONE,
    notifications:   READ,
    medicineOrders:  READ,
    inventory:       NONE,
  },
  Patient: {
    dashboard:       READ,
    patients:        NONE,
    doctors:         READ,
    staff:           NONE,
    departments:     NONE,
    appointments:    NONE,
    visits:          NONE,
    billing:         READ,
    prescriptions:   READ,
    reports:         NONE,
    settings:        { view: true, create: false, edit: true, delete: false },
    telemedicine:    { view: true, create: true, edit: false, delete: false },
    chatbot:         WRITE,
    helpCenter:      READ,
    ownRecords:      READ,
    bookAppointment: { view: true, create: true, edit: false, delete: false },
    notifications:   READ,
    medicineOrders:  WRITE,
    inventory:       NONE,
  },
  Vendor: {
    dashboard:       READ,
    patients:        NONE,
    doctors:         NONE,
    staff:           NONE,
    departments:     NONE,
    appointments:    NONE,
    visits:          NONE,
    billing:         NONE,
    prescriptions:   READ,
    reports:         NONE,
    settings:        { view: true, create: false, edit: true, delete: false },
    telemedicine:    NONE,
    chatbot:         WRITE,
    helpCenter:      READ,
    ownRecords:      NONE,
    bookAppointment: NONE,
    notifications:   READ,
    medicineOrders:  WRITE,
    inventory:       FULL,
  },
};

export function getPermissions(role: Role): RolePermissions {
  return PERMISSIONS[role] ?? PERMISSIONS.Staff;
}

export function hasPermission(role: Role, resource: Resource, action: keyof Permission): boolean {
  return PERMISSIONS[role]?.[resource]?.[action] ?? false;
}

/** Returns list of routes this role can access */
export function getAllowedRoutes(role: Role): string[] {
  const base = ['/dashboard', '/dashboard/chatbot', '/dashboard/settings', '/dashboard/telemedicine', '/dashboard/help-center'];

  if (role === 'Admin' || role === 'Staff')
    return [...base, '/dashboard/master-data', '/dashboard/transaction-data', '/dashboard/reports'];

  if (role === 'Doctor')
    return [...base, '/dashboard/reports'];

  if (role === 'Patient')
    return [...base];

  if (role === 'Vendor')
    return [...base, '/dashboard/inventory', '/dashboard/orders'];

  return base;
}

/** Returns formatted role display with color token */
export function getRoleMeta(role: Role): { label: string; color: string; bg: string; icon: string } {
  switch (role) {
    case 'Admin':   return { label: 'System Admin',    color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🛡️' };
    case 'Doctor':  return { label: 'Medical Doctor',  color: '#0891b2', bg: 'rgba(8,145,178,0.12)',   icon: '👨‍⚕️' };
    case 'Patient': return { label: 'Patient Portal',  color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🏥' };
    case 'Staff':   return { label: 'Hospital Staff',  color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: '👩‍💼' };
    case 'Vendor':  return { label: 'Pharmacy Vendor', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: '💊' };
    default:        return { label: role,              color: '#64748b', bg: 'rgba(100,116,139,0.1)', icon: '👤' };
  }
}

/** Compatibility shim */
export function getRoleBadgeColor(role: Role): string {
  return getRoleMeta(role).color;
}

/** Check if a user can access a specific data record (data-level security) */
export function canAccessRecord(
  role: Role, userId: string,
  record: { patientId?: string; doctorId?: string; ownerId?: string }
): boolean {
  if (role === 'Admin') return true;
  if (role === 'Doctor') return true;           // can see all assigned patients
  if (role === 'Patient') {
    return (
      record.patientId === userId ||
      record.ownerId   === userId
    );
  }
  if (role === 'Staff') return true;            // staff manages records
  return false;
}

/** Audit action categories for logging */
export type AuditAction =
  | 'LOGIN' | 'LOGOUT'
  | 'VIEW_RECORD' | 'CREATE_RECORD' | 'EDIT_RECORD' | 'DELETE_RECORD'
  | 'BOOK_APPOINTMENT' | 'CANCEL_APPOINTMENT' | 'APPROVE_APPOINTMENT'
  | 'WRITE_PRESCRIPTION' | 'VIEW_PRESCRIPTION'
  | 'START_VIDEO_CALL' | 'END_VIDEO_CALL'
  | 'SEND_CHAT' | 'ACCESS_DENIED';

export interface AuditLog {
  id: string;
  userId: string;
  role: Role;
  action: AuditAction;
  resource: string;
  metadata?: Record<string, any>;
  timestamp: number;
  ip?: string;
}

class SecurityAuditLogger {
  private logs: AuditLog[] = [];

  log(entry: Omit<AuditLog, 'id' | 'timestamp'>): void {
    this.logs.push({ ...entry, id: `audit_${Date.now()}`, timestamp: Date.now() });
    if (this.logs.length > 500) this.logs.shift();
    // In production: ship to backend audit API
  }

  getLogs(limit = 100): AuditLog[] {
    return [...this.logs].reverse().slice(0, limit);
  }

  filterByUser(userId: string): AuditLog[] {
    return this.logs.filter(l => l.userId === userId);
  }

  filterByAction(action: AuditAction): AuditLog[] {
    return this.logs.filter(l => l.action === action);
  }
}

export const auditLogger = new SecurityAuditLogger();
