// ============================================
// Hook: useRealtimeCollection
// Subscribe to real-time collection changes
// ============================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/realtimeDb';
import { api } from '../services/api';

interface UseRealtimeCollectionOptions {
  searchQuery?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
}

interface UseRealtimeCollectionReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  add: (item: T) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
  connectionStatus: string;
  lastUpdated: number | null;
}

export function useRealtimeCollection<T extends { id: string }>(
  collection: string,
  options: UseRealtimeCollectionOptions = {}
): UseRealtimeCollectionReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const { searchQuery, sortField, sortDirection = 'asc' } = options;

  // Subscribe to real-time updates
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);

    const unsubscribe = db.onSnapshot<T>(collection, (newData) => {
      if (!mountedRef.current) return;
      setData(newData);
      setLastUpdated(Date.now());
      setLoading(false);
      setError(null);
    });

    const unsubStatus = db.onConnectionStatus((status) => {
      if (mountedRef.current) setConnectionStatus(status);
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
      unsubStatus();
    };
  }, [collection]);

  // Filter and sort data
  const filteredData = (() => {
    let result = [...data];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        Object.values(item).some(v =>
          String(v).toLowerCase().includes(q)
        )
      );
    }

    if (sortField) {
      result.sort((a, b) => {
        const aVal = String((a as any)[sortField] || '');
        const bVal = String((b as any)[sortField] || '');
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'desc' ? -cmp : cmp;
      });
    }

    return result;
  })();

  const add = useCallback(async (item: T) => {
    try {
      setError(null);
      await api.create(collection, item);
    } catch (e: any) {
      setError(e.message || 'Failed to add item');
      throw e;
    }
  }, [collection]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      setError(null);
      await api.update(collection, id, updates);
    } catch (e: any) {
      setError(e.message || 'Failed to update item');
      throw e;
    }
  }, [collection]);

  const remove = useCallback(async (id: string) => {
    try {
      setError(null);
      await api.delete(collection, id);
    } catch (e: any) {
      setError(e.message || 'Failed to delete item');
      throw e;
    }
  }, [collection]);

  const refresh = useCallback(() => {
    setData(db.getAll<T>(collection));
    setLastUpdated(Date.now());
  }, [collection]);

  return {
    data: filteredData,
    loading,
    error,
    add,
    update,
    remove,
    refresh,
    connectionStatus,
    lastUpdated,
  };
}
