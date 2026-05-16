import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, X } from 'lucide-react';
import { callService, type CallState } from '../services/callService';
import { useAuth } from '../context/AuthContext';

interface Props {
  onAccept: (call: CallState) => void;
}

export default function IncomingCallPopup({ onAccept }: Props) {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<CallState | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const unsub = callService.onIncomingCall((call) => {
      if (!user) return;

      // Check if this call is targeted at the current user
      const myName = (user.name || '').toLowerCase().trim();
      const myId = user.id || '';
      const targetName = (call.targetName || '').toLowerCase().trim();
      const targetId = call.targetId || '';

      // Match by ID or name (flexible matching like doctor dashboard)
      const isForMe =
        (myId && targetId && myId === targetId) ||
        (myName && targetName && (
          myName === targetName ||
          myName.includes(targetName) ||
          targetName.includes(myName)
        ));

      // Don't ring for your own calls
      const isFromMe = call.callerId === myId ||
        (call.callerName || '').toLowerCase().trim() === myName;

      if (isForMe && !isFromMe) {
        setIncomingCall(call);
        setElapsed(0);
        startRinging();
      }
    });

    return () => {
      unsub();
      stopRinging();
    };
  }, [user]);

  // Elapsed timer
  useEffect(() => {
    if (!incomingCall) return;

    timerRef.current = setInterval(() => {
      setElapsed(e => {
        if (e >= 44) {
          // Auto-dismiss after timeout
          handleReject();
          return 0;
        }
        return e + 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [incomingCall]);

  // Listen for call_end from caller side (they cancelled)
  useEffect(() => {
    const unsub = callService.onCallStatus((call) => {
      if (incomingCall && call.callId === incomingCall.callId && (call.status === 'ended' || call.status === 'rejected')) {
        stopRinging();
        setIncomingCall(null);
      }
    });
    return () => unsub();
  }, [incomingCall]);

  const startRinging = () => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 440;
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      oscillatorRef.current = osc;
      gainRef.current = gain;

      // Ring pattern: beep-beep ... beep-beep
      let ringCycle = 0;
      const ringInterval = setInterval(() => {
        if (!gainRef.current || !oscillatorRef.current) {
          clearInterval(ringInterval);
          return;
        }
        const t = ringCycle % 4;
        if (t === 0 || t === 1) {
          oscillatorRef.current.frequency.value = t === 0 ? 440 : 520;
          gainRef.current.gain.setValueAtTime(0.15, audioCtxRef.current!.currentTime);
        } else {
          gainRef.current.gain.setValueAtTime(0, audioCtxRef.current!.currentTime);
        }
        ringCycle++;
      }, 300);

      // Store interval for cleanup
      (audioCtxRef.current as any)._ringInterval = ringInterval;
    } catch {
      // Audio not available
    }
  };

  const stopRinging = () => {
    try {
      if ((audioCtxRef.current as any)?._ringInterval) {
        clearInterval((audioCtxRef.current as any)._ringInterval);
      }
      oscillatorRef.current?.stop();
      audioCtxRef.current?.close();
    } catch {}
    oscillatorRef.current = null;
    gainRef.current = null;
    audioCtxRef.current = null;
  };

  const handleAccept = () => {
    if (!incomingCall) return;
    stopRinging();
    const accepted = callService.acceptCall(incomingCall);
    callService.setActiveCall(accepted);
    setIncomingCall(null);
    onAccept(accepted);
  };

  const handleReject = () => {
    if (!incomingCall) return;
    stopRinging();
    callService.rejectCall(incomingCall);
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const isVideo = incomingCall.callType === 'video';

  return (
    <div className="incoming-call-overlay">
      <div className="incoming-call-card">
        {/* Pulse rings */}
        <div className="call-pulse-container">
          <div className="call-pulse-ring ring-1" />
          <div className="call-pulse-ring ring-2" />
          <div className="call-pulse-ring ring-3" />
          <div className="call-avatar-circle">
            <span>{incomingCall.callerAvatar || '👤'}</span>
          </div>
        </div>

        {/* Call info */}
        <div className="call-info">
          <p className="call-type-label">
            {isVideo ? '📹 Incoming Video Call' : '📞 Incoming Voice Call'}
          </p>
          <h2 className="call-caller-name">{incomingCall.callerName}</h2>
          <div className="call-role-badge">
            {incomingCall.callerRole === 'Patient' ? '🏥' : '👨‍⚕️'} {incomingCall.callerRole}
          </div>
          <p className="call-timer">
            Ringing... {elapsed}s
          </p>
        </div>

        {/* Action buttons */}
        <div className="call-actions">
          <button className="call-btn call-reject" onClick={handleReject} title="Reject Call">
            <PhoneOff size={24} />
            <span>Decline</span>
          </button>
          <button className="call-btn call-accept" onClick={handleAccept} title="Accept Call">
            {isVideo ? <Video size={24} /> : <Phone size={24} />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}
