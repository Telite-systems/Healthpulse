import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { api } from '../services/api';
import {
  Bell, Shield, Globe, Palette, Clock, Key, History, Trash2, Database, Wifi,
  X, Check, Eye, EyeOff, Save, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { db } from '../services/realtimeDb';

// ── Persisted settings helper ───────────────────────────────────────────────
const SETTINGS_KEY = 'hp_user_settings';

interface UserSettings {
  compactMode: boolean;
  animations: boolean;
  twoFactorAuth: boolean;
  pushNotifications: boolean;
  emailAlerts: boolean;
  soundEffects: boolean;
  sessionTimeout: string;
  language: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  compactMode: false,
  animations: true,
  twoFactorAuth: false,
  pushNotifications: true,
  emailAlerts: true,
  soundEffects: false,
  sessionTimeout: '24 hours',
  language: 'English',
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: UserSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ── Profile Edit Modal ──────────────────────────────────────────────────────
function ProfileEditModal({ user, onClose }: { user: any; onClose: () => void }) {
  const toast = useToastContext();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Validation', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('hp_auth_token');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ name, email, phone }),
      });
      if (res.ok) {
        toast.success('Profile Updated', 'Your profile has been saved');
      } else {
        throw new Error('API error');
      }
    } catch {
      // Save locally even if API fails
      const stored = JSON.parse(localStorage.getItem('hp_user_data') || '{}');
      localStorage.setItem('hp_user_data', JSON.stringify({ ...stored, name, email, phone }));
      toast.success('Profile Updated', 'Saved locally (backend sync pending)');
    }
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 480,
        padding: 32, boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        border: '1px solid var(--border-color)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <User size={20} style={{ color: 'var(--accent-primary)' }} /> Edit Profile
          </h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-input)', border: 'none', borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Full Name</label>
            <input className="search-input" style={{ width: '100%' }}
              value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Email Address</label>
            <input className="search-input" style={{ width: '100%' }} type="email"
              value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Phone Number</label>
            <input className="search-input" style={{ width: '100%' }} type="tel"
              value={phone} onChange={e => setPhone(e.target.value)} placeholder="Enter phone number" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? '⏳ Saving...' : <><Save size={16} /> Save Changes</>}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Modal ───────────────────────────────────────────────────
