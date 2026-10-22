import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { listRecurringDay, setRecurringLog } from '@/services/recurring-service';
import type { RecurringDayEntry } from '@/types/recurring-task';

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Could not update this everyday task.';
}

export function useRecurringDay(dateKey: string) {
  const db = useSQLiteContext();
  const dateRef = useRef(dateKey);
  const requestRef = useRef(0);
  const [entries, setEntries] = useState<RecurringDayEntry[]>([]);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  dateRef.current = dateKey;

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    const requested = dateRef.current;
    try {
      const next = await listRecurringDay(db, requested);
      if (token !== requestRef.current || dateRef.current !== requested) return;
      setEntries(next);
      setLoadedDate(requested);
      setError(null);
    } catch (loadError) {
      if (token !== requestRef.current || dateRef.current !== requested) return;
      setError(messageFrom(loadError));
    }
  }, [db]);

  useEffect(() => {
    setError(null);
    void refresh();
  }, [dateKey, refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const setValue = useCallback(
    async (taskId: string, value: number | null) => {
      await setRecurringLog(db, taskId, dateRef.current, value);
      await refresh();
    },
    [db, refresh],
  );

  const current = loadedDate === dateKey;

  return {
    entries: current ? entries : [],
    loading: !current && error == null,
    error,
    refresh,
    setValue,
  };
}
