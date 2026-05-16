import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, IndianRupee, UserCheck, TrendingUp, Clock, Database, ArrowRightLeft, Wifi, Shield, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { db } from '../services/realtimeDb';
import Skeleton from '../components/Skeleton';
import LivePulse from '../components/LivePulse';
import LiveEventFeed from '../components/LiveEventFeed';
import AnimatedPage from '../components/AnimatedPage';
import { hasPermission } from '../services/permissions';
import type { Role } from '../services/permissions';
import DoctorDashboard from './DoctorDashboard';
import PatientDashboard from './PatientDashboard';

export default function DashboardHome() {
  const { user } = useAuth();

  // ── Role-specific portals ──────────────────────────────────────────────────
  if (user?.role === 'Doctor')  return <DoctorDashboard />;
  if (user?.role === 'Patient') return <PatientDashboard />;
  // Staff and Admin fall through to the full admin overview below

  return <AdminDashboardContent />;
}

// Mock stats used when backend is offline
const MOCK_STATS = {
  todayAppointments: 24,
  monthlyRevenue: 128400,
  activeDoctors: 8,
  totalDoctors: 12,
  occupancyRate: 78,
  pendingBills: 14,
};

function AdminDashboardContent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(MOCK_STATS);
  const [loading, setLoading] = useState(true);
  const [livePatientCount, setLivePatientCount] = useState(247);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [hoveredStat, setHoveredStat] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDashboardStats();
        setStats(res.data);
      } catch {
        // Backend offline → keep MOCK_STATS already set
        setStats(MOCK_STATS);
      }
      setLoading(false);
    };
    load();

    const unsub = db.onSnapshot('patients', (data: any[]) => {
      if (data.length > 0) setLivePatientCount(data.length);
    });

    const unsubStatus = db.onConnectionStatus(setConnectionStatus);
    return () => { unsub(); unsubStatus(); };
  }, []);

  const statItems = stats ? [
    { label: 'Total Patients', value: livePatientCount.toLocaleString(), change: '+12%', positive: true, icon: <Users size={22} />, bg: 'rgba(14,165,233,0.12)', color: '#0ea5e9', sparkline: [35, 42, 38, 45, 50, 48, 55] },
    { label: "Today's Appointments", value: stats.todayAppointments.toString(), change: '+5', positive: true, icon: <Calendar size={22} />, bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', sparkline: [28, 35, 32, 40, 42, 38, 45] },
    { label: 'Monthly Revenue', value: `₹${(stats.monthlyRevenue / 100000).toFixed(1)}L`, change: '+8.2%', positive: true, icon: <IndianRupee size={22} />, bg: 'rgba(16,185,129,0.12)', color: '#10b981', sparkline: [95, 105, 112, 128, 118, 125, 135] },
    { label: 'Active Doctors', value: `${stats.activeDoctors}/${stats.totalDoctors}`, change: 'Online', positive: true, icon: <UserCheck size={22} />, bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', sparkline: [18, 20, 22, 24, 22, 24, 24] },
    { label: 'Occupancy Rate', value: `${stats.occupancyRate}%`, change: '+3%', positive: true, icon: <TrendingUp size={22} />, bg: 'rgba(236,72,153,0.12)', color: '#ec4899', sparkline: [65, 68, 72, 75, 78, 76, 80] },
    { label: 'Pending Bills', value: stats.pendingBills.toString(), change: '-2', positive: false, icon: <Clock size={22} />, bg: 'rgba(239,68,68,0.12)', color: '#ef4444', sparkline: [20, 18, 15, 17, 14, 13, 12] },
  ] : [];

  const renderMiniSparkline = (data: number[], color: string) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const width = 80;
    const height = 28;
    const step = width / (data.length - 1);

    const points = data.map((v, i) => {
      const x = i * step;
      const y = height - ((v - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="mini-sparkline" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
        <polygon
          fill={`url(#spark-${color.replace('#', '')})`}
          points={`0,${height} ${points} ${width},${height}`}
        />
      </svg>
    );
  };

  const userRole = (user?.role || 'Staff') as Role;

  return (
    <AnimatedPage>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="stagger-in">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
            <p className="stagger-in" style={{ animationDelay: '0.1s' }}>
              Here's an overview of your healthcare operations today.
            </p>
          </div>
          <div className="header-badges">
            <div className={`live-indicator ${connectionStatus}`}>
              <Wifi size={14} />
              <span className="live-dot" />
              <span>Live</span>
            </div>
            <div className="role-badge" style={{ '--badge-color': user?.role === 'Admin' ? '#0ea5e9' : user?.role === 'Doctor' ? '#8b5cf6' : '#10b981' } as any}>
              <Shield size={12} />
              <span>{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton type="stat" key={i} />)
        ) : (
          statItems.map((s, i) => (
            <div
              className={`glass-card stat-card hover-lift ${hoveredStat === i ? 'stat-expanded' : ''}`}
              key={i}
              style={{ animationDelay: `${i * 0.06}s` }}
              onMouseEnter={() => setHoveredStat(i)}
              onMouseLeave={() => setHoveredStat(null)}
            >
              <div className="stat-info">
                <h3>{s.label}</h3>
                <div className="stat-value counter-animate">{s.value}</div>
                <div className={`stat-change ${s.positive ? 'positive' : 'negative'}`}>
                  <span className="change-icon">{s.positive ? '↗' : '↘'}</span>
                  {s.change} from last month
                </div>
                <div className="stat-sparkline-container">
                  {renderMiniSparkline(s.sparkline, s.color)}
                </div>
              </div>
              <div className="stat-icon pulse-on-hover" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            </div>
          ))
        )}
      </div>

      <div className="feature-cards">
        {hasPermission(userRole, 'patients', 'view') && (
          <div className="glass-card feature-card master hover-lift ripple-container" onClick={() => navigate('/dashboard/master-data')}>
            <div className="card-icon" style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}>
              <Database size={32} />
            </div>
            <h2>Master Data Management</h2>
            <p>Manage core hospital data including patient registration, doctor profiles, staff records, and department configuration.</p>
            <div className="card-tags">
              <span className="card-tag">👤 Patient Registration</span>
              <span className="card-tag">🩺 Doctor Details</span>
              <span className="card-tag">👥 Staff Details</span>
              <span className="card-tag">🏥 Departments</span>
            </div>
            <div className="card-arrow">→</div>
          </div>
        )}

        {hasPermission(userRole, 'appointments', 'view') && (
          <div className="glass-card feature-card transaction hover-lift ripple-container" onClick={() => navigate('/dashboard/transaction-data')}>
            <div className="card-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
              <ArrowRightLeft size={32} />
            </div>
            <h2>Transaction Data</h2>
            <p>Track real-time operations including appointment scheduling, patient visits, billing & payments, and prescription records.</p>
            <div className="card-tags">
              <span className="card-tag">📅 Appointments</span>
              <span className="card-tag">📋 Visit Records</span>
              <span className="card-tag">💳 Billing</span>
              <span className="card-tag">💊 Prescriptions</span>
            </div>
            <div className="card-arrow">→</div>
          </div>
        )}
      </div>

      {/* Live Dashboard Grid */}
      <div className="dashboard-bottom-grid">
        <div className="glass-card dashboard-live-card">
          <LiveEventFeed maxEvents={8} />
        </div>

        <div className="dashboard-right-stack">
          {/* Heartbeat Monitor */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} style={{ color: 'var(--accent-primary)' }} />
              System Health
            </h3>
            <LivePulse />
            <div className="system-metrics">
              {[
                { label: 'API Latency', value: '~280ms', status: 'good' },
                { label: 'DB Sync', value: 'Connected', status: 'good' },
                { label: 'Uptime', value: '99.8%', status: 'good' },
                { label: 'Memory', value: '68%', status: 'warn' },
              ].map((m, i) => (
                <div className="metric-item" key={i}>
                  <span className="metric-label">{m.label}</span>
                  <span className={`metric-value metric-${m.status}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>📊 Quick Stats</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { label: 'Today Visits', value: '34', sub: 'Since 8AM', color: '#0ea5e9' },
                { label: 'Revenue', value: '₹1.03L', sub: '+15%', color: '#10b981' },
                { label: 'Prescriptions', value: '28', sub: '3 pending', color: '#f59e0b' },
                { label: 'Discharge', value: '12', sub: '5 today', color: '#8b5cf6' },
              ].map((item, i) => (
                <div key={i} className="quick-stat-card hover-lift" style={{ '--stat-accent': item.color } as any}>
                  <div className="quick-stat-value">{item.value}</div>
                  <div className="quick-stat-label">{item.label}</div>
                  <div className="quick-stat-sub">{item.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
