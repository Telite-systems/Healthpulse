// ============================================
// Call Signaling Service — Real WebSocket Backend
// ============================================
// Connects each user to /ws/call/{user_id} on the backend.
// The server routes signals directly between users by ID,
// enabling real cross-browser, cross-device video/voice calls.
// Falls back to BroadcastChannel (same-browser) if WS unavailable.
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
  zegoRoomID?: string;   // shared room — receiver joins same Zego room
}

type IncomingCallHandler = (call: CallState) => void;
type CallStatusHandler = (call: CallState) => void;

const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const CALL_TIMEOUT_MS = 45_000;

class CallService {
  private ws: WebSocket | null = null;
  private userId = '';
  private userName = '';
  private incomingHandlers = new Set<IncomingCallHandler>();
  private statusHandlers = new Set<CallStatusHandler>();
  private activeCall: CallState | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackChannel: BroadcastChannel | null = null;
  private isConnected = false;

  // ── Connect to the signaling server for a specific user ──────────────────

  connect(userId: string, userName: string) {
    if (this.userId === userId && this.isConnected) return; // already connected
    this.userId = userId;
    this.userName = userName;
    this._openWS();
    this._initFallback();
  }

  private _openWS() {
    if (!this.userId) return;
    try {
      const url = `${WS_PROTOCOL}//${window.location.host}/ws/call/${encodeURIComponent(this.userId)}?user_name=${encodeURIComponent(this.userName)}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log(`📞 Call signaling connected as ${this.userName} (${this.userId})`);
      };

      this.ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          this._handleServerMessage(msg);
        } catch {}
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        console.log('📴 Call signaling disconnected, reconnecting in 3s...');
        this.reconnectTimer = setTimeout(() => this._openWS(), 3000);
      };

      this.ws.onerror = () => {
        console.warn('⚠️ Call signaling WS error — using fallback');
      };
    } catch (e) {
      console.warn('Could not open call signaling WS:', e);
    }
  }

  private _initFallback() {
    // BroadcastChannel as same-browser fallback
    try {
      this.fallbackChannel = new BroadcastChannel('hp_calls');
      this.fallbackChannel.onmessage = (e) => this._handleServerMessage(e.data);
    } catch {}
  }

  private _handleServerMessage(msg: any) {
    const type = msg?.type;
    if (!type) return;

    if (type === 'pong') return;

    // ── Incoming call ─────────────────────────────────────────────────────
    if (type === 'call_initiate') {
      const call: CallState = msg;
      this.incomingHandlers.forEach(h => h(call));
      return;
    }

    // ── Call was delivered / not delivered (feedback to caller) ───────────
    if (type === 'call_status') {
      if (!msg.delivered && this.activeCall && this.activeCall.callId === msg.callId) {
        // Target offline — auto-miss after a moment
        setTimeout(() => {
          if (this.activeCall && this.activeCall.callId === msg.callId) {
            const missed: CallState = { ...this.activeCall, status: 'missed' };
            this.statusHandlers.forEach(h => h(missed));
            this.activeCall = null;
          }
        }, 2000);
      }
      return;
    }

    // ── Accept ────────────────────────────────────────────────────────────
    if (type === 'call_accept') {
      if (this.activeCall && this.activeCall.callId === msg.callId) {
        const accepted: CallState = { ...this.activeCall, status: 'accepted', zegoRoomID: msg.zegoRoomID || this.activeCall.zegoRoomID };
        this.activeCall = accepted;
        this._clearTimeout();
        this.statusHandlers.forEach(h => h(accepted));
      }
      return;
    }

    // ── Reject ────────────────────────────────────────────────────────────
    if (type === 'call_reject') {
      if (this.activeCall && this.activeCall.callId === msg.callId) {
        const rejected: CallState = { ...this.activeCall, status: 'rejected' };
        this.activeCall = rejected;
        this._clearTimeout();
        this.statusHandlers.forEach(h => h(rejected));
        setTimeout(() => { this.activeCall = null; }, 3000);
      }
      return;
    }

    // ── End ───────────────────────────────────────────────────────────────
    if (type === 'call_end') {
      const callId = msg.callId as string;
      if ((this.activeCall && this.activeCall.callId === callId) || !this.activeCall) {
        const endedCall: CallState = this.activeCall
          ? { ...this.activeCall, status: 'ended' }
          : { callId, callerId: msg.callerId ?? '', callerName: msg.callerName ?? '', callerRole: msg.callerRole ?? '', callerAvatar: msg.callerAvatar ?? '', targetId: msg.targetId ?? '', targetName: msg.targetName ?? '', callType: msg.callType ?? 'video', status: 'ended', startedAt: msg.startedAt ?? Date.now() };
        this._clearTimeout();
        this.statusHandlers.forEach(h => h(endedCall));
        this.activeCall = null;
      }
      return;
    }
  }

  private _send(msg: object) {
    const json = JSON.stringify(msg);
    // Try real WS first
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(json);
    }
    // Also broadcast locally for same-browser tabs (doctor on same laptop)
    try { this.fallbackChannel?.postMessage(msg); } catch {}
  }

  private _clearTimeout() {
    if (this.timeoutId) { clearTimeout(this.timeoutId); this.timeoutId = null; }
  }

  // ── Public API ──────────────────────────────────────────────────────────

  /** Start a call. zegoRoomID is included in the signal so receiver can join. */
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
      zegoRoomID,
    };

    this.activeCall = call;

    this._send({ type: 'call_initiate', ...call });

    // Auto-timeout
    this.timeoutId = setTimeout(() => {
      if (this.activeCall?.callId === call.callId && this.activeCall.status === 'ringing') {
        this.activeCall = { ...this.activeCall, status: 'missed' };
        this.statusHandlers.forEach(h => h(this.activeCall!));
        this.activeCall = null;
      }
    }, CALL_TIMEOUT_MS);

    return call;
  }

  acceptCall(call: CallState) {
    const accepted = { ...call, status: 'accepted' as CallStatus };
    this.activeCall = accepted;
    // Send accept back to original caller (targetId = original callerId)
    this._send({ type: 'call_accept', callId: call.callId, zegoRoomID: call.zegoRoomID, targetId: call.callerId });
    return accepted;
  }

  rejectCall(call: CallState) {
    this._send({ type: 'call_reject', callId: call.callId, targetId: call.callerId });
  }

  endCall(callId?: string) {
    const id = callId || this.activeCall?.callId;
    if (!id) return;
    const targetId = this.activeCall?.callerId === this.userId
      ? this.activeCall?.targetId
      : this.activeCall?.callerId;
    this._send({ type: 'call_end', callId: id, targetId });
    this._clearTimeout();
    this.activeCall = null;
  }

  onIncomingCall(handler: IncomingCallHandler): () => void {
    this.incomingHandlers.add(handler);
    return () => this.incomingHandlers.delete(handler);
  }

  onCallStatus(handler: CallStatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => this.statusHandlers.delete(handler);
  }

  getActiveCall(): CallState | null { return this.activeCall; }
  setActiveCall(call: CallState) { this.activeCall = call; }

  destroy() {
    this._clearTimeout();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.fallbackChannel?.close();
    this.incomingHandlers.clear();
    this.statusHandlers.clear();
  }
}

// Singleton
export const callService = new CallService();
export default callService;
