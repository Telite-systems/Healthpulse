import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pill, TrendingUp, ShoppingBag, CheckCircle, AlertTriangle, Clock, ArrowRight, DollarSign, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AnimatedPage from '../components/AnimatedPage';
import { useToastContext } from '../context/ToastContext';

export default function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToastContext();
  
  const [orders, setOrders] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  
  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [ordersRes, invRes] = await Promise.all([
          api.getOrders(),
          api.getInventory()
        ]);
        
        // Filter orders and inventory specifically for this vendor
        const vendorId = user?.id || 'V001';
        const vendorOrders = (ordersRes.data || []).filter((o: any) => o.vendorId === vendorId);
        const vendorInv = (invRes.data || []).filter((i: any) => i.vendorId === vendorId);
        
        setOrders(vendorOrders);
        setInventory(vendorInv);
      } catch (err) {
        console.error('Error loading vendor dashboard data:', err);
        toast.error('Load Error', 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [user?.id]);
  // Analytics computations
  const pendingOrders = orders.filter(o => ['Created', 'Accepted', 'Processing', 'Ready for Dispatch'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'Delivered');
  const lowStockItems = inventory.filter(i => i.quantity < 20);
  
  const totalRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || o.grandTotal || o.totalPrice || 0), 0);
  const todayRevenue = orders
    .filter(o => o.status === 'Delivered' && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((sum, o) => sum + (o.totalAmount || o.grandTotal || o.totalPrice || 0), 0);

  // Status badge style helper
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Created': return 'badge-info';
      case 'Accepted': return 'badge-primary';
      case 'Processing': return 'badge-secondary';
      case 'Ready for Dispatch': return 'badge-warning';
      case 'Out for Delivery': return 'badge-warning';
      case 'Delivered': return 'badge-success';
      case 'Rejected': return 'badge-danger';
      default: return 'badge-muted';
    }
  };

  const handleStatusToggle = () => {
    setOnlineStatus(!onlineStatus);
    toast.success(
      onlineStatus ? 'Store Offline' : 'Store Online',
      onlineStatus ? 'You will not receive new incoming orders.' : 'Ready to receive doorstep delivery orders.'
    );
  };

  return (
    <AnimatedPage>
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <h1 className="stagger-in">Welcome to {user?.name || 'Pharmacy Portal'} 💊</h1>
            <p className="stagger-in" style={{ animationDelay: '0.1s' }}>
              Manage prescription fulfillment, delivery dispatch, and local inventory.
            </p>
          </div>
          <div className="header-badges">
            <button 
              className={`live-indicator ${onlineStatus ? 'connected' : 'offline'}`}
              onClick={handleStatusToggle}
              style={{ background: 'none', cursor: 'pointer', border: 'none', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 20 }}
            >
              <Activity size={14} />
              <span className="live-dot" />
              <span>{onlineStatus ? 'Accepting Orders' : 'Offline'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <div className="glass-card stat-card hover-lift">
          <div className="stat-info">
            <h3>Pending Orders</h3>
            <div className="stat-value">{loading ? '...' : pendingOrders.length}</div>
            <div className="stat-change positive">Requires Attention</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="glass-card stat-card hover-lift">
          <div className="stat-info">
            <h3>Today's Earnings</h3>
            <div className="stat-value">₹{loading ? '...' : todayRevenue.toFixed(2)}</div>
            <div className="stat-change positive">Delivered orders</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
            <DollarSign size={22} />
          </div>
        </div>

        <div className="glass-card stat-card hover-lift">
          <div className="stat-info">
            <h3>Completed Orders</h3>
            <div className="stat-value">{loading ? '...' : completedOrders.length}</div>
            <div className="stat-change positive">All-time delivered</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.12)', color: '#0ea5e9' }}>
            <CheckCircle size={22} />
          </div>
        </div>

        <div className="glass-card stat-card hover-lift">
          <div className="stat-info">
            <h3>Active Catalog</h3>
            <div className="stat-value">{loading ? '...' : inventory.length}</div>
            <div className="stat-change negative">{lowStockItems.length} items low stock</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(139,92,246,0.12)', color: '#8b5cf6' }}>
            <Pill size={22} />
          </div>
        </div>
      </div>

      <div className="dashboard-bottom-grid" style={{ marginTop: 24 }}>
        {/* Recent Orders List */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📋 Active Fulfillment Queue</h2>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => navigate('/dashboard/orders')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Manage Orders <ArrowRight size={14} />
            </button>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading active queue...</p>
          ) : pendingOrders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
              <h3>All caught up!</h3>
              <p style={{ fontSize: '0.85rem' }}>No pending orders found. New orders will appear here automatically.</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: 350, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Patient</th>
                    <th>Medicines</th>
                    <th>Total Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingOrders.slice(0, 5).map((order) => (
                    <tr key={order.id}>
                      <td><strong style={{ fontFamily: 'monospace' }}>{order.id}</strong></td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600 }}>{order.patientName}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{order.contactNumber}</span>
                        </div>
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {order.medicines.map((m: any) => `${m.name} (x${m.quantity})`).join(', ')}
                      </td>
                      <td>₹{(order.totalAmount || order.grandTotal || order.totalPrice || 0).toFixed(2)}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(order.status)}`}>{order.status}</span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={() => navigate('/dashboard/orders')}
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts & Quick Trends */}
        <div className="dashboard-right-stack">
          {/* Low Stock Widget */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#f59e0b' }}>
              <AlertTriangle size={16} />
              Low Stock Warnings ({lowStockItems.length})
            </h3>
            
            {loading ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Checking stock levels...</p>
            ) : lowStockItems.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.08)', color: '#10b981' }}>
                <CheckCircle size={18} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>All medicine inventories are sufficiently stocked.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 220, overflowY: 'auto' }}>
                {lowStockItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'rgba(239,68,68,0.04)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.medicineName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: item.quantity === 0 ? '#ef4444' : '#f97316' }}>
                        {item.quantity} Left
                      </div>
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => navigate('/dashboard/inventory')}
                        style={{ fontSize: '0.68rem', padding: '2px 8px', marginTop: 4 }}
                      >
                        Restock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats & Earnings Target */}
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={16} />
              Performance Targets
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  <span>Daily Dispatch Target</span>
                  <span>{completedOrders.length} / 10 orders</span>
                </div>
                <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (completedOrders.length / 10) * 100)}%`, 
                      background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                      borderRadius: 3 
                    }} 
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  <span>Revenue Milestone</span>
                  <span>₹{totalRevenue.toFixed(0)} / ₹5,000</span>
                </div>
                <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${Math.min(100, (totalRevenue / 5000) * 100)}%`, 
                      background: 'linear-gradient(90deg, #8b5cf6, #0ea5e9)',
                      borderRadius: 3 
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
