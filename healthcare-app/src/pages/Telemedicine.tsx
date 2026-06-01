import { useState, useRef, useEffect } from 'react';
import {
  Video, Phone, Search, PhoneOff,
  Star, MapPin, Clock, Shield, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { mockDoctors, mockUsers } from '../data/mockData';
import callService, { type CallState, type CallType } from '../services/callService';
import DoctorPatientConsult from '../components/DoctorPatientConsult';
import ZegoCallRoom, { generateRoomID } from '../components/ZegoCallRoom';

export default function Telemedicine() {
  const { user } = useAuth();

  // Doctor selection state
  const [doctors, setDoctors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [callingState, setCallingState] = useState<'idle' | 'calling' | 'accepted' | 'rejected' | 'missed'>('idle');
  const [activeCallState, setActiveCallState] = useState<CallState | null>(null);
  const [showConsult, setShowConsult] = useState(false);
  const [remoteName, setRemoteName] = useState('');
  const [callElapsed, setCallElapsed] = useState(0);
  const [filterSpecialty, setFilterSpecialty] = useState('All');

  // ZEGOCLOUD real call state
  const [zegoRoomID, setZegoRoomID] = useState<string | null>(null);
  const [zegoCallType, setZegoCallType] = useState<'oneOnOneVideo' | 'oneOnOneVoice'>('oneOnOneVideo');

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
      } catch { /* fallback */ }
      setDoctors(mockDoctors);
    };
    fetchDoctors();
  }, []);

  // Listen for call status changes
  useEffect(() => {
    const unsub = callService.onCallStatus((call) => {
      if (activeCallState && call.callId === activeCallState.callId) {
        if (call.status === 'accepted') {
          setCallingState('accepted');
          clearInterval(callTimerRef.current);
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

  const startCall = (doctor: any, type: CallType) => {
    if (!user) return;
    setSelectedDoctor(doctor);
    setCallElapsed(0);

    // Set ZEGOCLOUD call type
    setZegoCallType(type === 'video' ? 'oneOnOneVideo' : 'oneOnOneVoice');

    // Generate DETERMINISTIC room ID — same for both caller and callee
    // Both sides compute this from their user IDs, so they always land in the same room
    const roomId = generateRoomID(user.id || 'patient', doctor.id || 'doctor');
    setZegoRoomID(roomId);

    const matchedDoctorUser = mockUsers.find((usr) => usr.role === 'Doctor' && usr.name === doctor.name);
    const doctorSignalId = matchedDoctorUser?.id || doctor.id || '';
    const doctorSignalName = doctor.name || 'Doctor';

    const call = callService.initiateCall(
      { id: user.id || '', name: user.name || 'Patient', role: user.role || 'Patient', avatar: user.avatar || '\u{1F464}' },
      { id: doctorSignalId, name: doctorSignalName },
      type,
      roomId   // ← send roomID in the signal so receiver knows which Zego room to join
    );
    setActiveCallState(call);

    // Wait for the doctor to accept the call before joining the video room.
    setCallingState('calling');
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
    setZegoRoomID(null);
  };

  // Get unique specialties
  const specialties = ['All', ...new Set(doctors.map(d => d.specialization || d.department || 'General').filter(Boolean))];

  // Filter doctors
  const filteredDoctors = doctors.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      (d.name || '').toLowerCase().includes(q) ||
      (d.specialization || '').toLowerCase().includes(q) ||
      (d.department || '').toLowerCase().includes(q);
    const matchesFilter = filterSpecialty === 'All' || 
      (d.specialization || d.department || '') === filterSpecialty;
    const isMe = user?.name && (d.name || '').toLowerCase().includes(user.name.toLowerCase());
    return matchesSearch && matchesFilter && !isMe;
  });

  // Doctor avatar colors
  const avatarGradients = [
    'linear-gradient(135deg, #0891b2, #0e7490)',
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
  ];

  // Show ZEGOCLOUD real call when accepted
  if (callingState === 'accepted' && zegoRoomID && user) {
    // Use a stable userID — localStorage ensures incognito/new browser tabs
    // get a consistent ID rather than a random timestamp that breaks Zego auth
    const stableUserID = user.id ||
      (() => {
        const key = 'hp_uid';
        const saved = localStorage.getItem(key);
        if (saved) return saved;
        const generated = `guest_${Math.random().toString(36).slice(2, 10)}`;
        localStorage.setItem(key, generated);
        return generated;
      })();

    return (
      <ZegoCallRoom
        roomID={zegoRoomID}
        userID={stableUserID}
        userName={user.name || 'Patient'}
        callType={zegoCallType}
        onCallEnd={() => {
          handleConsultClose();
        }}
        onLeaveRoom={() => {
          handleConsultClose();
        }}
      />
    );
  }

  // Show DoctorPatientConsult (fallback/clinical panel)
  if (showConsult) {
    return <DoctorPatientConsult
      patientName={remoteName}
      callId={activeCallState?.callId}
      onClose={handleConsultClose}
    />;
  }

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <h1>Telemedicine</h1>
        <p>Connect with {user?.role === 'Doctor' ? 'patients' : 'healthcare specialists'} via secure video or voice call</p>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { icon: <Activity size={20} />, label: 'Available Now', value: doctors.filter(d => d.status === 'Available').length.toString(), color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { icon: <Video size={20} />, label: 'Video Calls Today', value: '12', color: '#0891b2', bg: 'rgba(8,145,178,0.1)' },
          { icon: <Phone size={20} />, label: 'Voice Calls Today', value: '8', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
          { icon: <Shield size={20} />, label: 'End-to-End Encrypted', value: '✓', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
        ].map((stat, i) => (
          <div key={i} className="glass-card hover-lift" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Calling Overlay ──────────────────────────────────────── */}
      {callingState === 'calling' && selectedDoctor && (
        <div className="calling-overlay">
          <div style={{
            background: 'linear-gradient(135deg, #0c1829 0%, #1a1a2e 50%, #16213e 100%)',
            border: '1px solid rgba(100,150,255,0.15)',
            borderRadius: 32, padding: '48px 56px', textAlign: 'center',
            boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(8,145,178,0.15)',
            animation: 'callCardPop 0.4s cubic-bezier(0.34,1.56,0.64,1)',
            maxWidth: 420, width: '90vw',
          }}>
            {/* Pulsing avatar */}
            <div className="call-pulse-container">
              <div className="call-pulse-ring ring-1" />
              <div className="call-pulse-ring ring-2" />
              <div className="call-pulse-ring ring-3" />
              <div className="call-avatar-circle">
                <span>👨‍⚕️</span>
              </div>
            </div>

            {/* Call info */}
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: '0.78rem', color: '#67e8f9', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                📞 {activeCallState?.callType === 'video' ? 'Video' : 'Voice'} Call
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#e2e8f0' }}>
                {selectedDoctor.name}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 4 }}>
                {selectedDoctor.specialization || selectedDoctor.department || 'Doctor'}
              </p>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
                padding: '6px 16px', borderRadius: 20, background: 'rgba(255,255,255,0.06)',
                fontSize: '0.82rem', color: '#94a3b8',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', animation: 'callTimerPulse 1s infinite alternate' }} />
                Ringing... {callElapsed}s
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 32 }}>
              <button onClick={cancelCall} className="call-btn call-reject">
                <PhoneOff size={22} />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejected / Missed Banners ────────────────────────────── */}
      {callingState === 'rejected' && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, borderLeft: '4px solid #ef4444', animation: 'fadeInUp 0.3s ease' }}>
          <p style={{ fontSize: '1rem', fontWeight: 600, color: '#ef4444', margin: 0 }}>
            📵 Call was declined by {selectedDoctor?.name || 'the doctor'}
          </p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Try again later or choose another doctor
          </p>
        </div>
      )}

      {callingState === 'missed' && (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', marginBottom: 24, borderLeft: '4px solid #f59e0b', animation: 'fadeInUp 0.3s ease' }}>
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
          {/* Search + Filter bar */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                flex: '1 1 300px', display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--bg-input)', borderRadius: 'var(--radius-full)',
                padding: '10px 18px', border: '1.5px solid var(--border-color)',
                transition: 'all 0.2s',
              }}>
                <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search doctors by name, specialization..."
                  style={{
                    flex: 1, border: 'none', background: 'none', outline: 'none',
                    color: 'var(--text-primary)', fontSize: '0.92rem', fontFamily: 'var(--font-primary)',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {specialties.slice(0, 6).map(spec => (
                  <button
                    key={spec}
                    onClick={() => setFilterSpecialty(spec)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                      fontSize: '0.76rem', fontWeight: 600, transition: 'all 0.2s',
                      background: filterSpecialty === spec ? 'var(--accent-gradient)' : 'var(--bg-input)',
                      color: filterSpecialty === spec ? '#fff' : 'var(--text-secondary)',
                      boxShadow: filterSpecialty === spec ? '0 4px 12px rgba(8,145,178,0.3)' : 'none',
                    }}
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, padding: '0 4px' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              Showing <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{filteredDoctors.length}</span> doctors
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <Shield size={13} /> Secure & HIPAA Compliant
            </div>
          </div>

          {/* Doctor Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {filteredDoctors.map((doc, idx) => (
              <div key={doc.id} className="glass-card tele-doctor-card" style={{
                padding: 24, transition: 'all 0.3s', position: 'relative', overflow: 'hidden',
              }}>
                {/* Online indicator */}
                {doc.status === 'Available' && (
                  <div style={{
                    position: 'absolute', top: 16, right: 16,
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                    background: 'rgba(16,185,129,0.12)', color: '#10b981',
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                    Online
                  </div>
                )}

                {/* Doctor Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                    background: avatarGradients[idx % avatarGradients.length],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.6rem', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  }}>
                    {doc.avatar || '👨‍⚕️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{doc.name}</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {doc.specialization || doc.department || 'General'}
                    </p>
                  </div>
                </div>

                {/* Doctor details pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {doc.experience && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                      fontSize: '0.72rem', fontWeight: 600, background: 'rgba(99,102,241,0.08)', color: '#818cf8',
                    }}>
                      <Star size={11} /> {doc.experience} yrs exp
                    </div>
                  )}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                    fontSize: '0.72rem', fontWeight: 600, background: 'rgba(8,145,178,0.08)', color: '#22d3ee',
                  }}>
                    <MapPin size={11} /> {doc.department || 'General'}
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20,
                    fontSize: '0.72rem', fontWeight: 600, background: 'rgba(245,158,11,0.08)', color: '#fbbf24',
                  }}>
                    <Clock size={11} /> Available
                  </div>
                </div>

                {/* Call buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => startCall(doc, 'video')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '11px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #0891b2, #0e7490)',
                      color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                      boxShadow: '0 4px 16px rgba(8,145,178,0.3)',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { (e.target as HTMLElement).style.transform = 'translateY(-2px)'; (e.target as HTMLElement).style.boxShadow = '0 6px 24px rgba(8,145,178,0.5)'; }}
                    onMouseOut={e => { (e.target as HTMLElement).style.transform = 'translateY(0)'; (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(8,145,178,0.3)'; }}
                  >
                    <Video size={16} /> Video Call
                  </button>
                  <button
                    onClick={() => startCall(doc, 'audio')}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      padding: '11px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                      boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                      transition: 'all 0.2s',
                    }}
                    onMouseOver={e => { (e.target as HTMLElement).style.transform = 'translateY(-2px)'; (e.target as HTMLElement).style.boxShadow = '0 6px 24px rgba(16,185,129,0.5)'; }}
                    onMouseOut={e => { (e.target as HTMLElement).style.transform = 'translateY(0)'; (e.target as HTMLElement).style.boxShadow = '0 4px 16px rgba(16,185,129,0.3)'; }}
                  >
                    <Phone size={16} /> Voice Call
                  </button>
                </div>
              </div>
            ))}

            {filteredDoctors.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 60 }}>
                <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.4 }}>🔍</div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>No doctors found</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 300, margin: '0 auto' }}>
                  Try a different search term or adjust your filters
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
