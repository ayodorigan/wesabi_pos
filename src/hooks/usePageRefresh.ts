import { useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';

export function usePageRefresh(pageName: string, options: { refreshOnMount?: boolean; staleTime?: number } = {}) {
  const { refreshData, lastRefreshTime, loading } = useApp();
  const { refreshOnMount = true, staleTime = 30000 } = options;
  const previousPageRef = useRef<string | null>(null);
  const lastPageRefreshRef = useRef<number>(0);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    const timeSincePageRefresh = now - lastPageRefreshRef.current;
    const isPageChange = previousPageRef.current !== null && previousPageRef.current !== pageName;

    const shouldRefresh =
      (refreshOnMount && timeSinceLastRefresh > staleTime) ||
      (isPageChange && timeSincePageRefresh > staleTime) ||
      (refreshOnMount && lastRefreshTime === 0);

    if (shouldRefresh && !loading) {
      lastPageRefreshRef.current = now;
      refreshData();
    }

    previousPageRef.current = pageName;
  }, [pageName, refreshOnMount, staleTime, lastRefreshTime, loading, refreshData]);

  return { refreshData };
}
