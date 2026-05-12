import { useState } from 'react';
import { Video, Mic, MicOff, VideoOff, Phone, Monitor, Send } from 'lucide-react';

export default function Telemedicine() {
  const [inCall, setInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [chatMsg, setChatMsg] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'Dr. James Wilson', text: 'Hello! How are you feeling today?', time: '10:30 AM' },
    { sender: 'Patient', text: 'Hi Doctor, I have been experiencing headaches.', time: '10:31 AM' },
  ]);

  const sendMsg = () => {
    if (!chatMsg.trim()) return;
    setMessages(prev => [...prev, { sender: 'You', text: chatMsg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setChatMsg('');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Telemedicine</h1>
        <p>Virtual doctor-patient consultation</p>
      </div>

      {!inCall ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', cursor: 'pointer' }} onClick={() => setInCall(true)}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(14,165,233,0.12)', color: '#0ea5e9', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: 20 }}>
              <Video size={36} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Start Video Call</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>Begin a face-to-face video consultation with a patient</p>
            <button className="btn btn-primary">Launch Video Call</button>
          </div>

          <div className="glass-card" style={{ padding: 40, textAlign: 'center', cursor: 'pointer' }} onClick={() => setInCall(true)}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(16,185,129,0.12)', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: 20 }}>
              <Phone size={36} />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Start Voice Call</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>Audio-only consultation for quick check-ins</p>
            <button className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}>Launch Voice Call</button>
          </div>
        </div>
      ) : (
        <div className="tele-container">
          <div className="glass-card video-area">
            <div className="video-main">
              <div className="video-placeholder">
                <div className="placeholder-icon">👨‍⚕️</div>
                <h3>Dr. James Wilson</h3>
                <p>Cardiology — In Call</p>
                <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <span style={{ padding: '4px 12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: 20, fontSize: '0.8rem' }}>● Connected</span>
                  <span style={{ padding: '4px 12px', background: 'rgba(139,92,246,0.15)', color: '#8b5cf6', borderRadius: 20, fontSize: '0.8rem' }}>HD Quality</span>
                </div>
              </div>
              <div className="video-self">
                <span style={{ fontSize: '1.5rem' }}>👤</span>
              </div>
            </div>
            <div className="video-controls">
              <button className={`video-control-btn mic ${!micOn ? 'muted' : ''}`} onClick={() => setMicOn(!micOn)}>
                {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              </button>
              <button className={`video-control-btn camera ${!camOn ? 'muted' : ''}`} onClick={() => setCamOn(!camOn)}>
                {camOn ? <Video size={20} /> : <VideoOff size={20} />}
              </button>
              <button className="video-control-btn end-call" onClick={() => setInCall(false)}>
                <Phone size={20} />
              </button>
              <button className="video-control-btn screen">
                <Monitor size={20} />
              </button>
            </div>
          </div>

          <div className="glass-card chat-sidebar-panel">
            <div className="tele-chat-header">
              <h3>💬 Consultation Chat</h3>
            </div>
            <div className="tele-chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`chat-message ${m.sender === 'You' ? 'user' : 'bot'}`}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, marginBottom: 2, opacity: 0.7 }}>{m.sender}</div>
                  {m.text}
                  <div style={{ fontSize: '0.68rem', opacity: 0.5, marginTop: 4, textAlign: 'right' }}>{m.time}</div>
                </div>
              ))}
            </div>
            <div className="tele-chat-input">
              <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Type message..." />
              <button className="send-btn" style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent-gradient)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={sendMsg}>
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
