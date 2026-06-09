import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Truck, Phone, Navigation, Shield, 
  MapPin, CheckCircle, Clock, Map, Sparkles, Loader2, AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';
import { ws } from '../services/websocket';
import { useToastContext } from '../context/ToastContext';
import AnimatedPage from '../components/AnimatedPage';

// Leaflet instance alias
const L = (window as any).L;

interface DeliveryTrackingState {
  order_id: string;
  vendor_id: string;
  patient_id: string;
  delivery_partner_id: string;
  delivery_partner_name: string;
  delivery_partner_vehicle_type: string;
  delivery_partner_vehicle_number: string;
  delivery_partner_avatar: string;
  delivery_partner_phone: string;
  current_latitude: number;
  current_longitude: number;
  eta_minutes: number;
  distance_remaining: number;
  delivery_status: string;
  last_updated: string;
}

export default function DeliveryTrackingPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const toast = useToastContext();
  
  const [tracking, setTracking] = useState<DeliveryTrackingState | null>(null);
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const riderMarkerRef = useRef<any>(null);
  const pathRef = useRef<any>(null);

  // Delhi Central coordinates (Default fallback center)
  const defaultCenter: [number, number] = [28.6139, 77.2090]; 

  // Seed coordinates lookups
  const VENDORS_COORDS: Record<string, [number, number]> = {
    "V001": [28.6304, 77.2177],
    "V002": [28.6250, 77.2200],
    "V003": [28.6050, 77.1950],
  };

  const PATIENTS_COORDS: Record<string, [number, number]> = {
    "P001": [28.6139, 77.2090],
    "P002": [28.6195, 77.2010],
    "P003": [28.6080, 77.2150],
    "P004": [28.6210, 77.1990],
  };

  // 1. Fetch initial order and tracking details
  useEffect(() => {
    async function loadData() {
      if (!orderId) return;
      try {
        const orderRes = await api.getById<any>('orders', orderId);
        setOrder(orderRes.data);
        
        try {
          const trackRes = await fetch(`/api/delivery/track/${orderId}`, {
            headers: {
              'Content-Type': 'application/json',
              ...(localStorage.getItem('hp_auth_token') ? { 'Authorization': `Bearer ${localStorage.getItem('hp_auth_token')}` } : {})
            }
          });
          const trackData = await trackRes.json();
          if (trackData?.data) {
            setTracking(trackData.data);
          } else {
            throw new Error("No tracking info on backend");
          }
        } catch {
          // Check if mock/offline mode
          const mockUser = localStorage.getItem('hp_mock_user');
          if (mockUser || !localStorage.getItem('hp_auth_token')) {
            setIsOfflineMode(true);
            initializeFrontendSimulation(orderRes.data);
          }
        }
      } catch (err: any) {
        console.error(err);
        toast.error("Track Error", "Failed to retrieve order tracking info.");
        // Fallback to overview dashboard
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [orderId]);

  // 2. Setup real-time WebSockets tracking listener
  useEffect(() => {
    if (isOfflineMode) return;

    // Listen to websocket messages
    const unsubscribe = ws.onEvent((event: any) => {
      if (event.type === 'delivery_update' && event.data?.order_id === orderId) {
        setTracking(event.data);
        // Toast notifications
        if (event.data.delivery_status === 'Arriving Soon') {
          toast.warning("Rider Nearby", "Your medicine delivery partner is nearby.");
        } else if (event.data.delivery_status === 'Delivered') {
          toast.success("Order Delivered", "Your medicines were delivered successfully.");
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [orderId, isOfflineMode]);

  // 3. Frontend Simulated Loop (Fallback / Offline Mode)
  const initializeFrontendSimulation = (orderData: any) => {
    const vendorId = orderData.vendorId || 'V001';
    const patientId = orderData.patientId || 'P001';
    
    const vCoord = VENDORS_COORDS[vendorId] || [28.6300, 77.2100];
    const pCoord = PATIENTS_COORDS[patientId] || [28.6150, 77.2050];
    
    const mockRider = {
      order_id: orderData.id,
      vendor_id: vendorId,
      patient_id: patientId,
      delivery_partner_id: "DP-OFFLINE",
      delivery_partner_name: "Rohit Sharma (Offline Mock)",
      delivery_partner_vehicle_type: "Bike Delivery",
      delivery_partner_vehicle_number: "UP75 AB 1234",
      delivery_partner_avatar: "🚴‍♂️",
      delivery_partner_phone: "+91-9876543210",
      current_latitude: vCoord[0],
      current_longitude: vCoord[1],
      eta_minutes: 10,
      distance_remaining: 1.8,
      delivery_status: "Out for Delivery",
      last_updated: new Date().toISOString()
    };
    
    setTracking(mockRider);
    
    // Start simulation loop on frontend
    let step = 0;
    const totalSteps = 10;
    const interval = setInterval(() => {
      step++;
      const t = step / totalSteps;
      const curLat = vCoord[0] + t * (pCoord[0] - vCoord[0]);
      const curLng = vCoord[1] + t * (pCoord[1] - vCoord[1]);
      const remDist = Math.max(0, 1.8 * (1 - t));
      const remEta = Math.max(0, Math.ceil(10 * (1 - t)));
      
      let status = "Out for Delivery";
      if (t >= 0.8 && t < 1.0) {
        status = "Arriving Soon";
      } else if (t >= 1.0) {
        status = "Delivered";
        clearInterval(interval);
      }
      
      setTracking(prev => {
        if (!prev) return null;
        return {
          ...prev,
          current_latitude: curLat,
          current_longitude: curLng,
          distance_remaining: remDist,
          eta_minutes: remEta,
          delivery_status: status,
          last_updated: new Date().toISOString()
        };
      });
      
      if (status === "Arriving Soon") {
        toast.warning("Delivery Nearby", "Delivery partner is approaching your home.");
      } else if (status === "Delivered") {
        toast.success("Medicines Delivered", "Order delivered successfully!");
        // Update local order status
        setOrder((prev: any) => prev ? { ...prev, status: 'Delivered' } : null);
      }
    }, 4000);

    return () => clearInterval(interval);
  };

  // 4. Initialize Leaflet Map
  useEffect(() => {
    if (loading || !tracking || !mapContainerRef.current || mapRef.current) return;
    
    // Check if Leaflet is present in window
    if (!L) {
      console.warn("Leaflet library not loaded in window.");
      return;
    }

    const vendorId = tracking.vendor_id || 'V001';
    const patientId = tracking.patient_id || 'P001';
    
    const vLoc = VENDORS_COORDS[vendorId] || defaultCenter;
    const pLoc = PATIENTS_COORDS[patientId] || defaultCenter;
    const rLoc: [number, number] = [tracking.current_latitude, tracking.current_longitude];

    // Setup Leaflet map instance
    try {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(rLoc, 14);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(mapRef.current);

      // Create Custom Emoji Markers
      const createEmojiIcon = (emoji: string, size = 32) => {
        return L.divIcon({
          html: `<div style="font-size: ${size}px; line-height: 1; transform: translate(-25%, -25%); text-shadow: 0 2px 5px rgba(0,0,0,0.3);">${emoji}</div>`,
          className: 'custom-emoji-marker',
          iconSize: [size, size]
        });
      };

      // Add Markers
      const vendorMarker = L.marker(vLoc, { icon: createEmojiIcon('🏥') }).addTo(mapRef.current);
      vendorMarker.bindPopup(`<b>Pharmacy Vendor</b><br/>${order?.vendorName || "Metro Pharmacy"}`).openPopup();

      const patientMarker = L.marker(pLoc, { icon: createEmojiIcon('🏠') }).addTo(mapRef.current);
      patientMarker.bindPopup(`<b>Your Delivery Address</b><br/>${order?.deliveryAddress || "Home"}`);

      // Rider Scooter Icon
      const riderEmoji = tracking.delivery_partner_avatar || '🛵';
      riderMarkerRef.current = L.marker(rLoc, { icon: createEmojiIcon(riderEmoji, 36) }).addTo(mapRef.current);
      riderMarkerRef.current.bindPopup(`<b>Delivery Partner</b><br/>${tracking.delivery_partner_name}`);

      // Draw route path line
      pathRef.current = L.polyline([vLoc, rLoc, pLoc], {
        color: 'var(--accent-primary)',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(mapRef.current);

      // Fit map bounds to show vendor and patient
      const bounds = L.latLngBounds([vLoc, pLoc]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      setMapLoaded(true);
    } catch (e) {
      console.error("Leaflet initialization failed", e);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, tracking]);

  // 5. Smoothly update Rider Position on map coordinates change
  useEffect(() => {
    if (!mapLoaded || !tracking || !riderMarkerRef.current || !mapRef.current) return;

    const rLoc: [number, number] = [tracking.current_latitude, tracking.current_longitude];
    
    // Update marker position
    riderMarkerRef.current.setLatLng(rLoc);

    // Update polyline route
    const vendorId = tracking.vendor_id || 'V001';
    const patientId = tracking.patient_id || 'P001';
    const vLoc = VENDORS_COORDS[vendorId] || defaultCenter;
    const pLoc = PATIENTS_COORDS[patientId] || defaultCenter;
    
    if (pathRef.current) {
      pathRef.current.setLatLngs([vLoc, rLoc, pLoc]);
    }

    // Pan map to follow rider
    mapRef.current.panTo(rLoc, { animate: true, duration: 1.0 });
  }, [tracking?.current_latitude, tracking?.current_longitude, mapLoaded]);

  // Call Rider simulation
  const handleCallRider = () => {
    if (!tracking) return;
    setIsCalling(true);
    toast.info("Connecting Call...", `Dialing ${tracking.delivery_partner_name} at ${tracking.delivery_partner_phone}`);
    setTimeout(() => {
      setIsCalling(false);
      toast.success("Call Ended", "Simulated phone call complete.");
    }, 4000);
  };

  // Helper to format Expected Arrival Time based on last updated + eta minutes
  const getExpectedArrivalTime = (eta: number) => {
    const timeRef = tracking?.last_updated ? new Date(tracking.last_updated) : new Date();
    timeRef.setMinutes(timeRef.getMinutes() + eta);
    return timeRef.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  // Timeline helper
  const getTimelineSteps = (status: string) => {
    const steps = [
      { key: 'Created', label: 'Order Confirmed' },
      { key: 'Accepted', label: 'Vendor Accepted' },
      { key: 'Processing', label: 'Preparing Order' },
      { key: 'Ready for Dispatch', label: 'Packed' },
      { key: 'Out for Delivery', label: 'Out for Delivery' },
      { key: 'Delivered', label: 'Delivered' }
    ];

    const currentIdx = steps.findIndex(s => s.key === status);
    
    // Normalize status during delivery tracking
    let activeIdx = currentIdx;
    if (status === 'Arriving Soon') {
      activeIdx = steps.findIndex(s => s.key === 'Out for Delivery');
    }

    return steps.map((s, idx) => {
      const isCompleted = idx < activeIdx || status === 'Delivered';
      const isActive = idx === activeIdx && status !== 'Delivered';
      return { ...s, isCompleted, isActive };
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
        <Loader2 size={36} className="spin" color="var(--accent-primary)" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Connecting to delivery GPS stream...</p>
      </div>
    );
  }

  if (!tracking) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 12px' }} />
        <h3>Tracking Unavailable</h3>
        <p>No active delivery tracking stream was found for this order.</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginTop: 12 }}>
          Go Back
        </button>
      </div>
    );
  }

  const timelineSteps = getTimelineSteps(order?.status || tracking.delivery_status);

  return (
    <AnimatedPage>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Header Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="btn btn-secondary"
            style={{ padding: '8px 12px', minWidth: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              Track Medicine Delivery
              <span className="sparkle-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(8,145,178,0.12)', color: 'var(--accent-primary)', fontSize: '0.7rem', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                <Sparkles size={10} /> Live
              </span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Order ID: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{orderId}</span> · From: {order?.vendorName}
            </p>
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="delivery-tracking-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, alignItems: 'start' }}>
          
          {/* LEFT: Leaflet Map or Fallback Simulator */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
              
              {/* Map Canvas wrapper */}
              <div 
                ref={mapContainerRef} 
                style={{ width: '100%', height: 420, background: '#1e293b', position: 'relative' }} 
              >
                {!L && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', zIndex: 5 }}>
                    <Map size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 12 }} />
                    <h4 style={{ color: 'white' }}>Seeding Maps Fallback</h4>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', maxWidth: 300, margin: '4px 0 16px' }}>
                      Leaflet assets are compiling. Drawing vector route simulation...
                    </p>
                    
                    {/* SVG Vector Path Simulation */}
                    <div style={{ width: '80%', height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: 12, position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <svg width="100%" height="100%">
                        <path d="M 30 40 Q 150 10, 270 40" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" strokeDasharray="5,5" />
                        <circle cx="30" cy="40" r="6" fill="#0ea5e9" />
                        <circle cx="270" cy="40" r="6" fill="#10b981" />
                        <g style={{ transform: `translate(${30 + (270 - 30) * (tracking.distance_remaining > 0 ? (1.8 - tracking.distance_remaining)/1.8 : 1.0)}px, ${40 - Math.sin(Math.PI * (1.8 - tracking.distance_remaining)/1.8) * 15}px)` }}>
                          <circle cx="0" cy="0" r="10" fill="var(--accent-primary)" />
                          <text x="0" y="3" fontSize="10" textAnchor="middle">🛵</text>
                        </g>
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Offline/Mock alert banner */}
            {isOfflineMode && (
              <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} color="#d97706" />
                <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 600 }}>
                  Offline Fallback Mode: Running simulated route updates locally.
                </span>
              </div>
            )}
          </div>

          {/* RIGHT: ETA, Delivery Partner details, timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* ETA & Distance Panel */}
            <div 
              className="glass-card" 
              style={{ 
                padding: '24px 20px', 
                background: 'linear-gradient(135deg, var(--bg-card) 0%, rgba(8,145,178,0.05) 100%)', 
                border: '1px solid rgba(8,145,178,0.15)',
                borderRadius: 20, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 16
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Estimated Arrival Time
                  </span>
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 0' }}>
                    {tracking.delivery_status === 'Delivered' ? (
                      <span style={{ color: '#10b981' }}>Delivered 🎉</span>
                    ) : (
                      `Arriving in ${tracking.eta_minutes} Mins`
                    )}
                  </h2>
                </div>
                <div style={{ background: 'rgba(8,145,178,0.1)', color: 'var(--accent-primary)', width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  <Navigation size={20} style={{ transform: 'rotate(45deg)' }} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Expected Arrival</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {tracking.delivery_status === 'Delivered' ? 'Completed' : getExpectedArrivalTime(tracking.eta_minutes)}
                  </span>
                </div>
                <div>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block' }}>Distance Remaining</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {tracking.distance_remaining.toFixed(2)} km away
                  </span>
                </div>
              </div>
            </div>

            {/* Delivery Partner Card */}
            <div className="glass-card" style={{ padding: 18, borderRadius: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(99,102,241,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
                  {tracking.delivery_partner_avatar}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0 }}>{tracking.delivery_partner_name}</h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {tracking.delivery_partner_vehicle_type} · <strong style={{ color: 'var(--text-primary)' }}>{tracking.delivery_partner_vehicle_number}</strong>
                  </p>
                </div>
                <button 
                  onClick={handleCallRider} 
                  disabled={isCalling || tracking.delivery_status === 'Delivered'}
                  className="btn btn-secondary" 
                  style={{ minWidth: 'auto', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12 }}
                >
                  <Phone size={14} /> Call Rider
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <Shield size={12} color="#10b981" />
                <span>Contactless delivery active. Safety regulations verified.</span>
              </div>
            </div>

            {/* Progress Timeline Stepper */}
            <div className="glass-card" style={{ padding: 22, borderRadius: 20 }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 700, marginBottom: 18, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                Delivery Timeline
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', paddingLeft: 10 }}>
                {/* Timeline vertical connector line */}
                <div style={{ position: 'absolute', left: 19, top: 10, bottom: 10, width: 2, background: 'var(--border-color)' }} />
                
                {timelineSteps.map((step, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 2 }}>
                    
                    {/* Step bubble icon indicator */}
                    <div 
                      style={{ 
                        width: 20, 
                        height: 20, 
                        borderRadius: '50%', 
                        border: '2px solid',
                        borderColor: step.isActive ? 'var(--accent-primary)' : step.isCompleted ? '#10b981' : 'var(--border-color)',
                        background: step.isCompleted ? '#10b981' : 'var(--bg-card)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        boxShadow: step.isActive ? '0 0 8px var(--accent-primary)' : 'none',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {step.isCompleted ? '✓' : ''}
                    </div>

                    <span 
                      style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: step.isActive ? 700 : 500, 
                        color: step.isActive ? 'var(--text-primary)' : step.isCompleted ? 'var(--text-primary)' : 'var(--text-muted)'
                      }}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>

      </div>
    </AnimatedPage>
  );
}
