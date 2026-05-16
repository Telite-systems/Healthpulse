// ============================================
// Enhanced Real-Time Database Layer
// Firebase-style API with optimistic updates,
// offline queue, conflict resolution, and
// live presence tracking.
// ============================================

import { api } from './api';

export type Unsubscribe    = () => void;
export type DbStatus       = 'connected' | 'disconnected' | 'syncing' | 'offline';
export type DbEventType    = 'added' | 'modified' | 'removed' | 'initial';

export interface DbEvent<T> {
  type: DbEventType;
  data: T;
  timestamp: number;
  collection: string;
  userId?: string;
}

type Listener<T>     = (data: T[], event: DbEvent<T>) => void;
type StatusListener  = (status: DbStatus) => void;

interface OfflineOp {
  id: string;
  type: 'add' | 'update' | 'remove';
  collection: string;
  payload: any;
  timestamp: number;
  retries: number;
}

interface PresenceInfo {
  userId: string;
  name: string;
  role: string;
  lastSeen: number;
  page: string;
}

/** Firebase-style realtime database singleton. */
class RealtimeDatabase {
  private listeners      = new Map<string, Set<Listener<any>>>();
  private data           = new Map<string, any[]>();
  private polling        = new Map<string, ReturnType<typeof setInterval>>();
  private status: DbStatus = 'connected';
  private statusListeners  = new Set<StatusListener>();
  private changeLog: DbEvent<any>[] = [];
  private offlineQueue: OfflineOp[] = [];
  private presence         = new Map<string, PresenceInfo>();
  private presenceTimers   = new Map<string, ReturnType<typeof setTimeout>>();

  // ── Public CRUD ─────────────────────────────────────────────────────────────

  /** Subscribe to a collection — listener fires immediately with current data,
   *  then again on any change. Returns unsubscribe fn. */
  onSnapshot<T>(collection: string, listener: Listener<T>): Unsubscribe {
    if (!this.listeners.has(collection)) this.listeners.set(collection, new Set());
    this.listeners.get(collection)!.add(listener);

    const current = this.data.get(collection) ?? [];
    listener(current, { type: 'initial', data: current[0], timestamp: Date.now(), collection });

    // Start polling if backend is reachable
    if (!this.polling.has(collection)) {
      this._startPolling(collection);
    }

    return () => {
      this.listeners.get(collection)?.delete(listener);
      if (!this.listeners.get(collection)?.size) {
        clearInterval(this.polling.get(collection)!);
        this.polling.delete(collection);
      }
    };
  }

  /** Subscribe to connection status changes */
  onConnectionStatus(listener: StatusListener): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  /** Get current cached snapshot */
  getAll<T>(collection: string): T[] {
    return [...(this.data.get(collection) ?? [])];
  }

  getById<T extends { id: string }>(collection: string, id: string): T | undefined {
    return (this.data.get(collection) ?? []).find((d: T) => d.id === id);
  }

  query<T>(collection: string, fn: (item: T) => boolean): T[] {
    return (this.data.get(collection) ?? []).filter(fn);
  }

  /** Add document with optimistic UI update */
  async add<T extends { id: string }>(collection: string, item: T): Promise<T> {
    // Optimistic: add to cache immediately
    const draft = { ...item };
    this._patch(collection, draft, 'added', true);

    try {
      this._setStatus('syncing');
      const res = await api.create<T>(collection, item);
      const created = res.data;

      // Replace draft with server response
      const col = this.data.get(collection) ?? [];
      const idx = col.findIndex(d => d.id === draft.id);
      if (idx !== -1) col[idx] = created; else col.push(created);
      this.data.set(collection, [...col]);
      this._setStatus('connected');
      this._notify(collection, col, { type: 'added', data: created, timestamp: Date.now(), collection });
      return created;
    } catch (err) {
      // Rollback
      this._removeLocal(collection, draft.id);
      this._enqueueOffline('add', collection, item);
      throw err;
    }
  }

  /** Update document with optimistic UI update */
  async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
    const prev = this.getById<T>(collection, id);
    if (!prev) return null;

    // Optimistic update
    const optimistic = { ...prev, ...updates };
    this._patch(collection, optimistic, 'modified', false);

