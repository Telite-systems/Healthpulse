// ============================================
// Reschedule Request Modal Component
// Allows patient to request preferred date/time
// ============================================

import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { useToastContext } from '../context/ToastContext';

interface RescheduleRequestModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { preferredDate: string; preferredTime: string; reason: string }) => Promise<void>;
  currentDate: string;
  currentTime: string;
}

export default function RescheduleRequestModal({
  open,
  onClose,
  onSubmit,
  currentDate,
  currentTime,
}: RescheduleRequestModalProps) {
  const toast = useToastContext();
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredDate || !preferredTime) {
      toast.error('Validation Error', 'Please select both preferred date and time.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({ preferredDate, preferredTime, reason });
      toast.success('Submitted', 'Reschedule request submitted successfully.');
      onClose();
    } catch (err: any) {
      toast.error('Submission Failed', err?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="confirm-overlay visible" style={{ display: 'flex' }} onClick={onClose}>
      <div className="confirm-dialog visible" style={{ width: '420px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
        <button className="confirm-close" onClick={onClose} type="button">
          <X size={16} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
          <div className="sidebar-logo" style={{ width: '38px', height: '38px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="white" />
          </div>
          <h3 className="confirm-title" style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Request Reschedule</h3>
        </div>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: '8px', marginBottom: '16px' }}>
          Current Scheduled Time: <strong>{currentDate} at {currentTime}</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Preferred Date *</label>
            <input
              type="date"
              className="form-input"
              value={preferredDate}
              onChange={e => setPreferredDate(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Preferred Time *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 11:30 AM"
              value={preferredTime}
              onChange={e => setPreferredTime(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Reason for Rescheduling</label>
            <textarea
              className="form-input"
              placeholder="Why do you need to reschedule?"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              style={{ resize: 'none' }}
            />
          </div>

          <div className="confirm-actions" style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
