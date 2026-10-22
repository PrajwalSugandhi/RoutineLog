import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import {
  createRecurringTask,
  listRecurringTasksWithLog,
  setRecurringLog,
} from '@/services/recurring-service';
import type { RecurringDayEntry, RecurringTask, RecurringTaskDraft } from '@/types/recurring-task';
import { todayKey } from '@/utils/date';

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Could not update this everyday task.';
}

export function useRecurringTasks() {
  const db = useSQLiteContext();
  const requestRef = useRef(0);
  const [entries, setEntries] = useState<RecurringDayEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    const today = todayKey();
    try {
      const next = await listRecurringTasksWithLog(db, today);
      if (token !== requestRef.current) return;
      setEntries(next);
      setLoaded(true);
      setError(null);
    } catch (loadError) {
      if (token !== requestRef.current) return;
      setError(messageFrom(loadError));
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const create = useCallback(
    async (draft: RecurringTaskDraft): Promise<RecurringTask> => {
      const task = await createRecurringTask(db, draft);
      await refresh();
      return task;
    },
    [db, refresh],
  );

  const setTodayValue = useCallback(
    async (taskId: string, value: number | null) => {
      await setRecurringLog(db, taskId, todayKey(), value);
      await refresh();
    },
    [db, refresh],
  );

  return {
    entries,
    loading: !loaded && error == null,
    error,
    refresh,
    create,
    setTodayValue,
  };
}
