import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, Mic, MicOff, X, Loader2,
  Volume2, VolumeX, RefreshCw, Wifi, WifiOff,
  Video, Phone, PhoneCall
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { findHelpArticles } from '../data/helpCenterData';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  quickActions?: string[];
  isError?: boolean;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

// Relative URL — proxied by Vite (dev) or nginx (Docker) to n8n
const N8N_WEBHOOK_URL = '/webhook/chat';
const REQUEST_TIMEOUT_MS = 30_000; // 30 s

// ─── Session ID — persisted for the browser tab ────────────────────────────────

function getSessionId(): string {
  const key = 'hp_chat_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ─── Rule-Based Fallback (Offline / Hinglish) ─────────────────────────────────

interface FallbackCtx { lastTopic?: string; step?: string; }
const fbCtx = { current: {} as FallbackCtx };

function getRuleBased(input: string): { text: string; quickActions: string[] } {
  const lo = input.toLowerCase();
  const ctx = fbCtx.current;

  if (lo.match(/chest pain|seene mein dard|saans|breathing|unconscious|heart attack|stroke/)) {
    fbCtx.current = {};
    return { text: '🚨 **EMERGENCY ALERT** 🚨\nYeh symptoms bahut serious hain. Abhi turant ambulance bulao ya najdiki hospital jaao. Please bilkul der mat karo!', quickActions: ['Emergency call karo', 'Najdika hospital dhundo'] };
  }
  if (lo.match(/^(hi|hello|hey|namaste|namaskar|kya haal|theek chha|kaise ho)/)) {
    fbCtx.current = { lastTopic: 'greeting', step: 'start' };
    return { text: 'Namaste! 😊 Main Dr. HealthPulse hoon, aapka personal health assistant. Aaj aap kaisa feel kar rahe hain? Jo bhi takleef ho, bata sakte hain — main yahaan hoon.', quickActions: ['Mujhe bukhar hai', 'Mujhe khansi hai', 'Sar dard hai', 'Appointment chahiye'] };
  }
  if (lo.match(/bukhar|fever|temperature|garam/)) {
    fbCtx.current = { lastTopic: 'fever', step: 'followup' };
    return { text: 'Oh, bukhar ho raha hai aapko. 🥺 Yeh sunke bahut bura laga. Kitne din se yeh problem hai? Aur kya saath mein body pain ya sardi-khansi bhi ho rahi hai?', quickActions: ['Aaj se shuru hua', 'Kal se hai', 'Haan, body pain bhi hai'] };
  }
  if (lo.match(/khansi|cough|cold|gala|throat|sardi/)) {
    fbCtx.current = { lastTopic: 'cough', step: 'followup' };
    return { text: 'Khansi aur sardi mein bahut takleef hoti hai, main samajh sakta hoon. 🥺 Yeh dry khansi hai ya balgam bhi aa rahi hai? Aur yeh kitne dino se hai?', quickActions: ['Dry khansi hai', 'Balgam aa raha hai', 'Kal se shuru hua'] };
  }
  if (lo.match(/sar dard|sir dard|headache|migraine|sar mein dard/)) {
    fbCtx.current = { lastTopic: 'headache', step: 'followup' };
    return { text: 'Sar dard bahut pareshaan karta hai — main bilkul samajh sakta hoon. 🥺 Kya dard pura sar mein hai ya kisi ek jagah? Aur kya saath mein ulti jaisi feeling bhi ho rahi hai?', quickActions: ['Pura sar dukh raha hai', 'Sirf mathe mein', 'Haan, ulti jaisi feeling hai'] };
  }
  if (lo.match(/pet|stomach|nausea|ulti|vomit|dast|loose motion/)) {
    fbCtx.current = { lastTopic: 'stomach', step: 'followup' };
    return { text: 'Pet ki problem bahut uncomfortable hoti hai. 🥺 Kya aapne kuch bahar ka ya alag khana khaya tha? Aur kya saath mein bukhar bhi hai?', quickActions: ['Bahar ka khana khaya tha', 'Ghar ka hi khaya', 'Haan thoda bukhar bhi hai'] };
  }
  if (ctx.step === 'followup') {
    const t = ctx.lastTopic;
    fbCtx.current = { ...ctx, step: 'resolved' };
    const plans: Record<string, { text: string; qa: string[] }> = {
      fever: { text: 'Samajh aa gaya. Jo aapne bataya usse lagta hai yeh viral infection ya seasonal flu hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Viral Bukhar / Flu\n• Suggested Dawai: Paracetamol 500mg (1 tablet khaana khane ke baad, din mein 3 baar)\n• Ghar ka Ilaaj: Haldi wala doodh, zyada paani peeyen, thanda paani se bacho\n• Doctor ki Salaah: Agar bukhar 103°F se zyada ho ya 3 din se zyada rahe, toh clinic aayein\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
      cough: { text: 'Aapki baat se lagta hai yeh common cold ya throat infection hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Upper Respiratory Infection\n• Suggested Dawai: Cough syrup 2 chammach din mein 2 baar\n• Ghar ka Ilaaj: Garam paani mein namak daalo aur gargle karo, honey-ginger wala paani peeyen\n• Doctor ki Salaah: Awaz mat ugaiye, thanda paani bilkul nahi\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
      headache: { text: 'Jo aap describe kar rahe hain wo tension headache lagta hai — aksar stress ya dehydration se hota hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Tension Headache / Dehydration\n• Suggested Dawai: Ibuprofen ya Paracetamol (1 tablet khaane ke saath)\n• Ghar ka Ilaaj: 2 bade glass paani abhi peeyen, andhera kamra, thodi neend lein\n• Doctor ki Salaah: Screen time kam karein aur 7-8 ghante ki neend lein\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
      stomach: { text: 'Jo aap bata rahe hain usse lagta hai yeh gastritis ya mild food poisoning hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Gastritis / Mild Food Poisoning\n• Suggested Dawai: Antacid (Gelusil) + ORS paani peete rahein\n• Ghar ka Ilaaj: Halka khana — chawal, toast, banana. Teekha-masaledar bilkul nahi.\n• Doctor ki Salaah: 24 ghante mein kuch bhi nahi rukta toh clinic aayein\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
    };
    const p = t ? plans[t] : null;
    if (p) return { text: p.text, quickActions: p.qa };
  }
  if (lo.match(/shukriya|thanks|thank|bye|theek hai|ok|thik hai/)) {
    fbCtx.current = {};
    return { text: 'Bahut shukriya! 😊 Jaldi theek ho jaao. Koi bhi problem ho toh wapas aana — main hamesha yahaan hoon. Apna khayal rakhein! 🙏', quickActions: ['Naya sawaal puchna hai'] };
  }
  if (lo.match(/appointment|book|doctor se milna/)) {
    fbCtx.current = { lastTopic: 'appointment', step: 'followup' };
    return { text: 'Bilkul! Doctor se milna hamesha best decision hota hai. Aap General Physician chahiye ya koi Specialist (ENT, Cardiologist, Orthopedic)?', quickActions: ['General Physician', 'Specialist', 'Video Consultation'] };
  }
  // ── Help Center article suggestions ──
  if (lo.match(/how to|help|guide|kaise|kaise kare|steps|tutorial|help center|kya karein/)) {
    const helpResults = findHelpArticles(lo);
    if (helpResults.length > 0) {
      const article = helpResults[0];
      const stepsPreview = article.steps.slice(0, 3).map(s => `${s.stepNumber}. ${s.text}`).join('\n');
      fbCtx.current = {};
      return {
        text: `📖 **${article.title}**\n\n${article.description}\n\n**Quick Steps:**\n${stepsPreview}${article.steps.length > 3 ? `\n...+${article.steps.length - 3} more steps` : ''}\n\n💡 _Full guide available in Help Center_`,
        quickActions: ['📖 Open Help Center', ...(helpResults.length > 1 ? [helpResults[1].title] : [])],
      };
    }
  }
  fbCtx.current = ctx;
  return { text: 'Main aapki help karna chahta hoon! Kya aap apna main symptom thoda aur clearly batayenge? Jaise — bukhar, khansi, sar dard, ya pet dard?', quickActions: ['Bukhar', 'Khansi', 'Sar dard', 'Pet dard'] };
}

// ─── Parse n8n response (handles multiple possible shapes) ───────────────────

function parseN8nResponse(data: any): { text: string; quickActions: string[] } {
  // n8n can return: { output }, { text }, { response }, { message }, or a string
  let raw = '';

  if (typeof data === 'string') {
    raw = data;
  } else if (Array.isArray(data)) {
    // n8n sometimes wraps in array
    const first = data[0];
    raw = first?.output ?? first?.text ?? first?.response ?? first?.message ?? JSON.stringify(first);
  } else if (typeof data === 'object' && data !== null) {
    raw = data.output ?? data.text ?? data.response ?? data.message ?? data.reply ?? '';
    if (!raw) raw = JSON.stringify(data);
  }

  // Extract QUICK_ACTIONS if the n8n agent outputs them
  const qaMatch = raw.match(/QUICK_ACTIONS:\s*(.+)/i);
  const quickActions = qaMatch
    ? qaMatch[1].split('|').map((a: string) => a.replace(/\[|\]/g, '').trim()).filter(Boolean)
    : [];

  return { text: raw.replace(/QUICK_ACTIONS:\s*.+/i, '').trim(), quickActions };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ftime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Initial messages ─────────────────────────────────────────────────────────

const INIT: ChatMessage[] = [{
  id: '0', sender: 'bot', timestamp: new Date().toISOString(),
  text: "Namaste! 😊 Main Dr. HealthPulse hoon — aapka personal AI health companion. Aaj aap kaisa feel kar rahe hain? Koi bhi baat ho, mujhe bataiye — main yahaan hoon aapki madad ke liye.\n\n_(You can talk to me in English, Hindi, or Hinglish!)_",
  quickActions: ['I have a fever', 'Mujhe khansi hai', 'Sar mein dard hai', 'Appointment chahiye'],
}];

// ─── Main ChatbotWidget ───────────────────────────────────────────────────────

export default function ChatbotWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INIT);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);
  const [n8nOnline, setN8nOnline] = useState<boolean | null>(null); // null = unknown
  const [usingFallback, setUsingFallback] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<any>(null);
  const sessionId = useRef<string>(getSessionId());

  // Derive patientId: use logged-in patient's id, else undefined
  const patientId = user?.role === 'Patient' ? user.id : undefined;

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);

  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speakRef = useRef<(text: string) => void>(() => { });
  speakRef.current = (text: string) => {
    if (isMutedRef.current || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text
      .replace(/QUICK_ACTIONS:.*/gi, '')
      .replace(/[🚨📋⚠️💊🌡️😊🥺👋🙏•*_]/g, '')
      .trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = 'hi-IN';
    utt.pitch = 1.05; utt.rate = 0.93;
    const voices = window.speechSynthesis.getVoices();
    const best = voices.find(v => v.lang === 'hi-IN')
      ?? voices.find(v => v.lang.startsWith('en'))
      ?? null;
    if (best) utt.voice = best;
    window.speechSynthesis.speak(utt);
  };
  const speak = (text: string) => speakRef.current(text);

  // ── Call n8n webhook ───────────────────────────────────────────────────────
  const callN8n = useCallback(async (userText: string) => {
    const payload: Record<string, string> = {
      message: userText,
      sessionId: sessionId.current,
    };
    if (patientId) payload.patientId = patientId;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(`n8n responded with HTTP ${res.status}`);
      }

      // Read body once, then try parsing as JSON or plain text
      const bodyText = await res.text();
      let data: any;
      try {
        data = JSON.parse(bodyText);
      } catch {
        // Response is plain text, not JSON
        data = bodyText;
      }
      const { text, quickActions } = parseN8nResponse(data);

      setN8nOnline(true);
      setUsingFallback(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        sender: 'bot',
        text,
        timestamp: new Date().toISOString(),
        quickActions,
      }]);
      speak(text);
    } catch (err: any) {
      clearTimeout(timeout);
      console.warn('[Chatbot] n8n unreachable, using fallback:', err.message);
      setN8nOnline(false);
      setUsingFallback(true);

      const { text, quickActions } = getRuleBased(userText);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `_(n8n agent unavailable — built-in knowledge se jawab de raha hoon)_\n\n${text}`,
        timestamp: new Date().toISOString(),
        quickActions,
      }]);
      speak(text);
    } finally {
      setIsLoading(false);
    }
  }, [patientId]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async (t: string) => {
    const tr = t.trim();
    if (!tr || isLoading) return;

    // Handle Help Center navigation from quick action
    if (tr === '📖 Open Help Center') {
      setIsOpen(false);
      navigate('/dashboard/help-center');
      return;
    }

    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'user',
      text: tr,
      timestamp: new Date().toISOString(),
    }]);
    setInput('');
    setIsLoading(true);
    await callN8n(tr);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetChat = () => {
    // Generate a fresh session ID on reset
    const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('hp_chat_session_id', newId);
    sessionId.current = newId;
    fbCtx.current = {};
    setMessages(INIT);
    setInput('');
    setUsingFallback(false);
    setIsLoading(false);
    window.speechSynthesis?.cancel();
  };

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleListening = () => {
    if (isListening) { speechRecognitionRef.current?.stop(); setIsListening(false); return; }
    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition ke liye Chrome ya Edge use karein.'); return; }
    const rec = new SR();
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = false;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    rec.onresult = (e: any) => { const t = e.results[0][0].transcript; setInput(t); handleSend(t); };
    speechRecognitionRef.current = rec;
    rec.start();
  };

  // ── Markdown renderer ─────────────────────────────────────────────────────
  const renderText = (text: string) =>
    text.split('\n').map((line, i, arr) => {
      const parts = line.replace(/\*\*(.*?)\*\*/g, '\x00B$1\x01').replace(/_(.*?)_/g, '\x00I$1\x01').split('\x00');
      return (
        <span key={i}>
          {parts.map((seg, si) => {
            if (seg.startsWith('B')) { const [c, r] = seg.slice(1).split('\x01'); return <span key={si}><strong>{c}</strong>{r}</span>; }
            if (seg.startsWith('I')) { const [c, r] = seg.slice(1).split('\x01'); return <span key={si}><em style={{ opacity: 0.75 }}>{c}</em>{r}</span>; }
            return <span key={si}>{seg.replace(/\x01/g, '')}</span>;
          })}
          {i < arr.length - 1 && <br />}
        </span>
      );
    });

  const bubbleSt = (isUser: boolean): React.CSSProperties => ({
    maxWidth: '87%', padding: '11px 15px', borderRadius: 16, fontSize: '0.91rem',
    borderBottomRightRadius: isUser ? 2 : 16, borderBottomLeftRadius: isUser ? 16 : 2,
    backgroundColor: isUser ? 'var(--accent-primary)' : 'var(--bg-input)',
    color: isUser ? '#fff' : 'var(--text-primary)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)', wordBreak: 'break-word', lineHeight: '1.6',
  });

  const iconBtn = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: 'transparent', border: 'none', cursor: 'pointer', padding: 6,
    borderRadius: 8, color: 'var(--text-secondary)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', ...extra,
  });

  // ─── Status indicator ─────────────────────────────────────────────────────
  const statusColor = usingFallback ? '#f59e0b' : '#10b981';
  const statusLabel = usingFallback
    ? 'Offline Mode'
    : n8nOnline === null
      ? 'n8n Agent'
      : 'n8n · Connected';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating button */}
      <button id="chatbot-toggle" className="chatbot-toggle" onClick={() => setIsOpen(o => !o)} title="Dr. HealthPulse se baat karein">
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {isOpen && (
        <div className="chatbot-panel" style={{ display: 'flex', flexDirection: 'column' }}>

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="chatbot-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#0891b2,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: '0 0 12px rgba(8,145,178,0.35)' }}>👨‍⚕️</div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700 }}>Dr. HealthPulse</h4>
                <span style={{ fontSize: '0.7rem', color: statusColor, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: statusColor, borderRadius: '50%', display: 'inline-block', animation: 'statusPulse 2s infinite' }} />
                  {statusLabel}
                  {patientId && (
                    <span style={{ marginLeft: 4, opacity: 0.7, color: 'var(--text-muted)' }}>· {patientId}</span>
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => { window.location.href = 'tel:108'; }} title="Emergency Call (108)" style={{...iconBtn({ color: '#fff', background: '#ef4444' }), marginRight: 4, animation: 'pulse 2s infinite'}}>
                <PhoneCall size={16} />
              </button>
              <button onClick={() => { setIsOpen(false); navigate('/dashboard/telemedicine'); }} title="Start Video Call" style={iconBtn()}>
                <Video size={18} />
              </button>
              <button onClick={() => { setIsOpen(false); navigate('/dashboard/telemedicine'); }} title="Start Voice Call" style={iconBtn()}>
                <Phone size={18} />
              </button>
              <button onClick={() => {
                setIsMuted(m => {
                  const next = !m;
                  isMutedRef.current = next;
                  if (next) {
                    // Muting: stop any playing speech
                    window.speechSynthesis?.cancel();
                  } else {
                    // Unmuting: speak the last bot message immediately
                    const lastBot = [...messages].reverse().find(msg => msg.sender === 'bot');
                    if (lastBot) {
                      // Use setTimeout so the ref update commits first
                      setTimeout(() => speakRef.current(lastBot.text), 50);
                    }
                  }
                  return next;
                });
              }} title={isMuted ? 'Unmute' : 'Mute'} style={iconBtn()}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button onClick={resetChat} title="Naya conversation shuru karo (new session)" style={iconBtn()}>
                <RefreshCw size={17} />
              </button>
            </div>
          </div>

          {/* ── Status banners ────────────────────────────────────────────── */}
          {usingFallback && (
            <div style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.18)', fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: 7 }}>
              <WifiOff size={12} />
              n8n agent unreachable — built-in responses mode. Check n8n is running on port 5678.
            </div>
          )}
          {!usingFallback && n8nOnline && (
            <div style={{ padding: '5px 14px', background: 'rgba(16,185,129,0.06)', borderBottom: '1px solid rgba(16,185,129,0.15)', fontSize: '0.72rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wifi size={11} />
              Connected to n8n · session: <code style={{ fontFamily: 'monospace', marginLeft: 4 }}>{sessionId.current}</code>
            </div>
          )}

          {/* ── Messages ─────────────────────────────────────────────────── */}
          <div className="chatbot-messages" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column' }}>
            {messages.map((msg, idx) => (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: 16, alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                {/* Sender label */}
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4, paddingRight: 4 }}>
                  {msg.sender === 'bot' ? '👨‍⚕️ Dr. HealthPulse' : '👤 You'}
                </span>
                {/* Bubble */}
                <div style={bubbleSt(msg.sender === 'user')}>
                  {renderText(msg.text)}
                  <div style={{ fontSize: '0.62rem', marginTop: 5, textAlign: 'right', opacity: 0.55 }}>{ftime(msg.timestamp)}</div>
                </div>
                {/* Quick-action pills (only on last message) */}
                {msg.quickActions && msg.quickActions.length > 0 && idx === messages.length - 1 && !isLoading && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: msg.sender === 'bot' ? 'flex-start' : 'flex-end' }}>
                    {msg.quickActions.map((a, i) => (
                      <button key={i} disabled={isLoading} onClick={() => handleSend(a)}
                        style={{ fontSize: '0.77rem', padding: '6px 12px', borderRadius: 20, fontWeight: 500, border: '1.5px solid var(--accent-primary)', backgroundColor: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                        onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
                      >{a}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* ─ Typing indicator ─ */}
            {isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.67rem', color: 'var(--text-muted)', marginBottom: 4, paddingLeft: 4 }}>👨‍⚕️ Dr. HealthPulse</span>
                <div style={{ ...bubbleSt(false), display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block', animation: `typingDot 1.2s ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>n8n agent se pooch raha hoon…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Mic */}
            <button onClick={toggleListening} disabled={isLoading} title={isListening ? 'Rokein' : 'Bolein (Hindi/English)'}
              style={{ flexShrink: 0, padding: 10, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', cursor: isLoading ? 'not-allowed' : 'pointer', background: isListening ? '#ef4444' : 'var(--bg-input)', color: isListening ? '#fff' : 'var(--text-secondary)', border: isListening ? 'none' : '1px solid var(--border-color)', animation: isListening ? 'pulse 1.5s infinite' : 'none' }}>
              {isListening ? <MicOff size={19} /> : <Mic size={19} />}
            </button>
            {/* Text */}
            <input
              id="chatbot-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
              placeholder={isListening ? '🎤 Sun raha hoon…' : 'Apni takleef batayein (Hindi/English)…'}
              disabled={isLoading || isListening}
              style={{ flex: 1, padding: '11px 16px', borderRadius: 24, fontSize: '0.9rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', transition: 'border 0.2s' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-color)')}
            />
            {/* Send */}
            <button onClick={() => handleSend(input)} disabled={isLoading || !input.trim()} title="Bhejein"
              style={{ flexShrink: 0, padding: 10, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', background: !input.trim() || isLoading ? 'var(--border-color)' : 'var(--accent-primary)', color: '#fff', cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer' }}>
              {isLoading ? <Loader2 size={19} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={19} />}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin        { to { transform:rotate(360deg); } }
        @keyframes pulse       { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.5)} 70%{box-shadow:0 0 0 10px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
        @keyframes statusPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes typingDot   { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
      `}</style>
    </>
  );
}