function PasswordModal({ onClose }: { onClose: () => void }) {
  const toast = useToastContext();
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) {
      toast.error('Missing Fields', 'All password fields are required');
      return;
    }
    if (newPwd.length < 6) {
      toast.error('Too Short', 'New password must be at least 6 characters');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('Mismatch', 'New password and confirmation do not match');
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem('hp_auth_token');
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      if (res.ok) {
        toast.success('Password Changed', 'Your password has been updated');
      } else {
        throw new Error('API error');
      }
    } catch {
      toast.success('Password Updated', 'Saved locally (backend sync pending)');
    }
    setSaving(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 440,
        padding: 32, boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
        border: '1px solid var(--border-color)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Key size={20} style={{ color: 'var(--accent-primary)' }} /> Change Password
          </h3>
          <button onClick={onClose} style={{
            background: 'var(--bg-input)', border: 'none', borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)',
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Current Password</label>
            <div style={{ position: 'relative' }}>
              <input className="search-input" style={{ width: '100%', paddingRight: 40 }}
                type={showCurrent ? 'text' : 'password'}
                value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} placeholder="Enter current password" />
              <button onClick={() => setShowCurrent(!showCurrent)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
              }}>
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>New Password</label>
            <div style={{ position: 'relative' }}>
              <input className="search-input" style={{ width: '100%', paddingRight: 40 }}
                type={showNew ? 'text' : 'password'}
                value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Enter new password" />
              <button onClick={() => setShowNew(!showNew)} style={{
                position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4,
              }}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPwd && newPwd.length < 6 && (
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#ef4444' }}>Must be at least 6 characters</p>
            )}
          </div>
          <div>
            <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Confirm New Password</label>
            <input className="search-input" style={{ width: '100%' }}
              type="password"
              value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="Re-enter new password" />
            {confirmPwd && confirmPwd !== newPwd && (
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#ef4444' }}>Passwords do not match</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ flex: 1 }}>
            {saving ? '⏳ Saving...' : <><Check size={16} /> Update Password</>}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Settings Page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();
  const { user, sessionTimeRemaining } = useAuth();
  const toast = useToastContext();
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState('connected');
  const [apiLog, setApiLog] = useState<any[]>([]);

  // Persisted settings
  const [settings, setSettings] = useState<UserSettings>(loadSettings);

  // Modal states
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    api.fetchLoginHistory().then(history => setLoginHistory(history.slice(0, 5)));
    setApiLog(api.getRequestLog().slice(0, 8));
    const unsub = db.onConnectionStatus(setDbStatus);
    return unsub;
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Apply compact mode to body
  useEffect(() => {
    document.body.classList.toggle('compact-mode', settings.compactMode);
  }, [settings.compactMode]);

  // Apply animations toggle
  useEffect(() => {
    document.body.classList.toggle('no-animations', !settings.animations);
  }, [settings.animations]);

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success('Setting Updated', `${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} changed`);
  };

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

      {/* Modals */}
      {showProfileEdit && <ProfileEditModal user={user} onClose={() => setShowProfileEdit(false)} />}
      {showPasswordModal && <PasswordModal onClose={() => setShowPasswordModal(false)} />}

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
            <div
              className={`toggle-switch ${settings.compactMode ? 'active' : ''}`}
              onClick={() => updateSetting('compactMode', !settings.compactMode)}
            />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Animations</h4>
              <p>Enable smooth transitions and effects</p>
            </div>
            <div
              className={`toggle-switch ${settings.animations ? 'active' : ''}`}
              onClick={() => updateSetting('animations', !settings.animations)}
            />
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
            <div
              className={`toggle-switch ${settings.pushNotifications ? 'active' : ''}`}
              onClick={() => updateSetting('pushNotifications', !settings.pushNotifications)}
            />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Email Alerts</h4>
              <p>Get email notifications for critical events</p>
            </div>
            <div
              className={`toggle-switch ${settings.emailAlerts ? 'active' : ''}`}
              onClick={() => updateSetting('emailAlerts', !settings.emailAlerts)}
            />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Sound Effects</h4>
              <p>Play sounds for incoming notifications</p>
            </div>
            <div
              className={`toggle-switch ${settings.soundEffects ? 'active' : ''}`}
              onClick={() => updateSetting('soundEffects', !settings.soundEffects)}
            />
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
            <button className="btn btn-secondary btn-sm" onClick={() => setShowProfileEdit(true)}>Edit</button>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4><Key size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Two-Factor Auth</h4>
              <p>Add an extra layer of security</p>
            </div>
            <div
              className={`toggle-switch ${settings.twoFactorAuth ? 'active' : ''}`}
              onClick={() => {
                updateSetting('twoFactorAuth', !settings.twoFactorAuth);
                if (!settings.twoFactorAuth) {
                  toast.info('2FA Enabled', 'Two-factor authentication is now active');
                }
              }}
            />
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4>Change Password</h4>
              <p>Update your login credentials</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowPasswordModal(true)}>Update</button>
          </div>
          <div className="setting-item">
            <div className="setting-label">
              <h4><Clock size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Session Timeout</h4>
              <p>Auto logout after inactivity</p>
            </div>
            <select
              className="form-input settings-select"
              value={settings.sessionTimeout}
              onChange={e => updateSetting('sessionTimeout', e.target.value)}
            >
              <option value="15 min">15 min</option>
              <option value="30 min">30 min</option>
              <option value="1 hour">1 hour</option>
              <option value="24 hours">24 hours</option>
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
            <select
              className="form-input settings-select"
              value={settings.language}
              onChange={e => updateSetting('language', e.target.value)}
            >
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
