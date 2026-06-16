// ============================================
// Schedule Follow-Up Modal
// Animated dialog for scheduling patient follow-ups
// ============================================

import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { followupApi } from '../services/followupApi';
import { useToastContext } from '../context/ToastContext';

interface ScheduleFollowUpModalProps {
  open: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  department: string;
  originalAppointmentId?: string;
  onScheduled?: () => void;
}

export default function ScheduleFollowUpModal({
  open,
  onClose,
  patientId,
  patientName,
  doctorId,
  doctorName,
  department,
  originalAppointmentId,
  onScheduled,
}: ScheduleFollowUpModalProps) {
  const toast = useToastContext();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    followupType: 'Physical Visit',
    priority: 'Normal' as 'Normal' | 'Important' | 'Urgent',
    reason: '',
    notes: '',
    scheduledDate: '',
    scheduledTime: '',
  });

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.scheduledDate || !form.scheduledTime) {
      toast.error('Validation Error', 'Please select both date and time.');
      return;
    }

    setLoading(true);
    try {
      await followupApi.create({
        patientId,
        patientName,
        doctorId,
        doctorName,
        department,
        originalAppointmentId,
        ...form,
      });
      toast.success('Success', 'Follow-up scheduled successfully.');
      if (onScheduled) onScheduled();
      onClose();
    } catch (err: any) {
      toast.error('Scheduling Failed', err?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirm-overlay visible" style={{ display: 'flex' }} onClick={onClose}>
      <div className="confirm-dialog visible" style={{ width: '500px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <button className="confirm-close" onClick={onClose} type="button">
          <X size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div className="sidebar-logo" style={{ width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="white" />
          </div>
          <h3 className="confirm-title" style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Schedule Follow-Up</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Patient</label>
            <input type="text" className="form-input" value={patientName} disabled style={{ opacity: 0.7 }} />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Date *</label>
              <input
                type="date"
                className="form-input"
                value={form.scheduledDate}
                onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Time *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 10:00 AM"
                value={form.scheduledTime}
                onChange={e => setForm({ ...form, scheduledTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Follow-Up Type</label>
              <select
                className="form-input"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: '100%', borderRadius: '8px', padding: '10px' }}
                value={form.followupType}
                onChange={e => setForm({ ...form, followupType: e.target.value })}
              >
                <option value="Physical Visit">Physical Visit</option>
                <option value="Teleconsultation">Teleconsultation</option>
                <option value="Routine Checkup">Routine Checkup</option>
                <option value="Test Review">Test Review</option>
                <option value="Post-Operation Review">Post-Operation Review</option>
                <option value="Medication Review">Medication Review</option>
              </select>
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Priority</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {(['Normal', 'Important', 'Urgent'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm ${form.priority === p ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 0', fontSize: '0.8rem', justifyContent: 'center' }}
                    onClick={() => setForm({ ...form, priority: p })}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Reason for Follow-Up</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Discuss blood test reports"
              value={form.reason}
              onChange={e => setForm({ ...form, reason: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Additional Notes</label>
            <textarea
              className="form-input"
              placeholder="Instructions for the patient..."
              rows={3}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'none' }}
            />
          </div>

          <div className="confirm-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Scheduling...' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
