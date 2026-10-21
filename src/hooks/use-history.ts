import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { loadHistory, type HistoryBundle } from '@/services/history-service';

export function useHistory() {
  const db = useSQLiteContext();
  const requestRef = useRef(0);
  const [bundle, setBundle] = useState<HistoryBundle | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    try {
      const next = await loadHistory(db);
      if (token !== requestRef.current) return;
      setBundle(next);
      setError(null);
    } catch (loadError) {
      if (token !== requestRef.current) return;
      setError(loadError instanceof Error ? loadError.message : 'Could not load history.');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return {
    bundle,
    loading: bundle == null && error == null,
    error,
    refresh,
  };
}
