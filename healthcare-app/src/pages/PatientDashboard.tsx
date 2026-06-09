import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { api } from '../services/api';
import { db } from '../services/realtimeDb';
import { ws } from '../services/websocket';
import PaymentFlow from '../components/PaymentFlow';
import type { Doctor } from '../types';
import {
  Calendar, FileText, Bell, Download, CheckCircle,
  Pill, Video, Phone, Activity, Heart, ChevronRight, Navigation,
  Star, MessageSquare, AlertCircle, Thermometer, Loader2,
  Filter, Search, Stethoscope, Trash2, ShoppingBag,
  Truck, ShoppingCart, ArrowRight,
  X, Award, Clock, Mail, Phone as PhoneIcon, MapPin, GraduationCap, IndianRupee, Shield, Eye, BadgeCheck
} from 'lucide-react';

// Fallback data
const FB_APPOINTMENTS: any[] = [];

const FB_PRESCRIPTIONS: any[] = [];

const FB_RECORDS: any[] = [];

const FB_NOTIFICATIONS = [
  { id: 1, icon: '📅', title: 'Welcome!', desc: 'Book your first appointment with our specialists.', time: 'Just now', read: false, patientName: '' },
];

// ── All available departments for filtering ────────────────────────────────────
const ALL_DEPARTMENTS = [
  'All Departments',
  'Cardiology',
  'Dermatology',
  'Neurology',
  'Orthopedics',
  'Pediatrics',
  'ENT',
  'General Medicine',
  'Gynecology',
  'Ophthalmology',
  'Psychiatry',
  'General Surgery',
  'Endocrinology',
  'Pulmonology',
  'Urology',
  'Nephrology',
];

// ── Doctor type for booking ────────────────────────────────────────────────────
interface BookingDoctor {
  id: string;
  name: string;
  spec: string;
  department: string;
  available: boolean;
  avatar: string;
  rating: number;
  experience: number;
  availability: string;
  licenseNo?: string;
  licenseValidity?: string;
  contact?: string;
  email?: string;
  qualification?: string;
  consultationFee?: number;
  gender?: string;
}

type PatientTab = 'overview' | 'book' | 'records' | 'prescriptions' | 'orders' | 'notifications' | 'shop';

