import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Database, ArrowRightLeft, MessageSquare,
  BarChart3, Settings, Video, LogOut, ChevronLeft, ChevronRight, Heart,
  Users, Calendar, FileText, Pill, Bell, Stethoscope, UserCog, Shield, HelpCircle
} from 'lucide-react';

// ─── Role-based nav configurations ───────────────────────────────────────────

const adminNav = [
  { label: 'MAIN', items: [
    { to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard Overview' },
    { to: '/dashboard/master-data', icon: Database, text: 'Master Data' },
    { to: '/dashboard/transaction-data', icon: ArrowRightLeft, text: 'Transaction Data' },
  ]},
  { label: 'MANAGEMENT', items: [
    { to: '/dashboard/master-data', icon: Users, text: 'Patients Management' },
    { to: '/dashboard/master-data', icon: Stethoscope, text: 'Doctors Management' },
    { to: '/dashboard/reports', icon: BarChart3, text: 'Reports & Analytics' },
  ]},
  { label: 'TOOLS', items: [
    { to: '/dashboard/chatbot', icon: MessageSquare, text: 'Chatbot Assistant' },
    { to: '/dashboard/telemedicine', icon: Video, text: 'Telemedicine' },
    { to: '/dashboard/settings', icon: Settings, text: 'Settings' },
    { to: '/dashboard/help-center', icon: HelpCircle, text: 'Help Center' },
  ]},
];

const doctorNav = [
  { label: 'MAIN', items: [
    { to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard' },
    { to: '/dashboard/doctor/patients', icon: Users, text: 'My Patients' },
    { to: '/dashboard/doctor/appointments', icon: Calendar, text: 'Appointments' },
    { to: '/dashboard/doctor/prescriptions', icon: Pill, text: 'Prescriptions' },
  ]},
  { label: 'TOOLS', items: [
    { to: '/dashboard/chatbot', icon: MessageSquare, text: 'Chatbot Assistant' },
    { to: '/dashboard/telemedicine', icon: Video, text: 'Video Consultation' },
    { to: '/dashboard/reports', icon: BarChart3, text: 'Analytics' },
    { to: '/dashboard/settings', icon: Settings, text: 'Settings' },
    { to: '/dashboard/help-center', icon: HelpCircle, text: 'Help Center' },
  ]},
];

const patientNav = [
  { label: 'MAIN', items: [
    { to: '/dashboard', icon: LayoutDashboard, text: 'My Health' },
    { to: '/dashboard/patient/book', icon: Calendar, text: 'Book Appointment' },
    { to: '/dashboard/patient/records', icon: FileText, text: 'Medical Records' },
    { to: '/dashboard/patient/prescriptions', icon: Pill, text: 'Prescriptions' },
  ]},
  { label: 'SUPPORT', items: [
    { to: '/dashboard/chatbot', icon: MessageSquare, text: 'Chatbot Assistant' },
    { to: '/dashboard/telemedicine', icon: Video, text: 'Video Consultation' },
    { to: '/dashboard/patient/notifications', icon: Bell, text: 'Notifications' },
    { to: '/dashboard/settings', icon: Settings, text: 'Settings' },
    { to: '/dashboard/help-center', icon: HelpCircle, text: 'Help Center' },
  ]},
];

const staffNav = [
  { label: 'MAIN', items: [
    { to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard' },
    { to: '/dashboard/master-data', icon: Database, text: 'Master Data' },
    { to: '/dashboard/transaction-data', icon: ArrowRightLeft, text: 'Transaction Data' },
  ]},
  { label: 'TOOLS', items: [
    { to: '/dashboard/chatbot', icon: MessageSquare, text: 'Chatbot Assistant' },
    { to: '/dashboard/reports', icon: BarChart3, text: 'Reports' },
    { to: '/dashboard/settings', icon: Settings, text: 'Settings' },
    { to: '/dashboard/help-center', icon: HelpCircle, text: 'Help Center' },
  ]},
];

// ─── Role badge config ────────────────────────────────────────────────────────

const roleMeta: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  Admin:   { label: 'System Admin',      color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: Shield },
  Doctor:  { label: 'Medical Doctor',    color: '#0891b2', bg: 'rgba(8,145,178,0.12)',   icon: Stethoscope },
  Patient: { label: 'Patient Portal',    color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: Heart },
  Staff:   { label: 'Hospital Staff',    color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: UserCog },
};

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const role = user?.role ?? 'Admin';
  const navItems = role === 'Doctor' ? doctorNav
    : role === 'Patient' ? patientNav
    : role === 'Staff'   ? staffNav
    : adminNav;

  const meta = roleMeta[role] ?? roleMeta.Admin;
  const RoleIcon = meta.icon;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99,
        }} />
      )}

      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo"><Heart size={20} strokeWidth={2.5} /></div>
          <span className="sidebar-brand">HealthPulse</span>
          <button onClick={() => setCollapsed(!collapsed)} style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
          }}>
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div style={{ padding: '10px 16px', margin: '0 12px 8px', borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', gap: 8 }}>
            <RoleIcon size={15} color={meta.color} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{meta.label}</span>
          </div>
        )}

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map((section, si) => (
            <div className="nav-section" key={si}>
              <div className="nav-label">{section.label}</div>
              {section.items.map((item, ii) => (
                <NavLink
                  key={`${item.to}-${ii}`}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon size={20} className="nav-icon" />
                  <span className="nav-text">{item.text}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.avatar}</div>
            <div className="sidebar-user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="nav-item" style={{ width: '100%', marginTop: 8, color: 'var(--danger)' }}>
            <LogOut size={20} />
            <span className="nav-text">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
