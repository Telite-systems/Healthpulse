// ============================================
// Realtime Collection Hook
// Firebase-style useCollection / useDocument
// ============================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { db, type DbEvent, type DbStatus } from '../services/realtimeDb';

export interface CollectionOptions {
  searchQuery?: string;
  filterFn?: (item: any) => boolean;
}

export interface CollectionState<T> {
  data:             T[];
  loading:          boolean;
  error:            string | null;
  status:           DbStatus;
  connectionStatus: DbStatus;   // alias so both names work
  add:     (item: T) => Promise<T>;
  update:  (id: string, updates: Partial<T>) => Promise<T | null>;
  remove:  (id: string) => Promise<boolean>;
  refresh: () => void;
}

/**
 * Subscribe to a realtime collection with optional client-side search filtering.
 *
 * @example
 *   const { data, loading, add } = useRealtimeCollection<Patient>('patients', { searchQuery: 'John' });
 */
export function useRealtimeCollection<T extends { id: string }>(
  collection: string,
  options?: CollectionOptions
): CollectionState<T> {
  const [rawData, setRawData] = useState<T[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [status,   setStatus]   = useState<DbStatus>('connected');
  const refreshKey = useRef(0);

  useEffect(() => {
    setLoading(true);
    const unsub = db.onSnapshot<T>(collection, (rows, _evt: DbEvent<T>) => {
      setRawData(rows);
      setLoading(false);
    });
    const unsubStatus = db.onConnectionStatus(setStatus);
    return () => { unsub(); unsubStatus(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, refreshKey.current]);

  // Client-side search filtering
  const data = useMemo(() => {
    const q = options?.searchQuery?.toLowerCase().trim();
    if (!q) return rawData;
    return rawData.filter(item =>
      Object.values(item).some(v =>
        typeof v === 'string' && v.toLowerCase().includes(q)
      )
    );
  }, [rawData, options?.searchQuery]);

  const refresh = useCallback(() => { refreshKey.current++; }, []);

  const add = useCallback(async (item: T): Promise<T> => {
    try {
      return await db.add<T>(collection, item);
    } catch (e: any) {
      setError(e?.message ?? 'Add failed');
      throw e;
    }
  }, [collection]);

  const update = useCallback(async (id: string, updates: Partial<T>): Promise<T | null> => {
    try {
      return await db.update<T>(collection, id, updates);
    } catch (e: any) {
      setError(e?.message ?? 'Update failed');
      throw e;
    }
  }, [collection]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      return await db.remove<T>(collection, id);
    } catch (e: any) {
      setError(e?.message ?? 'Remove failed');
      throw e;
    }
  }, [collection]);

  return { data, loading, error, status, connectionStatus: status, add, update, remove, refresh };
}

/**
 * Subscribe to a single document by id.
 */
export function useRealtimeDocument<T extends { id: string }>(
  collection: string,
  id: string
): { doc: T | null; loading: boolean } {
  const [doc,     setDoc]     = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const unsub = db.onSnapshot<T>(collection, (rows) => {
      setDoc(rows.find(r => r.id === id) ?? null);
      setLoading(false);
    });
    return unsub;
  }, [collection, id]);

  return { doc, loading };
}

/**
 * Real-time presence for current user.
 */
export function usePresence(userId: string, name: string, role: string, page: string): void {
  useEffect(() => {
    if (!userId) return;
    const ping = () => db.updatePresence({ userId, name, role, lastSeen: Date.now(), page });
    ping();
    const interval = setInterval(ping, 15_000);
    return () => clearInterval(interval);
  }, [userId, name, role, page]);
}

/**
 * Live connection status.
 */
export function useConnectionStatus(): DbStatus {
  const [s, setS] = useState<DbStatus>('connected');
  useEffect(() => {
    const unsub = db.onConnectionStatus(setS);
    return unsub;
  }, []);
  return s;
}
