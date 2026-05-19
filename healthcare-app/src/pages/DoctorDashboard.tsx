import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToastContext } from '../context/ToastContext';
import { api } from '../services/api';
import {
  Users, Calendar, FileText, Clock, CheckCircle, XCircle,
  TrendingUp, Activity, Stethoscope, Pill, Video, Star,
  ChevronRight, AlertCircle, Heart, Loader2, X, Thermometer, Plus,
  Pencil, Trash2
} from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import DoctorPatientConsult from '../components/DoctorPatientConsult';


// Fallback data used when backend is unreachable
const FALLBACK_PATIENTS = [
  { id: 'P001', name: 'Rahul Sharma', age: 34, condition: 'Hypertension', lastVisit: '2026-04-10', status: 'Active', avatar: '👨' },
  { id: 'P002', name: 'Priya Singh', age: 28, condition: 'Diabetes Type 2', lastVisit: '2026-04-09', status: 'Critical', avatar: '👩' },
  { id: 'P003', name: 'Amit Kumar', age: 45, condition: 'Arthritis', lastVisit: '2026-04-08', status: 'Stable', avatar: '👨' },
  { id: 'P004', name: 'Sunita Devi', age: 52, condition: 'Thyroid', lastVisit: '2026-04-07', status: 'Active', avatar: '👩' },
  { id: 'P005', name: 'Vikram Patel', age: 39, condition: 'Back Pain', lastVisit: '2026-04-06', status: 'Stable', avatar: '👨' },
];

const FALLBACK_APPOINTMENTS: any[] = [];

const FALLBACK_PRESCRIPTIONS: any[] = [];

// Fallback visit records keyed by patient name
const FALLBACK_VISITS: Record<string, any[]> = {
  'Rahul Sharma': [
    { id: 'V001', date: '2026-04-10', diagnosis: 'Hypertension Stage 1', treatment: 'Lifestyle modifications, Amlodipine prescribed', vitals: { bp: '142/92', temp: '98.4°F', pulse: '84 bpm', weight: '78 kg' }, status: 'Completed', notes: 'Patient advised low-sodium diet and regular exercise.' },
    { id: 'V002', date: '2026-03-15', diagnosis: 'Routine Checkup', treatment: 'Blood work ordered', vitals: { bp: '138/88', temp: '98.6°F', pulse: '80 bpm', weight: '79 kg' }, status: 'Completed', notes: 'Lipid panel slightly elevated. Statin considered.' },
  ],
  'Priya Singh': [
    { id: 'V003', date: '2026-04-09', diagnosis: 'Diabetes Type 2 — Uncontrolled', treatment: 'Insulin Glargine initiated, Metformin dose increased', vitals: { bp: '128/82', temp: '98.2°F', pulse: '76 bpm', weight: '65 kg' }, status: 'Follow-up Required', notes: 'HbA1c: 8.9%. Strict dietary compliance required.' },
  ],
  'Amit Kumar': [
    { id: 'V004', date: '2026-04-08', diagnosis: 'Osteoarthritis — Knee', treatment: 'Diclofenac 50mg, Physiotherapy referral', vitals: { bp: '130/84', temp: '98.6°F', pulse: '72 bpm', weight: '82 kg' }, status: 'Completed', notes: 'X-ray shows Grade 2 OA. Advised weight reduction.' },
  ],
  'Sunita Devi': [
    { id: 'V005', date: '2026-04-07', diagnosis: 'Hypothyroidism', treatment: 'Levothyroxine 50mcg daily', vitals: { bp: '122/78', temp: '97.8°F', pulse: '68 bpm', weight: '70 kg' }, status: 'Completed', notes: 'TSH: 12.4. Repeat after 6 weeks.' },
  ],
  'Vikram Patel': [
    { id: 'V006', date: '2026-04-06', diagnosis: 'Lumbar Disc Herniation', treatment: 'Rest, Analgesics, Physiotherapy', vitals: { bp: '126/80', temp: '98.4°F', pulse: '74 bpm', weight: '85 kg' }, status: 'Follow-up Required', notes: 'MRI shows L4-L5 disc bulge. Conservative management for now.' },
  ],
};

