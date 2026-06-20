// ============================================
// Patient Follow-Up Widget Component
// Allows patient to view and act on scheduled followups
// ============================================

import { useState, useEffect } from 'react';
import { Calendar, Clock, Check, RefreshCw, Eye, X } from 'lucide-react';
import { followupApi } from '../services/followupApi';
import type { FollowUp } from '../types';
import { useToastContext } from '../context/ToastContext';
import RescheduleRequestModal from './RescheduleRequestModal';
import { ws } from '../services/websocket';

interface PatientFollowUpWidgetProps {
  patientId: string;
}

export default function PatientFollowUpWidget({ patientId }: PatientFollowUpWidgetProps) {
  const toast = useToastContext();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected detail view
  const [selectedFU, setSelectedFU] = useState<FollowUp | null>(null);

  // Reschedule state
  const [reschedulingFU, setReschedulingFU] = useState<FollowUp | null>(null);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await followupApi.getByPatient(patientId);
      setFollowups(res.data || []);
    } catch (err: any) {
      toast.error('Error', err?.message || 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      fetchFollowUps();

      // Listen for WebSocket events to sync list in real-time
      const unsubscribe = ws.onEvent((event) => {
        if (
          event.type === 'appointment_update' ||
          event.type === 'patient_alert'
        ) {
          fetchFollowUps();
        }
      });

      return () => unsubscribe();
    }
  }, [patientId]);

  const handleAccept = async (id: string) => {
    try {
      const res = await followupApi.accept(id);
      setFollowups(prev => prev.map(f => f.id === id ? res.data : f));
      toast.success('Accepted', 'Follow-up accepted successfully.');
    } catch (err: any) {
      toast.error('Action Failed', err?.message || 'Failed to accept follow-up.');
    }
  };

  const handleRescheduleSubmit = async (data: { preferredDate: string; preferredTime: string; reason: string }) => {
    if (!reschedulingFU) return;
    try {
      const res = await followupApi.requestReschedule(reschedulingFU.id, data);
      setFollowups(prev => prev.map(f => f.id === reschedulingFU.id ? res.data : f));
      setReschedulingFU(null);
      toast.success('Reschedule Requested', 'Reschedule requested successfully.');
    } catch (err: any) {
      toast.error('Action Failed', err?.message || 'Failed to request reschedule.');
    }
  };

  const getStatusLabel = (status: FollowUp['status']) => {
    switch (status) {
      case 'Scheduled': return { text: 'Scheduled (Action Required)', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' };
      case 'Accepted': return { text: 'Accepted & Confirmed', color: '#059669', bg: 'rgba(5,150,105,0.1)' };
      case 'Reschedule Requested': return { text: 'Reschedule Requested (Pending)', color: '#d97706', bg: 'rgba(217,119,6,0.1)' };
      case 'Completed': return { text: 'Completed', color: '#059669', bg: 'rgba(5,150,105,0.1)' };
      case 'Missed': return { text: 'Missed', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' };
      default: return { text: status, color: 'var(--text-secondary)', bg: 'var(--bg-input)' };
    }
  };

  // Grouping follow-ups
  const upcoming = followups.filter(f => f.status === 'Scheduled' || f.status === 'Accepted');
  const rescheduleRequests = followups.filter(f => f.status === 'Reschedule Requested');
  const completed = followups.filter(f => f.status === 'Completed' || f.status === 'Missed');

  const renderFollowUpCard = (fu: FollowUp) => {
    const statusConfig = getStatusLabel(fu.status);
    return (
      <div key={fu.id} className="glass-card" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              Dr. {fu.doctorName}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              ({fu.department})
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Calendar size={14} /> {fu.scheduledDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={14} /> {fu.scheduledTime}
            </span>
            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, background: statusConfig.bg, color: statusConfig.color }}>
              {statusConfig.text}
            </span>
          </div>

          {fu.reason && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              <strong>Reason:</strong> {fu.reason}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedFU(fu)}
            style={{ padding: '6px 12px' }}
          >
            <Eye size={14} /> Details
          </button>

          {fu.status === 'Scheduled' && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => handleAccept(fu.id)}
              style={{ padding: '6px 12px' }}
            >
              <Check size={14} /> Accept
            </button>
          )}

          {(fu.status === 'Scheduled' || fu.status === 'Accepted') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setReschedulingFU(fu)}
              style={{ padding: '6px 12px' }}
            >
              <RefreshCw size={14} /> Reschedule
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <span className="btn-spinner" style={{ width: '24px', height: '24px' }} />
        </div>
      ) : (
        <>
          {/* Upcoming Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              📅 Upcoming Follow-Ups
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'rgba(8,145,178,0.1)', color: '#0891b2' }}>
                {upcoming.length}
              </span>
            </h4>
            {upcoming.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', borderStyle: 'dashed' }}>
                <p style={{ margin: 0 }}>No upcoming follow-ups scheduled.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcoming.map(renderFollowUpCard)}
              </div>
            )}
          </div>

          {/* Reschedule Requests Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              🔄 Reschedule Requests
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
                {rescheduleRequests.length}
              </span>
            </h4>
            {rescheduleRequests.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', borderStyle: 'dashed' }}>
                <p style={{ margin: 0 }}>No active reschedule requests.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {rescheduleRequests.map(renderFollowUpCard)}
              </div>
            )}
          </div>

          {/* Completed Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              ✅ Completed Follow-Ups
              <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '12px', background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
                {completed.length}
              </span>
            </h4>
            {completed.length === 0 ? (
              <div className="glass-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', borderStyle: 'dashed' }}>
                <p style={{ margin: 0 }}>No completed follow-ups recorded.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {completed.map(renderFollowUpCard)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail overlay */}
      {selectedFU && (
        <div className="confirm-overlay visible" onClick={() => setSelectedFU(null)}>
          <div className="confirm-dialog visible" style={{ width: '450px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <button className="confirm-close" onClick={() => setSelectedFU(null)} type="button">
              <X size={16} />
            </button>
            <h3 className="confirm-title" style={{ marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Follow-Up Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div><strong>Physician:</strong> Dr. {selectedFU.doctorName} ({selectedFU.department})</div>
              <div><strong>Date:</strong> {selectedFU.scheduledDate}</div>
              <div><strong>Time:</strong> {selectedFU.scheduledTime}</div>
              <div><strong>Type:</strong> {selectedFU.followupType}</div>
              <div><strong>Priority:</strong> {selectedFU.priority}</div>
              <div><strong>Status:</strong> {selectedFU.status}</div>
              {selectedFU.reason && <div><strong>Reason:</strong> {selectedFU.reason}</div>}
              {selectedFU.notes && <div><strong>Instructions:</strong> {selectedFU.notes}</div>}
            </div>

            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '10px' }}>Activity Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '160px', overflowY: 'auto' }}>
              {selectedFU.auditTrail.map((entry, idx) => (
                <div key={idx} style={{ fontSize: '0.78rem', padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>{entry.action}</span>
                    <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>By {entry.userName}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedFU(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule dialog */}
      {reschedulingFU && (
        <RescheduleRequestModal
          open={true}
          onClose={() => setReschedulingFU(null)}
          onSubmit={handleRescheduleSubmit}
          currentDate={reschedulingFU.scheduledDate}
          currentTime={reschedulingFU.scheduledTime}
        />
      )}
    </div>
  );
}
