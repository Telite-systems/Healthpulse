import { useState } from 'react';
import { Plus, Search, Pencil, Trash2, X, RefreshCw, Loader2 } from 'lucide-react';
import { useRealtimeCollection } from '../hooks/useRealtimeCollection';
import { useToastContext } from '../context/ToastContext';
import Skeleton from '../components/Skeleton';
import type { Patient, Doctor, Staff, Department } from '../types';

type Tab = 'patients' | 'doctors' | 'staff' | 'departments';

export default function MasterData() {
  const [tab, setTab] = useState<Tab>('patients');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToastContext();

  const patients = useRealtimeCollection<Patient>('patients', { searchQuery: tab === 'patients' ? search : '' });
  const doctors = useRealtimeCollection<Doctor>('doctors', { searchQuery: tab === 'doctors' ? search : '' });
  const staffList = useRealtimeCollection<Staff>('staff', { searchQuery: tab === 'staff' ? search : '' });
  const departments = useRealtimeCollection<Department>('departments', { searchQuery: tab === 'departments' ? search : '' });

  const current = tab === 'patients' ? patients : tab === 'doctors' ? doctors : tab === 'staff' ? staffList : departments;

  const tabs: { key: Tab; label: string; icon: string; count: number }[] = [
    { key: 'patients', label: 'Patients', icon: '👤', count: patients.data.length },
    { key: 'doctors', label: 'Doctors', icon: '🩺', count: doctors.data.length },
    { key: 'staff', label: 'Staff', icon: '👥', count: staffList.data.length },
    { key: 'departments', label: 'Departments', icon: '🏥', count: departments.data.length },
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
      toast.success('Deleted', `Record ${id} removed successfully`);
    } catch {
      toast.error('Error', 'Failed to delete record');
    }
    setDeletingId(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (tab === 'patients') {
        const entry: Patient = {
          id: editId || `P${String(Date.now()).slice(-5)}`,
          name: form.name || '', age: parseInt(form.age) || 0,
          gender: (form.gender as Patient['gender']) || 'Male',
          contact: form.contact || '', email: form.email || '', address: form.address || '',
          bloodGroup: form.bloodGroup || 'A+',
          registeredDate: form.registeredDate || new Date().toISOString().split('T')[0],
          status: (form.status as Patient['status']) || 'Active'
        };
        if (editId) await patients.update(editId, entry);
        else await patients.add(entry);
      }
      if (tab === 'doctors') {
        const entry: Doctor = {
          id: editId || `D${String(Date.now()).slice(-5)}`,
          name: form.name || '', specialization: form.specialization || '',
          contact: form.contact || '', email: form.email || '',
          experience: parseInt(form.experience) || 0, department: form.department || '',
          availability: form.availability || '',
          status: (form.status as Doctor['status']) || 'Available'
        };
        if (editId) await doctors.update(editId, entry);
        else await doctors.add(entry);
      }
      if (tab === 'staff') {
        const entry: Staff = {
          id: editId || `S${String(Date.now()).slice(-5)}`,
          name: form.name || '', role: form.role || '', department: form.department || '',
          contact: form.contact || '', email: form.email || '',
          joinDate: form.joinDate || new Date().toISOString().split('T')[0],
          status: (form.status as Staff['status']) || 'Active'
        };
        if (editId) await staffList.update(editId, entry);
        else await staffList.add(entry);
      }
      if (tab === 'departments') {
        const entry: Department = {
          id: editId || `DEP${String(Date.now()).slice(-5)}`,
          name: form.name || '', head: form.head || '',
          staffCount: parseInt(form.staffCount) || 0,
          location: form.location || '',
          status: (form.status as Department['status']) || 'Active'
        };
        if (editId) await departments.update(editId, entry);
        else await departments.add(entry);
      }
      toast.success(editId ? 'Updated' : 'Created', `Record ${editId ? 'updated' : 'created'} successfully`);
      setShowModal(false);
    } catch {
      toast.error('Error', 'Failed to save record');
    }
    setSaving(false);
  };

  const getFields = (): { key: string; label: string; type?: string; options?: string[] }[] => {
    if (tab === 'patients') return [
      { key: 'name', label: 'Full Name' }, { key: 'age', label: 'Age', type: 'number' },
      { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Other'] },
      { key: 'contact', label: 'Contact' }, { key: 'email', label: 'Email', type: 'email' },
      { key: 'address', label: 'Address' },
      { key: 'bloodGroup', label: 'Blood Group', options: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'] },
      { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }
    ];
    if (tab === 'doctors') return [
      { key: 'name', label: 'Full Name' }, { key: 'specialization', label: 'Specialization' },
      { key: 'contact', label: 'Contact' }, { key: 'email', label: 'Email', type: 'email' },
      { key: 'experience', label: 'Experience (years)', type: 'number' }, { key: 'department', label: 'Department' },
      { key: 'availability', label: 'Availability' },
      { key: 'status', label: 'Status', options: ['Available', 'On Leave', 'Busy'] }
    ];
    if (tab === 'staff') return [
      { key: 'name', label: 'Full Name' }, { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' }, { key: 'contact', label: 'Contact' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }
    ];
    return [
      { key: 'name', label: 'Department Name' }, { key: 'head', label: 'Head Doctor' },
      { key: 'staffCount', label: 'Staff Count', type: 'number' }, { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status', options: ['Active', 'Inactive'] }
    ];
  };

  const getColumns = () => {
    if (tab === 'patients') return ['ID', 'Name', 'Age', 'Gender', 'Contact', 'Blood Group', 'Status', 'Actions'];
    if (tab === 'doctors') return ['ID', 'Name', 'Specialization', 'Department', 'Experience', 'Status', 'Actions'];
    if (tab === 'staff') return ['ID', 'Name', 'Role', 'Department', 'Contact', 'Status', 'Actions'];
    return ['ID', 'Name', 'Head', 'Staff Count', 'Location', 'Status', 'Actions'];
  };

  const renderRow = (item: any, i: number) => {
    const id = String(item.id);
    const status = String(item.status || '').toLowerCase().replace(/\s+/g, '-');
    const isDeleting = deletingId === id;

    const ActionButtons = () => (
      <div className="action-btns">
        <button className="action-btn hover-scale" onClick={() => openEdit(id)} title="Edit">
          <Pencil size={14} />
        </button>
        <button className="action-btn delete hover-scale" onClick={() => handleDelete(id)} disabled={isDeleting} title="Delete">
          {isDeleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    );

    if (tab === 'patients') {
      const p = item as Patient;
      return <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}><td className="td-mono">{p.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{p.name}</td><td>{p.age}</td><td>{p.gender}</td><td>{p.contact}</td><td>{p.bloodGroup}</td><td><span className={`status-badge ${status}`}>{p.status}</span></td><td><ActionButtons /></td></tr>;
    }
    if (tab === 'doctors') {
      const d = item as Doctor;
      return <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}><td className="td-mono">{d.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{d.name}</td><td>{d.specialization}</td><td>{d.department}</td><td>{d.experience} yrs</td><td><span className={`status-badge ${status}`}>{d.status}</span></td><td><ActionButtons /></td></tr>;
    }
    if (tab === 'staff') {
      const s = item as Staff;
      return <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}><td className="td-mono">{s.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{s.name}</td><td>{s.role}</td><td>{s.department}</td><td>{s.contact}</td><td><span className={`status-badge ${status}`}>{s.status}</span></td><td><ActionButtons /></td></tr>;
    }
    const dep = item as Department;
    return <tr key={i} className="table-row-animate" style={{ animationDelay: `${i * 0.03}s` }}><td className="td-mono">{dep.id}</td><td style={{fontWeight:600,color:'var(--text-primary)'}}>{dep.name}</td><td>{dep.head}</td><td>{dep.staffCount}</td><td>{dep.location}</td><td><span className={`status-badge ${status}`}>{dep.status}</span></td><td><ActionButtons /></td></tr>;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Master Data</h1>
        <p>Manage core healthcare data records • Real-time synced</p>
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
            <span className="data-count">({current.data.length})</span>
            {current.connectionStatus === 'syncing' && <RefreshCw size={14} className="spin" style={{ color: 'var(--accent-primary)' }} />}
          </h2>
          <div className="data-actions">
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="search-input" style={{ paddingLeft: 34 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm hover-scale" onClick={openAdd}><Plus size={16} /> Add New</button>
          </div>
        </div>
        <div className="data-table-wrapper">
          {current.loading ? (
            <Skeleton type="table" count={5} />
          ) : (
            <>
              <table className="data-table">
                <thead><tr>{getColumns().map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
                <tbody>{current.data.map((item: any, i: number) => renderRow(item, i))}</tbody>
              </table>
              {current.data.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <p>No records found</p>
                  <span>Try adjusting your search or add new records</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal slide-in-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editId ? '✏️ Edit' : '➕ Add'} {tabs.find(t => t.key === tab)?.label.slice(0, -1)}</h3>
              <button className="btn-icon hover-scale" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              {getFields().map(f => (
                <div className="form-group" key={f.key}>
                  <label>{f.label}</label>
                  {f.options ? (
                    <select className="form-input" value={form[f.key] || ''} onChange={e => setForm({...form, [f.key]: e.target.value})}>
                      <option value="">Select {f.label}</option>
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
