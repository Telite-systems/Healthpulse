// ============================================
// Role-Based Permissions System
// Granular access control for all features
// ============================================

export type Role = 'Admin' | 'Doctor' | 'Staff';

export interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermissions {
  dashboard: Permission;
  patients: Permission;
  doctors: Permission;
  staff: Permission;
  departments: Permission;
  appointments: Permission;
  visits: Permission;
  billing: Permission;
  prescriptions: Permission;
  reports: Permission;
  settings: Permission;
  telemedicine: Permission;
  chatbot: Permission;
}

const PERMISSIONS: Record<Role, RolePermissions> = {
  Admin: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    patients: { view: true, create: true, edit: true, delete: true },
    doctors: { view: true, create: true, edit: true, delete: true },
    staff: { view: true, create: true, edit: true, delete: true },
    departments: { view: true, create: true, edit: true, delete: true },
    appointments: { view: true, create: true, edit: true, delete: true },
    visits: { view: true, create: true, edit: true, delete: false },
    billing: { view: true, create: true, edit: true, delete: true },
    prescriptions: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: false, edit: false, delete: false },
    settings: { view: true, create: true, edit: true, delete: true },
    telemedicine: { view: true, create: true, edit: true, delete: false },
    chatbot: { view: true, create: true, edit: true, delete: false },
  },
  Doctor: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    patients: { view: true, create: true, edit: true, delete: false },
    doctors: { view: true, create: false, edit: false, delete: false },
    staff: { view: true, create: false, edit: false, delete: false },
    departments: { view: true, create: false, edit: false, delete: false },
    appointments: { view: true, create: true, edit: true, delete: false },
    visits: { view: true, create: true, edit: true, delete: false },
    billing: { view: true, create: false, edit: false, delete: false },
    prescriptions: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    telemedicine: { view: true, create: true, edit: true, delete: false },
    chatbot: { view: true, create: true, edit: false, delete: false },
  },
  Staff: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    patients: { view: true, create: true, edit: true, delete: false },
    doctors: { view: true, create: false, edit: false, delete: false },
    staff: { view: true, create: false, edit: false, delete: false },
    departments: { view: true, create: false, edit: false, delete: false },
    appointments: { view: true, create: true, edit: true, delete: false },
    visits: { view: true, create: false, edit: false, delete: false },
    billing: { view: true, create: true, edit: false, delete: false },
    prescriptions: { view: true, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: true, create: false, edit: true, delete: false },
    telemedicine: { view: false, create: false, edit: false, delete: false },
    chatbot: { view: true, create: true, edit: false, delete: false },
  },
};

export function getPermissions(role: Role): RolePermissions {
  return PERMISSIONS[role] || PERMISSIONS.Staff;
}

export function hasPermission(role: Role, resource: keyof RolePermissions, action: keyof Permission): boolean {
  const perms = PERMISSIONS[role];
  if (!perms) return false;
  return perms[resource]?.[action] ?? false;
}

export function getRoleBadgeColor(role: Role): string {
  switch (role) {
    case 'Admin': return '#0ea5e9';
    case 'Doctor': return '#8b5cf6';
    case 'Staff': return '#10b981';
    default: return '#64748b';
  }
}
