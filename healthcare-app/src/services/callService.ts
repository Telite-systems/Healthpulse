// ============================================
// Call Signaling Service
// Uses BroadcastChannel API for cross-tab
// real-time call notifications
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

class CallService {
  private channel: BroadcastChannel | null = null;
  private incomingHandlers = new Set<IncomingCallHandler>();
  private statusHandlers = new Set<CallStatusHandler>();
  private activeCall: CallState | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.init();
  }

  private init() {
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event: MessageEvent<CallMessage>) => {
        this.handleMessage(event.data);
      };
    } catch {
      console.warn('BroadcastChannel not supported — cross-tab calls disabled');
    }
  }

  private handleMessage(msg: CallMessage) {
    const { type, payload } = msg;

    switch (type) {
      case 'call_initiate':
        // Notify all incoming call listeners
        this.incomingHandlers.forEach(h => h(payload));
        break;

      case 'call_accept':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'accepted' };
          this.clearTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
        }
        break;

      case 'call_reject':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'rejected' };
          this.clearTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
          setTimeout(() => { this.activeCall = null; }, 3000);
        }
        break;

      case 'call_end':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'ended' };
          this.clearTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
          this.activeCall = null;
        }
        // Also notify status handlers for receivers
        this.statusHandlers.forEach(h => h({ ...payload, status: 'ended' }));
        break;

      case 'call_busy':
        if (this.activeCall?.callId === payload.callId) {
          this.activeCall = { ...this.activeCall, status: 'busy' };
          this.clearTimeout();
          this.statusHandlers.forEach(h => h(this.activeCall!));
          setTimeout(() => { this.activeCall = null; }, 3000);
        }
        break;
    }
  }

  private broadcast(msg: CallMessage) {
    this.channel?.postMessage(msg);
    // Also store in localStorage as fallback
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(msg));
      // Trigger storage event for tabs that might not support BroadcastChannel
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  private clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Initiate a call to a target user */
  initiateCall(
    caller: { id: string; name: string; role: string; avatar: string },
    target: { id: string; name: string },
    callType: CallType
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

    this.clearTimeout();
    this.activeCall = null;
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
    this.clearTimeout();
    this.incomingHandlers.clear();
    this.statusHandlers.clear();
  }
}

// Singleton
export const callService = new CallService();
export default callService;
