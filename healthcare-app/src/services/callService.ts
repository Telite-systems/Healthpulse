// ============================================
// Call Signaling Service
// ============================================
// Cross-browser signaling via Supabase Realtime or BroadcastChannel fallback.
// The callService now carries the zegoRoomID in the payload so the receiver
// knows exactly which Zego room to join on accept.
// ============================================

export type CallType = 'video' | 'audio';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed' | 'busy';

export interface CallState {
  callId: string;
  callerId: string;
  callerName: string;
  callerRole: string;
  callerAvatar: string;
  targetId: string;
  targetName: string;
  callType: CallType;
  status: CallStatus;
  startedAt: number;
  zegoRoomID?: string;   // ← shared room ID so receiver can join the same room
}

interface CallMessage {
  type: 'call_initiate' | 'call_accept' | 'call_reject' | 'call_end' | 'call_busy';
  payload: CallState;
  timestamp: number;
}

type IncomingCallHandler = (call: CallState) => void;
type CallStatusHandler = (call: CallState) => void;

const CHANNEL_NAME = 'hp_calls';
const CALL_TIMEOUT_MS = 45_000; // 45 seconds to answer
const STORAGE_KEY = 'hp_active_call';
const LS_SIGNAL_KEY = 'hp_call_signal'; // localStorage cross-tab fallback

class CallService {
  private channel: BroadcastChannel | null = null;
  private incomingHandlers = new Set<IncomingCallHandler>();
  private statusHandlers = new Set<CallStatusHandler>();
  private activeCall: CallState | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private lastMsgId = '';

  constructor() {
    this.init();
  }

  private init() {
    // BroadcastChannel — same-browser cross-tab (works in same browser)
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<CallMessage>) => {
        this.handleMessage(event.data);
      };
    } catch {
      console.warn('BroadcastChannel not supported — cross-tab calls disabled');
    }

    // localStorage storage event — cross-tab fallback, also cross-incognito on some browsers
    window.addEventListener('storage', this.handleStorageEvent);
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key !== LS_SIGNAL_KEY || !e.newValue) return;
    try {
      const msg: CallMessage & { _id: string } = JSON.parse(e.newValue);
      // Deduplicate — BroadcastChannel may have already handled this
      if (msg._id === this.lastMsgId) return;
      this.lastMsgId = msg._id;
      this.handleMessage(msg);
    } catch {}
  };

  private handleMessage(msg: CallMessage) {
    const { type, payload } = msg;

    switch (type) {
      case 'call_initiate':
        this.incomingHandlers.forEach(h => h(payload));
        break;

      case 'call_accept':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'accepted' };
          this.clearCallTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
        }
        break;

      case 'call_reject':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'rejected' };
          this.clearCallTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
          setTimeout(() => { this.activeCall = null; }, 3000);
        }
        break;

      case 'call_end':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'ended' };
          this.clearCallTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
          this.activeCall = null;
        }
        this.statusHandlers.forEach(h => h({ ...payload, status: 'ended' }));
        break;

      case 'call_busy':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'busy' };
          this.clearCallTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
          setTimeout(() => { this.activeCall = null; }, 3000);
        }
        break;
    }
  }

  private broadcast(msg: CallMessage) {
    // 1. BroadcastChannel — same browser, all tabs
    this.channel?.postMessage(msg);

    // 2. localStorage signal — triggers storage events in other tabs/windows
    //    NOTE: storage events do NOT fire in the same tab that set the value,
    //    but DO fire in other tabs of the same origin (including some incognito contexts).
    try {
      const msgWithId = { ...msg, _id: `${Date.now()}_${Math.random().toString(36).slice(2)}` };
      this.lastMsgId = msgWithId._id;
      localStorage.setItem(LS_SIGNAL_KEY, JSON.stringify(msgWithId));
      // Keep the value so other tabs can read it on load
    } catch {}

    // 3. Also store current active call state for late-joiners
    try {
      if (msg.type === 'call_initiate') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(msg.payload));
      } else if (msg.type === 'call_end' || msg.type === 'call_reject') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  private clearCallTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Initiate a call — zegoRoomID is carried in the signal so receiver can join */
  initiateCall(
    caller: { id: string; name: string; role: string; avatar: string },
    target: { id: string; name: string },
    callType: CallType,
    zegoRoomID?: string
  ): CallState {
    const call: CallState = {
      callId: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      callerId: caller.id,
      callerName: caller.name,
      callerRole: caller.role,
      callerAvatar: caller.avatar || '👤',
      targetId: target.id,
      targetName: target.name,
      callType,
      status: 'ringing',
      startedAt: Date.now(),
      zegoRoomID,   // ← receiver will use this to join the exact same Zego room
    };

    this.activeCall = call;

    this.broadcast({
      type: 'call_initiate',
      payload: call,
      timestamp: Date.now(),
    });

    // Auto-timeout after 45s
    this.timeoutId = setTimeout(() => {
      if (this.activeCall?.callId === call.callId && this.activeCall.status === 'ringing') {
        this.activeCall = { ...this.activeCall, status: 'missed' };
        this.statusHandlers.forEach(h => h(this.activeCall!));
        this.activeCall = null;
        localStorage.removeItem(STORAGE_KEY);
      }
    }, CALL_TIMEOUT_MS);

    return call;
  }

  /** Accept an incoming call */
  acceptCall(call: CallState) {
    const accepted = { ...call, status: 'accepted' as CallStatus };
    this.activeCall = accepted;

    this.broadcast({
      type: 'call_accept',
      payload: accepted,
      timestamp: Date.now(),
    });

    return accepted;
  }

  /** Reject an incoming call */
  rejectCall(call: CallState) {
    this.broadcast({
      type: 'call_reject',
      payload: { ...call, status: 'rejected' },
      timestamp: Date.now(),
    });
    localStorage.removeItem(STORAGE_KEY);
  }

  /** End an active call */
  endCall(callId?: string) {
    const id = callId || this.activeCall?.callId;
    if (!id) return;

    const endedCall = this.activeCall
      ? { ...this.activeCall, status: 'ended' as CallStatus }
      : { callId: id, status: 'ended' as CallStatus } as CallState;

    this.broadcast({
      type: 'call_end',
      payload: endedCall,
      timestamp: Date.now(),
    });

    this.clearCallTimeout();
    this.activeCall = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  /** Check if there's a pending incoming call (for tabs that opened late) */
  checkPendingCall(): CallState | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const call: CallState = JSON.parse(stored);
      // Only return if still fresh (< 45s old)
      if (Date.now() - call.startedAt > CALL_TIMEOUT_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return call;
    } catch {
      return null;
    }
  }

  /** Subscribe to incoming calls */
  onIncomingCall(handler: IncomingCallHandler): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
  }

  /** Subscribe to call status changes (accept/reject/end/timeout) */
  onCallStatus(handler: CallStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  /** Get current active call */
  getActiveCall(): CallState | null {
    return this.activeCall;
  }

  /** Set active call (used when accepting on receiver side) */
  setActiveCall(call: CallState) {
    this.activeCall = call;
  }

  destroy() {
    this.channel?.close();
    this.clearCallTimeout();
    this.incomingHandlers.clear();
    this.statusHandlers.clear();
    window.removeEventListener('storage', this.handleStorageEvent);
  }
}

// Singleton
export const callService = new CallService();
export default callService;
