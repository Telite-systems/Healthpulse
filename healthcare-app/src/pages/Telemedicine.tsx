import { useState, useRef, useEffect } from 'react';
import { Video, Phone, Search, PhoneOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { mockDoctors } from '../data/mockData';
import callService, { type CallState, type CallType } from '../services/callService';
import DoctorPatientConsult from '../components/DoctorPatientConsult';

export default function Telemedicine() {
  const { user } = useAuth();
  const [inCall, setInCall] = useState(false);
  const [callMode, setCallMode] = useState<'video' | 'audio'>('video');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'System', text: 'Call connected. You may begin your consultation.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  ]);

  // Doctor selection state
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'accepted' | 'rejected' | 'missed'>('idle');
  const [activeCallState, setActiveCallState] = useState<CallState | null>(null);
  const [showConsult, setShowConsult] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [callElapsed, setCallElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch doctors
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await api.getAll<any>('doctors', 1, 50);
        if (res?.data?.data?.length) {
          setDoctors(res.data.data);
          return;
        }
      } catch {}
      // Fallback to mock
      setDoctors(mockDoctors);
    };
    fetchDoctors();
  }, []);

  // Listen for call status changes (accept/reject/end)
  useEffect(() => {
    const unsub = callService.onCallStatus((call) => {
      if (activeCallState && call.callId === activeCallState.callId) {
        if (call.status === 'accepted') {
          setCallingState('accepted');
          clearInterval(callTimerRef.current);
          // Open consult UI
          setRemoteName(selectedDoctor?.name || call.targetName);
          setShowConsult(true);
        } else if (call.status === 'rejected') {
          setCallingState('rejected');
          clearInterval(callTimerRef.current);
          setTimeout(() => setCallingState('idle'), 3000);
        } else if (call.status === 'missed') {
          setCallingState('missed');
          clearInterval(callTimerRef.current);
          setTimeout(() => setCallingState('idle'), 3000);
        } else if (call.status === 'ended') {
          setCallingState('idle');
          setShowConsult(false);
          setActiveCallState(null);
          clearInterval(callTimerRef.current);
        }
      }
    });
    return () => { unsub(); clearInterval(callTimerRef.current); };
  }, [activeCallState, selectedDoctor]);

  // Also listen for incoming calls that were accepted (for doctor side)
  useEffect(() => {
    const unsub = callService.onCallStatus((call) => {
      if (call.status === 'ended' && showConsult) {
        setShowConsult(false);
        setCallingState('idle');
        setActiveCallState(null);
      }
    });
    return () => unsub();
  }, [showConsult]);

  // Old simple call (for backward compat with non-doctor-select flow)
  useEffect(() => {
    if (inCall) {
      navigator.mediaDevices.getUserMedia({ video: callMode === 'video', audio: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current && callMode === 'video') {
            videoRef.current.srcObject = stream;
          }
          stream.getVideoTracks().forEach(t => t.enabled = camOn);
          stream.getAudioTracks().forEach(t => t.enabled = micOn);
        })
        .catch(err => {
          console.error("Error accessing media devices.", err);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [inCall, callMode]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.getVideoTracks().forEach(t => t.enabled = camOn);
  }, [camOn]);

  useEffect(() => {
    if (streamRef.current) streamRef.current.getAudioTracks().forEach(t => t.enabled = micOn);
  }, [micOn]);

  const startCall = (doctor: any, type: CallType) => {
    if (!user) return;
    setSelectedDoctor(doctor);
    setCallingState('calling');
    setCallElapsed(0);

    const call = callService.initiateCall(
      { id: user.id || '', name: user.name || 'Patient', role: user.role || 'Patient', avatar: user.avatar || '👤' },
      { id: doctor.id || '', name: doctor.name || 'Doctor' },
      type
    );
    setActiveCallState(call);

    // Elapsed timer
    callTimerRef.current = setInterval(() => {
      setCallElapsed(e => e + 1);
    }, 1000);
  };

  const cancelCall = () => {
    if (activeCallState) {
      callService.endCall(activeCallState.callId);
    }
    setCallingState('idle');
    setActiveCallState(null);
    setSelectedDoctor(null);
    clearInterval(callTimerRef.current);
  };

  const handleConsultClose = () => {
    if (activeCallState) {
      callService.endCall(activeCallState.callId);
    }
    setShowConsult(false);
    setCallingState('idle');
    setActiveCallState(null);
    setSelectedDoctor(null);
  };

  // Suppress unused-variable warnings for state used only in effects
  void inCall; void callMode; void micOn; void camOn;
  void setInCall; void setCallMode; void setMicOn; void setCamOn;
  void chatMsg; void setChatMsg; void messages; void setMessages;

  // Filter doctors (exclude self if logged in as doctor)
  const filteredDoctors = doctors.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q) ||
      (d.department || '').toLowerCase().includes(q);

    // Don't show yourself
    const isMe = user?.name && (d.name || '').toLowerCase().includes(user.name.toLowerCase());
    return matchesSearch && !isMe;
  });

  // Show consult overlay
  if (showConsult) {
    return <DoctorPatientConsult
      patientName={remoteName}
      callId={activeCallState?.callId}
      onClose={handleConsultClose}
    />;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Telemedicine</h1>
        <p>Connect with {user?.role === 'Doctor' ? 'patients' : 'doctors'} via video or voice call</p>
      </div>

      {/* ── Calling State Overlay ───────────────────────────────────── */}
      {callingState === 'calling' && selectedDoctor && (
        <div className="calling-overlay">
          <div className="calling-card glass-card">
            <div className="calling-pulse-container">
              <div className="call-pulse-ring ring-1" />
              <div className="call-pulse-ring ring-2" />
              <div className="call-pulse-ring ring-3" />
              <div className="call-avatar-circle">
                <span>👨‍⚕️</span>
              </div>
            </div>
            <h2 style={{ marginTop: 20, fontSize: '1.2rem', fontWeight: 700 }}>
              Calling {selectedDoctor.name}...
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: 4 }}>
              {selectedDoctor.specialization || selectedDoctor.department || 'Doctor'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Ringing... {callElapsed}s
            </p>
            <button onClick={cancelCall} className="call-btn call-reject" style={{ marginTop: 20 }}>
              <PhoneOff size={20} />
              <span>Cancel Call</span>
            </button>
          </div>
        </div>
      )}

      {callingState === 'rejected' && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, borderLeft: '4px solid #ef4444' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444', margin: 0 }}>
            📵 Call was declined by {selectedDoctor?.name || 'the doctor'}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Try again later or choose another doctor
          </p>
        </div>
      )}

      {callingState === 'missed' && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, borderLeft: '4px solid #f59e0b' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#f59e0b', margin: 0 }}>
            ⏰ No answer from {selectedDoctor?.name || 'the doctor'}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            The doctor may be busy. Try again or select another doctor.
          </p>
        </div>
      )}

      {/* ── Doctor Selection ─────────────────────────────────────── */}
      {callingState === 'idle' && (
        <>
          {/* Search bar */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', padding: '10px 18px', border: '1.5px solid var(--border-color)' }}>
              <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search doctors by name, specialization..."
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.92rem', fontFamily: 'var(--font-primary)' }}
              />
            </div>
          </div>

          {/* Doctor Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filteredDoctors.map(doc => (
              <div key={doc.id} className="glass-card tele-doctor-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                  <div className="tele-doc-avatar">
                    <span>👨‍⚕️</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>{doc.name}</h3>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {doc.specialization || 'General'} · {doc.department || ''}
                    </p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600,
                        background: doc.status === 'Available' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: doc.status === 'Available' ? '#10b981' : '#f59e0b',
                      }}>
                        {doc.status === 'Available' ? '● Online' : '○ Busy'}
                      </span>
                      {doc.experience && (
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 600, background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                          {doc.experience} yrs exp
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => startCall(doc, 'video')}
                  >
                    <Video size={15} /> Video Call
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, background: 'linear-gradient(135deg, #10b981, #06b6d4)', color: '#fff', border: 'none' }}
                    onClick={() => startCall(doc, 'audio')}
                  >
                    <Phone size={15} /> Voice Call
                  </button>
                </div>
              </div>
            ))}

            {filteredDoctors.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🔍</div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>No doctors found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
