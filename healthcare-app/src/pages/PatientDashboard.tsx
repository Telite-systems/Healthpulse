import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { api } from '../services/api';
import { db } from '../services/realtimeDb';
import type { Doctor } from '../types';
import {
  Calendar, FileText, Bell, Download, Clock, CheckCircle,
  Pill, Video, Phone, Activity, Heart, ChevronRight,
  Star, MessageSquare, AlertCircle, Thermometer, Loader2,
  Filter, Search, Stethoscope
} from 'lucide-react';

// Fallback data
const FB_APPOINTMENTS: any[] = [];

const FB_PRESCRIPTIONS: any[] = [];

const FB_RECORDS: any[] = [];

const FB_NOTIFICATIONS = [
  { id: 1, icon: '📅', title: 'Welcome!', desc: 'Book your first appointment with our specialists.', time: 'Just now', read: false },
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
}

type PatientTab = 'overview' | 'book' | 'records' | 'prescriptions' | 'notifications';

export default function PatientDashboard() {
  const { user } = useAuth();
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState<PatientTab>('overview');
  const [myAppointments, setMyAppointments] = useState(FB_APPOINTMENTS);
  const [myPrescriptions, setMyPrescriptions] = useState(FB_PRESCRIPTIONS);
  const [myRecords, setMyRecords] = useState(FB_RECORDS);
  const [myNotifications, setMyNotifications] = useState(FB_NOTIFICATIONS);
  const [loading, setLoading] = useState(true);
  const [bookingStep, setBookingStep] = useState(1);
  const [selectedDoctor, setSelectedDoctor] = useState<BookingDoctor | null>(null);
  const [selectedDate, setSelectedDate] = useState('2026-04-25');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);

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

  // Fetch patient data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [aptsRes, rxRes, visitsRes, notifsRes] = await Promise.allSettled([
          api.getAll<any>('appointments', 1, 20),
          api.getAll<any>('prescriptions', 1, 20),
          api.getAll<any>('visits', 1, 20),
          api.getAll<any>('notifications', 1, 20),
        ]);

        if (aptsRes.status === 'fulfilled' && aptsRes.value?.data?.data?.length) {
          setMyAppointments(aptsRes.value.data.data.map((a: any) => ({
            id: a.id || a._id, doctor: a.doctorName, specialization: a.department || '',
            date: a.date, time: a.time, status: a.status, type: a.type || 'Consultation',
          })));
        }
        if (rxRes.status === 'fulfilled' && rxRes.value?.data?.data?.length) {
          setMyPrescriptions(rxRes.value.data.data.map((rx: any) => ({
            id: rx.id || rx._id, doctor: rx.doctorName, date: rx.date,
            medicines: rx.medications || rx.medicines, status: rx.status, duration: rx.duration || '—',
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
            id: n.id || n._id, icon: n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : '📢',
            title: n.title, desc: n.message, time: n.time || 'recently', read: n.read ?? false,
          })));
        }
      } catch {
        // Keep fallback data
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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
      doctorName: selectedDoctor.name,
      department: selectedDoctor.spec,
      date: selectedDate,
      time: selectedTime,
      status: 'Scheduled',
      type: 'Consultation',
      notes: '',
      createdAt: new Date().toISOString(),
    };
    try {
      await api.create('appointments', aptData as any);
      toast.success('Appointment Booked!', `With ${selectedDoctor.name} on ${selectedDate}`);
    } catch {
      toast.info('Booked Locally', 'Appointment saved (backend sync pending)');
    }
    setMyAppointments(prev => [{ id: aptData.id, doctor: aptData.doctorName, specialization: aptData.department, date: aptData.date, time: aptData.time, status: 'Scheduled', type: 'Consultation' }, ...prev]);
    setBookingSaving(false);
    setBookingSuccess(true);
    setTimeout(() => { setBookingSuccess(false); setBookingStep(1); setSelectedDoctor(null); setSelectedTime(''); setSelectedDepartment('All Departments'); setDoctorSearch(''); setActiveTab('overview'); }, 2500);
  };

  // ── Get next appointment for overview ──────────────────────────────────────
  const nextApt = myAppointments.find(a => a.status !== 'Completed');

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
          { key: 'notifications', icon: Bell, label: 'Notifications' },
        ] as { key: PatientTab; icon: any; label: string }[]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
            fontWeight: 500, fontSize: '0.86rem', transition: 'all 0.2s',
          }}>
            <tab.icon size={15} />{tab.label}
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
              { label: 'Active Medicines', value: String(myPrescriptions.filter(r => r.status === 'Active').length || '0'), sub: `${myPrescriptions.length} prescriptions`, icon: Pill, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
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
              {myAppointments.filter(a => a.status !== 'Completed').length === 0 ? (
                <div style={{ padding: '32px 22px', textAlign: 'center' }}>
                  <Calendar size={36} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.4 }} />
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.87rem' }}>No upcoming appointments</p>
                  <button className="btn btn-primary" style={{ marginTop: 12, fontSize: '0.82rem' }} onClick={() => setActiveTab('book')}>Book Your First Appointment</button>
                </div>
              ) : myAppointments.filter(a => a.status !== 'Completed').map(apt => {
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
                        <div key={doc.id} onClick={() => doc.available && setSelectedDoctor(doc)} style={{
                          padding: '18px 20px', borderRadius: 14, border: `2px solid ${selectedDoctor?.id === doc.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          background: selectedDoctor?.id === doc.id ? 'rgba(8,145,178,0.06)' : 'var(--bg-input)',
                          cursor: doc.available ? 'pointer' : 'not-allowed', opacity: doc.available ? 1 : 0.5,
                          display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.2s',
                        }}
                          onMouseOver={e => doc.available && (e.currentTarget.style.borderColor = 'var(--accent-primary)', e.currentTarget.style.transform = 'translateY(-1px)')}
                          onMouseOut={e => (e.currentTarget.style.borderColor = selectedDoctor?.id === doc.id ? 'var(--accent-primary)' : 'var(--border-color)', e.currentTarget.style.transform = 'none')}
                        >
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(8,145,178,0.15), rgba(99,102,241,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>{doc.avatar}</div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.92rem' }}>{doc.name}</p>
                            <p style={{ margin: '2px 0', fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 500 }}>{doc.spec}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: doc.available ? '#10b981' : '#ef4444', fontWeight: 600 }}>● {doc.available ? 'Available' : doc.available === false ? 'On Leave' : 'Busy'}</span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.72rem', color: '#f59e0b' }}>⭐ {doc.rating.toFixed(1)}</span>
                              {doc.experience > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{doc.experience} yrs exp</span>}
                            </div>
                          </div>
                          {selectedDoctor?.id === doc.id && <CheckCircle size={20} color="var(--accent-primary)" />}
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
          {myPrescriptions.length === 0 ? (
            <div className="glass-card" style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Pill size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>No prescriptions yet</p>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>Your prescriptions will appear here after doctor visits.</p>
            </div>
          ) : myPrescriptions.map(rx => {
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
                    <button className="btn btn-secondary btn-sm"><Download size={13} /> Download</button>
                  </div>
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--bg-input)', borderRadius: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  💊 {rx.medicines}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {activeTab === 'notifications' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>🔔 Notifications</h3>
            <span style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
              {myNotifications.filter(n => !n.read).length} Unread
            </span>
          </div>
          {myNotifications.map(n => (
            <div key={n.id} style={{
              padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: 16, alignItems: 'flex-start',
              background: n.read ? 'transparent' : 'rgba(8,145,178,0.03)',
            }}>
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
    </div>
  );
}