    try {
      this._setStatus('syncing');
      const res = await api.update<T>(collection, id, updates);
      const updated = res.data;
      this._patch(collection, updated, 'modified', false);
      this._setStatus('connected');
      return updated;
    } catch (err) {
      // Rollback
      this._patch(collection, prev, 'modified', false);
      this._enqueueOffline('update', collection, { id, ...updates });
      throw err;
    }
  }

  /** Remove document */
  async remove<T extends { id: string }>(collection: string, id: string): Promise<boolean> {
    const item = this.getById<T>(collection, id);
    this._removeLocal(collection, id);

    try {
      this._setStatus('syncing');
      await api.delete(collection, id);
      this._setStatus('connected');
      if (item) this._notify(collection, this.getAll(collection), { type: 'removed', data: item, timestamp: Date.now(), collection });
      return true;
    } catch (err) {
      // Rollback
      if (item) { const col = this.data.get(collection) ?? []; col.push(item); this.data.set(collection, col); }
      this._enqueueOffline('remove', collection, { id });
      throw err;
    }
  }

  /** Initialize collection (fetch from backend or seed with defaults) */
  initCollection<T extends { id: string }>(name: string, defaults: T[]): void {
    this._fetchCollection(name, defaults);
  }

  /** Real-time presence tracking */
  updatePresence(info: PresenceInfo): void {
    this.presence.set(info.userId, { ...info, lastSeen: Date.now() });

    // Auto-expire after 30s of inactivity
    if (this.presenceTimers.has(info.userId)) clearTimeout(this.presenceTimers.get(info.userId)!);
    this.presenceTimers.set(info.userId, setTimeout(() => {
      this.presence.delete(info.userId);
    }, 30_000));
  }

  getActiveUsers(): PresenceInfo[] {
    return [...this.presence.values()].filter(u => Date.now() - u.lastSeen < 30_000);
  }

  /** Change log access */
  getChangeLog(limit = 50): DbEvent<any>[] {
    return [...this.changeLog].reverse().slice(0, limit);
  }

  getStatus(): DbStatus { return this.status; }

  /** Flush offline queue when back online */
  async flushOfflineQueue(): Promise<void> {
    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    for (const op of queue) {
      try {
        if (op.type === 'add')    await this.add(op.collection, op.payload);
        if (op.type === 'update') await this.update(op.collection, op.payload.id, op.payload);
        if (op.type === 'remove') await this.remove(op.collection, op.payload.id);
      } catch {
        if (op.retries < 3) this.offlineQueue.push({ ...op, retries: op.retries + 1 });
      }
    }
  }

  getOfflineQueueSize(): number { return this.offlineQueue.length; }

  destroy(): void {
    this.polling.forEach(i => clearInterval(i));
    this.presenceTimers.forEach(t => clearTimeout(t));
    this.polling.clear(); this.listeners.clear();
    this.statusListeners.clear(); this.presenceTimers.clear();
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async _fetchCollection<T>(name: string, defaults?: T[]): Promise<void> {
    try {
      this._setStatus('syncing');
      const res = await api.getAll<T>(name, 1, 200);
      const items = res.data.data;
      this.data.set(name, items);
      this._setStatus('connected');
      this._notify(name, items, { type: 'initial', data: items[0], timestamp: Date.now(), collection: name });
    } catch {
      if (!this.data.has(name)) this.data.set(name, defaults ?? []);
      this._setStatus('disconnected');
      this._notify(name, this.data.get(name)!, {
        type: 'initial', data: (this.data.get(name) ?? [])[0],
        timestamp: Date.now(), collection: name,
      });
    }
  }

  private _startPolling(collection: string, intervalMs = 12_000): void {
    const id = setInterval(() => this._fetchCollection(collection), intervalMs);
    this.polling.set(collection, id);
  }

  private _patch<T extends { id: string }>(collection: string, item: T, type: DbEventType, push: boolean): void {
    const col = this.data.get(collection) ?? [];
    const idx = col.findIndex(d => d.id === item.id);
    if (idx !== -1) col[idx] = item;
    else if (push) col.push(item);
    this.data.set(collection, [...col]);
    this._notify(collection, col, { type, data: item, timestamp: Date.now(), collection });
  }

  private _removeLocal(collection: string, id: string): void {
    const col = (this.data.get(collection) ?? []).filter(d => d.id !== id);
    this.data.set(collection, col);
  }

  private _notify<T>(collection: string, data: T[], event: DbEvent<T>): void {
    this.changeLog.push(event);
    if (this.changeLog.length > 200) this.changeLog.shift();
    this.listeners.get(collection)?.forEach(l => { try { l(data, event); } catch {} });
  }

  private _setStatus(s: DbStatus): void {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach(l => l(s));
  }

  private _enqueueOffline(type: OfflineOp['type'], collection: string, payload: any): void {
    this.offlineQueue.push({
      id: `off_${Date.now()}`, type, collection, payload, timestamp: Date.now(), retries: 0,
    });
  }
}

export const db = new RealtimeDatabase();
export default db;
