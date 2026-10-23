import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  archiveRecurringTask,
  loadRecurringDetail,
  setRecurringLog,
  updateRecurringTask,
} from '@/services/recurring-service';
import type { RecurringLog, RecurringTask, RecurringTaskUpdate } from '@/types/recurring-task';
import { todayKey } from '@/utils/date';

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : 'Could not update this everyday task.';
}

export function useRecurringDetail(
  taskId: string | null,
  from: string,
  to: string,
  onChanged?: () => void,
) {
  const db = useSQLiteContext();
  const requestRef = useRef(0);
  const [task, setTask] = useState<RecurringTask | null>(null);
  const [logs, setLogs] = useState<RecurringLog[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const refresh = useCallback(async () => {
    if (!taskId) return;
    const token = ++requestRef.current;
    const key = `${taskId}|${from}|${to}|${todayKey()}`;
    try {
      const next = await loadRecurringDetail(db, taskId, from, to, todayKey());
      if (token !== requestRef.current) return;
      setTask(next.task);
      setLogs(next.logs);
      setLoadedKey(key);
      setError(null);
    } catch (loadError) {
      if (token !== requestRef.current) return;
      setError(messageFrom(loadError));
    }
  }, [db, from, taskId, to]);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setLogs([]);
      setLoadedKey(null);
      setError(null);
      return;
    }
    void refresh();
  }, [refresh, taskId]);

  const notify = useCallback(async () => {
    await refresh();
    onChangedRef.current?.();
  }, [refresh]);

  const setValue = useCallback(
    async (dateKey: string, value: number | null) => {
      if (!taskId) return;
      await setRecurringLog(db, taskId, dateKey, value);
      await notify();
    },
    [db, notify, taskId],
  );

  const update = useCallback(
    async (draft: RecurringTaskUpdate) => {
      if (!taskId) return;
      await updateRecurringTask(db, taskId, draft);
      await notify();
    },
    [db, notify, taskId],
  );

  const remove = useCallback(async () => {
    if (!taskId) return;
    await archiveRecurringTask(db, taskId);
    onChangedRef.current?.();
  }, [db, taskId]);

  const readyKey = taskId ? `${taskId}|${from}|${to}|${todayKey()}` : null;
  const ready = loadedKey === readyKey && error == null;

  return {
    task: taskId && task?.id === taskId ? task : null,
    logs: loadedKey === readyKey ? logs : [],
    loading: taskId != null && !ready && error == null,
    ready,
    error,
    setValue,
    update,
    remove,
    refresh,
  };
}