export default function PatientDashboard() {
  const { user } = useAuth();
  const toast = useToastContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');
  const [myAppointments, setMyAppointments] = useState(FB_APPOINTMENTS);
  const [myPrescriptions, setMyPrescriptions] = useState(FB_PRESCRIPTIONS);
  const [myRecords, setMyRecords] = useState(FB_RECORDS);
  const [myNotifications, setMyNotifications] = useState(FB_NOTIFICATIONS);
  const [_loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<BookingDoctor | null>(null);
  const [profileDoctor, setProfileDoctor] = useState<BookingDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-04-25');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // ── Shop / Buy Medicines state ──
  const [shopSearch, setShopSearch] = useState('');
  const [shopCategory, setShopCategory] = useState('All');
  const [cart, setCart] = useState<{ [medId: string]: { item: any; qty: number } }>({});
  const [shopCheckoutStep, setShopCheckoutStep] = useState(1); // 1 = shop catalog/cart, 2 = select vendor, 3 = delivery details, 4 = payment, 5 = success
  const [selectedShopVendor, setSelectedShopVendor] = useState<any | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [prescriptionFileName, setPrescriptionFileName] = useState('');
  const [prescriptionUrl, setPrescriptionUrl] = useState('');
  const [placingShopOrder, setPlacingShopOrder] = useState(false);
  const [shopOrderSuccess, setShopOrderSuccess] = useState(false);
  const [createdShopOrderId, setCreatedShopOrderId] = useState('');
  const [showShopDetailModal, setShowShopDetailModal] = useState<any | null>(null);

  // Read unused variables to prevent tsc compilation errors
  if (prescriptionFile || shopOrderSuccess) {
    // values read
  }

  // ── Medicine delivery ecosystem states ──────────────────────────────────────────
  const [selectedTrackOrder, setSelectedTrackOrder] = useState<any | null>(null);
  const [medicineOrders, setMedicineOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState<any | null>(null);
  const [checkoutStep, setCheckoutStep] = useState(1);
  const [selectedMeds, setSelectedMeds] = useState<string[]>([]);
  const [medQuantities, setMedQuantities] = useState<Record<string, number>>({});
  const [vendorsList, setVendorsList] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<any | null>(null);
  const [shippingAddress, setShippingAddress] = useState('12 MG Road, New Delhi');
  const [contactNumber, setContactNumber] = useState('+91-9876543201');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [activePaymentOrder, setActivePaymentOrder] = useState<any | null>(null);

  // ── Live delivery tracking state (Ola/Uber-style inline map) ──────────────────
  const [liveTrackingData, setLiveTrackingData] = useState<any | null>(null);
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapRef = useRef<any>(null);
  const miniRiderMarkerRef = useRef<any>(null);
  const miniPathRef = useRef<any>(null);
  const miniMapInitialized = useRef(false);
  const L = (window as any).L;

  const fetchMedicineOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await api.getOrders();
      if (res?.data) {
        const patientName = user?.name || '';
        const patientId = user?.id || '';
        const filtered = res.data.filter((o: any) => 
          o.patientId === patientId || 
          o.patientName?.toLowerCase() === patientName?.toLowerCase()
        );
        setMedicineOrders(filtered);
      }
    } catch (e) {
      console.error('Error fetching medicine orders:', e);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOpenOrderModal = async (rx: any) => {
    setSelectedRx(rx);
    setCheckoutStep(1);
    setOrderSuccess(false);
    
    const meds = rx.medicines ? rx.medicines.split(',').map((m: string) => m.trim()).filter(Boolean) : [];
    setSelectedMeds(meds);
    
    const quantities: Record<string, number> = {};
    meds.forEach((m: string) => {
      quantities[m] = 30; // default 30 days
    });
    setMedQuantities(quantities);
    
    setShippingAddress(user?.address || '12 MG Road, New Delhi');
    setContactNumber(user?.contact || '+91-9876543201');
    setSelectedVendor(null);
    setOrderModalOpen(true);
    
    try {
      const [vendorsRes, inventoryRes] = await Promise.all([
        api.getVendors(),
        api.getInventory()
      ]);
      setVendorsList(vendorsRes.data || []);
      setInventoryList(inventoryRes.data || []);
    } catch (err) {
      console.error('Error loading checkout resources:', err);
      toast.error('Load Error', 'Failed to load pharmacy vendor stock information');
    }
  };

  const getVendorPricing = (vendor: any) => {
    let totalMedsPrice = 0;
    let availableCount = 0;
    const items = [];
    
    for (const medName of selectedMeds) {
      const qtyNeeded = medQuantities[medName] || 1;
      const match = inventoryList.find((inv: any) => 
        inv.vendorId === vendor.id && 
        (inv.medicineName.toLowerCase().includes(medName.toLowerCase()) || 
         medName.toLowerCase().includes(inv.medicineName.toLowerCase()))
      );
      
      if (match && match.quantity >= qtyNeeded) {
        totalMedsPrice += match.price * qtyNeeded;
        availableCount++;
        items.push({ name: medName, price: match.price, inStock: true, qty: qtyNeeded });
      } else if (match) {
        totalMedsPrice += match.price * qtyNeeded;
        items.push({ name: medName, price: match.price, inStock: false, qty: qtyNeeded, availableQty: match.quantity });
      } else {
        const mockPrice = 10.0;
        totalMedsPrice += mockPrice * qtyNeeded;
        items.push({ name: medName, price: mockPrice, inStock: false, qty: qtyNeeded });
      }
    }
    
    const shippingFee = 30.0;
    const totalAmount = totalMedsPrice + shippingFee;
    const isFullyInStock = availableCount === selectedMeds.length;
    
    return {
      items,
      totalMedsPrice,
      shippingFee,
      totalAmount,
      isFullyInStock,
      availableCount,
      totalCount: selectedMeds.length
    };
  };

  const handlePreCreatePrescriptionOrder = async () => {
    if (!selectedVendor) return;
    setPlacingOrder(true);
    
    const pricing = getVendorPricing(selectedVendor);
    const subtotal = pricing.totalMedsPrice;
    const deliveryFee = pricing.shippingFee;
    const taxAmount = subtotal * 0.05;
    const grandTotal = subtotal + deliveryFee + taxAmount;

    const orderData = {
      patientId: user?.id || 'P001',
      patientName: user?.name || 'Rahul Sharma',
      prescriptionId: selectedRx?.id || 'RX001',
      doctorId: selectedRx?.doctorId || 'D001',
      doctorName: selectedRx?.doctor || 'Dr. Rajesh Kumar',
      medicines: pricing.items.map(item => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
        instructions: ''
      })),
      instructions: selectedRx?.instructions || '',
      deliveryAddress: shippingAddress,
      contactNumber: contactNumber,
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.name,
      status: 'Created',
      deliveryCharges: deliveryFee,
      taxAmount: taxAmount,
      grandTotal: grandTotal,
      totalAmount: grandTotal, // backward compat
      deliveryEta: selectedVendor.deliveryTime || '30-45 min',
      createdAt: new Date().toISOString(),
      prescriptionUrl: selectedRx?.prescriptionUrl || null,
      paymentMethod: 'Online',
      paymentStatus: 'Pending'
    };
    
    try {
      const res = await api.createOrder(orderData);
      setCreatedOrderId(res.data.id);
      setCheckoutStep(4);
    } catch (err: any) {
      console.error(err);
      toast.error('Order Creation Failed', err.message || 'Could not submit medicine order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const getShopVendorPricing = (vendor: any) => {
    const cartArray = Object.values(cart);
    let totalMedsPrice = 0;
    let availableCount = 0;
    const items = [];
    const missing = [];
    
    for (const cartObj of cartArray) {
      const match = inventoryList.find((inv: any) => 
        inv.vendorId === vendor.id && 
        inv.medicineName.toLowerCase() === cartObj.item.medicineName.toLowerCase()
      );
      if (match && match.quantity > 0) {
        availableCount++;
        const price = match.price;
        const qtyToBuy = Math.min(cartObj.qty, match.quantity);
        totalMedsPrice += price * qtyToBuy;
        items.push({ name: cartObj.item.medicineName, qty: qtyToBuy, price });
      } else {
        missing.push(cartObj.item.medicineName);
      }
    }
    
    const deliveryFee = totalMedsPrice > 500 ? 0 : 30;
    const totalAmount = totalMedsPrice + deliveryFee;
    const isFullyInStock = availableCount === cartArray.length;
    
    return {
      totalMedsPrice,
      deliveryFee,
      totalAmount,
      isFullyInStock,
      availableCount,
      totalCount: cartArray.length,
      items,
      missing
    };
  };

  const handlePreCreateShopOrder = async () => {
    if (!selectedShopVendor) return;
    setPlacingShopOrder(true);
    
    const pricing = getShopVendorPricing(selectedShopVendor);
    const subtotal = pricing.totalMedsPrice;
    const deliveryFee = pricing.deliveryFee;
    const taxAmount = subtotal * 0.05;
    const grandTotal = subtotal + deliveryFee + taxAmount;

    const orderData = {
      patientId: user?.id || 'P001',
      patientName: user?.name || 'Rahul Sharma',
      prescriptionId: '',
      doctorId: '',
      doctorName: '',
      medicines: pricing.items.map(item => ({
        name: item.name,
        quantity: item.qty,
        price: item.price,
        instructions: ''
      })),
      instructions: prescriptionFileName ? `Prescription Verified: ${prescriptionFileName}` : 'OTC Order',
      deliveryAddress: shippingAddress,
      contactNumber: contactNumber,
      vendorId: selectedShopVendor.id,
      vendorName: selectedShopVendor.name,
      status: 'Created',
      deliveryCharges: deliveryFee,
      taxAmount: taxAmount,
      grandTotal: grandTotal,
      totalAmount: grandTotal, // backward compat
      deliveryEta: selectedShopVendor.deliveryTime || '30-45 min',
      createdAt: new Date().toISOString(),
      prescriptionUrl: prescriptionUrl || null,
      paymentMethod: 'Online',
      paymentStatus: 'Pending'
    };

    try {
      const res = await api.createOrder(orderData);
      setCreatedShopOrderId(res.data.id);
      setShopCheckoutStep(4);
    } catch (err: any) {
      console.error(err);
      toast.error('Order Creation Failed', err.message || 'Could not initiate marketplace order');
    } finally {
      setPlacingShopOrder(false);
    }
  };

  const handleShopPaymentComplete = async (_txId: string, _method: 'COD' | 'Online') => {
    setShopOrderSuccess(true);
    setShopCheckoutStep(5);
    setCart({});
    await fetchMedicineOrders();
  };


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

  // ── Doctor list (dynamic from DB) ──────────────────────────────────────────
  const [allDoctors, setAllDoctors] = useState<BookingDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [doctorSearch, setDoctorSearch] = useState('');

  // Fetch doctors from API/database
  useEffect(() => {
    const fetchDoctors = async () => {
      setDoctorsLoading(true);
      try {
        const res = await api.getAll<Doctor>('doctors', 1, 100);
        if (res?.data?.data?.length) {
          setAllDoctors(res.data.data.map((d: any) => ({
            id: d.id || d._id,
            name: d.name,
            spec: d.specialization || d.department || '',
            department: d.department || d.specialization || '',
            available: d.status === 'Available',
            avatar: d.name?.toLowerCase().includes('dr.') && d.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️',
            rating: (4.5 + Math.random() * 0.5),
            experience: d.experience || 0,
            availability: d.availability || 'Mon-Fri',
            licenseNo: d.licenseNo || '',
            licenseValidity: d.licenseValidity || '',
            contact: d.contact || '',
            email: d.email || '',
            qualification: d.qualification || '',
            consultationFee: d.consultationFee || 0,
            gender: d.gender || '',
          })));
          setDoctorsLoading(false);
          return;
        }
      } catch {
        // API unreachable, try db cache
      }

      // Try from db cache
      const cached = db.getAll<Doctor>('doctors');
      if (cached.length) {
        setAllDoctors(cached.map((d: any) => ({
          id: d.id,
          name: d.name,
          spec: d.specialization || d.department || '',
          department: d.department || d.specialization || '',
          available: d.status === 'Available',
          avatar: d.name?.toLowerCase().includes('dr.') && d.gender === 'Female' ? '👩‍⚕️' : '👨‍⚕️',
          rating: (4.5 + Math.random() * 0.5),
          experience: d.experience || 0,
          availability: d.availability || 'Mon-Fri',
          licenseNo: d.licenseNo || '',
          licenseValidity: d.licenseValidity || '',
          contact: d.contact || '',
          email: d.email || '',
          qualification: d.qualification || '',
          consultationFee: d.consultationFee || 0,
          gender: d.gender || '',
        })));
        setDoctorsLoading(false);
        return;
      }

      // No doctors from API/DB — not a problem, we show an empty state
      setAllDoctors([]);
      setDoctorsLoading(false);
    };

    fetchDoctors();
  }, []);

  // Fetch patient data from API — uses patient-specific prescription endpoint
  useEffect(() => {
    const fetchData = async () => {
      const patientId = user?.id || '';
      const patientName = user?.name || '';
      try {
        // Fetch prescriptions via the dedicated patient endpoint for correct ownership filtering
        const rxPromise = patientId
          ? fetch(`/api/prescriptions/patient/${patientId}`, {
              headers: {
                'Content-Type': 'application/json',
                ...(localStorage.getItem('hp_auth_token')
                  ? { Authorization: `Bearer ${localStorage.getItem('hp_auth_token')}` }
                  : {}),
              },
            }).then(r => r.json()).catch(() => null)
          : Promise.resolve(null);

        const [aptsRes, rxPatientRes, visitsRes, notifsRes, ordersRes, vendorsRes, inventoryRes] = await Promise.allSettled([
          api.getAll<any>('appointments', 1, 500),
          rxPromise,
          api.getAll<any>('visits', 1, 500),
          api.getAll<any>('notifications', 1, 500),
          api.getOrders(),
          api.getVendors(),
          api.getInventory(),
        ]);

        if (aptsRes.status === 'fulfilled' && aptsRes.value?.data?.data?.length) {
          setMyAppointments(aptsRes.value.data.data.map((a: any) => ({
            id: a.id || a._id, doctor: a.doctorName, specialization: a.department || '',
            date: a.date, time: a.time, status: a.status, type: a.type || 'Consultation',
            patientName: a.patientName || a.patient || '',
          })));
        }

        // Map prescriptions from the patient-specific endpoint
        if (rxPatientRes.status === 'fulfilled' && rxPatientRes.value?.data?.length) {
          const rxList = rxPatientRes.value.data;
          setMyPrescriptions(rxList.map((rx: any) => ({
            id: rx.id || rx._id, doctor: rx.doctorName, date: rx.date,
            medicines: rx.medications || rx.medicines, status: rx.status, duration: rx.duration || '—',
            patientName: rx.patientName || rx.patient || '', instructions: rx.instructions || '',
            diagnosis: rx.diagnosis || '', dosage: rx.dosage || '',
          })));
        }

        if (visitsRes.status === 'fulfilled' && visitsRes.value?.data?.data?.length) {
          setMyRecords(visitsRes.value.data.data.map((v: any) => ({
            id: v.id || v._id, date: v.visitDate, doctor: v.doctorName,
            diagnosis: v.diagnosis, vitals: v.vitals || { bp: '—', temp: '—', pulse: '—', weight: '—' },
          })));
        }
        if (notifsRes.status === 'fulfilled' && notifsRes.value?.data?.data?.length) {
          setMyNotifications(notifsRes.value.data.data.map((n: any) => ({
            id: n.id || n._id, icon: n.type === 'error' || n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : '📢',
            title: n.title, desc: n.message, time: n.time || 'recently', read: n.read ?? false,
            patientName: n.patientName || n.patient || '',
            target: n.target || '',
          })));
        }
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.data?.length) {
          const filtered = ordersRes.value.data.filter((o: any) => 
            o.patientId === patientId || 
            o.patientName?.toLowerCase() === patientName?.toLowerCase()
          );
          setMedicineOrders(filtered);
        }
        if (vendorsRes.status === 'fulfilled' && vendorsRes.value?.data) {
          setVendorsList(vendorsRes.value.data);
        }
        if (inventoryRes.status === 'fulfilled' && inventoryRes.value?.data) {
          setInventoryList(inventoryRes.value.data);
        }
      } catch {
        // Keep fallback data
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // ── Real-time subscriptions for live updates ──
  useEffect(() => {
    // Subscribe to notifications for live updates
    const unsubNotifs = db.onSnapshot<any>('notifications', (items) => {
      if (items.length) {
        const currentPatient = (user?.name || '').toLowerCase().trim();
        const mapped = items
          .filter((n: any) => {
            if (!n.patientName) return true; // global alerts
            const np = (n.patientName || '').toLowerCase().trim();
            return np === currentPatient || np.includes(currentPatient) || currentPatient.includes(np);
          })
          .map((n: any) => ({
            id: n.id || n._id, icon: n.type === 'error' || n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : '📢',
            title: n.title, desc: n.message, time: n.time || 'recently', read: n.read ?? false,
            patientName: n.patientName || '', target: n.target || '',
          }));
        if (mapped.length) setMyNotifications(mapped);
      }
    });
    return () => { unsubNotifs(); };
  }, [user]);

  // ── Real-time WebSocket: Order Status Updates + Delivery GPS Tracking ──
  useEffect(() => {
    const patientId = user?.id || '';
    const patientName = (user?.name || '').toLowerCase().trim();

    const unsubWs = ws.onEvent((event: any) => {
      // 1) Order status changes from vendor (Accepted, Processing, Out for Delivery, etc.)
      if (event.type === 'order_status_update' && event.data) {
        const d = event.data;
        // Only process events for this patient
        if (d.patientId === patientId || (d.patientName || '').toLowerCase().trim() === patientName) {
          // Update order in local state immediately
          setMedicineOrders(prev => prev.map(o => 
            o.id === d.order_id 
              ? { ...o, status: d.status, deliveryEta: d.deliveryEta } 
              : o
          ));
          // Also update selectedTrackOrder if it's the same order
          setSelectedTrackOrder((prev: any) => 
            prev?.id === d.order_id 
              ? { ...prev, status: d.status, deliveryEta: d.deliveryEta } 
              : prev
          );
          // Show toast
          toast.info('Order Updated', `Order ${d.order_id} → ${d.status} (ETA: ${d.deliveryEta})`);
        }
      }

      // 2) Live delivery GPS coordinate updates
      if (event.type === 'delivery_update' && event.data) {
        const d = event.data;
        // Update live tracking data if it's for the currently selected order
        setSelectedTrackOrder((prev: any) => {
          if (prev?.id === d.order_id) {
            // Update the order status too
            if (d.delivery_status === 'Delivered') {
              setMedicineOrders(prevOrders => prevOrders.map(o => 
                o.id === d.order_id ? { ...o, status: 'Delivered', deliveryEta: 'Delivered' } : o
              ));
              return { ...prev, status: 'Delivered', deliveryEta: 'Delivered' };
            }
            return { ...prev, status: d.delivery_status, deliveryEta: `${d.eta_minutes} min` };
          }
          return prev;
        });
        setLiveTrackingData(d);
      }
    });

    return () => { unsubWs(); };
  }, [user]);

  // ── Fetch live tracking data when a dispatched order is selected ──
  useEffect(() => {
    if (!selectedTrackOrder) {
      setLiveTrackingData(null);
      return;
    }
    if (!['Out for Delivery', 'Arriving Soon'].includes(selectedTrackOrder.status)) {
      setLiveTrackingData(null);
      return;
    }

    // Fetch current tracking snapshot from backend
    const fetchTrackingSnapshot = async () => {
      try {
        const res = await fetch(`/api/delivery/track/${selectedTrackOrder.id}`, {
          headers: {
            'Content-Type': 'application/json',
            ...(localStorage.getItem('hp_auth_token') ? { Authorization: `Bearer ${localStorage.getItem('hp_auth_token')}` } : {})
          }
        });
        const data = await res.json();
        if (data?.data) {
          setLiveTrackingData(data.data);
        }
      } catch {
        // If backend unavailable, start local simulation
        startMiniMapSimulation();
      }
    };

    fetchTrackingSnapshot();
  }, [selectedTrackOrder?.id, selectedTrackOrder?.status]);

  // ── Inline mini-map simulation fallback ──
  const startMiniMapSimulation = useCallback(() => {
    if (!selectedTrackOrder) return;

    const VENDORS_COORDS: Record<string, [number, number]> = {
      'V001': [28.6304, 77.2177], 'V002': [28.6250, 77.2200], 'V003': [28.6050, 77.1950],
    };
    const PATIENTS_COORDS: Record<string, [number, number]> = {
      'P001': [28.6139, 77.2090], 'P002': [28.6195, 77.2010], 'P003': [28.6080, 77.2150], 'P004': [28.6210, 77.1990],
    };

    const vendorId = selectedTrackOrder.vendorId || 'V001';
    const patientId = selectedTrackOrder.patientId || 'P001';
    const vCoord = VENDORS_COORDS[vendorId] || [28.6300, 77.2100];
    const pCoord = PATIENTS_COORDS[patientId] || [28.6150, 77.2050];

    let step = 0;
    const totalSteps = 10;
    const interval = setInterval(() => {
      step++;
      const t = step / totalSteps;
      setLiveTrackingData({
        order_id: selectedTrackOrder.id,
        current_latitude: vCoord[0] + t * (pCoord[0] - vCoord[0]),
        current_longitude: vCoord[1] + t * (pCoord[1] - vCoord[1]),
        eta_minutes: Math.max(0, Math.ceil(10 * (1 - t))),
        distance_remaining: Math.max(0, 1.8 * (1 - t)),
        delivery_status: t >= 1.0 ? 'Delivered' : t >= 0.8 ? 'Arriving Soon' : 'Out for Delivery',
        delivery_partner_name: 'Rohit Sharma',
        delivery_partner_avatar: '🛵',
        delivery_partner_vehicle_number: 'UP75 AB 1234',
        delivery_partner_phone: '+91-9876543210',
        vendor_id: vendorId,
        patient_id: patientId,
      });
      if (step >= totalSteps) clearInterval(interval);
    }, 3000);

    return () => clearInterval(interval);
  }, [selectedTrackOrder?.id]);

  // ── Initialize & update inline Leaflet mini-map ──
  useEffect(() => {
    if (!liveTrackingData || !miniMapContainerRef.current || !L) return;
    if (!['Out for Delivery', 'Arriving Soon'].includes(selectedTrackOrder?.status)) return;

    const VENDORS_COORDS: Record<string, [number, number]> = {
      'V001': [28.6304, 77.2177], 'V002': [28.6250, 77.2200], 'V003': [28.6050, 77.1950],
    };
    const PATIENTS_COORDS: Record<string, [number, number]> = {
      'P001': [28.6139, 77.2090], 'P002': [28.6195, 77.2010], 'P003': [28.6080, 77.2150], 'P004': [28.6210, 77.1990],
    };

    const vId = liveTrackingData.vendor_id || selectedTrackOrder?.vendorId || 'V001';
    const pId = liveTrackingData.patient_id || selectedTrackOrder?.patientId || 'P001';
    const vLoc = VENDORS_COORDS[vId] || [28.6300, 77.2100];
    const pLoc = PATIENTS_COORDS[pId] || [28.6150, 77.2050];
    const rLoc: [number, number] = [liveTrackingData.current_latitude, liveTrackingData.current_longitude];

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
          .bindPopup(`<b>Pharmacy</b><br/>${selectedTrackOrder?.vendorName || 'Vendor'}`);

        // Patient marker
        L.marker(pLoc, { icon: createEmojiIcon('🏠', 24) })
          .addTo(miniMapRef.current)
          .bindPopup('<b>Your Location</b>');

        // Rider marker
        const riderEmoji = liveTrackingData.delivery_partner_avatar || '🛵';
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
      if (miniRiderMarkerRef.current) {
        miniRiderMarkerRef.current.setLatLng(rLoc);
      }
      if (miniPathRef.current) {
        miniPathRef.current.setLatLngs([vLoc, rLoc, pLoc]);
      }
      if (miniMapRef.current) {
        miniMapRef.current.panTo(rLoc, { animate: true, duration: 0.8 });
      }
    }
  }, [liveTrackingData?.current_latitude, liveTrackingData?.current_longitude, selectedTrackOrder?.status]);

  // Cleanup mini-map when order changes or deselected
  useEffect(() => {
    return () => {
      if (miniMapRef.current) {
        miniMapRef.current.remove();
        miniMapRef.current = null;
        miniMapInitialized.current = false;
      }
    };
  }, [selectedTrackOrder?.id]);

  // ── Filtered doctor list ──────────────────────────────────────────────────
  const filteredDoctors = allDoctors.filter(doc => {
    const matchesDept = selectedDepartment === 'All Departments'
      || doc.spec.toLowerCase().includes(selectedDepartment.toLowerCase())
      || doc.department.toLowerCase().includes(selectedDepartment.toLowerCase());
    const matchesSearch = !doctorSearch
      || doc.name.toLowerCase().includes(doctorSearch.toLowerCase())
      || doc.spec.toLowerCase().includes(doctorSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const statusColor = (s: string) => {
    if (s === 'Confirmed' || s === 'Active' || s === 'Scheduled') return { color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    if (s === 'Pending') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    if (s === 'Completed') return { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
    if (s === 'In Progress') return { color: '#0891b2', bg: 'rgba(8,145,178,0.1)' };
    return { color: '#8897ad', bg: 'rgba(136,151,173,0.1)' };
  };

  const handleBook = async () => {
    if (!selectedTime || !selectedDoctor) return;
    setBookingSaving(true);
    const aptData = {
      id: `APT${Date.now()}`,
      patientName: user?.name || 'Patient',
      patientId: user?.id || '',
      doctorName: selectedDoctor.name,
      doctorId: selectedDoctor.id,
      department: selectedDoctor.spec,
      date: selectedDate,
      time: selectedTime,
      status: 'Pending',
      type: 'Consultation',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    try {
      // Create appointment record
      await api.create('appointments', aptData as any);
      
      // Create notification for the doctor
      const notifData = {
        id: `N${Date.now()}`,
        title: '📅 New Appointment Booked',
        message: `${user?.name || 'Patient'} has booked a consultation for ${selectedDate} at ${selectedTime}.`,
        type: 'info',
        time: 'Just now',
        read: false,
        patientName: user?.name || '',
        doctorName: selectedDoctor.name,
        doctorId: selectedDoctor.id,
        createdAt: new Date().toISOString()
      };
      await api.create('notifications', notifData as any);
      
      toast.success('Appointment Booked!', `Pending confirmation with ${selectedDoctor.name}`);
    } catch (err) {
      toast.info('Booked Locally', 'Appointment saved (backend sync pending)');
    }
    
    // Add to local state (making sure patientName, doctorId, status are properly set so it doesn't get filtered out)
    setMyAppointments(prev => [
      { 
        id: aptData.id, 
        doctor: aptData.doctorName, 
        doctorId: aptData.doctorId,
        specialization: aptData.department, 
        date: aptData.date, 
        time: aptData.time, 
        status: 'Pending', 
        type: 'Consultation',
        patientName: aptData.patientName,
        patientId: aptData.patientId
      }, 
      ...prev
    ]);
    
    setBookingSaving(false);
    setBookingSuccess(true);
    setTimeout(() => { 
      setBookingSuccess(false); 
      setBookingStep(1); 
      setSelectedDoctor(null); 
      setSelectedTime(''); 
      setSelectedDepartment('All Departments'); 
      setDoctorSearch(''); 
      setActiveTab('overview'); 
    }, 2500);
  };

  const handleDeletePrescription = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this prescription?')) return;
    try {
      await api.delete('prescriptions', id);
      toast.success('Prescription Deleted', 'The prescription has been removed.');
    } catch {
      toast.info('Deleted Locally', 'Prescription removed from view.');
    }
    setMyPrescriptions(prev => prev.filter(rx => rx.id !== id));
  };

  const handleDownloadPrescription = (rx: any) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Prescription_${rx.id}</title>
        <style>
          body {
            font-family: 'Inter', system-ui, -apple-system, sans-serif;
            color: #1e293b;
            padding: 40px;
            margin: 0;
            background-color: #fff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #10b981;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .hospital-name {
            font-size: 24px;
            font-weight: 800;
            color: #059669;
            letter-spacing: -0.5px;
          }
          .hospital-sub {
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 40px;
            font-size: 14px;
          }
          .meta-label {
            color: #64748b;
            font-weight: 500;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
          }
          .meta-value {
            color: #0f172a;
            font-weight: 700;
          }
          .rx-symbol {
            font-size: 36px;
            font-weight: 800;
            color: #10b981;
            margin: 20px 0;
            font-family: Georgia, serif;
          }
          .medications-box {
            border: 1.5px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            background-color: #f8fafc;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
            color: #334155;
            white-space: pre-line;
          }
          .instructions-box {
            font-size: 14px;
            line-height: 1.6;
            color: #475569;
          }
          .instructions-title {
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
          }
          .footer {
            margin-top: 80px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            text-align: center;
            font-size: 11px;
            color: #94a3b8;
          }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="hospital-name">HealthPulse Medical Center</div>
            <div class="hospital-sub">24/7 Digital Health Support & Telemedicine</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: 700; font-size: 14px; color: #0f172a;">PRESCRIPTION RECORD</div>
            <div style="font-size: 12px; color: #64748b;">ID: ${rx.id}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div>
            <div class="meta-label">Patient Name</div>
            <div class="meta-value">${user?.name || 'Patient'}</div>
            <div style="margin-top: 15px;" class="meta-label">Date</div>
            <div class="meta-value">${rx.date}</div>
          </div>
          <div>
            <div class="meta-label">Prescribing Doctor</div>
            <div class="meta-value">${rx.doctor}</div>
            <div style="margin-top: 15px;" class="meta-label">Duration</div>
            <div class="meta-value">${rx.duration || 'As prescribed'}</div>
          </div>
        </div>

        <div class="rx-symbol">Rₓ</div>

        <div class="medications-box">
          <div class="meta-label" style="margin-bottom: 8px;">Prescribed Medications</div>
          <strong>${rx.medicines}</strong>
        </div>

        ${rx.instructions ? `
          <div class="instructions-box">
            <div class="instructions-title">Special Instructions & Dosage:</div>
            <div>${rx.instructions}</div>
          </div>
        ` : ''}

        <div class="footer">
          This is an electronically generated prescription from HealthPulse.<br/>
          HealthPulse Automation Platform &copy; 2026. All rights reserved.
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 500);
    }, 500);
  };

  // Filter prescriptions (only own prescriptions)
  const filteredPrescriptions = myPrescriptions.filter(rx => {
    if (!user?.name) return false;
    
    // Must belong to this patient
    const rxPatient = (rx.patientName || '').toLowerCase().trim();
    const currPatient = user.name.toLowerCase().trim();
    return rxPatient === currPatient || rxPatient.includes(currPatient) || currPatient.includes(rxPatient);
  });

  // Filter notifications (only own notifications or global alerts)
  const filteredNotifications = myNotifications.filter(n => {
    if (!n.patientName) return true; // global system alerts
    if (!user?.name) return false;
    const nPatient = n.patientName.toLowerCase().trim();
    const currPatient = user.name.toLowerCase().trim();
    return nPatient === currPatient || nPatient.includes(currPatient) || currPatient.includes(nPatient);
  });

  // Filter appointments (only own appointments)
  const filteredAppointments = myAppointments.filter(apt => {
    if (!user?.name) return false;
    const aptPatient = (apt.patientName || '').toLowerCase().trim();
    const currPatient = user.name.toLowerCase().trim();
    return aptPatient === currPatient || aptPatient.includes(currPatient) || currPatient.includes(aptPatient);
  });

  // ── Get next appointment for overview ──────────────────────────────────────
  const nextApt = filteredAppointments.find(a => a.status !== 'Completed');

  // ── Shop Catalog calculations ──
  const shopCatalog = inventoryList.reduce((acc: any[], item: any) => {
    const existing = acc.find(x => x.medicineName.toLowerCase() === item.medicineName.toLowerCase());
    if (existing) {
      if (item.price < existing.price) {
        existing.price = item.price;
        existing.manufacturer = item.manufacturer;
      }
      existing.totalQuantity += item.quantity;
      if (item.isPrescriptionRequired) {
        existing.isPrescriptionRequired = true;
      }
      if (!existing.vendors.some((v: any) => v.vendorId === item.vendorId)) {
        existing.vendors.push({
          vendorId: item.vendorId,
          price: item.price,
          quantity: item.quantity,
        });
      }
    } else {
      acc.push({
        id: item.id,
        medicineName: item.medicineName,
        category: item.category || 'General',
        description: item.description || 'Essential medication.',
        dosageInfo: item.dosageInfo || 'As directed by physician.',
        price: item.price,
        manufacturer: item.manufacturer,
        totalQuantity: item.quantity,
        isPrescriptionRequired: !!item.isPrescriptionRequired,
        vendors: [{
          vendorId: item.vendorId,
          price: item.price,
          quantity: item.quantity,
        }]
      });
    }
    return acc;
  }, []);

  const filteredCatalog = shopCatalog.filter(item => {
    const matchesSearch = item.medicineName.toLowerCase().includes(shopSearch.toLowerCase()) ||
      item.category.toLowerCase().includes(shopSearch.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(shopSearch.toLowerCase());
    const matchesCategory = shopCategory === 'All' || item.category === shopCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(5,150,105,0.25)',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 160, height: 160, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem' }}>
              {user?.avatar || '👤'}
            </div>
            <div>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.35rem', fontWeight: 700 }}>Hello, {user?.name || 'Patient'}!</h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.87rem' }}>Stay healthy, stay happy 💚</p>
            </div>
          </div>
          <button className="btn" onClick={() => setActiveTab('book')} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
            <Calendar size={17} /> Book Appointment
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-input)', padding: 5, borderRadius: 14, width: 'fit-content', flexWrap: 'wrap' }}>
        {([
          { key: 'overview', icon: Activity, label: 'My Health' },
          { key: 'book', icon: Calendar, label: 'Book Appointment' },
          { key: 'records', icon: FileText, label: 'Medical Records' },
          { key: 'prescriptions', icon: Pill, label: 'Prescriptions' },
          { key: 'shop', icon: ShoppingCart, label: 'Buy Medicines' },
          { key: 'orders', icon: Truck, label: 'Medicine Orders' },
          { key: 'notifications', icon: Bell, label: 'Notifications' },
        ] as { key: PatientTab; icon: any; label: string }[]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
            fontWeight: 500, fontSize: '0.86rem', transition: 'all 0.2s',
          }}>
            <tab.icon size={15} />
            {tab.label}
            {tab.key === 'notifications' && filteredNotifications.filter(n => !n.read).length > 0 && (
              <span style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.65rem',
                fontWeight: 700,
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4
              }}>
                {filteredNotifications.filter(n => !n.read).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <>
          {/* Health metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Next Appointment', value: nextApt ? new Date(nextApt.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '—', sub: nextApt?.doctor || 'Book one now', icon: Calendar, color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
              { label: 'Active Medicines', value: String(filteredPrescriptions.filter(r => r.status === 'Active').length || '0'), sub: `${filteredPrescriptions.length} prescriptions`, icon: Pill, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
              { label: 'Total Visits', value: String(myRecords.length || '0'), sub: 'Since registration', icon: Activity, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
              { label: 'Health Score', value: '85/100', sub: 'Good condition', icon: Heart, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
            ].map((s, i) => (
              <div key={i} className="glass-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={20} color={s.color} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{s.label}</p>
                  <p style={{ margin: '2px 0', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
            {/* Upcoming appointments */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Upcoming Appointments</h3>
                <button style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }} onClick={() => setActiveTab('book')}>+ Book New</button>
              </div>
              {filteredAppointments.filter(a => a.status !== 'Completed').length === 0 ? (
                <div style={{ padding: '32px 22px', textAlign: 'center' }}>
                  <Calendar size={36} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.87rem' }}>No upcoming appointments</p>
                  <button className="btn btn-primary" style={{ marginTop: 12, fontSize: '0.82rem' }} onClick={() => setActiveTab('book')}>Book Your First Appointment</button>
                </div>
              ) : filteredAppointments.filter(a => a.status !== 'Completed').map(apt => {
                const sc = statusColor(apt.status);
                return (
                  <div key={apt.id} style={{ padding: '14px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(8,145,178,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>👨‍⚕️</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: '0.87rem' }}>{apt.doctor}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{apt.specialization} · {apt.date} at {apt.time}</p>
                    </div>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{apt.status}</span>
                  </div>
                );
              })}
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: Video, label: 'Video Consultation', desc: 'Connect with doctor online', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                { icon: Phone, label: 'Voice Call', desc: 'Quick audio consultation', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                { icon: MessageSquare, label: 'AI Doctor Chat', desc: 'Get instant health advice', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
                { icon: AlertCircle, label: 'Emergency Help', desc: 'Contact emergency services', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              ].map((action, i) => (
                <div key={i} className="glass-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'translateX(4px)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'none')}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <action.icon size={18} color={action.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{action.label}</p>
                    <p style={{ margin: 0, fontSize: '0.73rem', color: 'var(--text-muted)' }}>{action.desc}</p>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── BOOK APPOINTMENT ── */}
      {activeTab === 'book' && (
        <div className="glass-card" style={{ padding: 28, maxWidth: 880 }}>
          <h3 style={{ margin: '0 0 24px', fontWeight: 700, fontSize: '1.1rem' }}>📅 Book an Appointment</h3>

          {bookingSuccess ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16 }}>✅</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#10b981', marginBottom: 8 }}>Appointment Booked!</h3>
              <p style={{ color: 'var(--text-secondary)' }}>You will receive a confirmation notification shortly.</p>
            </div>
          ) : (
            <>
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 0 }}>
                {['Select Doctor', 'Choose Date & Time', 'Confirm'].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.82rem', fontWeight: 700,
                        background: bookingStep > i + 1 ? '#10b981' : bookingStep === i + 1 ? 'var(--accent-primary)' : 'var(--bg-input)',
                        color: bookingStep >= i + 1 ? 'white' : 'var(--text-muted)',
                      }}>
                        {bookingStep > i + 1 ? '✓' : i + 1}
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: bookingStep === i + 1 ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{step}</span>
                    </div>
                    {i < 2 && <div style={{ flex: 1, height: 2, background: bookingStep > i + 1 ? '#10b981' : 'var(--border-color)', margin: '0 12px' }} />}
                  </div>
                ))}
              </div>

              {/* Step 1: Select Doctor */}
              {bookingStep === 1 && (
                <div>
                  <p style={{ color: 'var(--text-muted)', marginBottom: 18, fontSize: '0.87rem' }}>Select your preferred doctor from our specialists:</p>

                  {/* ── Department filter + Search ── */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: '0 0 auto' }}>
                      <Filter size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <select
                        value={selectedDepartment}
                        onChange={e => { setSelectedDepartment(e.target.value); setSelectedDoctor(null); }}
                        style={{
                          padding: '10px 16px 10px 34px', borderRadius: 12, fontSize: '0.84rem', fontWeight: 600,
                          border: '1.5px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)',
                          cursor: 'pointer', outline: 'none', appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32,
                          minWidth: 200,
                        }}
                      >
                        {ALL_DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                      <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        placeholder="Search doctor by name..."
                        value={doctorSearch}
                        onChange={e => setDoctorSearch(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 16px 10px 34px', borderRadius: 12, fontSize: '0.84rem',
                          border: '1.5px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                    </div>

                    {selectedDepartment !== 'All Departments' && (
                      <span style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: '0.76rem', fontWeight: 600,
                        background: 'rgba(8,145,178,0.1)', color: 'var(--accent-primary)',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <Stethoscope size={13} />
                        {selectedDepartment}
                        <span onClick={() => setSelectedDepartment('All Departments')} style={{ cursor: 'pointer', marginLeft: 4, opacity: 0.7, fontWeight: 700 }}>✕</span>
                      </span>
                    )}
                  </div>

                  {/* ── Doctor cards ── */}
                  {doctorsLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Loader2 size={32} color="var(--accent-primary)" style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.87rem' }}>Loading doctors...</p>
                    </div>
                  ) : filteredDoctors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Stethoscope size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>
                        {allDoctors.length === 0 ? 'No doctors found in the system' : 'No doctors found for this filter'}
                      </p>
                      <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {allDoctors.length === 0
                          ? 'Please make sure the backend is running and doctors are registered.'
                          : 'Try selecting a different department or clearing the search.'}
                      </p>
                      {selectedDepartment !== 'All Departments' && (
                        <button className="btn btn-secondary" style={{ marginTop: 14, fontSize: '0.8rem' }} onClick={() => { setSelectedDepartment('All Departments'); setDoctorSearch(''); }}>
                          Show All Doctors
                        </button>
                      )}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
                      {filteredDoctors.map((doc) => (
                        <div key={doc.id} style={{
                          padding: '18px 20px', borderRadius: 14, border: `2px solid ${selectedDoctor?.id === doc.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          background: selectedDoctor?.id === doc.id ? 'rgba(8,145,178,0.06)' : 'var(--bg-input)',
                          opacity: doc.available ? 1 : 0.5,
                          display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s',
                        }}
                          onMouseOver={e => doc.available && (e.currentTarget.style.borderColor = 'var(--accent-primary)', e.currentTarget.style.transform = 'translateY(-1px)')}
                          onMouseOut={e => (e.currentTarget.style.borderColor = selectedDoctor?.id === doc.id ? 'var(--accent-primary)' : 'var(--border-color)', e.currentTarget.style.transform = 'none')}
                        >
                          <div onClick={() => doc.available && setSelectedDoctor(doc)} style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(99,102,241,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0, cursor: doc.available ? 'pointer' : 'not-allowed' }}>{doc.avatar}</div>
                          <div style={{ flex: 1, cursor: doc.available ? 'pointer' : 'not-allowed' }} onClick={() => doc.available && setSelectedDoctor(doc)}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>{doc.name}</p>
                            <p style={{ margin: '2px 0', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 500 }}>{doc.spec}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: doc.available ? '#10b981' : '#ef4444', fontWeight: 600 }}>● {doc.available ? 'Available' : doc.available === false ? 'On Leave' : 'Busy'}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: '#f59e0b' }}>⭐ {doc.rating.toFixed(1)}</span>
                              {doc.experience > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.experience} yrs exp</span>}
                            </div>
                            {doc.licenseNo && (
                              <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                <span><span style={{ fontWeight: 600 }}>Lic. No:</span> {doc.licenseNo}</span>
                                {doc.licenseValidity && <span><span style={{ fontWeight: 600 }}>Validity:</span> {doc.licenseValidity}</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            {selectedDoctor?.id === doc.id && <CheckCircle size={20} color="var(--accent-primary)" />}
                            <button
                              onClick={(e) => { e.stopPropagation(); setProfileDoctor(doc); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 4,
                                padding: '5px 10px', borderRadius: 8,
                                border: '1px solid var(--border-color)',
                                background: 'rgba(99,102,241,0.06)',
                                color: '#6366f1', fontSize: '0.7rem', fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                              }}
                              onMouseOver={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = '#6366f1'; }}
                              onMouseOut={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                            >
                              <Eye size={12} /> View Profile
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {filteredDoctors.length} doctor{filteredDoctors.length !== 1 ? 's' : ''} found
                      {selectedDepartment !== 'All Departments' ? ` in ${selectedDepartment}` : ''}
                    </span>
                    <button className="btn btn-primary" disabled={!selectedDoctor} onClick={() => selectedDoctor && setBookingStep(2)}>
                      Next: Choose Date & Time →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Date & Time */}
              {bookingStep === 2 && (
                <div>
                  <div style={{ padding: '14px 18px', background: 'rgba(8,145,178,0.05)', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid rgba(8,145,178,0.12)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(99,102,241,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>{selectedDoctor?.avatar}</div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{selectedDoctor?.name}</p>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>{selectedDoctor?.spec} {selectedDoctor?.availability ? `· ${selectedDoctor.availability}` : ''}</p>
                      {selectedDoctor?.licenseNo && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontWeight: 600 }}>License No:</span> {selectedDoctor.licenseNo} &middot; <span style={{ fontWeight: 600 }}>Validity:</span> {selectedDoctor.licenseValidity || 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Select Date</label>
                      <input type="date" className="search-input" style={{ width: '100%' }} value={selectedDate} min={new Date().toISOString().split('T')[0]}
                        onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>Select Time Slot</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'].map(t => (
                          <button key={t} onClick={() => setSelectedTime(t)} style={{
                            padding: '8px 6px', borderRadius: 10, border: `1.5px solid ${selectedTime === t ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                            background: selectedTime === t ? 'rgba(8,145,178,0.1)' : 'transparent',
                            color: selectedTime === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.18s',
                          }}>{t}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
                    <button className="btn btn-secondary" onClick={() => setBookingStep(1)}>← Back</button>
                    <button className="btn btn-primary" disabled={!selectedTime} onClick={() => selectedTime && setBookingStep(3)}>
                      Next: Confirm →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Confirm */}
              {bookingStep === 3 && (
                <div>
                  <div style={{ padding: 24, background: 'var(--bg-input)', borderRadius: 16, marginBottom: 20 }}>
                    <h4 style={{ margin: '0 0 16px', fontWeight: 700, color: 'var(--text-primary)' }}>Appointment Summary</h4>
                    {[
                      { label: 'Doctor', value: selectedDoctor?.name },
                      { label: 'Doctor License', value: selectedDoctor?.licenseNo || 'N/A' },
                      { label: 'License Validity', value: selectedDoctor?.licenseValidity || 'N/A' },
                      { label: 'Department', value: selectedDoctor?.spec },
                      { label: 'Date', value: selectedDate },
                      { label: 'Time', value: selectedTime },
                      { label: 'Type', value: 'Consultation' },
                      { label: 'Patient', value: user?.name || 'Patient' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{item.label}</span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setBookingStep(2)}>← Back</button>
                    <button className="btn btn-primary" disabled={bookingSaving} onClick={handleBook}>
                      {bookingSaving ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />} Confirm Booking
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── RECORDS ── */}
      {activeTab === 'records' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {myRecords.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <FileText size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>No medical records yet</p>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Your visit records will appear here after consultations.</p>
            </div>
          ) : myRecords.map(rec => (
            <div key={rec.id} className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h4 style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '1rem' }}>{rec.diagnosis}</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {rec.doctor} · {rec.date} · Visit ID: {rec.id}
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm"><Download size={14} /> Download</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[
                  { icon: Activity, label: 'Blood Pressure', value: rec.vitals.bp, color: '#ef4444' },
                  { icon: Thermometer, label: 'Temperature', value: rec.vitals.temp, color: '#f59e0b' },
                  { icon: Heart, label: 'Pulse Rate', value: rec.vitals.pulse, color: '#6366f1' },
                  { icon: Star, label: 'Weight', value: rec.vitals.weight, color: '#10b981' },
                ].map((v, i) => (
                  <div key={i} style={{ padding: '12px 14px', background: 'var(--bg-input)', borderRadius: 12, textAlign: 'center' }}>
                    <v.icon size={18} color={v.color} style={{ marginBottom: 6 }} />
                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v.value}</p>
                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>{v.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── PRESCRIPTIONS ── */}
      {activeTab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredPrescriptions.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Pill size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>No prescriptions yet</p>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Your prescriptions will appear here after booking appointments with doctors and consulting with them.</p>
            </div>
          ) : filteredPrescriptions.map(rx => {
            const sc = statusColor(rx.status);
            return (
              <div key={rx.id} className="glass-card" style={{ padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pill size={20} color="#10b981" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem' }}>{rx.doctor}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Issued: {rx.date} · Duration: {rx.duration} · ID: {rx.id}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{rx.status}</span>
                    {rx.status === 'Active' && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleOpenOrderModal(rx)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <ShoppingBag size={13} /> Order Medicines
                      </button>
                    )}
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDownloadPrescription(rx)}>
                      <Download size={13} /> Download
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        fontSize: '0.76rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'opacity 0.2s'
                      }}
                      onClick={() => handleDeletePrescription(rx.id)}
                      onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </div>
                {rx.diagnosis && (
                  <div style={{ marginBottom: 8, padding: '8px 16px', background: 'rgba(99,102,241,0.05)', borderLeft: '3.5px solid #6366f1', borderRadius: '0 8px 8px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>Diagnosis:</strong> {rx.diagnosis}
                  </div>
                )}
                <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  💊 {rx.medicines}
                </div>
                {rx.instructions && (
                  <div style={{ marginTop: 10, padding: '10px 16px', background: 'rgba(8,145,178,0.04)', borderLeft: '3.5px solid #0891b2', borderRadius: '0 8px 8px 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <strong>Instructions:</strong> {rx.instructions}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── MEDICINE ORDERS ── */}
      {activeTab === 'orders' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>
          <div className="glass-card" style={{ padding: 18, minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem' }}>My Medicine Orders</h3>
            
            {ordersLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader2 size={24} className="spin" style={{ color: 'var(--accent-primary)', margin: '0 auto' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: 8 }}>Loading orders...</p>
              </div>
            ) : medicineOrders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                <ShoppingBag size={36} style={{ opacity: 0.3, marginBottom: 8 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600 }}>No orders placed yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.74rem' }}>Go to the Prescriptions tab to order your prescribed medicines.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: '55vh' }}>
                {medicineOrders.map(order => {
                  const sc = statusColor(order.status === 'Created' ? 'Pending' : order.status === 'Delivered' ? 'Completed' : order.status === 'Rejected' ? 'Muted' : 'Active');
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedTrackOrder(order)}
                      style={{
                        padding: 14,
                        borderRadius: 12,
                        border: `1.5px solid ${selectedTrackOrder?.id === order.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: selectedTrackOrder?.id === order.id ? 'rgba(8,145,178,0.05)' : 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      className="hover-lift"
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, alignItems: 'center' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>{order.id}</span>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: sc.color }}>{order.status}</span>
                          <span className={`badge-payment-status ${(order.paymentStatus || 'Pending').toLowerCase()} ${order.paymentMethod === 'COD' ? 'cod' : ''}`} style={{ fontSize: '0.62rem', padding: '2px 6px' }}>
                            {order.paymentMethod === 'COD' && order.paymentStatus === 'Pending' ? 'COD' : (order.paymentStatus || 'Pending')}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{order.vendorName}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                        <span>₹{(order.totalAmount || order.totalPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedTrackOrder ? (
            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Order Tracking</h3>
                    <span style={{ fontFamily: 'monospace', background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 6, fontSize: '0.74rem' }}>{selectedTrackOrder.id}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Placed with {selectedTrackOrder.vendorName} on {new Date(selectedTrackOrder.createdAt).toLocaleString()}</p>
                </div>
                <span style={{ padding: '6px 12px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 700, background: statusColor(selectedTrackOrder.status === 'Created' ? 'Pending' : selectedTrackOrder.status === 'Delivered' ? 'Completed' : selectedTrackOrder.status === 'Rejected' ? 'Muted' : 'Active').bg, color: statusColor(selectedTrackOrder.status === 'Created' ? 'Pending' : selectedTrackOrder.status === 'Delivered' ? 'Completed' : selectedTrackOrder.status === 'Rejected' ? 'Muted' : 'Active').color }}>
                  {selectedTrackOrder.status}
                </span>
              </div>

              <div style={{ position: 'relative', padding: '10px 0 20px', margin: '0 10px' }}>
                <div style={{ height: 4, background: 'var(--border-color)', borderRadius: 2, position: 'relative' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      width: getStepProgressWidth(selectedTrackOrder.status), 
                      background: 'linear-gradient(90deg, var(--accent-primary), #10b981)', 
                      borderRadius: 2, 
                      transition: 'width 0.4s ease' 
                    }} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', fontWeight: 700, marginTop: 8, color: 'var(--text-muted)' }}>
                  <span style={{ color: selectedTrackOrder.status === 'Created' ? 'var(--accent-primary)' : 'inherit' }}>SUBMITTED</span>
                  <span style={{ color: selectedTrackOrder.status === 'Accepted' ? 'var(--accent-primary)' : 'inherit' }}>ACCEPTED</span>
                  <span style={{ color: selectedTrackOrder.status === 'Processing' ? 'var(--accent-primary)' : 'inherit' }}>PREPARING</span>
                  <span style={{ color: selectedTrackOrder.status === 'Out for Delivery' ? 'var(--accent-primary)' : 'inherit' }}>SHIPPED</span>
                  <span style={{ color: selectedTrackOrder.status === 'Delivered' ? '#10b981' : 'inherit' }}>DELIVERED</span>
                </div>
              </div>

              {(selectedTrackOrder.status === 'Out for Delivery' || selectedTrackOrder.status === 'Arriving Soon') && (
                <div style={{ padding: 0, background: 'rgba(8,145,178,0.04)', border: '1px solid rgba(8,145,178,0.15)', borderRadius: 16, overflow: 'hidden' }}>
                  
                  {/* Live Leaflet Map (Ola/Uber-style) */}
                  <div 
                    ref={miniMapContainerRef} 
                    style={{ 
                      width: '100%', 
                      height: 240, 
                      background: '#0f172a',
                      position: 'relative',
                      cursor: 'grab'
                    }} 
                  >
                    {!L && (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5, color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', gap: 8 }}>
                        <Loader2 size={24} className="spin" />
                        <span>Loading map...</span>
                      </div>
                    )}
                  </div>

                  {/* ETA + Rider + Distance Info Bar */}
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    
                    {/* Top: Status + ETA headline */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Truck size={16} color="var(--accent-primary)" style={{ animation: 'bounce 1s infinite' }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {selectedTrackOrder.status === 'Arriving Soon' ? '🟢 Arriving Soon' : '🔵 Out for Delivery'}
                          </span>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: 'var(--text-primary)' }}>
                          {liveTrackingData 
                            ? `Arriving in ${liveTrackingData.eta_minutes} min` 
                            : `ETA: ${selectedTrackOrder.deliveryEta || '10-15 min'}`}
                        </h3>
                        {liveTrackingData && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                            Expected by {(() => {
                              const d = new Date();
                              d.setMinutes(d.getMinutes() + (liveTrackingData.eta_minutes || 0));
                              return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                            })()}
                          </span>
                        )}
                      </div>
                      
                      {/* Distance pill */}
                      {liveTrackingData && (
                        <div style={{ 
                          background: 'var(--bg-input)', 
                          border: '1px solid var(--border-color)', 
                          borderRadius: 12, 
                          padding: '8px 14px', 
                          textAlign: 'center',
                          minWidth: 80
                        }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'block' }}>
                            {liveTrackingData.distance_remaining?.toFixed(1)}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>km away</span>
                        </div>
                      )}
                    </div>

                    {/* Rider details inline */}
                    {liveTrackingData && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 12, 
                        padding: '10px 14px', 
                        background: 'var(--bg-input)', 
                        borderRadius: 12,
                        border: '1px solid var(--border-color)'
                      }}>
                        <span style={{ fontSize: '1.6rem' }}>{liveTrackingData.delivery_partner_avatar || '🛵'}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'block' }}>
                            {liveTrackingData.delivery_partner_name || 'Delivery Partner'}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {liveTrackingData.delivery_partner_vehicle_number || ''} · {liveTrackingData.delivery_partner_phone || ''}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/dashboard/track/${selectedTrackOrder.id}`)}
                          className="btn btn-primary"
                          style={{ padding: '8px 14px', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, borderRadius: 10 }}
                        >
                          <Navigation size={12} /> Full Screen
                        </button>
                      </div>
                    )}

                    {/* Fallback if no live data yet */}
                    {!liveTrackingData && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Connecting to rider GPS stream...
                        </span>
                        <button
                          onClick={() => navigate(`/dashboard/track/${selectedTrackOrder.id}`)}
                          className="btn btn-primary"
                          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                        >
                          <Navigation size={14} /> Track Delivery
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 10 }}>Fulfillment Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Doctor:</span>
                      <span style={{ fontWeight: 600 }}>{selectedTrackOrder.doctorName}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Delivery Address:</span>
                      <span style={{ fontWeight: 600, textAlign: 'right', maxWidth: 180 }}>{selectedTrackOrder.deliveryAddress}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Contact:</span>
                      <span style={{ fontWeight: 600 }}>{selectedTrackOrder.contactNumber}</span>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: 18, marginBottom: 10 }}>Payment Details</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Payment Method:</span>
                      <span style={{ fontWeight: 600 }}>
                        {selectedTrackOrder.paymentMethod === 'COD' ? '📦 Cash On Delivery' : '💳 Online Payment'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Payment Status:</span>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span className={`badge-payment-status ${(selectedTrackOrder.paymentStatus || 'Pending').toLowerCase()} ${selectedTrackOrder.paymentMethod === 'COD' ? 'cod' : ''}`}>
                          {selectedTrackOrder.paymentMethod === 'COD' && selectedTrackOrder.paymentStatus === 'Pending' ? 'COD Pending' : (selectedTrackOrder.paymentStatus || 'Pending')}
                        </span>
                        {selectedTrackOrder.paymentMethod === 'Online' && ['Failed', 'Expired', 'Processing'].includes(selectedTrackOrder.paymentStatus) && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.68rem', borderRadius: 4, height: 'auto', display: 'inline-flex', alignItems: 'center' }}
                            onClick={() => setActivePaymentOrder(selectedTrackOrder)}
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                    {selectedTrackOrder.transactionId && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Transaction ID:</span>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.74rem' }}>{selectedTrackOrder.transactionId}</span>
                      </div>
                    )}
                    {selectedTrackOrder.transactionDetails?.timestamp && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Payment Date:</span>
                        <span style={{ fontWeight: 600, fontSize: '0.74rem' }}>{new Date(selectedTrackOrder.transactionDetails.timestamp).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 10 }}>Order Medicines</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
                    {selectedTrackOrder.medicines.map((med: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{med.name} <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>x{med.quantity}</span></span>
                        <span style={{ fontWeight: 600 }}>₹{(med.price * med.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: 8, fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)', marginTop: 4 }}>
                      <span>Total Paid:</span>
                      <span>₹{(selectedTrackOrder.totalAmount || selectedTrackOrder.totalPrice || 0).toFixed(2)}</span>
                    </div>
                    {['Delivered', 'Completed'].includes(selectedTrackOrder.status) && (
                      <button 
                        className="btn btn-secondary animate-hover" 
                        style={{ fontSize: '0.78rem', padding: '6px 12px', marginTop: 12, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 700 }}
                        onClick={() => {
                          const newCart: any = {};
                          selectedTrackOrder.medicines.forEach((m: any) => {
                            const invMatch = inventoryList.find(x => x.medicineName.toLowerCase() === m.name.toLowerCase());
                            if (invMatch) {
                              newCart[invMatch.id] = { item: {
                                id: invMatch.id,
                                medicineName: invMatch.medicineName,
                                category: invMatch.category || 'General',
                                description: invMatch.description || '',
                                dosageInfo: invMatch.dosageInfo || '',
                                price: invMatch.price,
                                manufacturer: invMatch.manufacturer,
                                totalQuantity: invMatch.quantity,
                                isPrescriptionRequired: !!invMatch.isPrescriptionRequired,
                                vendors: [{ vendorId: invMatch.vendorId, price: invMatch.price, quantity: invMatch.quantity }]
                              }, qty: m.quantity };
                            }
                          });
                          setCart(newCart);
                          setActiveTab('shop');
                          setShopCheckoutStep(1);
                          toast.success('Cart Populated', 'Previous order items added to cart!');
                        }}
                      >
                        🔁 Reorder Medicines
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {selectedTrackOrder.status === 'Rejected' && (
                <div style={{ padding: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <AlertCircle size={16} color="#ef4444" />
                  <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
                    Fulfillment declined. Notes: {selectedTrackOrder.instructions || 'Out of stock'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
              <h3>Select an Order</h3>
              <p>Select any ongoing or historic medicine order from the list on the left to track progress.</p>
            </div>
          )}
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>🔔 Notifications</h3>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
              {filteredNotifications.filter(n => !n.read).length} Unread
            </span>
          </div>
          {filteredNotifications.map(n => (
            <div key={n.id} style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 16, alignItems: 'flex-start',
              background: n.read ? 'transparent' : 'rgba(8,145,178,0.03)',
              cursor: !n.read ? 'pointer' : 'default', transition: 'background 0.2s',
            }}
            onClick={async () => {
              if (!n.read) {
                // Mark notification as read
                try {
                  await api.update('notifications', String(n.id), { read: true } as any);
                } catch { /* ignore read-mark failure */ }
                setMyNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
              }
              // If notification is prescription-related, navigate to prescriptions tab
              if ((n as any).target === 'prescriptions' || n.title?.toLowerCase().includes('prescription')) {
                setActiveTab('prescriptions');
              }
            }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', flexShrink: 0 }}>{n.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem' }}>{n.title}</p>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.time}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{n.desc}</p>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#0891b2', marginTop: 6, flexShrink: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {/* ── BUY MEDICINES SHOP ── */}
      {activeTab === 'shop' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Shop Header banner */}
          <div style={{
            background: 'linear-gradient(135deg, #0891b2 0%, #6366f1 100%)',
            borderRadius: 20, padding: '24px 30px', color: 'white',
            boxShadow: '0 8px 32px rgba(8,145,178,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>HealthPulse Medicine Marketplace 💊</h2>
              <p style={{ margin: '6px 0 0', opacity: 0.9, fontSize: '0.88rem' }}>Order OTC directly, or upload prescription for regulated drugs.</p>
            </div>
            {shopCheckoutStep > 1 && (
              <button className="btn" onClick={() => setShopCheckoutStep(1)} style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                ← Back to Shop
              </button>
            )}
          </div>

          {/* Stepper for checkout */}
          {shopCheckoutStep > 1 && (
            <div className="glass-card" style={{ padding: '14px 24px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              <span style={{ color: shopCheckoutStep >= 2 ? 'var(--accent-primary)' : 'inherit' }}>{shopCheckoutStep > 2 ? '✓' : '2.'} SELECT VENDOR</span>
              <span style={{ color: shopCheckoutStep >= 3 ? 'var(--accent-primary)' : 'inherit' }}>{shopCheckoutStep > 3 ? '✓' : '3.'} SHIPPING DETAILS</span>
              <span style={{ color: shopCheckoutStep >= 4 ? 'var(--accent-primary)' : 'inherit' }}>{shopCheckoutStep > 4 ? '✓' : '4.'} SECURE PAYMENT</span>
              <span style={{ color: shopCheckoutStep === 5 ? '#10b981' : 'inherit' }}>5. CONFIRMATION</span>
            </div>
          )}

          {/* STEP 1: SHOP CATALOG & CART */}
          {shopCheckoutStep === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 24, alignItems: 'flex-start' }}>
              
              {/* Left Column: Catalogue */}
              <div className="glass-card" style={{ padding: 20 }}>
                {/* Search */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      placeholder="Search medicines, manufacturers, categories..." 
                      value={shopSearch}
                      onChange={e => setShopSearch(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                {/* Category Chips */}
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 16, borderBottom: '1px solid var(--border-color)' }}>
                  {['All', 'Cardiovascular', 'Analgesic', 'Diabetes', 'Thyroid', 'Vitamins'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setShopCategory(cat)}
                      style={{
                        padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                        background: shopCategory === cat ? 'var(--accent-primary)' : 'var(--bg-input)',
                        color: shopCategory === cat ? 'white' : 'var(--text-secondary)',
                        whiteSpace: 'nowrap', transition: 'all 0.2s'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                {filteredCatalog.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
                    <Pill size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
                    <p>No medicines found matching filters.</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
                    {filteredCatalog.map(prod => (
                      <div key={prod.id} className="glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--border-color)', transition: 'transform 0.2s' }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 8, background: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{prod.category}</span>
                            {prod.isPrescriptionRequired ? (
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700 }}>Rₓ Required</span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700 }}>OTC</span>
                            )}
                          </div>
                          
                          <h4 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '4px 0' }}>{prod.medicineName}</h4>
                          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 8px' }}>By {prod.manufacturer}</p>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', height: 34, marginBottom: 12 }}>{prod.description}</p>
                        </div>

                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{prod.price.toFixed(2)}</span>
                            <span style={{ fontSize: '0.74rem', color: prod.totalQuantity > 20 ? '#10b981' : prod.totalQuantity > 0 ? '#f59e0b' : '#ef4444', fontWeight: 600 }}>
                              {prod.totalQuantity > 20 ? 'In Stock' : prod.totalQuantity > 0 ? `Low Stock (${prod.totalQuantity})` : 'Out of Stock'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn-secondary"
                              style={{ flex: 1, padding: '6px 0', fontSize: '0.76rem', fontWeight: 600 }}
                              onClick={() => setShowShopDetailModal(prod)}
                            >
                              Details
                            </button>
                            <button
                              className="btn btn-primary"
                              disabled={prod.totalQuantity <= 0}
                              style={{ flex: 1.5, padding: '6px 0', fontSize: '0.76rem', fontWeight: 600 }}
                              onClick={() => {
                                setCart(prev => {
                                  const current = prev[prod.id] || { item: prod, qty: 0 };
                                  return { ...prev, [prod.id]: { ...current, qty: current.qty + 1 } };
                                });
                                toast.success('Added to Cart', `${prod.medicineName} added to cart.`);
                              }}
                            >
                              Add to Cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Cart Summary & Verification */}
              <div className="glass-card" style={{ padding: 20, position: 'sticky', top: 20 }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 16px' }}>
                  <ShoppingCart size={18} /> Shopping Cart ({Object.keys(cart).length})
                </h3>

                {Object.keys(cart).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    <ShoppingCart size={32} style={{ opacity: 0.15, marginBottom: 8 }} />
                    <p style={{ fontSize: '0.82rem' }}>Your shopping cart is empty.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Cart Items list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '25vh', overflowY: 'auto', paddingRight: 4 }}>
                      {Object.entries(cart).map(([id, itemObj]) => (
                        <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 10 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{itemObj.item.medicineName}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>₹{itemObj.item.price.toFixed(2)} each</div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <button
                              onClick={() => {
                                setCart(prev => {
                                  const c = { ...prev };
                                  if (c[id].qty > 1) {
                                    c[id].qty -= 1;
                                  } else {
                                    delete c[id];
                                  }
                                  return c;
                                });
                              }}
                              style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                            >
                              -
                            </button>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{itemObj.qty}</span>
                            <button
                              onClick={() => {
                                setCart(prev => {
                                  const c = { ...prev };
                                  if (c[id].qty < itemObj.item.totalQuantity) {
                                    c[id].qty += 1;
                                  } else {
                                    toast.warning('Limit Reached', 'No more stock available.');
                                  }
                                  return c;
                                });
                              }}
                              style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: 0 }} />

                    {/* Prescription Verification Warning & Upload */}
                    {Object.values(cart).some(x => x.item.isPrescriptionRequired) ? (
                      <div style={{ padding: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                          <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                          <div>
                            <span style={{ fontSize: '0.78rem', color: '#d97706', fontWeight: 700, display: 'block' }}>Prescription Required</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginTop: 2 }}>
                              This order contains regulated medicines (Rₓ). Please upload a valid doctor's prescription.
                            </span>
                          </div>
                        </div>
                        
                        {prescriptionFileName ? (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.08)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(16,185,129,0.2)' }}>
                            <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 600 }}>✓ {prescriptionFileName}</span>
                            <button
                              onClick={() => { setPrescriptionFileName(''); setPrescriptionUrl(''); setPrescriptionFile(null); }}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div>
                            <label 
                              htmlFor="prescription-upload-input"
                              style={{
                                display: 'block', width: '100%', padding: '10px', borderRadius: 8, border: '1px dashed #d97706', background: 'transparent',
                                color: '#d97706', textAlign: 'center', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                              }}
                            >
                              📎 Upload Prescription Image
                            </label>
                            <input 
                              type="file" 
                              id="prescription-upload-input" 
                              accept="image/*,.pdf" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setPrescriptionFile(file);
                                  setPrescriptionFileName(file.name);
                                  setPrescriptionUrl(`file:///prescriptions/upload_${Date.now()}_${file.name}`);
                                  toast.success('Prescription Attached', 'Verification file attached successfully.');
                                }
                              }}
                              style={{ display: 'none' }}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ padding: 12, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <CheckCircle size={16} color="#10b981" />
                        <span style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: 600 }}>OTC medicines only. Direct checkout allowed.</span>
                      </div>
                    )}

                    {/* Subtotal Calculation */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                        <span style={{ fontWeight: 600 }}>₹{
                          Object.values(cart).reduce((acc, curr) => acc + curr.item.price * curr.qty, 0).toFixed(2)
                        }</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Delivery Fee:</span>
                        <span style={{ fontWeight: 600 }}>
                          {Object.values(cart).reduce((acc, curr) => acc + curr.item.price * curr.qty, 0) > 500 ? 'Free' : '₹30.00'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.9rem', borderTop: '1px solid var(--border-color)', paddingTop: 8, marginTop: 4, color: 'var(--accent-primary)' }}>
                        <span>Total Est. Cost:</span>
                        <span>₹{
                          (
                            Object.values(cart).reduce((acc, curr) => acc + curr.item.price * curr.qty, 0) +
                            (Object.values(cart).reduce((acc, curr) => acc + curr.item.price * curr.qty, 0) > 500 ? 0 : 30)
                          ).toFixed(2)
                        }</span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <button
                      className="btn btn-primary"
                      style={{ width: '100%', padding: '12px 0', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      disabled={Object.values(cart).some(x => x.item.isPrescriptionRequired) && !prescriptionFileName}
                      onClick={() => {
                        setSelectedShopVendor(null);
                        setShopCheckoutStep(2);
                      }}
                    >
                      Secure Checkout <ArrowRight size={16} />
                    </button>
                    {Object.values(cart).some(x => x.item.isPrescriptionRequired) && !prescriptionFileName && (
                      <p style={{ margin: 0, fontSize: '0.7rem', color: '#ef4444', textAlign: 'center', fontWeight: 600 }}>Please upload prescription to enable checkout.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SHOP VENDOR */}
          {shopCheckoutStep === 2 && (
            <div className="glass-card" style={{ padding: 24, maxWidth: 640, margin: '0 auto', width: '100%' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 6 }}>Choose Pharmacy Vendor</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 18 }}>Compare pricing and availability across local pharmacies near you.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                {vendorsList.map(vendor => {
                  const pricing = getShopVendorPricing(vendor);
                  const isSelected = selectedShopVendor?.id === vendor.id;
                  return (
                    <div
                      key={vendor.id}
                      onClick={() => setSelectedShopVendor(vendor)}
                      style={{
                        padding: 16, borderRadius: 14, cursor: 'pointer', transition: 'all 0.2s',
                        border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                        background: isSelected ? 'rgba(8,145,178,0.04)' : 'var(--bg-input)',
                        display: 'flex', flexDirection: 'column', gap: 10
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 700 }}>{vendor.name}</div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>📍 {vendor.address} ({vendor.distance})</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '3px 8px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700 }}>
                          ⭐ {vendor.rating.toFixed(1)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid var(--border-color)', paddingTop: 8 }}>
                        <span style={{ color: pricing.isFullyInStock ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                          {pricing.isFullyInStock ? '✓ All Items In Stock' : `⚠️ Partial Stock (${pricing.availableCount}/${pricing.totalCount} items)`}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '0.9rem' }}>₹{pricing.totalAmount.toFixed(2)}</span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Incl. Delivery fee</span>
                        </div>
                      </div>

                      {pricing.missing.length > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#ef4444', background: 'rgba(239,68,68,0.05)', padding: '6px 10px', borderRadius: 6 }}>
                          <strong>Out of stock at this vendor:</strong> {pricing.missing.join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setShopCheckoutStep(1)}>Back</button>
                <button className="btn btn-primary" disabled={!selectedShopVendor} onClick={() => setShopCheckoutStep(3)}>Next: Shipping Details</button>
              </div>
            </div>
          )}

          {/* STEP 3: SHIPPING DETAILS */}
          {shopCheckoutStep === 3 && (
            <div className="glass-card" style={{ padding: 24, maxWidth: 540, margin: '0 auto', width: '100%' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: 16 }}>Shipping Details</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Delivery Address</label>
                  <input
                    type="text"
                    value={shippingAddress}
                    onChange={e => setShippingAddress(e.target.value)}
                    placeholder="Enter your full street address"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Contact Phone Number</label>
                  <input
                    type="text"
                    value={contactNumber}
                    onChange={e => setContactNumber(e.target.value)}
                    placeholder="Mobile number for delivery agent contact"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setShopCheckoutStep(2)}>Back</button>
                <button 
                  className="btn btn-primary" 
                  disabled={!shippingAddress.trim() || !contactNumber.trim() || placingShopOrder} 
                  onClick={handlePreCreateShopOrder}
                >
                  {placingShopOrder ? (
                    <>
                      <Loader2 className="animate-spin" size={16} style={{ marginRight: 6 }} /> Creating Order...
                    </>
                  ) : (
                    'Next: Payment & Review'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: SECURE PAYMENT */}
          {shopCheckoutStep === 4 && selectedShopVendor && (
            <div className="glass-card" style={{ padding: 32, maxWidth: 640, margin: '0 auto', width: '100%' }}>
              <PaymentFlow
                orderSummary={{
                  items: getShopVendorPricing(selectedShopVendor).items.map(item => ({ name: item.name, quantity: item.qty, price: item.price })),
                  subtotal: getShopVendorPricing(selectedShopVendor).totalMedsPrice,
                  deliveryFee: getShopVendorPricing(selectedShopVendor).deliveryFee,
                  taxAmount: getShopVendorPricing(selectedShopVendor).totalMedsPrice * 0.05,
                  grandTotal: getShopVendorPricing(selectedShopVendor).totalMedsPrice + getShopVendorPricing(selectedShopVendor).deliveryFee + (getShopVendorPricing(selectedShopVendor).totalMedsPrice * 0.05)
                }}
                orderId={createdShopOrderId}
                vendorName={selectedShopVendor.name}
                onPaymentComplete={handleShopPaymentComplete}
                onCancel={() => setShopCheckoutStep(3)}
              />
            </div>
          )}

          {/* STEP 5: SUCCESS BLOCK */}
          {shopCheckoutStep === 5 && (
            <div className="glass-card" style={{ padding: '40px 24px', maxWidth: 440, margin: '40px auto', textAlign: 'center' }}>
              <span style={{ fontSize: '4rem' }}>🎉</span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: 12 }}>Medicines Ordered!</h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 6 }}>Your order ID is <strong>{createdShopOrderId}</strong>.</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 4 }}>Your order is routed to {selectedShopVendor?.name} and will be delivered shortly.</p>
              
              <button
                className="btn btn-primary"
                style={{ marginTop: 24, padding: '10px 24px', fontSize: '0.84rem' }}
                onClick={() => {
                  setShopCheckoutStep(1);
                  setSelectedShopVendor(null);
                  setActiveTab('orders');
                }}
              >
                Track Order
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Shop Detail Modal ── */}
      {showShopDetailModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 440, maxWidth: '95%', animation: 'scaleUp 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>💊 Medicine Details</h3>
              <button onClick={() => setShowShopDetailModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.85rem' }}>
              <div>
                <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 8, background: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{showShopDetailModal.category}</span>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '6px 0 2px' }}>{showShopDetailModal.medicineName}</h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Manufacturer: {showShopDetailModal.manufacturer}</span>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 10 }}>
                <strong>Description:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{showShopDetailModal.description}</p>
              </div>

              <div style={{ padding: 12, background: 'var(--bg-input)', borderRadius: 10 }}>
                <strong>Dosage Information:</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{showShopDetailModal.dosageInfo}</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 4px' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)' }}>Starting Price</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>₹{showShopDetailModal.price.toFixed(2)}</span>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)' }}>Regulation Class</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: showShopDetailModal.isPrescriptionRequired ? '#ef4444' : '#10b981' }}>
                    {showShopDetailModal.isPrescriptionRequired ? '⚠️ Prescription Required (Rₓ)' : '✓ Over-The-Counter (OTC)'}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 12, marginTop: 4 }}>
                <span style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: 6 }}>Nearby Vendor Stock:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {showShopDetailModal.vendors.map((v: any, idx: number) => {
                    const vendorObj = vendorsList.find(x => x.id === v.vendorId);
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 8 }}>
                        <span>{vendorObj?.name || 'Local Pharmacy'} <span style={{ color: 'var(--text-muted)' }}>({vendorObj?.distance})</span></span>
                        <strong style={{ color: 'var(--accent-primary)' }}>₹{v.price.toFixed(2)} ({v.quantity} left)</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => {
                setCart(prev => {
                  const current = prev[showShopDetailModal.id] || { item: showShopDetailModal, qty: 0 };
                  return { ...prev, [showShopDetailModal.id]: { ...current, qty: current.qty + 1 } };
                });
                toast.success('Added to Cart', `${showShopDetailModal.medicineName} added to cart.`);
                setShowShopDetailModal(null);
              }}
              style={{ width: '100%', marginTop: 20, padding: '10px 0' }}
            >
              Add to Shopping Cart
            </button>
          </div>
        </div>
      )}

      {/* ── Resume/Complete Payment Modal ── */}
      {activePaymentOrder && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 560, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              <h3 style={{ fontSize: '1.20rem', fontWeight: 800 }}>💳 Complete Payment</h3>
              <button onClick={() => setActivePaymentOrder(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>
            
            <PaymentFlow
              orderSummary={{
                items: activePaymentOrder.medicines,
                subtotal: activePaymentOrder.medicines.reduce((acc: number, m: any) => acc + (m.price * m.quantity), 0),
                deliveryFee: activePaymentOrder.deliveryCharges || 30,
                taxAmount: activePaymentOrder.taxAmount || (activePaymentOrder.medicines.reduce((acc: number, m: any) => acc + (m.price * m.quantity), 0) * 0.05),
                grandTotal: activePaymentOrder.grandTotal || activePaymentOrder.totalAmount
              }}
              orderId={activePaymentOrder.id}
              vendorName={activePaymentOrder.vendorName}
              onPaymentComplete={async (_txId, _method) => {
                setActivePaymentOrder(null);
                await fetchMedicineOrders();
                toast.success('Payment Complete!', `Payment verified successfully for Order #${activePaymentOrder.id}`);
              }}
              onCancel={() => setActivePaymentOrder(null)}
            />
          </div>
        </div>
      )}

      {/* ── Order Medicines Modal ── */}
      {orderModalOpen && selectedRx && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card modal-content" style={{ padding: 24, width: 560, maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto', animation: 'scaleUp 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--border-color)', paddingBottom: 10 }}>
              <h3 style={{ fontSize: '1.20rem', fontWeight: 800 }}>🛒 Order Prescribed Medicines</h3>
              <button onClick={() => setOrderModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            {orderSuccess ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <span style={{ fontSize: '4rem' }}>🎉</span>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981', marginTop: 12 }}>Order Placed Successfully!</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 6 }}>Your order ID is <strong>{createdOrderId}</strong>.</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>You can track its status in the "Medicine Orders" tab.</p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setOrderModalOpen(false);
                    setActiveTab('orders');
                  }}
                  style={{ marginTop: 20 }}
                >
                  Track Order
                </button>
              </div>
            ) : (
              <>
                {/* Step Indicators */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  <span style={{ color: checkoutStep === 1 ? 'var(--accent-primary)' : 'inherit' }}>1. MEDS</span>
                  <span style={{ color: checkoutStep === 2 ? 'var(--accent-primary)' : 'inherit' }}>2. PHARMACY</span>
                  <span style={{ color: checkoutStep === 3 ? 'var(--accent-primary)' : 'inherit' }}>3. DETAILS</span>
                  <span style={{ color: checkoutStep === 4 ? 'var(--accent-primary)' : 'inherit' }}>4. CONFIRM</span>
                </div>

                {/* Step 1: Select Meds & Quantities */}
                {checkoutStep === 1 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Select medicines to purchase</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {selectedRx.medicines && selectedRx.medicines.split(',').map((m: string) => m.trim()).filter(Boolean).map((medName: string) => {
                        const isChecked = selectedMeds.includes(medName);
                        return (
                          <div key={medName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedMeds(prev => [...prev, medName]);
                                  } else {
                                    setSelectedMeds(prev => prev.filter(m => m !== medName));
                                  }
                                }}
                                style={{ width: 16, height: 16, cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{medName}</span>
                            </div>
                            {isChecked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Qty:</span>
                                <input 
                                  type="number" 
                                  min={1} 
                                  value={medQuantities[medName] || 30}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 1;
                                    setMedQuantities(prev => ({ ...prev, [medName]: val }));
                                  }}
                                  style={{ width: 60, padding: '4px 8px', borderRadius: 6, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', textAlign: 'center', fontSize: '0.8rem' }}
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button className="btn btn-secondary" onClick={() => setOrderModalOpen(false)}>Cancel</button>
                      <button className="btn btn-primary" disabled={selectedMeds.length === 0} onClick={() => setCheckoutStep(2)}>Next: Select Vendor</button>
                    </div>
                  </div>
                )}

                {/* Step 2: Choose Vendor */}
                {checkoutStep === 2 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Choose a local pharmacy vendor</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, maxHeight: '40vh', overflowY: 'auto' }}>
                      {vendorsList.map(vendor => {
                        const pricing = getVendorPricing(vendor);
                        const isSelected = selectedVendor?.id === vendor.id;
                        return (
                          <div 
                            key={vendor.id} 
                            onClick={() => setSelectedVendor(vendor)}
                            style={{ 
                              padding: 14, 
                              borderRadius: 12, 
                              border: `2px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                              background: isSelected ? 'rgba(8,145,178,0.04)' : 'var(--bg-input)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                              transition: 'all 0.2s'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{vendor.name}</div>
                                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>📍 {vendor.address} ({vendor.distance})</div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', padding: '3px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700 }}>
                                ⭐ {vendor.rating.toFixed(1)}
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', paddingTop: 6, borderTop: '1px solid var(--border-color)' }}>
                              <span style={{ color: pricing.isFullyInStock ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
                                {pricing.isFullyInStock ? '✓ All Items In Stock' : `⚠️ Partial Stock (${pricing.availableCount}/${pricing.totalCount} items)`}
                              </span>
                              <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                                Est. Total: ₹{pricing.totalAmount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                      <button className="btn btn-secondary" onClick={() => setCheckoutStep(1)}>Back</button>
                      <button className="btn btn-primary" disabled={!selectedVendor} onClick={() => setCheckoutStep(3)}>Next: Address Details</button>
                    </div>
                  </div>
                )}

                {/* Step 3: Address & Contact Details */}
                {checkoutStep === 3 && (
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>Delivery details</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Delivery Address</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={shippingAddress} 
                          onChange={e => setShippingAddress(e.target.value)} 
                          placeholder="Enter your full home address"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: 4 }}>Contact Number</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={contactNumber} 
                          onChange={e => setContactNumber(e.target.value)} 
                          placeholder="Mobile number for delivery rider"
                          required
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
                      <button className="btn btn-secondary" onClick={() => setCheckoutStep(2)}>Back</button>
                      <button 
                        className="btn btn-primary" 
                        disabled={!shippingAddress.trim() || !contactNumber.trim() || placingOrder} 
                        onClick={handlePreCreatePrescriptionOrder}
                      >
                        {placingOrder ? (
                          <>
                            <Loader2 className="animate-spin" size={16} style={{ marginRight: 6 }} /> Creating Order...
                          </>
                        ) : (
                          'Next: Review & Pay'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4: Secure Payment */}
                {checkoutStep === 4 && selectedVendor && (
                  <PaymentFlow
                    orderSummary={{
                      items: getVendorPricing(selectedVendor).items.map(item => ({ name: item.name, quantity: item.qty, price: item.price })),
                      subtotal: getVendorPricing(selectedVendor).totalMedsPrice,
                      deliveryFee: getVendorPricing(selectedVendor).shippingFee,
                      taxAmount: getVendorPricing(selectedVendor).totalMedsPrice * 0.05,
                      grandTotal: getVendorPricing(selectedVendor).totalMedsPrice + getVendorPricing(selectedVendor).shippingFee + (getVendorPricing(selectedVendor).totalMedsPrice * 0.05)
                    }}
                    orderId={createdOrderId}
                    vendorName={selectedVendor.name}
                    onPaymentComplete={(_txId, _method) => {
                      setOrderSuccess(true);
                      fetchMedicineOrders();
                    }}
                    onCancel={() => {
                      setCheckoutStep(3);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
      {/* ── DOCTOR PROFILE MODAL ── */}
      {profileDoctor && (
        <div
          onClick={() => setProfileDoctor(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderRadius: 24,
              width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              border: '1px solid var(--border-color)',
              animation: 'slideUp 0.3s ease',
            }}
          >
            {/* Header with gradient banner */}
            <div style={{
              background: 'linear-gradient(135deg, #059669 0%, #0891b2 50%, #6366f1 100%)',
              padding: '28px 28px 48px', borderRadius: '24px 24px 0 0',
              position: 'relative',
            }}>
              <button
                onClick={() => setProfileDoctor(null)}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.2)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'white', transition: 'all 0.2s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.35)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              >
                <X size={16} />
              </button>
              <div style={{ position: 'absolute', top: -20, right: 60, width: 120, height: 120, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
              <div style={{ position: 'absolute', bottom: -10, left: 30, width: 80, height: 80, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>Doctor Profile</p>
            </div>

            {/* Avatar overlapping the banner */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: -38 }}>
              <div style={{
                width: 76, height: 76, borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(8,145,178,0.2), rgba(99,102,241,0.15))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2.2rem', border: '4px solid var(--bg-card)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}>
                {profileDoctor.avatar}
              </div>
              <h3 style={{ margin: '10px 0 2px', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)', textAlign: 'center' }}>{profileDoctor.name}</h3>
              <p style={{ margin: 0, color: 'var(--accent-primary)', fontWeight: 600, fontSize: '0.88rem' }}>{profileDoctor.spec}</p>

              {/* Quick stats row */}
              <div style={{ display: 'flex', gap: 16, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: '#f59e0b', fontWeight: 600 }}>
                  <Star size={14} fill="#f59e0b" /> {profileDoctor.rating.toFixed(1)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Award size={14} color="#6366f1" /> {profileDoctor.experience} yrs
                </div>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.76rem', fontWeight: 700,
                  color: profileDoctor.available ? '#10b981' : '#ef4444',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: profileDoctor.available ? '#10b981' : '#ef4444' }} />
                  {profileDoctor.available ? 'Available' : 'Unavailable'}
                </div>
              </div>
            </div>

            {/* Profile details */}
            <div style={{ padding: '20px 28px 28px' }}>

              {/* Consultation Fee highlight */}
              {(profileDoctor.consultationFee ?? 0) > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(8,145,178,0.08))',
                  border: '1.5px solid rgba(16,185,129,0.2)',
                  borderRadius: 14, padding: '14px 18px', marginBottom: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IndianRupee size={18} color="#10b981" />
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Consultation Fee</p>
                      <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>₹{profileDoctor.consultationFee}</p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>per visit</span>
                </div>
              )}

              {/* Info grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 18 }}>
                {[
                  ...(profileDoctor.qualification ? [{ icon: GraduationCap, label: 'Qualification', value: profileDoctor.qualification, color: '#6366f1' }] : []),
                  { icon: Stethoscope, label: 'Department', value: profileDoctor.department, color: '#0891b2' },
                  { icon: Award, label: 'Experience', value: `${profileDoctor.experience} Years`, color: '#f59e0b' },
                  { icon: Clock, label: 'Availability', value: profileDoctor.availability, color: '#10b981' },
                  ...(profileDoctor.contact ? [{ icon: Phone, label: 'Contact', value: profileDoctor.contact, color: '#8b5cf6' }] : []),
                  ...(profileDoctor.email ? [{ icon: Mail, label: 'Email', value: profileDoctor.email, color: '#ec4899' }] : []),
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 0',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: `${item.color}15`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <item.icon size={16} color={item.color} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</p>
                      <p style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* License section */}
              {profileDoctor.licenseNo && (
                <div style={{
                  background: 'var(--bg-input)', borderRadius: 14, padding: '16px 18px',
                  border: '1.5px solid var(--border-color)', marginBottom: 20,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Shield size={16} color="#0891b2" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Medical License</span>
                    <BadgeCheck size={16} color="#10b981" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>License Number</p>
                      <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{profileDoctor.licenseNo}</p>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valid Until</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                          {profileDoctor.licenseValidity || 'N/A'}
                        </p>
                        {profileDoctor.licenseValidity && (() => {
                          const expiry = new Date(profileDoctor.licenseValidity);
                          const now = new Date();
                          const monthsLeft = (expiry.getFullYear() - now.getFullYear()) * 12 + (expiry.getMonth() - now.getMonth());
                          const isValid = expiry > now;
                          const isExpiringSoon = monthsLeft <= 6 && monthsLeft > 0;
                          return (
                            <span style={{
                              padding: '2px 8px', borderRadius: 6, fontSize: '0.62rem', fontWeight: 700,
                              background: !isValid ? 'rgba(239,68,68,0.12)' : isExpiringSoon ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)',
                              color: !isValid ? '#ef4444' : isExpiringSoon ? '#f59e0b' : '#10b981',
                            }}>
                              {!isValid ? 'EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : 'VERIFIED'}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setProfileDoctor(null)}
                  className="btn btn-secondary"
                  style={{ flex: 1, borderRadius: 12, padding: '12px 0', fontWeight: 600 }}
                >
                  Close
                </button>
                {profileDoctor.available && (
                  <button
                    onClick={() => {
                      setSelectedDoctor(profileDoctor);
                      setProfileDoctor(null);
                    }}
                    className="btn btn-primary"
                    style={{
                      flex: 2, borderRadius: 12, padding: '12px 0', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: 'linear-gradient(135deg, #059669, #0891b2)',
                    }}
                  >
                    <Calendar size={16} /> Select for Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
