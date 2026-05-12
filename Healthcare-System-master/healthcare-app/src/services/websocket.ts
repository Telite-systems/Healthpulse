// ============================================
// WebSocket Service
// Connects to real WebSocket at ws://localhost:8000/ws
// Falls back to simulated events if connection fails
// ============================================

const WS_URL = 'ws://localhost:8000/ws';

export interface WSEvent {
  id: string;
  type: 'patient_alert' | 'appointment_update' | 'vital_update' | 'billing_event' | 'system_event' | 'staff_status';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
  timestamp: number;
  data?: Record<string, any>;
}

type WSEventHandler = (event: WSEvent) => void;

class WebSocketService {
  private handlers: Map<string, Set<WSEventHandler>> = new Map();
  private globalHandlers: Set<WSEventHandler> = new Set();
  private eventLog: WSEvent[] = [];
  private ws: WebSocket | null = null;
  private isRunning = false;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatListeners: Set<(bpm: number) => void> = new Set();
  private heartbeatInterval: number | null = null;
  private currentBPM = 72;
  private fallbackInterval: number | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connect();
    this.startHeartbeat();
  }

  stop(): void {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  private connect(): void {
    if (!this.isRunning) return;

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('✅ WebSocket connected to backend');
        this.reconnectAttempts = 0;
        // Stop fallback if running
        if (this.fallbackInterval) {
          clearInterval(this.fallbackInterval);
          this.fallbackInterval = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'pong') return; // Heartbeat response
          this.handleEvent(data as WSEvent);
        } catch (e) {
          console.warn('WS message parse error:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Error will trigger onclose, which handles reconnect
        this.startFallback();
      };
    } catch {
      this.scheduleReconnect();
      this.startFallback();
    }
  }

  private scheduleReconnect(): void {
    if (!this.isRunning || this.reconnectTimeout) return;

    this.reconnectAttempts++;
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached, using fallback events');
      this.startFallback();
      return;
    }

    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    console.log(`Reconnecting WebSocket in ${Math.round(delay / 1000)}s (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = window.setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  // Fallback: generate simulated events when backend WS is unavailable
  private startFallback(): void {
    if (this.fallbackInterval) return;

    const templates: Omit<WSEvent, 'id' | 'timestamp'>[] = [
      { type: 'vital_update', title: 'Vitals Updated', message: 'Patient John Anderson — BP: 138/88, HR: 76 bpm', severity: 'info' },
      { type: 'appointment_update', title: 'Appointment Check-in', message: 'Maria Garcia has checked in for Dr. Anna Lee', severity: 'info' },
      { type: 'patient_alert', title: 'New Patient Registered', message: 'Patient Alex Rivera — Emergency Department', severity: 'info' },
      { type: 'billing_event', title: 'Payment Received', message: '$495 payment from Robert Chen', severity: 'success' },
      { type: 'system_event', title: 'System Backup', message: 'Daily backup completed — 1.2GB synced', severity: 'success' },
      { type: 'staff_status', title: 'Shift Change', message: 'Night shift handover complete — 12 staff on duty', severity: 'info' },
      { type: 'vital_update', title: 'Critical Alert', message: 'ICU Bed 7 — Patient heart rate dropped to 48 bpm', severity: 'critical' },
    ];

    const emit = () => {
      const template = templates[Math.floor(Math.random() * templates.length)];
      this.handleEvent({
        ...template,
        id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
      });
    };

    // Emit every 6-18 seconds
    this.fallbackInterval = window.setInterval(() => {
      emit();
    }, 6000 + Math.random() * 12000);
  }

  private handleEvent(event: WSEvent): void {
    this.eventLog.push(event);
    if (this.eventLog.length > 100) {
      this.eventLog = this.eventLog.slice(-100);
    }

    // Notify global handlers
    this.globalHandlers.forEach(h => {
      try { h(event); } catch (e) { console.error('WS handler error:', e); }
    });

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(event.type);
    if (typeHandlers) {
      typeHandlers.forEach(h => {
        try { h(event); } catch (e) { console.error('WS handler error:', e); }
      });
    }
  }

  // Subscribe to all events
  onEvent(handler: WSEventHandler): () => void {
    this.globalHandlers.add(handler);
    return () => this.globalHandlers.delete(handler);
  }

  // Subscribe to specific event types
  on(type: WSEvent['type'], handler: WSEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  // Subscribe to heartbeat monitor
  onHeartbeat(handler: (bpm: number) => void): () => void {
    this.heartbeatListeners.add(handler);
    return () => this.heartbeatListeners.delete(handler);
  }

  // Get recent event log
  getRecentEvents(count = 20): WSEvent[] {
    return [...this.eventLog].reverse().slice(0, count);
  }

  // Get event counts by type
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.eventLog.forEach(e => {
      stats[e.type] = (stats[e.type] || 0) + 1;
    });
    return stats;
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = window.setInterval(() => {
      // Simulate realistic heartbeat variation
      this.currentBPM += (Math.random() - 0.5) * 6;
      this.currentBPM = Math.max(58, Math.min(98, this.currentBPM));
      const bpm = Math.round(this.currentBPM);
      this.heartbeatListeners.forEach(h => h(bpm));

      // Send ping to backend WS
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 1000);
  }
}

// Singleton
export const ws = new WebSocketService();
export default ws;
