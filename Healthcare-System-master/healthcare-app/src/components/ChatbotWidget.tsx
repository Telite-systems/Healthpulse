import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare, Send, Mic, MicOff, X, Loader2,
  Volume2, VolumeX, RefreshCw, Video, VideoOff,
  Phone, PhoneOff, AlertCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  quickActions?: string[];
  isError?: boolean;
}

interface GeminiTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// ─── Configuration ─────────────────────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY ?? '';

/** Model fallback chain — tries each on quota/model errors */
const MODEL_FALLBACKS = [
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash-8b',
];
const MAX_RETRIES   = 2;
const BASE_ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// ─── Multilingual Doctor System Prompt ───────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are Dr. HealthPulse — ek bahut caring, empathetic, aur experienced AI doctor assistant jo HealthPulse Hospital Platform mein embedded hai.

🌍 LANGUAGE RULES (CRITICAL):
- If user writes in Hindi → reply in Hindi + Devanagari (हिंदी)
- If user writes in Hinglish (Roman Hindi) → reply in Hinglish (friendly mix)
- If user writes English → reply in clear, warm English
- If user greets in Garhwali phrases (like "Kya haal chha", "Theek chha") → reply warmly acknowledging Garhwali, then continue in Hinglish
- DETECT the language in first 2 words and match it throughout the reply
- Use "aap" (formal) in Hindi/Hinglish to sound respectful

🩺 PERSONALITY:
- Ek caring aur warm human doctor ki tarah baat karo — kabhi robotic mat lagna
- Pehle patient ki feelings validate karo, PHIR symptoms analyse karo
- Emojis use karo occasionally (😊 🥺 💊 🌡️ 🙏) — human feel ke liye
- Clear, simple language use karo — heavy jargon avoid karo

💬 CONVERSATION STYLE:
- Warmly greet karo aur ek open-ended follow-up question poocho
- Ek baar mein sirf EK follow-up question poocho (onset, severity, ya associated symptoms)
- 2–3 details milne ke baad naturally diagnosis aur care plan batao
- Before concluding, apni reasoning batao: "Aapne jo bataya usase lagta hai ki…"
- ALWAYS end medical advice with the safety disclaimer below

📋 PRESCRIPTION FORMAT (jab zaroorat ho):
💊 Care Plan:
• Sambhavit Diagnosis: …
• Suggested Dawai: … (Dosage)
• Ghar ka Ilaaj: …
• Doctor ki Salaah: …
⚠️ Yeh sirf general jaankari hai. Agar symptoms zyada badhen ya serious lage, toh hamare clinic mein zaroor aayein ya emergency services call karein.

🚨 EMERGENCY PROTOCOL:
Agar patient bataye: chest pain, saans lene mein problem, behoshi, stroke symptoms, ya severe allergy:
→ TURANT respond karo: 🚨 EMERGENCY ALERT 🚨 — Abhi ambulance bulao ya najdiki hospital jaao. Bilkul der mat karo.

