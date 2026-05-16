import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { useToastContext } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import type { Appointment, PatientVisit, Billing, Prescription } from '../types';

type Tab = 'appointments' | 'visits' | 'billing' | 'prescriptions';

export default function TransactionData() {
  const [tab, setTab] = useState<Tab>('appointments');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToastContext();

  const appointments = useRealtimeCollection<Appointment>('appointments', { searchQuery: tab === 'appointments' ? search : '' });
  const visits = useRealtimeCollection<PatientVisit>('visits', { searchQuery: tab === 'visits' ? search : '' });
  const billing = useRealtimeCollection<Billing>('billing', { searchQuery: tab === 'billing' ? search : '' });
  const prescriptions = useRealtimeCollection<Prescription>('prescriptions', { searchQuery: tab === 'prescriptions' ? search : '' });

  const current = tab === 'appointments' ? appointments : tab === 'visits' ? visits : tab === 'billing' ? billing : prescriptions;

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'appointments', label: 'Appointments', icon: '📅', count: appointments.data.length },
    { key: 'visits', label: 'Visit Records', icon: '📋', count: visits.data.length },
    { key: 'billing', label: 'Billing & Payments', icon: '💳', count: billing.data.length },
    { key: 'prescriptions', label: 'Prescriptions', icon: '💊', count: prescriptions.data.length },
  ];

  const openAdd = () => { setEditId(null); setForm({}); setShowModal(true); };

  const openEdit = (id: string) => {
    setEditId(id);
    const item = current.data.find((d: any) => d.id === id);
    if (item) {
      const f: Record<string, string> = {};
      Object.entries(item).forEach(([k, v]) => { if (typeof v !== 'object') f[k] = String(v); });
      setForm(f);
    }
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await current.remove(id);
      toast.success('Deleted', `Record ${id} removed`);
    } catch {
      toast.error('Error', 'Failed to delete');
    }
    setDeletingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const now = new Date().toISOString();
    try {
      if (tab === 'appointments') {
        const entry: Appointment = {
          id: editId || `APT${String(Date.now()).slice(-5)}`,
          patientName: form.patientName || '', doctorName: form.doctorName || '', department: form.department || '',
          date: form.date || '', time: form.time || '', status: (form.status as Appointment['status']) || 'Scheduled',
          type: (form.type as Appointment['type']) || 'Consultation', notes: form.notes || '', createdAt: now
        };
        if (editId) await appointments.update(editId, entry);
        else await appointments.add(entry);
      }
      if (tab === 'billing') {
        const amt = parseFloat(form.amount) || 0;
        const disc = parseFloat(form.discount) || 0;
        const tax = parseFloat(form.tax) || 0;
        const entry: Billing = {
          id: editId || `B${String(Date.now()).slice(-5)}`,
          patientName: form.patientName || '', invoiceDate: form.invoiceDate || '', services: form.services || '',
          amount: amt, discount: disc, tax, total: amt - disc + tax,
          paymentMethod: (form.paymentMethod as Billing['paymentMethod']) || 'Cash',
          status: (form.status as Billing['status']) || 'Pending', createdAt: now
        };
        if (editId) await billing.update(editId, entry);
        else await billing.add(entry);
      }
      if (tab === 'prescriptions') {
        const entry: Prescription = {
          id: editId || `RX${String(Date.now()).slice(-5)}`,
          patientName: form.patientName || '', doctorName: form.doctorName || '',
          date: form.date || '', medications: form.medications || '', dosage: form.dosage || '',
          duration: form.duration || '', instructions: form.instructions || '',
          status: (form.status as Prescription['status']) || 'Active', createdAt: now
        };
        if (editId) await prescriptions.update(editId, entry);
        else await prescriptions.add(entry);
      }
      toast.success(editId ? 'Updated' : 'Created', 'Record saved successfully');
      setShowModal(false);
    } catch {
      toast.error('Error', 'Failed to save');
    }
    setSaving(false);
  };

  const getFields = () => {
    if (tab === 'appointments') return [
      { key: 'patientName', label: 'Patient Name' }, { key: 'doctorName', label: 'Doctor' },
      { key: 'department', label: 'Department' }, { key: 'date', label: 'Date', type: 'date' },
      { key: 'time', label: 'Time' }, { key: 'type', label: 'Type', options: ['Consultation', 'Follow-up', 'Emergency'] },
      { key: 'status', label: 'Status', options: ['Scheduled', 'Completed', 'Cancelled', 'In Progress'] },
      { key: 'notes', label: 'Notes' }
    ];
    if (tab === 'billing') return [
      { key: 'patientName', label: 'Patient Name' }, { key: 'invoiceDate', label: 'Invoice Date', type: 'date' },
      { key: 'services', label: 'Services' }, { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'discount', label: 'Discount', type: 'number' }, { key: 'tax', label: 'Tax', type: 'number' },
      { key: 'paymentMethod', label: 'Payment Method', options: ['Cash', 'Card', 'Insurance', 'UPI'] },
      { key: 'status', label: 'Status', options: ['Paid', 'Pending', 'Overdue'] }
    ];
    if (tab === 'prescriptions') return [
      { key: 'patientName', label: 'Patient Name' }, { key: 'doctorName', label: 'Doctor' },
      { key: 'date', label: 'Date', type: 'date' }, { key: 'medications', label: 'Medications' },
      { key: 'dosage', label: 'Dosage' }, { key: 'duration', label: 'Duration' },
      { key: 'instructions', label: 'Instructions' },
      { key: 'status', label: 'Status', options: ['Active', 'Completed', 'Expired'] }
    ];
    return [];
  };

  const ActionButtons = ({ id }: { id: string }) => (
    <div className="action-btns">
      <button className="action-btn hover-scale" onClick={() => openEdit(id)}><Pencil size={14} /></button>
      <button className="action-btn delete hover-scale" onClick={() => handleDelete(id)} disabled={deletingId === id}>
        {deletingId === id ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
      </button>
    </div>
  );

  const renderTable = () => {
    if (current.loading) return <Skeleton type="table" count={5} />;

    if (tab === 'appointments') {
      const data = appointments.data as unknown as Appointment[];
      return (
        <table className="data-table">
          <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{data.map((a, i) => (
            <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}>
              <td className="td-mono">{a.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{a.patientName}</td><td>{a.doctorName}</td>
              <td>{a.date}</td><td>{a.time}</td><td><span className="type-badge">{a.type}</span></td>
              <td><span className={`status-badge ${a.status.toLowerCase().replace(/\s+/g,'-')}`}>{a.status}</span></td>
              <td><ActionButtons id={a.id} /></td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (tab === 'visits') {
      const data = visits.data as unknown as PatientVisit[];
      return (
        <table className="data-table">
          <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Diagnosis</th><th>Status</th><th>BP</th></tr></thead>
          <tbody>{data.map((v, i) => (
            <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}>
              <td className="td-mono">{v.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{v.patientName}</td><td>{v.doctorName}</td>
              <td>{v.visitDate}</td><td>{v.diagnosis}</td>
              <td><span className={`status-badge ${v.status.toLowerCase().replace(/\s+/g,'-')}`}>{v.status}</span></td>
              <td>{v.vitals.bp}</td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    if (tab === 'billing') {
      const data = billing.data as unknown as Billing[];
      return (
        <table className="data-table">
          <thead><tr><th>ID</th><th>Patient</th><th>Services</th><th>Amount</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{data.map((b, i) => (
            <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}>
              <td className="td-mono">{b.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{b.patientName}</td><td>{b.services}</td>
              <td>₹{b.amount.toLocaleString('en-IN')}</td><td style={{fontWeight:700}}>₹{b.total.toLocaleString('en-IN')}</td><td>{b.paymentMethod}</td>
              <td><span className={`status-badge ${b.status.toLowerCase()}`}>{b.status}</span></td>
              <td><ActionButtons id={b.id} /></td>
            </tr>
          ))}</tbody>
        </table>
      );
    }
    const data = prescriptions.data as unknown as Prescription[];
    return (
      <table className="data-table">
        <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Medications</th><th>Dosage</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{data.map((p, i) => (
          <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}>
            <td className="td-mono">{p.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{p.patientName}</td><td>{p.doctorName}</td>
            <td>{p.medications}</td><td>{p.dosage}</td><td>{p.duration}</td>
            <td><span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span></td>
            <td><ActionButtons id={p.id} /></td>
          </tr>
        ))}</tbody>
      </table>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>Transaction Data</h1>
        <p>Real-time operational data with live sync</p>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => { setTab(t.key); setSearch(''); }}>
            {t.icon} {t.label}
            <span className="tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      <div className="glass-card data-section">
        <div className="data-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {tabs.find(t => t.key === tab)?.icon} {tabs.find(t => t.key === tab)?.label}
            <span className="live-badge">
              <Clock size={12} /> Live
              {current.connectionStatus === 'syncing' && <RefreshCw size={12} className="spin" />}
            </span>
          </h2>
          <div className="data-actions">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="search-input" style={{ paddingLeft: 34 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab !== 'visits' && <button className="btn btn-primary btn-sm hover-scale" onClick={openAdd}><Plus size={16} /> Add New</button>}
          </div>
        </div>
        <div className="data-table-wrapper">
          {renderTable()}
          {!current.loading && current.data.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <p>No records found</p>
              <span>Try adjusting your search or add new records</span>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal slide-in-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? '✏️ Edit' : '➕ Add'} Record</h3>
              <button className="btn-icon hover-scale" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {getFields().map(f => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  {f.options ? (
                    <select className="form-input" value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})}>
                      <option value="">Select</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input className="form-input" type={f.type || 'text'} placeholder={`Enter ${f.label}`} value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})} />
                  )}
                </div>
              ))}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={14} className="spin" /> Saving...</> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
