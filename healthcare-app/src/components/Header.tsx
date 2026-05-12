import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Search, Bell, Moon, Sun, Menu, LogOut, User, Settings, Clock } from 'lucide-react';
import { api } from '../services/api';
import ConnectionStatus from './ConnectionStatus';

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout, sessionTimeRemaining } = useAuth();
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications from backend
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await api.getAll<any>('notifications', 1, 50);
        setNotifications(res.data.data || []);
      } catch {
        // keep empty
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatSessionTime = (seconds: number | null) => {
    if (!seconds) return '';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <button className="header-btn mobile-menu-btn" onClick={onMenuClick} id="menu-toggle">
          <Menu size={20} />
        </button>
        <div className="header-search">
          <Search size={16} color="var(--text-muted)" />
          <input
            placeholder="Search patients, doctors, records..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            id="global-search"
          />
          {search && (
            <kbd className="search-shortcut">ESC</kbd>
          )}
        </div>
        <ConnectionStatus />
      </div>

      <div className="header-right">
        {/* Session timer */}
        {sessionTimeRemaining && (
          <div className="session-timer" title="Session time remaining">
            <Clock size={12} />
            <span>{formatSessionTime(sessionTimeRemaining)}</span>
          </div>
        )}

        <button className="header-btn theme-toggle-btn" onClick={toggleTheme} id="theme-toggle" title="Toggle theme">
          <div className="theme-icon-wrapper">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </div>
        </button>

        <div ref={notifRef} style={{ position: 'relative' }}>
          <button className="header-btn notif-btn" onClick={() => { setShowNotifs(!showNotifs); setShowProfile(false); }} id="notifications-btn">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="notification-badge">
                <span className="badge-count">{unreadCount}</span>
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="notification-panel slide-in-down">
              <div className="notification-panel-header">
                <h3>🔔 Notifications</h3>
                <button className="mark-read-btn" onClick={markAllRead}>Mark all read</button>
              </div>
              <div className="notification-list">
                {notifications.map(n => (
                  <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}>
                    <div className={`notification-dot ${n.type}`} />
                    <div className="notification-content">
                      <h4>{n.title}</h4>
                      <p>{n.message}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div ref={profileRef} style={{ position: 'relative' }}>
          <div className="header-avatar" onClick={() => { setShowProfile(!showProfile); setShowNotifs(false); }}>
            <span className="avatar-emoji">{user?.avatar}</span>
            <span className="avatar-status" />
          </div>

          {showProfile && (
            <div className="profile-dropdown slide-in-down">
              <div className="profile-header">
                <div className="profile-avatar-large">{user?.avatar}</div>
                <div>
                  <div className="profile-name">{user?.name}</div>
                  <div className="profile-role">{user?.role}</div>
                </div>
              </div>
              <div className="profile-menu">
                <button className="profile-menu-item">
                  <User size={16} /> My Profile
                </button>
                <button className="profile-menu-item">
                  <Settings size={16} /> Settings
                </button>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
                <button className="profile-menu-item danger" onClick={logout}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
