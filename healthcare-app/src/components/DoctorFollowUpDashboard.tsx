// ============================================
// Doctor Follow-Up Dashboard Component
// Lists all follow-ups, shows stats, and manages actions
// ============================================

import { useState, useEffect } from 'react';
import { 
  Calendar, Clock, CheckCircle, Search, X, RefreshCw, AlertCircle, Eye
} from 'lucide-react';
import { followupApi } from '../services/followupApi';
import type { FollowUp } from '../types';
import { useToastContext } from '../context/ToastContext';

interface DoctorFollowUpDashboardProps {
  doctorId: string;
}

export default function DoctorFollowUpDashboard({ doctorId }: DoctorFollowUpDashboardProps) {
  const toast = useToastContext();
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Detail sidebar state
  const [selectedFU, setSelectedFU] = useState<FollowUp | null>(null);
  
  // Reschedule approval modal state
  const [approvingFU, setApprovingFU] = useState<FollowUp | null>(null);
  const [approvedDate, setApprovedDate] = useState('');
  const [approvedTime, setApprovedTime] = useState('');
  const [submittingApproval, setSubmittingApproval] = useState(false);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const res = await followupApi.getByDoctor(doctorId);
      setFollowups(res.data || []);
    } catch (err: any) {
      toast.error('Error', err?.message || 'Failed to load follow-ups.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (doctorId) {
      fetchFollowUps();
    }
  }, [doctorId]);

  const handleComplete = async (id: string) => {
    try {
      const res = await followupApi.complete(id);
      setFollowups(prev => prev.map(f => f.id === id ? res.data : f));
      if (selectedFU?.id === id) setSelectedFU(res.data);
      toast.success('Success', 'Follow-up marked as completed.');
    } catch (err: any) {
      toast.error('Action Failed', err?.message || 'Failed to complete follow-up.');
    }
  };

  const handleMarkMissed = async (id: string) => {
    try {
      const res = await followupApi.markMissed(id);
      setFollowups(prev => prev.map(f => f.id === id ? res.data : f));
      if (selectedFU?.id === id) setSelectedFU(res.data);
      toast.success('Success', 'Follow-up marked as missed.');
    } catch (err: any) {
      toast.error('Action Failed', err?.message || 'Failed to mark follow-up as missed.');
    }
  };

  const openRescheduleApproval = (fu: FollowUp) => {
    setApprovingFU(fu);
    setApprovedDate(fu.rescheduleRequest?.preferredDate || fu.scheduledDate);
    setApprovedTime(fu.rescheduleRequest?.preferredTime || fu.scheduledTime);
  };

  const handleApproveReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingFU) return;

    setSubmittingApproval(true);
    try {
      const res = await followupApi.approveReschedule(approvingFU.id, {
        approvedDate,
        approvedTime,
      });
      setFollowups(prev => prev.map(f => f.id === approvingFU.id ? res.data : f));
      if (selectedFU?.id === approvingFU.id) setSelectedFU(res.data);
      toast.success('Approved', 'Follow-up reschedule request approved.');
      setApprovingFU(null);
    } catch (err: any) {
      toast.error('Approval Failed', err?.message || 'Failed to approve reschedule.');
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Compute stat metrics
  const upcomingCount = followups.filter(f => f.status === 'Scheduled' || f.status === 'Accepted').length;
  const pendingCount = followups.filter(f => f.status === 'Reschedule Requested').length;
  const completedCount = followups.filter(f => f.status === 'Completed').length;

  const filteredFollowups = followups.filter(f => {
    const matchesSearch = f.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.id.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesStatus = statusFilter === 'All' || f.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadgeClass = (status: FollowUp['status']) => {
    switch (status) {
      case 'Scheduled': return 'badge-info';
      case 'Accepted': return 'badge-success';
      case 'Reschedule Requested': return 'badge-warning';
      case 'Completed': return 'badge-success';
      case 'Missed': return 'badge-danger';
      default: return 'badge-secondary';
    }
  };

  const getPriorityBadgeStyle = (priority: FollowUp['priority']) => {
    switch (priority) {
      case 'Urgent': return { background: 'rgba(220,38,38,0.1)', color: '#dc2626' };
      case 'Important': return { background: 'rgba(217,119,6,0.1)', color: '#d97706' };
      default: return { background: 'var(--bg-input)', color: 'var(--text-secondary)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="glass-card stat-card">
          <div className="stat-info">
            <h3>Upcoming Follow-Ups</h3>
            <div className="stat-value">{upcomingCount}</div>
            <p className="stat-change positive">Assigned & active</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(8,145,178,0.1)', color: '#0891b2' }}>
            <Calendar size={24} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-info">
            <h3>Reschedule Requests</h3>
            <div className="stat-value">{pendingCount}</div>
            <p className="stat-change" style={{ color: pendingCount > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {pendingCount > 0 ? 'Requires your approval' : 'None pending'}
            </p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
            <RefreshCw size={24} />
          </div>
        </div>

        <div className="glass-card stat-card">
          <div className="stat-info">
            <h3>Completed Follow-Ups</h3>
            <div className="stat-value">{completedCount}</div>
            <p className="stat-change positive">Successfully review-completed</p>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(5,150,105,0.1)', color: '#059669' }}>
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Main content table block */}
      <div className="glass-card">
        <div className="data-header">
          <h2>Follow-Up Records</h2>
          <div className="data-actions">
            <div className="header-search" style={{ height: '36px', width: '220px' }}>
              <Search size={16} />
              <input 
                type="text" 
                placeholder="Search patient name..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              className="form-input"
              style={{ width: '160px', height: '36px', padding: '0 12px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '20px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="Accepted">Accepted</option>
              <option value="Reschedule Requested">Reschedule Requested</option>
              <option value="Completed">Completed</option>
              <option value="Missed">Missed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
            <span className="btn-spinner" style={{ width: '30px', height: '30px' }} />
          </div>
        ) : filteredFollowups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
            <AlertCircle size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No follow-ups match your search or filter.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '16px 24px' }}>Patient Name</th>
                  <th style={{ padding: '16px 24px' }}>Scheduled Date & Time</th>
                  <th style={{ padding: '16px 24px' }}>Type</th>
                  <th style={{ padding: '16px 24px' }}>Priority</th>
                  <th style={{ padding: '16px 24px' }}>Status</th>
                  <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map(fu => (
                  <tr key={fu.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{fu.patientName}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} className="text-muted" />
                        <span>{fu.scheduledDate}</span>
                        <Clock size={14} className="text-muted" style={{ marginLeft: '6px' }} />
                        <span>{fu.scheduledTime}</span>
                      </div>
                    </td>
                    <td style={{ padding: '16px 24px' }}>{fu.followupType}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className="badge" style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600, ...getPriorityBadgeStyle(fu.priority) }}>
                        {fu.priority}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span className={`badge ${getStatusBadgeClass(fu.status)}`}>
                        {fu.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button
                          title="View Details"
                          className="btn-icon"
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => setSelectedFU(fu)}
                        >
                          <Eye size={14} />
                        </button>
                        
                        {fu.status === 'Reschedule Requested' && (
                          <button
                            title="Review Reschedule"
                            className="btn btn-success btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                            onClick={() => openRescheduleApproval(fu)}
                          >
                            Review Reschedule
                          </button>
                        )}

                        {(fu.status === 'Scheduled' || fu.status === 'Accepted') && (
                          <>
                            <button
                              title="Mark Completed"
                              className="btn btn-primary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => handleComplete(fu.id)}
                            >
                              Complete
                            </button>
                            <button
                              title="Mark Missed"
                              className="btn btn-danger btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                              onClick={() => handleMarkMissed(fu.id)}
                            >
                              Missed
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Side-Drawer / Modal */}
      {selectedFU && (
        <div className="confirm-overlay visible" onClick={() => setSelectedFU(null)}>
          <div className="confirm-dialog visible" style={{ width: '480px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <button className="confirm-close" onClick={() => setSelectedFU(null)} type="button">
              <X size={16} />
            </button>
            <h3 className="confirm-title" style={{ marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Follow-Up Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
              <div><strong>ID:</strong> {selectedFU.id}</div>
              <div><strong>Patient:</strong> {selectedFU.patientName} (ID: {selectedFU.patientId})</div>
              <div><strong>Scheduled:</strong> {selectedFU.scheduledDate} at {selectedFU.scheduledTime}</div>
              <div><strong>Type:</strong> {selectedFU.followupType}</div>
              <div><strong>Priority:</strong> {selectedFU.priority}</div>
              <div><strong>Status:</strong> {selectedFU.status}</div>
              {selectedFU.reason && <div><strong>Reason:</strong> {selectedFU.reason}</div>}
              {selectedFU.notes && <div><strong>Doctor Notes:</strong> {selectedFU.notes}</div>}
            </div>

            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '12px' }}>Audit Trail (History)</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {selectedFU.auditTrail.map((entry, idx) => (
                <div key={idx} style={{ fontSize: '0.8rem', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', borderLeft: '3px solid var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '2px' }}>
                    <span>{entry.action}</span>
                    <span>{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    By {entry.userName} ({entry.userId})
                  </div>
                  {entry.newValue && (
                    <div style={{ fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-secondary)' }}>
                      {entry.previousValue ? `${entry.previousValue} → ` : ''} {entry.newValue}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedFU(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Approval Form Overlay */}
      {approvingFU && (
        <div className="confirm-overlay visible" onClick={() => setApprovingFU(null)}>
          <div className="confirm-dialog visible" style={{ width: '420px', textAlign: 'left' }} onClick={e => e.stopPropagation()}>
            <button className="confirm-close" onClick={() => setApprovingFU(null)} type="button">
              <X size={16} />
            </button>
            <h3 className="confirm-title" style={{ marginBottom: '16px', fontFamily: 'var(--font-heading)' }}>Approve Reschedule</h3>
            
            <div style={{ padding: '12px', background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <p><strong>Patient Requested Preference:</strong></p>
              <p style={{ marginTop: '4px' }}>
                📆 {approvingFU.rescheduleRequest?.preferredDate} at 🕒 {approvingFU.rescheduleRequest?.preferredTime}
              </p>
              {approvingFU.rescheduleRequest?.reason && (
                <p style={{ marginTop: '6px', color: 'var(--text-secondary)' }}>
                  <strong>Reason:</strong> "{approvingFU.rescheduleRequest.reason}"
                </p>
              )}
            </div>

            <form onSubmit={handleApproveReschedule}>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Approved Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={approvedDate}
                  onChange={e => setApprovedDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Approved Time</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={approvedTime}
                  onChange={e => setApprovedTime(e.target.value)}
                  required
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setApprovingFU(null)} disabled={submittingApproval}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={submittingApproval}>
                  {submittingApproval ? 'Approving...' : 'Confirm Approval'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
