import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';

type RefreshListener = () => void;
type DataEntity = 'sales' | 'inventory' | 'invoices' | 'credit_notes' | 'orders' | 'all';

interface DataRefreshContextType {
  triggerRefresh: (entities: DataEntity | DataEntity[]) => void;
  subscribe: (entity: DataEntity, callback: RefreshListener) => () => void;
}

const DataRefreshContext = createContext<DataRefreshContextType | undefined>(undefined);

export const DataRefreshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const listenersRef = useRef<Map<DataEntity, Set<RefreshListener>>>(new Map());

  const subscribe = useCallback((entity: DataEntity, callback: RefreshListener) => {
    if (!listenersRef.current.has(entity)) {
      listenersRef.current.set(entity, new Set());
    }

    listenersRef.current.get(entity)!.add(callback);

    return () => {
      listenersRef.current.get(entity)?.delete(callback);
    };
  }, []);

  const triggerRefresh = useCallback((entities: DataEntity | DataEntity[]) => {
    const entityList = Array.isArray(entities) ? entities : [entities];

    entityList.forEach(entity => {
      listenersRef.current.get(entity)?.forEach(callback => {
        callback();
      });
    });

    if (!entityList.includes('all')) {
      listenersRef.current.get('all')?.forEach(callback => {
        callback();
      });
    }
  }, []);

  return (
    <DataRefreshContext.Provider value={{ triggerRefresh, subscribe }}>
      {children}
    </DataRefreshContext.Provider>
  );
};

export const useDataRefresh = () => {
  const context = useContext(DataRefreshContext);
  if (!context) {
    throw new Error('useDataRefresh must be used within DataRefreshProvider');
  }
  return context;
};

export const useAutoRefresh = (entities: DataEntity | DataEntity[], callback: () => void) => {
  const { subscribe } = useDataRefresh();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const entityList = Array.isArray(entities) ? entities : [entities];
    const unsubscribers = entityList.map(entity =>
      subscribe(entity, () => callbackRef.current())
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe, entities]);
};
