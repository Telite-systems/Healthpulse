// ============================================
// Real-Time Database Layer
// Now backed by the real backend API.
// Provides local cache + polling for real-time feel.
// Maintains the same public interface for hooks.
// ============================================

import { api } from './api';

type Listener<T> = (data: T[], event: DbEvent<T>) => void;
type Unsubscribe = () => void;

export interface DbEvent<T> {
  type: 'added' | 'modified' | 'removed' | 'initial';
  data: T;
  timestamp: number;
  collection: string;
}

class RealtimeDatabase {
  private listeners: Map<string, Set<Listener<any>>> = new Map();
  private data: Map<string, any[]> = new Map();
  private pollingIntervals: Map<string, number> = new Map();
  private connectionStatus: 'connected' | 'disconnected' | 'syncing' = 'connected';
  private statusListeners: Set<(status: string) => void> = new Set();

  // Initialize a collection by fetching from the backend
  initCollection<T extends { id: string }>(name: string, _defaultData: T[]): void {
    // Fetch real data from backend instead of using defaults
    this.fetchCollection<T>(name);
  }

  // Fetch collection data from backend API
  private async fetchCollection<T>(name: string): Promise<void> {
    try {
      this.setStatus('syncing');
      const response = await api.getAll<T>(name, 1, 200);
      const items = response.data.data;
      this.data.set(name, items);
      this.setStatus('connected');

      // Notify listeners
      this.notifyListeners(name, items, {
        type: 'initial',
        data: items[0],
        timestamp: Date.now(),
        collection: name,
      });
    } catch (err) {
      console.warn(`Failed to fetch collection "${name}" from backend:`, err);
      // Use any previously cached data, or empty
      if (!this.data.has(name)) {
        this.data.set(name, []);
      }
      this.setStatus('disconnected');
    }
  }

  // Get all documents in a collection (from local cache)
  getAll<T>(collection: string): T[] {
    return [...(this.data.get(collection) || [])];
  }

  // Get a single document by ID (from local cache)
  getById<T extends { id: string }>(collection: string, id: string): T | undefined {
    const data = this.data.get(collection) || [];
    return data.find((item: T) => item.id === id);
  }

  // Query documents
  query<T>(collection: string, predicate: (item: T) => boolean): T[] {
    const data = this.data.get(collection) || [];
    return data.filter(predicate);
  }

  // Add a document via backend API
  async add<T extends { id: string }>(collection: string, item: T, _userId?: string): Promise<T> {
    this.setStatus('syncing');
    const response = await api.create<T>(collection, item);
    const created = response.data;

    // Update local cache
    const data = this.data.get(collection) || [];
    data.push(created);
    this.data.set(collection, [...data]);

    const event: DbEvent<T> = {
      type: 'added',
      data: created,
      timestamp: Date.now(),
      collection,
    };

    this.setStatus('connected');
    this.notifyListeners(collection, this.data.get(collection)!, event);
    return created;
  }

  // Update a document via backend API
  async update<T extends { id: string }>(collection: string, id: string, updates: Partial<T>, _userId?: string): Promise<T | null> {
    this.setStatus('syncing');
    const response = await api.update<T>(collection, id, updates);
    const updated = response.data;

    // Update local cache
    const data = this.data.get(collection) || [];
    const index = data.findIndex((item: T) => item.id === id);
    if (index !== -1) {
      data[index] = updated;
      this.data.set(collection, [...data]);
    }

    const event: DbEvent<T> = {
      type: 'modified',
      data: updated,
      timestamp: Date.now(),
      collection,
    };

    this.setStatus('connected');
    this.notifyListeners(collection, this.data.get(collection)!, event);
    return updated;
  }

  // Delete a document via backend API
  async remove<T extends { id: string }>(collection: string, id: string, _userId?: string): Promise<boolean> {
    this.setStatus('syncing');
    await api.delete(collection, id);

    // Update local cache
    const data = this.data.get(collection) || [];
    const item = data.find((d: T) => d.id === id);
    const filtered = data.filter((d: T) => d.id !== id);
    this.data.set(collection, filtered);

    if (item) {
      const event: DbEvent<T> = {
        type: 'removed',
        data: item,
        timestamp: Date.now(),
        collection,
      };
      this.notifyListeners(collection, filtered, event);
    }

    this.setStatus('connected');
    return true;
  }

  // Subscribe to real-time changes (polls backend every 10s)
  onSnapshot<T>(collection: string, listener: Listener<T>): Unsubscribe {
    if (!this.listeners.has(collection)) {
      this.listeners.set(collection, new Set());
    }
    this.listeners.get(collection)!.add(listener);

    // Send current cached data immediately
    const data = this.data.get(collection) || [];
    listener(data, {
      type: 'initial',
      data: data[0],
      timestamp: Date.now(),
      collection,
    });

    // Start polling for this collection if not already
    if (!this.pollingIntervals.has(collection)) {
      const interval = window.setInterval(() => {
        this.fetchCollection(collection);
      }, 10000); // Poll every 10 seconds
      this.pollingIntervals.set(collection, interval);
    }

    return () => {
      this.listeners.get(collection)?.delete(listener);

      // Stop polling if no listeners remain
      if (this.listeners.get(collection)?.size === 0) {
        const interval = this.pollingIntervals.get(collection);
        if (interval) {
          clearInterval(interval);
          this.pollingIntervals.delete(collection);
        }
      }
    };
  }

  // Subscribe to connection status changes
  onConnectionStatus(listener: (status: string) => void): Unsubscribe {
    this.statusListeners.add(listener);
    listener(this.connectionStatus);
    return () => this.statusListeners.delete(listener);
  }

  // Get connection status
  getStatus(): string {
    return this.connectionStatus;
  }

  // Get change log (now returns empty — backend handles logging)
  getChangeLog(): any[] {
    return [];
  }

  private notifyListeners<T>(collection: string, data: T[], event: DbEvent<T>): void {
    const listeners = this.listeners.get(collection);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data, event);
        } catch (e) {
          console.error('Listener error:', e);
        }
      });
    }
  }

  private setStatus(status: typeof this.connectionStatus): void {
    this.connectionStatus = status;
    this.statusListeners.forEach(l => l(status));
  }

  destroy(): void {
    this.pollingIntervals.forEach(interval => clearInterval(interval));
    this.pollingIntervals.clear();
    this.listeners.clear();
    this.statusListeners.clear();
  }
}

// Singleton
export const db = new RealtimeDatabase();
export default db;
