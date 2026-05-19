import { useState, useRef, useEffect } from 'react';
import {
  Video, Mic, MicOff, VideoOff, PhoneOff,
  Pill, FileText, ClipboardList,
  Send, Heart, AlertCircle, CheckCircle, Clock
} from 'lucide-react';
import callService from '../services/callService';

interface VitalReading { label: string; value: string; unit: string; status: 'normal' | 'warning' | 'critical'; }
interface ConsultNote  { id: string; text: string; time: string; type: 'observation' | 'diagnosis' | 'plan'; }

const VITALS: VitalReading[] = [
  { label: 'Blood Pressure', value: '128/84', unit: 'mmHg', status: 'warning' },
  { label: 'Heart Rate',     value: '82',     unit: 'bpm',  status: 'normal'  },
  { label: 'Oxygen Sat.',    value: '97',      unit: '%',   status: 'normal'  },
  { label: 'Temperature',   value: '98.6',    unit: '°F',   status: 'normal'  },
  { label: 'Resp. Rate',    value: '18',      unit: '/min', status: 'normal'  },
  { label: 'Blood Glucose', value: '142',     unit: 'mg/dL',status: 'warning' },
];

interface Props {
  patientName?: string;
  callId?: string;
  onClose?: () => void;
}

export default function DoctorPatientConsult({ patientName = 'Rahul Sharma', callId, onClose }: Props) {
  const [micOn,    setMicOn]    = useState(true);
  const [camOn,    setCamOn]    = useState(true);
  const [callTime, setCallTime] = useState(0);
  const [tab,      setTab]      = useState<'vitals' | 'notes' | 'rx' | 'history'>('vitals');
  const [chatMsg,  setChatMsg]  = useState('');
  const [notes,    setNotes]    = useState<ConsultNote[]>([
    { id: '1', text: 'Patient reports persistent headache for 3 days. Worse in morning.', time: '10:02 AM', type: 'observation' },
    { id: '2', text: 'BP slightly elevated. Recommend monitoring.', time: '10:05 AM', type: 'diagnosis' },
  ]);
  const [noteInput, setNoteInput] = useState('');
  const [noteType,  setNoteType]  = useState<ConsultNote['type']>('observation');
  const [rx,        setRx]        = useState({ med: '', dose: '', frequency: '', duration: '', instructions: '' });
  const [rxSaved,   setRxSaved]   = useState(false);
  const [chatHistory, setChatHistory] = useState([
    { sender: 'Doctor', text: 'Good morning! How are you feeling today?', time: '10:00 AM' },
    { sender: 'Patient', text: 'Good morning Doctor. Getting better, but still have some headache.', time: '10:01 AM' },
  ]);

  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const timerRef  = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(s => { streamRef.current = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => {});
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatHistory]);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMic = () => { streamRef.current?.getAudioTracks().forEach(t => (t.enabled = !micOn)); setMicOn(m => !m); };
  const toggleCam = () => { streamRef.current?.getVideoTracks().forEach(t => (t.enabled = !camOn)); setCamOn(c => !c); };

  const sendChat = () => {
    if (!chatMsg.trim()) return;
    setChatHistory(h => [...h, { sender: 'Doctor', text: chatMsg.trim(), time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMsg('');
  };

  const addNote = () => {
    if (!noteInput.trim()) return;
    setNotes(n => [...n, { id: Date.now().toString(), text: noteInput, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: noteType }]);
    setNoteInput('');
  };

  const saveRx = () => {
    if (!rx.med) return;
    setRxSaved(true);
    setTimeout(() => setRxSaved(false), 2500);
  };

  const vitalColor = (s: VitalReading['status']) =>
    s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#10b981';

  const noteTypeColor = (t: ConsultNote['type']) =>
    t === 'diagnosis' ? '#0891b2' : t === 'plan' ? '#10b981' : '#6366f1';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 1100, height: '92vh', borderRadius: 24, overflow: 'hidden',
        display: 'grid', gridTemplateColumns: '1fr 380px',
        background: 'linear-gradient(135deg, #0c1829, #111827)',
        border: '1px solid rgba(100,150,200,0.12)',
        boxShadow: '0 40px 100px rgba(0,0,0,0.7)',
      }}>

        {/* ── Left: Video ── */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Patient video (mock avatar) */}
          <div style={{ flex: 1, background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', position: 'relative' }}>
            <div style={{ fontSize: '6rem', marginBottom: 16 }}>👤</div>
            <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '1.1rem' }}>{patientName}</p>
            <p style={{ color: '#4ade80', fontSize: '0.8rem', marginTop: 4 }}>● Connected — HD</p>

            {/* Waveform */}
            <div className="waveform" style={{ marginTop: 20 }}>
              {[1,2,3,4,5,6].map(i => <div key={i} className="waveform-bar" />)}
            </div>

            {/* Self-view (real camera) */}
            <div style={{
              position: 'absolute', bottom: 16, right: 16, width: 160, height: 110, borderRadius: 14,
              overflow: 'hidden', border: '2px solid rgba(8,145,178,0.45)', background: '#060e1c',
            }}>
              {camOn
                ? <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}><VideoOff size={30} /></div>
              }
              <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 600 }}>You (Dr.)</div>
            </div>

            {/* Call timer + status */}
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: '0.82rem', fontWeight: 600 }}>
                <div className="pulse-ring" style={{ color: '#4ade80', width: 8, height: 8 }}>
                  <div style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%' }} />
                </div>
                {fmt(callTime)}
              </div>
              <div style={{ padding: '3px 10px', borderRadius: 20, background: 'rgba(8,145,178,0.2)', color: '#67e8f9', fontSize: '0.72rem', fontWeight: 600 }}>
                🔒 Encrypted
              </div>
            </div>

            {/* Close */}
            <button onClick={() => { if (callId) callService.endCall(callId); onClose?.(); }} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem' }}>✕ End</button>
          </div>

          {/* Controls */}
          <div style={{ background: '#0f1729', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            {[
              { icon: micOn ? <Mic size={20}/> : <MicOff size={20}/>, label: micOn ? 'Mute' : 'Unmute', onClick: toggleMic, active: !micOn, color: '#0891b2' },
              { icon: camOn ? <Video size={20}/> : <VideoOff size={20}/>, label: camOn ? 'Stop Cam' : 'Start Cam', onClick: toggleCam, active: !camOn, color: '#6366f1' },
              { icon: <PhoneOff size={20}/>, label: 'End Call', onClick: () => { if (callId) callService.endCall(callId); onClose?.(); }, active: true, color: '#ef4444' },
            ].map((btn, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <button onClick={btn.onClick} style={{
                  width: 52, height: 52, borderRadius: '50%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: btn.label === 'End Call' ? btn.color : `${btn.color}22`,
                  color: btn.label === 'End Call' ? '#fff' : btn.color,
                  boxShadow: btn.label === 'End Call' ? '0 4px 20px rgba(239,68,68,0.4)' : 'none', transition: 'all 0.2s',
                }}>
                  {btn.icon}
                </button>
                <p style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 4 }}>{btn.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Clinical Panel ── */}
        <div style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0f1729' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(8,145,178,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>👤</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: '#e2e8f0', fontSize: '0.92rem' }}>{patientName}</p>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>ID: P001 · 34 yrs · ♂ · B+</p>
              </div>
            </div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4 }}>
              {([
                { key: 'vitals', icon: Heart, label: 'Vitals' },
                { key: 'notes',  icon: ClipboardList, label: 'Notes' },
                { key: 'rx',     icon: Pill, label: 'Rx' },
                { key: 'history',icon: FileText, label: 'Chat' },
              ] as any[]).map(t => (
                <button key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, padding: '6px 4px', border: 'none', borderRadius: 8, cursor: 'pointer',
                  background: tab === t.key ? 'rgba(8,145,178,0.2)' : 'transparent',
                  color: tab === t.key ? '#67e8f9' : '#64748b', fontSize: '0.72rem', fontWeight: 600,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.18s',
                }}>
                  <t.icon size={14} />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

            {/* VITALS */}
            {tab === 'vitals' && (
              <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {VITALS.map((v, i) => (
                  <div key={i} className="animate-fade-left" style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>{v.label}</p>
                      <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: vitalColor(v.status) }}>{v.value} <span style={{ fontSize: '0.68rem', fontWeight: 400, color: '#64748b' }}>{v.unit}</span></p>
                    </div>
                    <div style={{ padding: '3px 8px', borderRadius: 20, background: `${vitalColor(v.status)}18`, color: vitalColor(v.status), fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{v.status}</div>
                  </div>
                ))}
              </div>
            )}

            {/* NOTES */}
            {tab === 'notes' && (
              <div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                  {(['observation', 'diagnosis', 'plan'] as ConsultNote['type'][]).map(t => (
                    <button key={t} onClick={() => setNoteType(t)} style={{
                      padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '0.68rem', fontWeight: 700, textTransform: 'capitalize',
                      background: noteType === t ? `${noteTypeColor(t)}25` : 'transparent',
                      color: noteType === t ? noteTypeColor(t) : '#64748b', transition: 'all 0.15s',
                    }}>{t}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                  <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                    placeholder="Add clinical note..." rows={2}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px', color: '#e2e8f0', fontSize: '0.82rem', resize: 'none', outline: 'none' }}
                  />
                  <button onClick={addNote} style={{ background: 'rgba(8,145,178,0.2)', border: 'none', color: '#67e8f9', borderRadius: 10, padding: '0 12px', cursor: 'pointer' }}>
                    <CheckCircle size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {notes.map(n => (
                    <div key={n.id} style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', borderLeft: `3px solid ${noteTypeColor(n.type)}` }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.5 }}>{n.text}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: '0.65rem', color: noteTypeColor(n.type) }}>{n.type}</span>
                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}><Clock size={9} style={{ display: 'inline', marginRight: 3 }} />{n.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PRESCRIPTION */}
            {tab === 'rx' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <h4 style={{ margin: 0, color: '#e2e8f0', fontSize: '0.88rem', fontWeight: 700 }}>💊 Write Prescription</h4>
                {[
                  { key: 'med',          label: 'Medication', placeholder: 'e.g. Amlodipine 5mg' },
                  { key: 'dose',         label: 'Dosage', placeholder: 'e.g. 1 tablet' },
                  { key: 'frequency',    label: 'Frequency', placeholder: 'e.g. Once daily' },
                  { key: 'duration',     label: 'Duration', placeholder: 'e.g. 30 days' },
                  { key: 'instructions', label: 'Instructions', placeholder: 'e.g. Take after food' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input value={(rx as any)[f.key]} onChange={e => setRx(r => ({ ...r, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '7px 10px', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                ))}
                <button onClick={saveRx} style={{
                  margin: '4px 0', padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: rxSaved ? 'rgba(16,185,129,0.25)' : 'rgba(8,145,178,0.2)',
                  color: rxSaved ? '#4ade80' : '#67e8f9', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.25s',
                }}>
                  {rxSaved ? '✓ Prescription Saved!' : '💾 Save Prescription'}
                </button>
              </div>
            )}

            {/* CHAT */}
            {tab === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 8, overflowY: 'auto' }}>
                  {chatHistory.map((m, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.sender === 'Doctor' ? 'flex-end' : 'flex-start' }}>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 3 }}>{m.sender} · {m.time}</span>
                      <div style={{
                        maxWidth: '85%', padding: '8px 12px', borderRadius: 12, fontSize: '0.82rem',
                        background: m.sender === 'Doctor' ? 'rgba(8,145,178,0.2)' : 'rgba(255,255,255,0.07)',
                        color: '#e2e8f0',
                        borderBottomRightRadius: m.sender === 'Doctor' ? 2 : 12,
                        borderBottomLeftRadius: m.sender === 'Doctor' ? 12 : 2,
                      }}>{m.text}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type message to patient..."
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '8px 14px', color: '#e2e8f0', fontSize: '0.82rem', outline: 'none' }}
                  />
                  <button onClick={sendChat} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(8,145,178,0.25)', color: '#67e8f9', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Emergency strip */}
          <div style={{ padding: '10px 16px', background: 'rgba(239,68,68,0.08)', borderTop: '1px solid rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} color="#ef4444" />
            <span style={{ fontSize: '0.72rem', color: '#fca5a5', fontWeight: 600 }}>Emergency Protocol:</span>
            <button style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 20, border: '1px solid rgba(239,68,68,0.4)', background: 'transparent', color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
              🚨 Activate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