type DoctorTab = 'overview' | 'patients' | 'appointments' | 'prescriptions';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState<DoctorTab>('overview');
  const [patients, setPatients] = useState<any[]>(FALLBACK_PATIENTS);
  const [appointments, setAppointments] = useState<any[]>(FALLBACK_APPOINTMENTS);
  const [prescriptions, setPrescriptions] = useState<any[]>(FALLBACK_PRESCRIPTIONS);
  const [_loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({ patient: '', medicines: '', dosage: '', duration: '', instructions: '' });
  const [showPrescForm, setShowPrescForm] = useState(false);
  const [editRxId, setEditRxId] = useState<string | null>(null);
  const [showConsult, setShowConsult] = useState(false);
  const [consultPatient, setConsultPatient] = useState('Rahul Sharma');
  const [recordsPatient, setRecordsPatient] = useState<any | null>(null);
  const [patientVisits, setPatientVisits] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [savingVisit, setSavingVisit] = useState(false);
  const [editVisitId, setEditVisitId] = useState<string | null>(null);
  const [deletingVisitId, setDeletingVisitId] = useState<string | null>(null);
  const [visitForm, setVisitForm] = useState({
    diagnosis: '', treatment: '', bp: '', temp: '', pulse: '', weight: '',
    status: 'Completed', notes: '', followUpDate: '',
  });

  // Fetch real data from backend — filter by logged-in doctor
  const doctorName = user?.name || '';
  const doctorId   = user?.id   || '';

  // Smart doctor match: handles name mismatches between backend & mock
  // e.g. backend stores "Meena Iyer" but mock has "Dr. Meena Iyer"
  const matchesDoctor = (fieldName: string, fieldId?: string): boolean => {
    if (!doctorName && !doctorId) return true; // no filter
    // ID match (strongest)
    if (doctorId && fieldId && fieldId === doctorId) return true;
    // Name match — case-insensitive + trimmed
    const a = (fieldName || '').toLowerCase().trim();
    const b = doctorName.toLowerCase().trim();
    if (!a || !b) return false;
    // Exact match
    if (a === b) return true;
    // Partial match: one name contains the other
    // Handles "Dr. Meena Iyer" vs "Meena Iyer"
    if (a.includes(b) || b.includes(a)) return true;
    // Last-name match: compare last word only as final fallback
    const lastA = a.split(' ').pop() || '';
    const lastB = b.split(' ').pop() || '';
    return lastA.length > 2 && lastA === lastB;
  };
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [patientsRes, appointmentsRes, prescriptionsRes] = await Promise.allSettled([
          api.getAll<any>('patients', 1, 50),
          api.getAll<any>('appointments', 1, 100),
          api.getAll<any>('prescriptions', 1, 100),
        ]);

        if (patientsRes.status === 'fulfilled' && patientsRes.value?.data?.data?.length) {
          setPatients(patientsRes.value.data.data.map((p: any) => ({
            id: p.id || p._id, name: p.name, age: p.age || 0,
            condition: p.diagnosis || p.condition || 'General',
            lastVisit: p.registeredDate || '—', status: p.status || 'Active',
            avatar: p.gender === 'Female' ? '👩' : '👨',
          })));
        }
        if (appointmentsRes.status === 'fulfilled' && appointmentsRes.value?.data?.data?.length) {
          // Filter appointments for THIS doctor only (robust match)
          const allApts = appointmentsRes.value.data.data;
          const myApts = doctorName
            ? allApts.filter((a: any) => matchesDoctor(a.doctorName || '', a.doctorId || a.doctor_id))
            : allApts;
          setAppointments(myApts.map((a: any) => ({
            id: a.id || a._id, patient: a.patientName, time: a.time,
            date: a.date || '',
            type: a.type || 'Consultation', status: a.status || 'Pending',
            department: a.department || '',
            avatar: '👤',
          })));
        }
        if (prescriptionsRes.status === 'fulfilled' && prescriptionsRes.value?.data?.data?.length) {
          // Filter prescriptions for THIS doctor only (robust match)
          const allRx = prescriptionsRes.value.data.data;
          const myRx = doctorName
            ? allRx.filter((rx: any) => matchesDoctor(rx.doctorName || '', rx.doctorId || rx.doctor_id))
            : allRx;
          setPrescriptions(myRx.map((rx: any) => ({
            id: rx.id || rx._id, patient: rx.patientName,
            medicines: rx.medications || rx.medicines,
            date: rx.date, status: rx.status || 'Active',
          })));
        }
      } catch {
        // Keep fallback data
      }
      setLoading(false);
    };
    fetchData();
  }, [doctorName]);


  const pendingCount = appointments.filter(a => a.status === 'Pending' || a.status === 'Urgent' || a.status === 'Scheduled').length;
  const activeRxCount = prescriptions.filter(rx => rx.status === 'Active').length;
  const stats = [
    { label: "Today's Patients", value: String(appointments.length), icon: Users, color: '#0891b2', bg: 'rgba(8,145,178,0.1)', change: 'Appointments assigned to you' },
    { label: 'Pending Appointments', value: String(pendingCount), icon: Calendar, color: '#6366f1', bg: 'rgba(99,102,241,0.1)', change: 'Need your attention' },
    { label: 'Active Prescriptions', value: String(activeRxCount), icon: Pill, color: '#10b981', bg: 'rgba(16,185,129,0.1)', change: 'Written by you' },
    { label: 'Patient Satisfaction', value: '98%', icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', change: '↑ 2% this month' },
  ];

  const handleAppointmentAction = async (id: string, action: 'accept' | 'reject') => {
    const newStatus = action === 'accept' ? 'Confirmed' : 'Cancelled';
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: newStatus } : a
    ));
    try {
      await api.update('appointments', id, { status: newStatus } as any);
      toast.success('Appointment Updated', `Appointment ${newStatus.toLowerCase()}`);
    } catch {
      toast.info('Updated Locally', 'Change saved locally (backend sync pending)');
    }
  };

  const handleUpdatePrescription = (rxId: string) => {
    const rx = prescriptions.find((r: any) => r.id === rxId);
    if (!rx) return;
    setEditRxId(rxId);
    setPrescriptionForm({
      patient: rx.patient || '',
      medicines: rx.medicines || '',
      dosage: rx.dosage || '',
      duration: rx.duration || '',
      instructions: rx.instructions || '',
    });
    setShowPrescForm(true);
    setActiveTab('prescriptions');
  };

  const handleSavePrescription = async () => {
    if (!prescriptionForm.patient || !prescriptionForm.medicines) {
      toast.error('Missing Fields', 'Patient name and medicines are required');
      return;
    }
    setSaving(true);
    const rxData = {
      id: editRxId || `RX${Date.now()}`,
      patientName: prescriptionForm.patient,
      doctorName: user?.name || 'Doctor',
      date: new Date().toISOString().split('T')[0],
      medications: prescriptionForm.medicines,
      dosage: prescriptionForm.dosage || 'As directed',
      duration: prescriptionForm.duration || '7 days',
      instructions: prescriptionForm.instructions || '',
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    try {
      if (editRxId) {
        await api.update('prescriptions', editRxId, rxData as any);
        toast.success('Prescription Updated', `Prescription for ${prescriptionForm.patient} updated`);
      } else {
        await api.create('prescriptions', rxData as any);
        toast.success('Prescription Saved', `Prescription for ${prescriptionForm.patient} created`);
      }
    } catch {
      toast.info(editRxId ? 'Updated Locally' : 'Saved Locally', 'Prescription saved (backend sync pending)');
    }
    if (editRxId) {
      setPrescriptions(prev => prev.map(rx =>
        rx.id === editRxId
          ? { ...rx, patient: rxData.patientName, medicines: rxData.medications, date: rxData.date, dosage: rxData.dosage, duration: rxData.duration, instructions: rxData.instructions }
          : rx
      ));
    } else {
      setPrescriptions(prev => [{ id: rxData.id, patient: rxData.patientName, medicines: rxData.medications, date: rxData.date, status: 'Active' }, ...prev]);
    }
    setPrescriptionForm({ patient: '', medicines: '', dosage: '', duration: '', instructions: '' });
    setEditRxId(null);
    setShowPrescForm(false);
    setSaving(false);
  };

  const handleViewRecords = async (patient: any) => {
    setRecordsPatient(patient);
    setLoadingRecords(true);
    // Try to fetch from backend first
    try {
      const res = await api.getAll<any>('visits', 1, 50);
      if (res?.data?.data?.length) {
        const filtered = res.data.data.filter((v: any) => v.patientName === patient.name);
        if (filtered.length) {
          setPatientVisits(filtered.map((v: any) => ({
            id: v.id || v._id,
            date: v.visitDate || v.date,
            diagnosis: v.diagnosis,
            treatment: v.treatment || '',
            vitals: v.vitals || { bp: '—', temp: '—', pulse: '—', weight: '—' },
            status: v.status || 'Completed',
            notes: v.notes || '',
          })));
          setLoadingRecords(false);
          return;
        }
      }
    } catch {
      // Fall through to fallback
    }
    // Use fallback data
    setPatientVisits(FALLBACK_VISITS[patient.name] || []);
    setLoadingRecords(false);
  };

  const statusColor = (s: string) => {
    if (s === 'Critical' || s === 'Urgent') return { color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (s === 'Pending') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    if (s === 'Confirmed' || s === 'Stable' || s === 'Active') return { color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    if (s === 'Completed') return { color: '#6366f1', bg: 'rgba(99,102,241,0.1)' };
    if (s === 'Follow-up Required') return { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' };
    return { color: '#8897ad', bg: 'rgba(136,151,173,0.1)' };
  };

  const handleSaveVisitRecord = async () => {
    if (!visitForm.diagnosis.trim()) {
      toast.error('Missing Field', 'Diagnosis is required');
      return;
    }
    setSavingVisit(true);
    const visitData = {
      id: editVisitId || `V${Date.now()}`,
      patientName: recordsPatient.name,
      doctorName: user?.name || 'Doctor',
      visitDate: new Date().toISOString().split('T')[0],
      date: new Date().toISOString().split('T')[0],
      diagnosis: visitForm.diagnosis,
      treatment: visitForm.treatment,
      followUpDate: visitForm.followUpDate || '',
      status: visitForm.status,
      vitals: {
        bp: visitForm.bp || '—',
        temp: visitForm.temp || '—',
        pulse: visitForm.pulse || '—',
        weight: visitForm.weight || '—',
      },
      notes: visitForm.notes,
      createdAt: new Date().toISOString(),
    };
    try {
      if (editVisitId) {
        await api.update('visits', editVisitId, visitData as any);
        toast.success('Visit Updated', `Visit record updated for ${recordsPatient.name}`);
      } else {
        await api.create('visits', visitData as any);
        toast.success('Visit Recorded', `Visit record created for ${recordsPatient.name}`);
      }
    } catch {
      toast.info(editVisitId ? 'Updated Locally' : 'Saved Locally', 'Visit record saved (backend sync pending)');
    }
    if (editVisitId) {
      setPatientVisits(prev => prev.map(v =>
        v.id === editVisitId
          ? { ...v, date: visitData.visitDate, diagnosis: visitData.diagnosis, treatment: visitData.treatment, vitals: visitData.vitals, status: visitData.status, notes: visitData.notes }
          : v
      ));
    } else {
      setPatientVisits(prev => [{
        id: visitData.id,
        date: visitData.visitDate,
        diagnosis: visitData.diagnosis,
        treatment: visitData.treatment,
        vitals: visitData.vitals,
        status: visitData.status,
        notes: visitData.notes,
      }, ...prev]);
    }
    // Reset form
    setVisitForm({ diagnosis: '', treatment: '', bp: '', temp: '', pulse: '', weight: '', status: 'Completed', notes: '', followUpDate: '' });
    setEditVisitId(null);
    setShowVisitForm(false);
    setSavingVisit(false);
  };

  const handleEditVisit = (visit: any) => {
    setEditVisitId(visit.id);
    setVisitForm({
      diagnosis: visit.diagnosis || '',
      treatment: visit.treatment || '',
      bp: visit.vitals?.bp || '',
      temp: visit.vitals?.temp || '',
      pulse: visit.vitals?.pulse || '',
      weight: visit.vitals?.weight || '',
      status: visit.status || 'Completed',
      notes: visit.notes || '',
      followUpDate: visit.followUpDate || '',
    });
    setShowVisitForm(true);
  };

  const handleDeleteVisit = async (visitId: string) => {
    setDeletingVisitId(visitId);
    try {
      await api.delete('visits', visitId);
      toast.success('Deleted', 'Visit record removed');
    } catch {
      toast.info('Deleted Locally', 'Visit removed (backend sync pending)');
    }
    setPatientVisits(prev => prev.filter(v => v.id !== visitId));
    setDeletingVisitId(null);
  };

  return (
    <>
    <AnimatedPage>
      {showConsult && <DoctorPatientConsult patientName={consultPatient} onClose={() => setShowConsult(false)} />}

      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0891b2 0%, #6366f1 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28, position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(8,145,178,0.25)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
        <div style={{ position: 'absolute', bottom: -20, right: 80, width: 100, height: 100, background: 'rgba(255,255,255,0.04)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', backdropFilter: 'blur(10px)' }}>
              {user?.avatar || '👨‍⚕️'}
            </div>
            <div>
              <h2 style={{ color: 'white', margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
                Good morning, {user?.name || 'Doctor'}! 👋
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.88rem' }}>
                {user?.specialization || 'General Physician'} · {user?.department || 'Internal Medicine'}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[{ icon: '🏥', text: `${appointments.length} appointments assigned` }, { icon: '⭐', text: '98% satisfaction rate' }, { icon: '📋', text: `${activeRxCount} active prescriptions` }].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
                <span>{item.icon}</span><span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: 'var(--bg-input)', padding: 5, borderRadius: 14, width: 'fit-content' }}>
        {([
          { key: 'overview', icon: Activity, label: 'Overview' },
          { key: 'patients', icon: Users, label: 'My Patients' },
          { key: 'appointments', icon: Calendar, label: 'Appointments' },
          { key: 'prescriptions', icon: FileText, label: 'Prescriptions' },
        ] as { key: DoctorTab; icon: any; label: string }[]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === tab.key ? 'var(--accent-primary)' : 'transparent',
            color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
            fontWeight: 500, fontSize: '0.87rem', transition: 'all 0.2s',
          }}>
            <tab.icon size={16} />{tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18, marginBottom: 24 }} className="stagger-children">

            {stats.map((s, i) => (
              <div key={i} className="glass-card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.icon size={22} color={s.color} />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, margin: '0 0 4px' }}>{s.label}</p>
                  <p style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 3px' }}>{s.value}</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{s.change}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Today's schedule */}
            <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Today's Schedule</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600 }}>{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ padding: '8px 0' }}>
                {appointments.length === 0 ? (
                  <div style={{ padding: '28px 22px', textAlign: 'center' }}>
                    <Calendar size={32} color="var(--text-muted)" style={{ marginBottom: 10, opacity: 0.4 }} />
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.87rem', fontWeight: 600 }}>No appointments yet</p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.76rem' }}>Appointments booked by patients will appear here</p>
                  </div>
                ) : appointments.slice(0, 4).map(apt => {
                  const sc = statusColor(apt.status);
                  return (
                    <div key={apt.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px', borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{apt.avatar}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{apt.patient}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{apt.date ? `${apt.date} · ` : ''}{apt.time} · {apt.type}</p>
                      </div>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{apt.status}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: Video, label: 'Start Video Consultation', desc: 'Connect with patients remotely', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                { icon: Pill, label: 'Write New Prescription', desc: 'Add medicine & dosage', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                { icon: Stethoscope, label: 'Patient History', desc: 'Review complete records', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
                { icon: AlertCircle, label: 'Emergency Protocol', desc: 'Handle urgent cases', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              ].map((action, i) => (
                <div key={i} className="glass-card hover-lift" onClick={() => {
                  if (action.label.includes('Prescription')) setActiveTab('prescriptions');
                  if (action.label.includes('Video')) { setConsultPatient('Rahul Sharma'); setShowConsult(true); }
                }}

                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseOver={e => (e.currentTarget.style.transform = 'translateX(4px)')}
                  onMouseOut={e => (e.currentTarget.style.transform = 'none')}
                >
                  <div style={{ width: 42, height: 42, borderRadius: 12, background: action.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <action.icon size={20} color={action.color} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem' }}>{action.label}</p>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{action.desc}</p>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── PATIENTS ── */}
      {activeTab === 'patients' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>My Assigned Patients</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{patients.length} patients</span>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead><tr>
                <th>Patient</th><th>Age</th><th>Condition</th><th>Last Visit</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {patients.map(p => {
                  const sc = statusColor(p.status);
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{p.avatar}</div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.88rem' }}>{p.age} yrs</td>
                      <td style={{ fontSize: '0.88rem' }}>{p.condition}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{p.lastVisit}</td>
                      <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{p.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setActiveTab('prescriptions'); setShowPrescForm(true); setPrescriptionForm(f => ({ ...f, patient: p.name })); }}>
                            <Pill size={13} /> Prescribe
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleViewRecords(p)}><FileText size={13} /> Records</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── APPOINTMENTS ── */}
      {activeTab === 'appointments' && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontWeight: 700 }}>My Appointments</h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{appointments.length} total</span>
          </div>
          {appointments.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center' }}>
              <Calendar size={40} color="var(--text-muted)" style={{ marginBottom: 12, opacity: 0.3 }} />
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>No appointments assigned to you yet</p>
              <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>When patients book appointments with you, they will appear here.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {appointments.map(apt => {
                    const sc = statusColor(apt.status);
                    const isPending = apt.status === 'Pending' || apt.status === 'Urgent' || apt.status === 'Scheduled';
                    return (
                      <tr key={apt.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: '1.2rem' }}>{apt.avatar}</span>
                            <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{apt.patient}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{apt.date || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.87rem' }}>
                            <Clock size={14} color="var(--text-muted)" />{apt.time}
                          </div>
                        </td>
                        <td><span style={{ fontSize: '0.82rem', padding: '2px 10px', borderRadius: 20, background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{apt.type}</span></td>
                        <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{apt.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isPending && (
                              <>
                                <button className="btn btn-success btn-sm" onClick={() => handleAppointmentAction(apt.id, 'accept')}>
                                  <CheckCircle size={13} /> Accept
                                </button>
                                <button className="btn btn-danger btn-sm" onClick={() => handleAppointmentAction(apt.id, 'reject')}>
                                  <XCircle size={13} /> Reject
                                </button>
                              </>
                            )}
                            {!isPending && <button className="btn btn-secondary btn-sm"><Video size={13} /> Join</button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── PRESCRIPTIONS ── */}
      {activeTab === 'prescriptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Add prescription form */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>{editRxId ? '✏️ Update Prescription' : '✍️ Write New Prescription'}</h3>
              <button className={`btn btn-${showPrescForm ? 'secondary' : 'primary'} btn-sm`} onClick={() => { setShowPrescForm(f => !f); if (showPrescForm) { setEditRxId(null); setPrescriptionForm({ patient: '', medicines: '', dosage: '', duration: '', instructions: '' }); } }}>
                {showPrescForm ? 'Cancel' : '+ New Prescription'}
              </button>
            </div>
            {showPrescForm && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Patient Name', key: 'patient', placeholder: 'Enter patient name' },
                  { label: 'Medicines', key: 'medicines', placeholder: 'e.g. Paracetamol 500mg' },
                  { label: 'Dosage', key: 'dosage', placeholder: 'e.g. 1 tablet twice daily' },
                  { label: 'Duration', key: 'duration', placeholder: 'e.g. 7 days' },
                ].map(field => (
                  <div key={field.key}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>{field.label}</label>
                    <input className="search-input" style={{ width: '100%' }} value={(prescriptionForm as any)[field.key]}
                      onChange={e => setPrescriptionForm(f => ({ ...f, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>Instructions</label>
                  <textarea className="search-input" style={{ width: '100%', minHeight: 80, resize: 'vertical' }}
                    value={prescriptionForm.instructions}
                    onChange={e => setPrescriptionForm(f => ({ ...f, instructions: e.target.value }))}
                    placeholder="Special instructions for patient..."
                  />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary" onClick={handleSavePrescription} disabled={saving}>
                    {saving ? <><Loader2 size={16} className="spin" /> Saving...</> : <><Heart size={16} /> {editRxId ? 'Update Prescription' : 'Save Prescription'}</>}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowPrescForm(false)}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Prescription list */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ margin: 0, fontWeight: 700 }}>Active Prescriptions</h3>
            </div>
            <div>
              {prescriptions.map(rx => {
                const sc = statusColor(rx.status);
                return (
                  <div key={rx.id} style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pill size={20} color="#10b981" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rx.patient}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: sc.bg, color: sc.color }}>{rx.status}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{rx.medicines}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issued: {rx.date} · ID: {rx.id}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleUpdatePrescription(rx.id)}><TrendingUp size={13} /> Update</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </AnimatedPage>

    {/* ── PATIENT RECORDS MODAL ── */}
    {recordsPatient && (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }} onClick={() => setRecordsPatient(null)}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 20, width: '100%', maxWidth: 780,
          maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
          border: '1px solid var(--border-color)',
        }} onClick={e => e.stopPropagation()}>
          {/* Modal header */}
          <div style={{
            padding: '20px 28px', borderBottom: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(8,145,178,0.08) 0%, rgba(99,102,241,0.08) 100%)',
            borderRadius: '20px 20px 0 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                {recordsPatient.avatar}
              </div>
              <div>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.1rem' }}>{recordsPatient.name}</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {recordsPatient.age} yrs · {recordsPatient.condition} · ID: {recordsPatient.id}
                </p>
              </div>
            </div>
            <button onClick={() => setRecordsPatient(null)} style={{
              background: 'var(--bg-input)', border: 'none', borderRadius: 10,
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 0.2s',
            }}>
              <X size={18} />
            </button>
          </div>

          {/* Add Visit Record Form */}
          <div style={{ padding: '16px 28px 0', borderBottom: showVisitForm ? '1px solid var(--border-color)' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showVisitForm ? 16 : 0 }}>
              <button className={`btn btn-${showVisitForm ? 'secondary' : 'primary'} btn-sm`}
                onClick={() => { setShowVisitForm(f => !f); if (showVisitForm) { setVisitForm({ diagnosis: '', treatment: '', bp: '', temp: '', pulse: '', weight: '', status: 'Completed', notes: '', followUpDate: '' }); setEditVisitId(null); } }}>
                {showVisitForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Visit Record</>}
              </button>
            </div>
            {showVisitForm && (
              <div style={{ paddingBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Diagnosis *</label>
                    <input className="search-input" style={{ width: '100%' }} placeholder="e.g. Hypertension Stage 1"
                      value={visitForm.diagnosis} onChange={e => setVisitForm(f => ({ ...f, diagnosis: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Treatment</label>
                    <input className="search-input" style={{ width: '100%' }} placeholder="e.g. Amlodipine 5mg prescribed"
                      value={visitForm.treatment} onChange={e => setVisitForm(f => ({ ...f, treatment: e.target.value }))} />
                  </div>
                </div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Vitals</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  <input className="search-input" style={{ width: '100%' }} placeholder="BP (e.g. 140/90)"
                    value={visitForm.bp} onChange={e => setVisitForm(f => ({ ...f, bp: e.target.value }))} />
                  <input className="search-input" style={{ width: '100%' }} placeholder="Temp (e.g. 98.6°F)"
                    value={visitForm.temp} onChange={e => setVisitForm(f => ({ ...f, temp: e.target.value }))} />
                  <input className="search-input" style={{ width: '100%' }} placeholder="Pulse (e.g. 80 bpm)"
                    value={visitForm.pulse} onChange={e => setVisitForm(f => ({ ...f, pulse: e.target.value }))} />
                  <input className="search-input" style={{ width: '100%' }} placeholder="Weight (e.g. 75 kg)"
                    value={visitForm.weight} onChange={e => setVisitForm(f => ({ ...f, weight: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Status</label>
                    <select className="search-input" style={{ width: '100%' }}
                      value={visitForm.status} onChange={e => setVisitForm(f => ({ ...f, status: e.target.value }))}>
                      <option value="Completed">Completed</option>
                      <option value="Follow-up Required">Follow-up Required</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Follow-up Date</label>
                    <input type="date" className="search-input" style={{ width: '100%' }}
                      value={visitForm.followUpDate} onChange={e => setVisitForm(f => ({ ...f, followUpDate: e.target.value }))} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 5 }}>Notes</label>
                  <textarea className="search-input" style={{ width: '100%', minHeight: 60, resize: 'vertical' }} placeholder="Additional notes or observations..."
                    value={visitForm.notes} onChange={e => setVisitForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveVisitRecord} disabled={savingVisit}>
                    {savingVisit ? <><Loader2 size={14} className="spin" /> Saving...</> : <><CheckCircle size={14} /> {editVisitId ? 'Update Record' : 'Save Visit Record'}</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setShowVisitForm(false); setEditVisitId(null); setVisitForm({ diagnosis: '', treatment: '', bp: '', temp: '', pulse: '', weight: '', status: 'Completed', notes: '', followUpDate: '' }); }}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: '24px 28px' }}>
            {loadingRecords ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader2 size={32} className="spin" color="var(--accent-primary)" />
                <p style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading records...</p>
              </div>
            ) : patientVisits.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>No visit records found</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Click "Add Visit Record" above to create the first record for this patient.</p>
              </div>
            ) : (
              <>
                {/* Latest vitals (from most recent visit) */}
                <h4 style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  📊 Latest Vitals
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
                  {[
                    { icon: Activity, label: 'Blood Pressure', value: patientVisits[0]?.vitals?.bp, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
                    { icon: Thermometer, label: 'Temperature', value: patientVisits[0]?.vitals?.temp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
                    { icon: Heart, label: 'Pulse Rate', value: patientVisits[0]?.vitals?.pulse, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
                    { icon: Star, label: 'Weight', value: patientVisits[0]?.vitals?.weight, color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
                  ].map((v, i) => (
                    <div key={i} style={{
                      padding: '14px 12px', background: v.bg, borderRadius: 14, textAlign: 'center',
                    }}>
                      <v.icon size={20} color={v.color} style={{ marginBottom: 6 }} />
                      <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>{v.value || '—'}</p>
                      <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{v.label}</p>
                    </div>
                  ))}
                </div>

                {/* Visit history */}
                <h4 style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  🏥 Visit History ({patientVisits.length} records)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                  {patientVisits.map((visit: any, idx: number) => {
                    const vsc = statusColor(visit.status);
                    return (
                      <div key={visit.id || idx} style={{
                        padding: '18px 20px', borderRadius: 14,
                        border: '1px solid var(--border-color)', background: 'var(--bg-input)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                          <div>
                            <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                              {visit.diagnosis}
                            </p>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              <Clock size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                              {visit.date} · Visit ID: {visit.id}
                            </p>
                          </div>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600, background: vsc.bg, color: vsc.color, whiteSpace: 'nowrap' }}>
                            {visit.status}
                          </span>
                        </div>
                        {visit.treatment && (
                          <div style={{ padding: '10px 14px', background: 'rgba(8,145,178,0.06)', borderRadius: 10, marginBottom: 8 }}>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              <Stethoscope size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                              <strong>Treatment:</strong> {visit.treatment}
                            </p>
                          </div>
                        )}
                        {visit.notes && (
                          <p style={{ margin: '0 0 10px', fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            📝 {visit.notes}
                          </p>
                        )}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: 10, marginTop: 10 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleEditVisit(visit)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Pencil size={13} /> Modify
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleDeleteVisit(visit.id)}
                            disabled={deletingVisitId === visit.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, color: deletingVisitId === visit.id ? 'var(--text-muted)' : '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
                            {deletingVisitId === visit.id ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />} Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Related prescriptions */}
                {prescriptions.filter((rx: any) => rx.patient === recordsPatient.name).length > 0 && (
                  <>
                    <h4 style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                      💊 Prescriptions
                    </h4>
                    {prescriptions.filter((rx: any) => rx.patient === recordsPatient.name).map((rx: any) => {
                      const rxsc = statusColor(rx.status);
                      return (
                        <div key={rx.id} style={{
                          padding: '14px 18px', borderRadius: 12,
                          border: '1px solid var(--border-color)', marginBottom: 10,
                          display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                          <Pill size={18} color="#10b981" />
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem' }}>{rx.medicines}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>Issued: {rx.date} · {rx.id}</p>
                          </div>
                          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: rxsc.bg, color: rxsc.color }}>{rx.status}</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
