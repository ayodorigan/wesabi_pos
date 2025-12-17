import { useEffect, useRef, useState, useCallback } from 'react';

interface UseDataFetchOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchOnFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

export function useDataFetch<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = [],
  options: UseDataFetchOptions = {}
): UseDataFetchResult<T> {
  const {
    enabled = true,
    refetchOnMount = true,
    refetchOnFocus = false,
    staleTime = 0,
    cacheTime = 5 * 60 * 1000,
    retry = 3,
    retryDelay = 1000,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState<boolean>(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const fetchIdRef = useRef<number>(0);

  const executeWithRetry = async (
    fn: () => Promise<T>,
    retriesLeft: number,
    currentFetchId: number
  ): Promise<T> => {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      if (retriesLeft > 0 && currentFetchId === fetchIdRef.current) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeWithRetry(fn, retriesLeft - 1, currentFetchId);
      }
      throw err;
    }
  };

  const fetchData = useCallback(async () => {
    if (!enabled || !isMountedRef.current) return;

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;

    if (timeSinceLastFetch < staleTime && data !== null && !isStale) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const currentFetchId = ++fetchIdRef.current;

    setLoading(true);
    setError(null);
    setIsStale(false);

    try {
      const result = await executeWithRetry(fetchFn, retry, currentFetchId);

      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        setData(result);
        setError(null);
        lastFetchTimeRef.current = Date.now();

        if (cacheTime > 0) {
          setTimeout(() => {
            if (isMountedRef.current) {
              setIsStale(true);
            }
          }, cacheTime);
        }
      }
    } catch (err) {
      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setData(null);
      }
    } finally {
      if (isMountedRef.current && currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, fetchFn, staleTime, data, isStale, cacheTime, retry, retryDelay]);

  const refetch = useCallback(async () => {
    setIsStale(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (refetchOnMount || isStale) {
      fetchData();
    }
  }, [...dependencies, refetchOnMount, isStale]);

  useEffect(() => {
    if (!refetchOnFocus) return;

    const handleFocus = () => {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;

      if (timeSinceLastFetch > staleTime) {
        setIsStale(true);
        fetchData();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchOnFocus, staleTime, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
  };
}
