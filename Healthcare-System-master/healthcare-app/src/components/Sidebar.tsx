import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Database, ArrowRightLeft, MessageSquare,
  BarChart3, Settings, Video, LogOut, ChevronLeft, ChevronRight, Heart
} from 'lucide-react';


const navItems = [
  { label: 'MAIN', items: [
    { to: '/dashboard', icon: LayoutDashboard, text: 'Dashboard Home' },
    { to: '/dashboard/master-data', icon: Database, text: 'Master Data' },
    { to: '/dashboard/transaction-data', icon: ArrowRightLeft, text: 'Transaction Data' },
  ]},
  { label: 'TOOLS', items: [
    { to: '/dashboard/chatbot', icon: MessageSquare, text: 'Chatbot Assistant' },
    { to: '/dashboard/telemedicine', icon: Video, text: 'Telemedicine' },
    { to: '/dashboard/reports', icon: BarChart3, text: 'Reports & Analytics' },
  ]},
  { label: 'SYSTEM', items: [
    { to: '/dashboard/settings', icon: Settings, text: 'Settings' },
  ]},
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  mobileOpen: boolean;
  setMobileOpen: (v: boolean) => void;
}

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:99
      }} />}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo"><Heart size={20} strokeWidth={2.5} /></div>
          <span className="sidebar-brand">HealthPulse</span>
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              marginLeft: 'auto', background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer', padding: 4
            }}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section, si) => (
            <div className="nav-section" key={si}>
              <div className="nav-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
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

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.avatar}</div>
            <div className="sidebar-user-info">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{ width: '100%', marginTop: 8, color: 'var(--danger)' }}
          >
            <LogOut size={20} />
            <span className="nav-text">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
