// ============================================
// Hook: useApi — Generic async API hook
// ============================================

import { useState, useCallback, useRef } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  apiFunc: (...args: any[]) => Promise<{ data: T }>
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const mountedRef = useRef(true);

  const execute = useCallback(async (...args: any[]): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await apiFunc(...args);
      if (mountedRef.current) {
        setState({ data: response.data, loading: false, error: null });
      }
      return response.data;
    } catch (e: any) {
      const errorMsg = e?.message || 'An error occurred';
      if (mountedRef.current) {
        setState({ data: null, loading: false, error: errorMsg });
      }
      return null;
    }
  }, [apiFunc]);

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