⚡ QUICK ACTIONS:
Har response ke bilkul end mein, ek alag line par exactly yeh format likho:
QUICK_ACTIONS: [option1] | [option2] | [option3]
Options 3-6 words mein rakho, contextually relevant.
Example: QUICK_ACTIONS: [Mujhe bukhar hai] | [Appointment book karo] | [Aur symptoms hain]`;

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
      fever:    { text: 'Samajh aa gaya. Jo aapne bataya usse lagta hai yeh viral infection ya seasonal flu hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Viral Bukhar / Flu\n• Suggested Dawai: Paracetamol 500mg (1 tablet khaana khane ke baad, din mein 3 baar)\n• Ghar ka Ilaaj: Haldi wala doodh, zyada paani peeyen, thanda paani se bacho\n• Doctor ki Salaah: Agar bukhar 103°F se zyada ho ya 3 din se zyada rahe, toh clinic aayein\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
      cough:    { text: 'Aapki baat se lagta hai yeh common cold ya throat infection hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Upper Respiratory Infection\n• Suggested Dawai: Cough syrup 2 chammach din mein 2 baar\n• Ghar ka Ilaaj: Garam paani mein namak daalo aur gargle karo, honey-ginger wala paani peeyen\n• Doctor ki Salaah: Awaz mat ugaiye, thanda paani bilkul nahi\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
      headache: { text: 'Jo aap describe kar rahe hain wo tension headache lagta hai — aksar stress ya dehydration se hota hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Tension Headache / Dehydration\n• Suggested Dawai: Ibuprofen ya Paracetamol (1 tablet khaane ke saath)\n• Ghar ka Ilaaj: 2 bade glass paani abhi peeyen, andhera kamra, thodi neend lein\n• Doctor ki Salaah: Screen time kam karein aur 7-8 ghante ki neend lein\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
      stomach:  { text: 'Jo aap bata rahe hain usse lagta hai yeh gastritis ya mild food poisoning hai.\n\n💊 **Care Plan:**\n• Sambhavit Diagnosis: Gastritis / Mild Food Poisoning\n• Suggested Dawai: Antacid (Gelusil) + ORS paani peete rahein\n• Ghar ka Ilaaj: Halka khana — chawal, toast, banana. Teekha-masaledar bilkul nahi.\n• Doctor ki Salaah: 24 ghante mein kuch bhi nahi rukta toh clinic aayein\n\n⚠️ Yeh sirf general jaankari hai. Serious condition ho toh doctor se zaroor milein.', qa: ['Appointment book karo', 'Shukriya, Doctor'] },
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
  fbCtx.current = ctx;
  return { text: 'Main aapki help karna chahta hoon! Kya aap apna main symptom thoda aur clearly batayenge? Jaise — bukhar, khansi, sar dard, ya pet dard?', quickActions: ['Bukhar', 'Khansi', 'Sar dard', 'Pet dard'] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseGeminiResponse(raw: string): { text: string; quickActions: string[] } {
  const qaMatch = raw.match(/QUICK_ACTIONS:\s*(.+)/i);
  const quickActions = qaMatch
    ? qaMatch[1].split('|').map(a => a.replace(/\[|\]/g, '').trim()).filter(Boolean)
    : [];
  return { text: raw.replace(/QUICK_ACTIONS:\s*.+/i, '').trim(), quickActions };
}

function parseRetryDelay(msg: string) {
  const m = msg.match(/retry in ([0-9.]+)s/i);
  return m ? Math.ceil(parseFloat(m[1])) + 1 : 10;
}

function ftime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── Initial messages ─────────────────────────────────────────────────────────

const INIT: ChatMessage[] = [{
  id: '0', sender: 'bot', timestamp: new Date().toISOString(),
  text: "Namaste! 😊 Main Dr. HealthPulse hoon — aapka personal AI health companion. Aaj aap kaisa feel kar rahe hain? Koi bhi baat ho, mujhe bataiye — main yahaan hoon aapki madad ke liye.\n\n_(You can talk to me in English, Hindi, or Hinglish!)_",
  quickActions: ['I have a fever', 'Mujhe khansi hai', 'Sar mein dard hai', 'Appointment chahiye'],
}];

// ─── Video Call Modal ──────────────────────────────────────────────────────────

function VideoCallModal({ onClose }: { onClose: () => void }) {
  const [micOn, setMicOn]     = useState(true);
  const [camOn, setCamOn]     = useState(true);
  const [callTime, setCallTime] = useState(0);
  const localVideoRef         = useRef<HTMLVideoElement>(null);
  const streamRef             = useRef<MediaStream | null>(null);
  const timerRef              = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => setCallTime(t => t + 1), 1000);
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then(stream => {
        streamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      })
      .catch(() => {}); // camera permission denied — just show placeholder
    return () => {
      clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach(t => (t.enabled = !micOn));
    setMicOn(m => !m);
  };
  const toggleCam = () => {
    streamRef.current?.getVideoTracks().forEach(t => (t.enabled = !camOn));
    setCamOn(c => !c);
  };
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{
        width: '100%', maxWidth: 720, borderRadius: 24, overflow: 'hidden',
        background: 'linear-gradient(135deg, #0c1829, #162033)',
        border: '1px solid rgba(100,150,200,0.15)', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, background: '#10b981', borderRadius: '50%', animation: 'vcPulse 2s infinite' }} />
            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.98rem' }}>Dr. HealthPulse — Video Consultation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: '#10b981', fontFamily: 'monospace', fontSize: '0.95rem' }}>{fmt(callTime)}</span>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '6px 14px', borderRadius: 8, fontSize: '0.82rem' }}>✕ Close</button>
          </div>
        </div>

        {/* Video area */}
        <div style={{ position: 'relative', background: '#060e1c', height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Doctor (remote) placeholder */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '5rem', marginBottom: 12 }}>👨‍⚕️</div>
            <p style={{ color: '#94a3b8', fontWeight: 600 }}>Dr. HealthPulse</p>
            <span style={{ fontSize: '0.8rem', color: '#10b981' }}>● Connected — AI Consultation Mode</span>
          </div>

          {/* Self-view (live camera) */}
          <div style={{ position: 'absolute', bottom: 16, right: 16, width: 140, height: 100, borderRadius: 12, overflow: 'hidden', border: '2px solid rgba(14,165,233,0.4)', background: '#0a1628' }}>
            {camOn ? (
              <video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                <VideoOff size={28} />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, background: '#0f1729' }}>
          {[
            { icon: micOn ? <Mic size={22} /> : <MicOff size={22} />, label: micOn ? 'Mute' : 'Unmute', onClick: toggleMic, active: !micOn, color: '#0891b2' },
            { icon: camOn ? <Video size={22} /> : <VideoOff size={22} />, label: camOn ? 'Stop Cam' : 'Start Cam', onClick: toggleCam, active: !camOn, color: '#6366f1' },
            { icon: <PhoneOff size={22} />, label: 'End Call', onClick: onClose, active: true, color: '#ef4444' },
          ].map((btn, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <button onClick={btn.onClick} style={{
                width: 56, height: 56, borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: btn.color + (btn.label === 'End Call' ? '' : (btn.active ? '22' : '22')),
                backgroundColor: btn.label === 'End Call' ? btn.color : (btn.active ? `${btn.color}30` : `${btn.color}18`),
                color: btn.label === 'End Call' ? '#fff' : btn.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: btn.label === 'End Call' ? '0 4px 20px rgba(239,68,68,0.4)' : 'none',
                transition: 'all 0.2s',
              }}>
                {btn.icon}
              </button>
              <p style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 6 }}>{btn.label}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes vcPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}

// ─── Main ChatbotWidget ───────────────────────────────────────────────────────

export default function ChatbotWidget() {
  const [isOpen,          setIsOpen]          = useState(false);
  const [messages,        setMessages]        = useState<ChatMessage[]>(INIT);
  const [input,           setInput]           = useState('');
  const [isListening,     setIsListening]     = useState(false);
  const [isLoading,       setIsLoading]       = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);
  const [showVideo,       setShowVideo]       = useState(false);
  const [retryCountdown,  setRetryCountdown]  = useState<number | null>(null);
  const [activeModel,     setActiveModel]     = useState(MODEL_FALLBACKS[0]);
  const [usingFallback,   setUsingFallback]   = useState(false);

  const messagesEndRef        = useRef<HTMLDivElement>(null);
  const speechRecognitionRef  = useRef<any>(null);
  const historyRef            = useRef<GeminiTurn[]>([]);
  const retryTimerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingRetryRef       = useRef<{ text: string; attempt: number; modelIdx: number } | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isLoading]);
  useEffect(() => () => {
    speechRecognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
    if (retryTimerRef.current) clearInterval(retryTimerRef.current);
  }, []);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = (text: string) => {
    if (isMuted || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/QUICK_ACTIONS:.*/gi, '').replace(/[🚨📋⚠️💊🌡️😊🥺👋🙏•*_]/g, '').trim();
    const utt   = new SpeechSynthesisUtterance(clean);
    utt.lang    = 'hi-IN'; // Use Hindi voice — falls back to en-US automatically
    utt.pitch   = 1.05; utt.rate = 0.93;
    const voices = window.speechSynthesis.getVoices();
    const best = voices.find(v => v.lang === 'hi-IN')
              ?? voices.find(v => v.lang.startsWith('en'))
              ?? null;
    if (best) utt.voice = best;
    window.speechSynthesis.speak(utt);
  };

  // ── Retry countdown helper ─────────────────────────────────────────────────
  const startRetryCountdown = (delaySec: number, text: string, attempt: number, modelIdx: number) => {
    pendingRetryRef.current = { text, attempt, modelIdx };
    setRetryCountdown(delaySec);
    retryTimerRef.current = setInterval(() => {
      setRetryCountdown(prev => {
        if (!prev || prev <= 1) {
          clearInterval(retryTimerRef.current!); retryTimerRef.current = null;
          const p = pendingRetryRef.current;
          if (p) { pendingRetryRef.current = null; callGeminiWithRetry(p.text, p.attempt + 1, p.modelIdx); }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // ── Gemini API call with model fallback + auto-retry ──────────────────────
  const callGeminiWithRetry = useCallback(async (userText: string, attempt = 0, modelIdx = 0) => {
    if (!GEMINI_API_KEY) {
      setUsingFallback(true);
      const { text, quickActions } = getRuleBased(userText);
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text, timestamp: new Date().toISOString(), quickActions }]);
      setIsLoading(false);
      speak(text);
      return;
    }

    const model = MODEL_FALLBACKS[modelIdx] ?? MODEL_FALLBACKS[MODEL_FALLBACKS.length - 1];
    setActiveModel(model);

    try {
      const body = {
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: historyRef.current,
        generationConfig: { temperature: 0.82, maxOutputTokens: 700, topP: 0.95 },
        safetySettings: [
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
        ],
      };

      const res  = await fetch(`${BASE_ENDPOINT(model)}?key=${GEMINI_API_KEY}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg: string = data?.error?.message ?? `HTTP ${res.status}`;
        const isQuota = res.status === 429 || errMsg.toLowerCase().includes('quota');
        const isModel = errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('not supported');

        if ((isQuota || isModel) && modelIdx + 1 < MODEL_FALLBACKS.length)
          return callGeminiWithRetry(userText, 0, modelIdx + 1);

        if (isQuota && attempt < MAX_RETRIES) {
          const delaySec = parseRetryDelay(errMsg);
          setIsLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now().toString(), sender: 'bot', isError: true,
            text: `⏳ Quota limit hit. **${delaySec}** second mein auto-retry ho raha hai…`,
            timestamp: new Date().toISOString(), quickActions: [],
          }]);
          startRetryCountdown(delaySec, userText, attempt, modelIdx);
          return;
        }
        throw new Error(errMsg);
      }

      const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (!raw) throw new Error('Empty response');

      historyRef.current.push({ role: 'model', parts: [{ text: raw.replace(/QUICK_ACTIONS:.*/gi, '').trim() }] });
      const { text, quickActions } = parseGeminiResponse(raw);
      setUsingFallback(false);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'bot', text, timestamp: new Date().toISOString(), quickActions }]);
      speak(text);
    } catch (err: any) {
      console.warn('[Chatbot] Offline fallback:', err.message);
      setUsingFallback(true);
      const { text, quickActions } = getRuleBased(userText);
      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(), sender: 'bot',
        text: `_(AI temporarily unavailable — built-in knowledge se jawab de raha hoon)_\n\n${text}`,
        timestamp: new Date().toISOString(), quickActions,
      }]);
      speak(text);
    } finally {
      setIsLoading(false);
    }
  }, [isMuted]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async (t: string) => {
    const tr = t.trim();
    if (!tr || isLoading || retryCountdown !== null) return;
    historyRef.current.push({ role: 'user', parts: [{ text: tr }] });
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: tr, timestamp: new Date().toISOString() }]);
    setInput('');
    setIsLoading(true);
    await callGeminiWithRetry(tr, 0, 0);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetChat = () => {
    if (retryTimerRef.current) { clearInterval(retryTimerRef.current); retryTimerRef.current = null; }
    pendingRetryRef.current = null;
    historyRef.current = [];
    fbCtx.current = {};
    setMessages(INIT);
    setInput('');
    setRetryCountdown(null);
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
    // Try Hindi recognition first — falls back to en-IN
    rec.lang = 'hi-IN'; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = ()    => setIsListening(true);
    rec.onend    = ()    => setIsListening(false);
    rec.onerror  = ()    => setIsListening(false);
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {showVideo && <VideoCallModal onClose={() => setShowVideo(false)} />}

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
                <span style={{ fontSize: '0.7rem', color: usingFallback ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, background: usingFallback ? '#f59e0b' : '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'statusPulse 2s infinite' }} />
                  {usingFallback ? 'Offline Mode' : `${activeModel}`}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {/* 📹 Video call */}
              <button onClick={() => setShowVideo(true)} title="Video Consultation shuru karein" style={iconBtn({ color: '#6366f1' })}>
                <Video size={19} />
              </button>
              <button onClick={() => setIsMuted(m => !m)} title={isMuted ? 'Unmute' : 'Mute'} style={iconBtn()}>
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <button onClick={resetChat} title="Naya conversation shuru karo" style={iconBtn()}>
                <RefreshCw size={17} />
              </button>
            </div>
          </div>

          {/* ── Banners ──────────────────────────────────────────────────── */}
          {retryCountdown !== null && (
            <div style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)', fontSize: '0.77rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertCircle size={13} />
              Rate limit — <strong>{retryCountdown}s</strong> mein auto-retry ho raha hai…
            </div>
          )}
          {usingFallback && retryCountdown === null && (
            <div style={{ padding: '7px 14px', background: 'rgba(245,158,11,0.07)', borderBottom: '1px solid rgba(245,158,11,0.18)', fontSize: '0.75rem', color: '#b45309', display: 'flex', alignItems: 'center', gap: 7 }}>
              <AlertCircle size={12} />
              Built-in mode — AI quota khatam. Jawab reliable hain par AI-generated nahi.
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
                {msg.quickActions && msg.quickActions.length > 0 && idx === messages.length - 1 && !isLoading && retryCountdown === null && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, justifyContent: msg.sender === 'bot' ? 'flex-start' : 'flex-end' }}>
                    {msg.quickActions.map((a, i) => (
                      <button key={i} disabled={isLoading} onClick={() => handleSend(a)}
                        style={{ fontSize: '0.77rem', padding: '6px 12px', borderRadius: 20, fontWeight: 500, border: '1.5px solid var(--accent-primary)', backgroundColor: 'transparent', color: 'var(--accent-primary)', cursor: 'pointer', transition: 'all 0.18s', whiteSpace: 'nowrap' }}
                        onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                        onMouseOut={e  => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-primary)'; }}
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
                  <span style={{ fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.86rem' }}>Doctor likh raha hai…</span>
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
            <input id="chatbot-input" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend(input)}
              placeholder={isListening ? '🎤 Sun raha hoon…' : retryCountdown ? `Retry ${retryCountdown}s mein…` : 'Apni takleef batayein (Hindi/English)…'}
              disabled={isLoading || isListening || retryCountdown !== null}
              style={{ flex: 1, padding: '11px 16px', borderRadius: 24, fontSize: '0.9rem', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-input)', color: 'var(--text-primary)', outline: 'none', transition: 'border 0.2s' }}
              onFocus={e => (e.target.style.borderColor = 'var(--accent-primary)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--border-color)')}
            />
            {/* Send */}
            <button onClick={() => handleSend(input)} disabled={isLoading || !input.trim() || retryCountdown !== null} title="Bhejein"
              style={{ flexShrink: 0, padding: 10, borderRadius: '50%', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s', background: !input.trim() || isLoading || retryCountdown !== null ? 'var(--border-color)' : 'var(--accent-primary)', color: '#fff', cursor: !input.trim() || isLoading || retryCountdown !== null ? 'not-allowed' : 'pointer' }}>
              <Send size={19} />
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
