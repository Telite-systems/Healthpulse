import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, IndianRupee, UserCheck, TrendingUp, Clock, Database, ArrowRightLeft, Wifi, Shield, Zap, Truck } from 'lucide-react';
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
import VendorDashboard from './VendorDashboard';

export default function DashboardHome() {
  const { user } = useAuth();

  // ── Role-specific portals ──────────────────────────────────────────────────
  if (user?.role === 'Doctor')  return <DoctorDashboard />;
  if (user?.role === 'Patient') return <PatientDashboard />;
  if (user?.role === 'Vendor')  return <VendorDashboard />;
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
  const [deliveryAnalytics, setDeliveryAnalytics] = useState<any>({
    total_deliveries: 145,
    successful_deliveries: 141,
    delayed_deliveries: 4,
    average_delivery_time: 16.8,
    vendor_performance: [
      { vendor_name: "Metro Pharmacy", total_deliveries: 62, avg_time: "15.4 min", fulfillment_rate: "98.4%", status: "Excellent" },
      { vendor_name: "City Care Chemists", total_deliveries: 48, avg_time: "21.2 min", fulfillment_rate: "95.5%", status: "Good" },
      { vendor_name: "Apollo Pharmacy Express", total_deliveries: 35, avg_time: "11.8 min", fulfillment_rate: "99.2%", status: "Excellent" }
    ]
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getDashboardStats();
        setStats(res.data);
      } catch {
        // Backend offline → keep MOCK_STATS already set
        setStats(MOCK_STATS);
      }
      
      try {
        const dRes = await fetch('/api/delivery/analytics', {
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('hp_auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hp_auth_token')}` } : {})
          }
        });
        const dData = await dRes.json();
        if (dData?.data) {
          setDeliveryAnalytics(dData.data);
        }
      } catch {
        // keep mock defaults
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

      {/* 🚚 Medicine Delivery Operations Analytics Section */}
      <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={20} color="var(--accent-primary)" />
          Medicine Delivery Operations Analytics
        </h2>

        {/* Analytics mini cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Deliveries', value: deliveryAnalytics.total_deliveries, change: 'All-time orders', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
            { label: 'Successful Deliveries', value: deliveryAnalytics.successful_deliveries, change: 'Delivered successfully', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
            { label: 'Delayed Deliveries', value: deliveryAnalytics.delayed_deliveries, change: 'Requires optimization', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            { label: 'Avg Delivery Time', value: `${deliveryAnalytics.average_delivery_time} mins`, change: 'Store-to-door average', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' }
          ].map((item, idx) => (
            <div key={idx} className="glass-card hover-lift" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>{item.value}</div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.change}</span>
              </div>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Truck size={18} />
              </div>
            </div>
          ))}
        </div>

        {/* Vendor Performance Grid */}
        <div className="glass-card" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12 }}>📈 Vendor Performance Metrics</h3>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Total Deliveries</th>
                  <th>Avg. Delivery Time</th>
                  <th>Fulfillment Rate</th>
                  <th>Status Rating</th>
                </tr>
              </thead>
              <tbody>
                {deliveryAnalytics.vendor_performance?.map((vendor: any, idx: number) => (
                  <tr key={idx}>
                    <td><strong style={{ color: 'var(--text-primary)' }}>{vendor.vendor_name || vendor.vendorName}</strong></td>
                    <td>{vendor.total_deliveries || vendor.totalDeliveries}</td>
                    <td>{vendor.avg_time || vendor.avgTime}</td>
                    <td><strong style={{ color: 'var(--accent-primary)' }}>{vendor.fulfillment_rate || vendor.fulfillmentRate}</strong></td>
                    <td>
                      <span className="badge" style={{ 
                        background: (vendor.status === 'Excellent' || vendor.status === 'Active') ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', 
                        color: (vendor.status === 'Excellent' || vendor.status === 'Active') ? '#10b981' : '#f59e0b',
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontWeight: 600,
                        fontSize: '0.72rem'
                      }}>
                        {vendor.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
