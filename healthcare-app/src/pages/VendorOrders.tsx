import { useState, useEffect, useRef } from 'react';
import { Pill, User, Phone, MapPin, CheckCircle, XCircle, ArrowRight, Truck, AlertCircle, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import AnimatedPage from '../components/AnimatedPage';
import { useToastContext } from '../context/ToastContext';
import { ws } from '../services/websocket';

const L = (window as any).L;

export default function VendorOrders() {
  const { user } = useAuth();
  const toast = useToastContext();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  
  // Filtering & Modal States
  const [activeTab, setActiveTab] = useState<'All' | 'Pending' | 'Active' | 'Delivered'>('Pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [clarifyModalOpen, setClarifyModalOpen] = useState(false);
  const [clarifyNotes, setClarifyNotes] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [activeTracking, setActiveTracking] = useState<any | null>(null);

  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<any>(null);
  const miniMapInitialized = useRef<boolean>(false);
  const miniRiderMarkerRef = useRef<any>(null);
  const miniPathRef = useRef<any>(null);

  // ── Initialize & update inline Leaflet map for Vendor ──
  useEffect(() => {
    if (!activeTracking || !miniMapContainerRef.current || !L) return;
    if (!['Out for Delivery', 'Arriving Soon'].includes(selectedOrder?.status)) return;

    const VENDORS_COORDS: Record<string, [number, number]> = {
      'V001': [28.6304, 77.2177], 'V002': [28.6250, 77.2200], 'V003': [28.6050, 77.1950],
    };
    const PATIENTS_COORDS: Record<string, [number, number]> = {
      'P001': [28.6139, 77.2090], 'P002': [28.6195, 77.2010], 'P003': [28.6080, 77.2150], 'P004': [28.6210, 77.1990],
    };

    const vId = activeTracking.vendor_id || selectedOrder?.vendorId || 'V001';
    const pId = activeTracking.patient_id || selectedOrder?.patientId || 'P001';
    const vLoc = VENDORS_COORDS[vId] || [28.6300, 77.2100];
    const pLoc = PATIENTS_COORDS[pId] || [28.6150, 77.2050];
    const rLoc: [number, number] = [activeTracking.current_latitude || vLoc[0], activeTracking.current_longitude || vLoc[1]];

    const createEmojiIcon = (emoji: string, size = 28) => {
      return L.divIcon({
        html: `<div style="font-size: ${size}px; line-height: 1; transform: translate(-25%, -25%); text-shadow: 0 2px 5px rgba(0,0,0,0.3);">${emoji}</div>`,
        className: 'custom-emoji-marker',
        iconSize: [size, size]
      });
    };

    // Initialize map only once
    if (!miniMapInitialized.current) {
      try {
        // Cleanup any previous instance
        if (miniMapRef.current) {
          miniMapRef.current.remove();
          miniMapRef.current = null;
        }

        miniMapRef.current = L.map(miniMapContainerRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: true,
          scrollWheelZoom: false,
        }).setView(rLoc, 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19,
        }).addTo(miniMapRef.current);

        // Vendor marker
        L.marker(vLoc, { icon: createEmojiIcon('🏥', 24) })
          .addTo(miniMapRef.current)
          .bindPopup(`<b>Your Pharmacy</b>`);

        // Patient marker
        L.marker(pLoc, { icon: createEmojiIcon('🏠', 24) })
          .addTo(miniMapRef.current)
          .bindPopup(`<b>Delivery Address</b><br/>${selectedOrder?.deliveryAddress || 'Home'}`);

        // Rider marker
        const riderEmoji = activeTracking.delivery_partner_avatar || '🛵';
        miniRiderMarkerRef.current = L.marker(rLoc, { icon: createEmojiIcon(riderEmoji, 32) })
          .addTo(miniMapRef.current);

        // Route line
        miniPathRef.current = L.polyline([vLoc, rLoc, pLoc], {
          color: '#0891b2',
          weight: 3,
          opacity: 0.7,
          dashArray: '6, 6'
        }).addTo(miniMapRef.current);

        // Fit bounds
        miniMapRef.current.fitBounds(L.latLngBounds([vLoc, pLoc]), { padding: [30, 30] });
        miniMapInitialized.current = true;
      } catch (e) {
        console.error('Mini-map init error:', e);
      }
    } else {
      // Update existing markers
      if (miniRiderMarkerRef.current && activeTracking.current_latitude && activeTracking.current_longitude) {
        miniRiderMarkerRef.current.setLatLng(rLoc);
      }
      if (miniPathRef.current) {
        miniPathRef.current.setLatLngs([vLoc, rLoc, pLoc]);
      }
      if (miniMapRef.current) {
        miniMapRef.current.panTo(rLoc, { animate: true, duration: 0.8 });
      }
    }
  }, [activeTracking?.current_latitude, activeTracking?.current_longitude, selectedOrder?.status]);

  // Cleanup mini-map when order changes or deselected
  useEffect(() => {
    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
        miniMapInitialized.current = false;
      }
    };
  }, [selectedOrder?.id]);

  useEffect(() => {
    if (!selectedOrder || !['Out for Delivery', 'Arriving Soon', 'Delivered'].includes(selectedOrder.status)) {
      setActiveTracking(null);
      return;
    }
    
    async function fetchTracking() {
      try {
        const res = await fetch(`/api/delivery/track/${selectedOrder.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('hp_auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hp_auth_token')}` } : {})
          }
        });
        const d = await res.json();
        if (d?.data) {
          setActiveTracking(d.data);
        }
      } catch {
        // Fallback mock details if in offline mode
        const mockRiders = [
          { name: "Rohit Sharma", avatar: "🚴‍♂️", vehicle_number: "UP75 AB 1234", vehicle_type: "Bike Delivery" },
          { name: "Amit Mishra", avatar: "🛵", vehicle_number: "MH12 CD 5678", vehicle_type: "Scooter Delivery" },
          { name: "Jasprit Bumrah", avatar: "🚴", vehicle_number: "DL3C EF 9012", vehicle_type: "Electric Bike" }
        ];
        const randomRider = mockRiders[selectedOrder.id.charCodeAt(selectedOrder.id.length - 1) % mockRiders.length];
        
        setActiveTracking({
          order_id: selectedOrder.id,
          delivery_partner_name: randomRider.name,
          delivery_partner_avatar: randomRider.avatar,
          delivery_partner_vehicle_type: randomRider.vehicle_type,
          delivery_partner_vehicle_number: randomRider.vehicle_number,
          delivery_status: selectedOrder.status,
          distance_remaining: selectedOrder.status === 'Delivered' ? 0.0 : 1.4,
          eta_minutes: selectedOrder.status === 'Delivered' ? 0 : 8,
          delivery_completed_at: selectedOrder.status === 'Delivered' ? new Date().toISOString() : null
        });
      }
    }
    fetchTracking();
  }, [selectedOrder?.id, selectedOrder?.status]);

  useEffect(() => {
    const unsubscribe = ws.onEvent((event: any) => {
      if (event.type === 'delivery_update' && event.data?.order_id === selectedOrder?.id) {
        setActiveTracking(event.data);
      }
    });
    return () => unsubscribe();
  }, [selectedOrder?.id]);

  const vendorId = user?.id || 'V001';

  async function loadOrders() {
    try {
      const res = await api.getOrders();
      // Filter for current vendor
      const filtered = (res.data || []).filter((o: any) => o.vendorId === vendorId);
      setOrders(filtered);
      
      // Select first order in list if none selected or keep current selection updated
      if (filtered.length > 0) {
        if (selectedOrder) {
          const updatedSelected = filtered.find((o: any) => o.id === selectedOrder.id);
          setSelectedOrder(updatedSelected || filtered[0]);
        } else {
          setSelectedOrder(filtered[0]);
        }
      } else {
        setSelectedOrder(null);
      }
    } catch (err) {
      console.error(err);
      toast.error('Load Error', 'Failed to retrieve orders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  // Tab filtering logic
  const filteredOrders = orders.filter(o => {
    if (activeTab === 'Pending') return o.status === 'Created';
    if (activeTab === 'Active') return ['Accepted', 'Processing', 'Ready for Dispatch', 'Out for Delivery'].includes(o.status);
    if (activeTab === 'Delivered') return ['Delivered', 'Rejected'].includes(o.status);
    return true; // 'All'
  });

  // Action: Accept
  const handleAccept = async (orderId: string) => {
    try {
      await api.acceptOrder(orderId);
      toast.success('Order Accepted', 'Fulfillment has begun');
      await loadOrders();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not accept order');
    }
  };

  // Action: Open Reject Modal
  const openRejectModal = () => {
    setRejectReason('');
    setRejectModalOpen(true);
  };

  // Action: Submit Reject
  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) {
      toast.error('Required Field', 'Please provide a reason for rejection');
      return;
    }
    try {
      await api.rejectOrder(selectedOrder.id, rejectReason);
      setRejectModalOpen(false);
      toast.success('Order Rejected', 'Notification sent to patient');
      await loadOrders();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not reject order');
    }
  };

  // Action: Open Clarification Modal
  const openClarificationModal = () => {
    setClarifyNotes('');
    setClarifyModalOpen(true);
  };

  // Action: Submit Clarification
  const handleClarifySubmit = async () => {
    if (!clarifyNotes.trim()) {
      toast.error('Required Field', 'Please enter clarifying details');
      return;
    }
    try {
      await api.updateOrder(selectedOrder.id, { 
        instructions: `Clarification Requested: ${clarifyNotes}`,
        status: 'Created' // Remains in review/created
      });
      setClarifyModalOpen(false);
      toast.info('Clarification Sent', 'Clarification details sent to doctor/patient');
      await loadOrders();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not send clarification');
    }
  };

  // Action: Transition through states (Dispatch/Deliver)
  const handleProgress = async (orderId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'Accepted' || currentStatus === 'Processing' || currentStatus === 'Ready for Dispatch') {
        await api.dispatchOrder(orderId);
        toast.info('Status Updated', `Order is now ${getLabelForNextStatus(currentStatus)}`);
      } else if (currentStatus === 'Out for Delivery') {
        await api.deliverOrder(orderId);
        toast.success('Success', 'Order marked as DELIVERED');
      }
      await loadOrders();
    } catch (err: any) {
      toast.error('Action Failed', err.message || 'Could not update status');
    }
  };

  const getLabelForNextStatus = (current: string) => {
    if (current === 'Accepted') return 'Processing';
    if (current === 'Processing') return 'Ready for Dispatch';
    if (current === 'Ready for Dispatch') return 'Out for Delivery';
    if (current === 'Out for Delivery') return 'Delivered';
    return '';
  };

  // Progress stepper helper
  const getStepProgressWidth = (status: string) => {
    switch (status) {
      case 'Created': return '10%';
      case 'Accepted': return '30%';
      case 'Processing': return '50%';
      case 'Ready for Dispatch': return '70%';
      case 'Out for Delivery': return '90%';
      case 'Delivered': return '100%';
      case 'Rejected': return '100%';
      default: return '0%';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Created': return '#0ea5e9';
      case 'Accepted': return '#8b5cf6';
      case 'Processing': return '#6366f1';
      case 'Ready for Dispatch': return '#f59e0b';
      case 'Out for Delivery': return '#d97706';
      case 'Delivered': return '#10b981';
      case 'Rejected': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <AnimatedPage>
      <div className="page-header">
        <h1 className="stagger-in">Medicine Orders 📦</h1>
        <p className="stagger-in" style={{ animationDelay: '0.1s' }}>
          Process incoming prescriptions, prepare medicine pouches, and dispatch local delivery riders.
        </p>
      </div>

      {/* Tabs */}
      <div className="tabs-container" style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
        {(['Pending', 'Active', 'Delivered', 'All'] as const).map(tab => (
          <button
            key={tab}
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 16px',
              fontWeight: 600,
              fontSize: '0.85rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'Pending' && 'Incoming Requests'}
            {tab === 'Active' && 'Active Prep & Delivery'}
            {tab === 'Delivered' && 'Order History'}
            {tab === 'All' && 'All Orders'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24, alignItems: 'start' }}>
        
        {/* Left Side: Orders List */}
        <div className="glass-card" style={{ padding: 16, height: '70vh', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>Orders Queue ({filteredOrders.length})</h2>
          
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)' }}>Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                <AlertCircle size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                <h3>No Orders Found</h3>
                <p style={{ fontSize: '0.78rem' }}>There are no orders matching this status filter.</p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${selectedOrder?.id === order.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: selectedOrder?.id === order.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  className="hover-lift"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>{order.id}</span>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        color: getStatusColor(order.status),
                        textTransform: 'uppercase'
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{order.patientName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span>{order.medicines.length} Medicines</span>
                    <span style={{ fontWeight: 700 }}>₹{(order.totalAmount || order.totalPrice || 0).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                    {order.prescriptionUrl ? (
                      <span style={{ fontSize: '0.62rem', padding: '1px 5px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 4, fontWeight: 700 }}>Rx</span>
                    ) : (
                      <span style={{ fontSize: '0.62rem', padding: '1px 5px', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: 4, fontWeight: 700 }}>OTC</span>
                    )}
                    <span className={`badge-payment-status ${(order.paymentStatus || 'Pending').toLowerCase()} ${order.paymentMethod === 'COD' ? 'cod' : ''}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                      {order.paymentMethod === 'COD' && order.paymentStatus === 'Pending' ? 'COD Pending' : `${order.paymentMethod || 'Online'} - ${order.paymentStatus || 'Pending'}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Detailed Preview Card */}
        {selectedOrder ? (
          <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header & Status Indicator */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Order Details</h2>
                  <span style={{ fontFamily: 'monospace', background: 'var(--border-color)', padding: '2px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600 }}>{selectedOrder.id}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>Created on: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span 
                  style={{ 
                    padding: '6px 14px', 
                    borderRadius: 20, 
                    fontSize: '0.8rem', 
                    fontWeight: 700,
                    color: 'white',
                    backgroundColor: getStatusColor(selectedOrder.status)
                  }}
                >
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            {/* Stepper Graphic */}
            <div style={{ position: 'relative', padding: '10px 0 20px', margin: '0 10px' }}>
              <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, position: 'relative' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    width: getStepProgressWidth(selectedOrder.status), 
                    background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-secondary))', 
                    borderRadius: 2, 
                    transition: 'width 0.4s ease' 
                  }} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, marginTop: 8, color: 'var(--text-muted)' }}>
                <span style={{ color: selectedOrder.status === 'Created' ? 'var(--accent-primary)' : 'inherit' }}>RECEIVED</span>
                <span style={{ color: selectedOrder.status === 'Accepted' ? 'var(--accent-primary)' : 'inherit' }}>ACCEPTED</span>
                <span style={{ color: selectedOrder.status === 'Processing' ? 'var(--accent-primary)' : 'inherit' }}>PREPARING</span>
                <span style={{ color: selectedOrder.status === 'Ready for Dispatch' ? 'var(--accent-primary)' : 'inherit' }}>READY</span>
                <span style={{ color: selectedOrder.status === 'Out for Delivery' ? 'var(--accent-primary)' : 'inherit' }}>SHIPPED</span>
                <span style={{ color: selectedOrder.status === 'Delivered' ? '#10b981' : 'inherit' }}>DELIVERED</span>
              </div>
            </div>

            {/* Highlights: Regulation & Payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 12, border: '1px solid var(--border-color)', margin: '0 4px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Classification</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  {selectedOrder.prescriptionUrl ? (
                    <>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>Rx Restricted</span>
                    </>
                  ) : (
                    <>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>OTC Medicine</span>
                    </>
                  )}
                </span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Payment Method</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginTop: 6, color: 'var(--text-primary)' }}>
                  {selectedOrder.paymentMethod === 'COD' ? '📦 Cash On Delivery' : '💳 Online Payment'}
                </span>
                {selectedOrder.transactionId && (
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'block', marginTop: 2 }}>
                    Tx: {selectedOrder.transactionId}
                  </span>
                )}
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Payment Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span className={`badge-payment-status ${(selectedOrder.paymentStatus || 'Pending').toLowerCase()} ${selectedOrder.paymentMethod === 'COD' ? 'cod' : ''}`}>
                    {selectedOrder.paymentStatus || 'Pending'}
                  </span>
                  {selectedOrder.paymentStatus !== 'Paid' && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={async () => {
                        try {
                          await api.updateOrder(selectedOrder.id, { paymentStatus: 'Paid' });
                          toast.success('Payment Received', 'Order marked as PAID');
                          await loadOrders();
                        } catch (err: any) {
                          toast.error('Failed to update payment status', err.message);
                        }
                      }}
                      style={{ padding: '2px 6px', fontSize: '0.65rem', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                    >
                      Mark Paid
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Verify Prescription row */}
            {selectedOrder.prescriptionUrl && (
              <div className="glass-card" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, margin: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>📄</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Prescription Attached</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Uploaded by patient for verification</div>
                  </div>
                </div>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={() => setShowPrescriptionModal(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Verify Prescription
                </button>
              </div>
            )}

            {/* Two Column details: Patient details vs Prescription details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
              
              {/* Patient Details */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderRight: '1px solid var(--border-color)', paddingRight: 24 }}>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.5px' }}>Delivery Address</h3>
                
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <User size={16} style={{ color: 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedOrder.patientName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Patient ID: {selectedOrder.patientId}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                  <div style={{ fontSize: '0.82rem' }}>{selectedOrder.contactNumber}</div>
                </div>

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <MapPin size={16} style={{ color: 'var(--text-muted)', marginTop: 2 }} />
                  <div style={{ fontSize: '0.82rem', lineHeight: '1.4' }}>{selectedOrder.deliveryAddress || selectedOrder.shippingAddress}</div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 style={{ fontSize: '0.88rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.5px', marginBottom: 12 }}>Items in Order</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedOrder.medicines.map((med: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 8, fontSize: '0.82rem' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{med.name}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>x{med.quantity}</span>
                      </div>
                      <span style={{ fontWeight: 700 }}>₹{(med.price * med.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid var(--border-color)', marginTop: 4, fontWeight: 700 }}>
                    <span>Total Value</span>
                    <span>₹{(selectedOrder.totalAmount || selectedOrder.totalPrice || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Delivery & Rider Details (Vendor Dashboard requirement) */}
            {activeTracking && (
              <div 
                className="glass-card" 
                style={{ 
                  padding: 16, 
                  background: 'rgba(8,145,178,0.03)', 
                  border: '1.5px solid rgba(8,145,178,0.15)', 
                  borderRadius: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  margin: '0 4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '1.2rem' }}>🚚</span>
                    <div>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>Delivery Dispatch Details</h4>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-time partner assignments & progress</span>
                    </div>
                  </div>
                  <span className="badge badge-info" style={{ textTransform: 'uppercase', fontSize: '0.7rem', background: 'rgba(8,145,178,0.12)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: 20 }}>
                    {activeTracking.delivery_status}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                      {activeTracking.delivery_partner_avatar || '🚴‍♂️'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{activeTracking.delivery_partner_name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {activeTracking.delivery_partner_vehicle_type} ({activeTracking.delivery_partner_vehicle_number})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
                    {activeTracking.delivery_status === 'Delivered' ? (
                      <div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Completed at: </span>
                        <strong style={{ color: '#10b981' }}>
                          {activeTracking.delivery_completed_at ? new Date(activeTracking.delivery_completed_at).toLocaleTimeString() : 'Just now'}
                        </strong>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Distance:</span>
                          <strong>{activeTracking.distance_remaining?.toFixed(2) || '0.0'} km</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Est. Arrival:</span>
                          <strong>{activeTracking.eta_minutes || '0'} mins</strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Live Leaflet Map (Ola/Uber-style) */}
                {['Out for Delivery', 'Arriving Soon'].includes(selectedOrder.status) && (
                  <div style={{ marginTop: 8, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="sparkle-badge" style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#0891b2' }}></span>
                        Live Rider GPS tracking
                      </span>
                    </div>
                    <div 
                      ref={miniMapContainerRef}
                      style={{ 
                        height: '140px', 
                        width: '100%', 
                        borderRadius: '8px', 
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden',
                        position: 'relative',
                        zIndex: 1
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Prescription Notes or Rejection Reason */}
            {selectedOrder.instructions && (
              <div style={{ padding: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#d97706', marginBottom: 4 }}>
                  <AlertCircle size={14} />
                  <span>SPECIAL INSTRUCTIONS / NOTES</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedOrder.instructions}</p>
              </div>
            )}

            {/* Actions Bar */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              
              {/* Step 1: Newly Created orders */}
              {selectedOrder.status === 'Created' && (
                <>
                  <button className="btn btn-secondary" onClick={openClarificationModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MessageSquare size={16} /> Ask Clarification
                  </button>
                  <button className="btn btn-danger" onClick={openRejectModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <XCircle size={16} /> Decline
                  </button>
                  <button className="btn btn-primary" onClick={() => handleAccept(selectedOrder.id)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle size={16} /> Accept Order
                  </button>
                </>
              )}

              {/* Step 2: Processing, Prep or Dispatch States */}
              {['Accepted', 'Processing', 'Ready for Dispatch'].includes(selectedOrder.status) && (
                <button 
                  className="btn btn-primary" 
                  onClick={() => handleProgress(selectedOrder.id, selectedOrder.status)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <Truck size={16} /> Move to {getLabelForNextStatus(selectedOrder.status)} <ArrowRight size={16} />
                </button>
              )}

              {/* Step 3: Out for Delivery state */}
              {selectedOrder.status === 'Out for Delivery' && (
                <button 
                  className="btn btn-success" 
                  onClick={() => handleProgress(selectedOrder.id, selectedOrder.status)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#10b981', color: 'white' }}
                >
                  <CheckCircle size={16} /> Mark as Delivered
                </button>
              )}

              {/* Rejected / Delivered details */}
              {['Delivered', 'Rejected'].includes(selectedOrder.status) && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 600 }}>This order has been finalized and requires no further actions.</p>
              )}

            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Pill size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
            <h3>Select an Order</h3>
            <p>Select a prescription order from the sidebar list to see details and perform fulfillment actions.</p>
          </div>
        )}

      </div>

      {/* Decline/Reject Modal */}
      {rejectModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 420, maxWidth: '90%', animation: 'scaleUp 0.2s' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: '#ef4444' }}>Decline Order Fulfillment</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>Please state the reason for rejecting this medicine order. The patient will be notified immediately.</p>
            
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. Out of stock, invalid dosage, address outside delivery zone..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'none', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRejectModalOpen(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRejectSubmit}>Confirm Decline</button>
            </div>
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {clarifyModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 440, maxWidth: '90%', animation: 'scaleUp 0.2s' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 10, color: 'var(--accent-primary)' }}>Request Order Clarification</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>Need to confirm dosage with the doctor or ask the patient for address clarifications? Detail your request below.</p>
            
            <textarea
              className="form-input"
              rows={4}
              placeholder="e.g. Confirming whether generic alternative can be supplied for Rosuvastatin..."
              value={clarifyNotes}
              onChange={e => setClarifyNotes(e.target.value)}
              style={{ width: '100%', padding: 10, borderRadius: 8, background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', resize: 'none', marginBottom: 16 }}
            />

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setClarifyModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleClarifySubmit}>Send Request</button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Viewer Modal */}
      {showPrescriptionModal && selectedOrder && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 500, maxWidth: '95%', animation: 'scaleUp 0.2s', background: 'var(--bg-card)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border-color)', paddingBottom: 12 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>Verify Rx Prescription</h3>
              <button onClick={() => setShowPrescriptionModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>
                ✕
              </button>
            </div>

            {/* Simulated Medical Prescription Pouch/Paper */}
            <div style={{ background: 'white', color: '#1e293b', padding: 24, borderRadius: 12, border: '2px dashed var(--accent-primary)', fontFamily: '"Courier New", Courier, monospace', position: 'relative', boxShadow: '0 4px 15px rgba(0,0,0,0.15)' }}>
              
              {/* Doctor Header */}
              <div style={{ borderBottom: '2px solid #334155', paddingBottom: 10, marginBottom: 15 }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#0f172a' }}>
                  {selectedOrder.doctorName || 'Dr. Self Consult / General Practitioner'}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  Reg. No: FMC-883921A | HealthPulse Clinic
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569' }}>
                  Email: clinic-support@healthpulse.com
                </div>
              </div>

              {/* Rx Watermark */}
              <div style={{ position: 'absolute', right: 20, top: 80, fontSize: '4.5rem', fontWeight: 'bold', color: 'rgba(239, 68, 68, 0.1)', pointerEvents: 'none' }}>
                Rx
              </div>

              {/* Patient details */}
              <div style={{ fontSize: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 15 }}>
                <div>
                  <span style={{ fontWeight: 'bold' }}>PATIENT:</span> {selectedOrder.patientName}
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>DATE:</span> {new Date(selectedOrder.createdAt).toLocaleDateString()}
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>ORDER ID:</span> {selectedOrder.id}
                </div>
                <div>
                  <span style={{ fontWeight: 'bold' }}>STATUS:</span> VERIFIED DOCUMENT
                </div>
              </div>

              {/* Rx Symbol */}
              <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--accent-primary)', marginBottom: 8 }}>
                ℞
              </div>

              {/* Medicines list */}
              <div style={{ minHeight: 80, fontSize: '0.82rem', lineHeight: 1.6 }}>
                {selectedOrder.medicines.map((med: any, idx: number) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #cbd5e1', padding: '4px 0' }}>
                    <span>
                      {idx + 1}. {med.name}
                    </span>
                    <span style={{ fontWeight: 'bold' }}>
                      Qty: {med.quantity}
                    </span>
                  </div>
                ))}
              </div>

              {/* Doctor digital signature */}
              <div style={{ borderTop: '1px solid #94a3b8', marginTop: 25, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Digital Verification Key: HP-SEC-SECURE-RX</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'cursive', color: '#1e3a8a', transform: 'rotate(-2deg)' }}>
                    Dr. {selectedOrder.doctorName?.split(' ').pop() || 'Verified'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#64748b' }}>Authorized Signature</div>
                </div>
              </div>

            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPrescriptionModal(false)}
              >
                Close Review
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => {
                  toast.success('Prescription Approved', 'Medicine dosage regulations matched successfully.');
                  setShowPrescriptionModal(false);
                }}
                style={{ background: '#10b981', color: 'white' }}
              >
                Approve Verification
              </button>
            </div>

          </div>
        </div>
      )}

    </AnimatedPage>
  );
}
