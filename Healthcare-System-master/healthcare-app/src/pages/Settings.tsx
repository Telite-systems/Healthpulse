import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { api } from '../services/api';
import { Moon, Sun, Bell, Shield, Globe, Palette, Clock, Key, History, Trash2, Database, Wifi } from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../services/realtimeDb';

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { user, session, sessionTimeRemaining } = useAuth();
  const toast = useToastContext();
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState('connected');
  const [apiLog, setApiLog] = useState<any[]>([]);

  useEffect(() => {
    api.fetchLoginHistory().then(history => setLoginHistory(history.slice(0, 5)));
    setApiLog(api.getRequestLog().slice(0, 8));
    const unsub = db.onConnectionStatus(setDbStatus);
    return unsub;
  }, []);

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast.warning('Cache Cleared', 'All local data has been reset. Reloading...');
    setTimeout(() => window.location.reload(), 1500);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your preferences, security, and system configuration</p>
      </div>

      <div className="settings-grid">
        {/* Appearance */}
        <div className="glass-card settings-card hover-lift">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Palette size={20} style={{ color: '#8b5cf6' }} /> Appearance
          </h3>
          <div className="setting-item">
            <div className="setting-label">
              <h4>{isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}</h4>
              <p>Toggle between dark and light theme</p>
            </div>
            <div className={`toggle-switch ${isDark ? 'active' : ''}`} onClick={toggleTheme} />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Compact Mode</h4>
              <p>Reduce spacing for denser layouts</p>
            </div>
            <div className="toggle-switch" />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Animations</h4>
              <p>Enable smooth transitions and effects</p>
            </div>
            <div className="toggle-switch active" />
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card settings-card hover-lift">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} style={{ color: '#f59e0b' }} /> Notifications
          </h3>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Push Notifications</h4>
              <p>Receive alerts for appointments & updates</p>
            </div>
            <div className="toggle-switch active" />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Email Alerts</h4>
              <p>Get email notifications for critical events</p>
            </div>
            <div className="toggle-switch active" />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Sound Effects</h4>
              <p>Play sounds for incoming notifications</p>
            </div>
            <div className="toggle-switch" />
          </div>
        </div>

        {/* Account & Security */}
        <div className="glass-card settings-card hover-lift">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={20} style={{ color: '#10b981' }} /> Account & Security
          </h3>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Profile</h4>
              <p>{user?.name} — {user?.role}</p>
            </div>
            <button className="btn btn-secondary btn-sm">Edit</button>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4><Key size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Two-Factor Auth</h4>
              <p>Add an extra layer of security</p>
            </div>
            <div className="toggle-switch" />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Change Password</h4>
              <p>Update your login credentials</p>
            </div>
            <button className="btn btn-secondary btn-sm">Update</button>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4><Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Session Timeout</h4>
              <p>Auto logout after inactivity</p>
            </div>
            <select className="form-input settings-select">
              <option>15 min</option>
              <option>30 min</option>
              <option>1 hour</option>
              <option selected>24 hours</option>
            </select>
          </div>
        </div>

        {/* Session Info */}
        <div className="glass-card settings-card hover-lift">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={20} style={{ color: '#0ea5e9' }} /> Active Session
          </h3>
          <div className="session-info-grid">
            <div className="session-info-item">
              <span className="session-label">Token Status</span>
              <span className="session-value">
                <span className="status-dot active" /> Active
              </span>
            </div>
            <div className="session-info-item">
              <span className="session-label">Time Remaining</span>
              <span className="session-value session-timer-value">{formatTime(sessionTimeRemaining)}</span>
            </div>
            <div className="session-info-item">
              <span className="session-label">Auth Method</span>
              <span className="session-value">JWT Bearer Token</span>
            </div>
            <div className="session-info-item">
              <span className="session-label">Database</span>
              <span className="session-value">
                <Wifi size={12} /> <span className={`status-dot ${dbStatus}`} /> {dbStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Login History */}
        <div className="glass-card settings-card hover-lift">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={20} style={{ color: '#ec4899' }} /> Login History
          </h3>
          {loginHistory.length > 0 ? (
            <div className="login-history-list">
              {loginHistory.map((entry, i) => (
                <div className="login-history-item" key={i}>
                  <div className="history-icon">🔐</div>
                  <div className="history-details">
                    <div className="history-user">{entry.username}</div>
                    <div className="history-meta">
                      {new Date(entry.timestamp).toLocaleString()} • IP: {entry.ip}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              No login history available
            </div>
          )}
        </div>

        {/* System */}
        <div className="glass-card settings-card hover-lift">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Globe size={20} style={{ color: '#06b6d4' }} /> System
          </h3>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Language</h4>
              <p>Select display language</p>
            </div>
            <select className="form-input settings-select">
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>Hindi</option>
            </select>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4><Database size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Data Export</h4>
              <p>Download data as CSV or PDF</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => toast.info('Export', 'Data export started...')}>Export</button>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4><Trash2 size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--danger)' }} />Clear Cache</h4>
              <p>Reset local storage data</p>
            </div>
            <button className="btn btn-danger btn-sm" onClick={handleClearCache}>Clear</button>
          </div>

          {/* API Request Log */}
          <div style={{ marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 10, color: 'var(--text-secondary)' }}>
              📡 Recent API Requests
            </h4>
            <div className="api-log">
              {apiLog.map((req, i) => (
                <div className="api-log-item" key={i}>
                  <span className={`api-method ${req.method.toLowerCase()}`}>{req.method}</span>
                  <span className="api-endpoint">{req.endpoint}</span>
                  <span className="api-duration">{req.duration}ms</span>
                  <span className={`api-status ${req.status < 300 ? 'ok' : 'err'}`}>{req.status}</span>
                </div>
              ))}
              {apiLog.length === 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: 8 }}>No recent requests</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
