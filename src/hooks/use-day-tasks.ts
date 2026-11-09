import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  createTask,
  deleteTask,
  hideTask,
  listTasksForDateRange,
  toggleTaskDay,
  updateTask,
} from '@/services/task-service';
import type { Task, TaskDraft } from '@/types/task';
import { summarizeDay, type DaySummary } from '@/utils/task-stats';

type DayTasksState = {
  tasks: Task[];
  summary: DaySummary;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (draft: TaskDraft) => Promise<Task>;
  update: (id: string, draft: TaskDraft) => Promise<Task>;
  toggleDay: (id: string, dateKey: string) => Promise<void>;
  hide: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Could not update your tasks.';
}

export function useDayTasks(startDate: string, endDate: string): DayTasksState {
  const db = useSQLiteContext();
  const rangeRef = useRef({ start: startDate, end: endDate });
  const requestRef = useRef(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rangeKey = `${startDate}|${endDate}`;

  rangeRef.current = { start: startDate, end: endDate };

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    const requested = rangeRef.current;
    const requestedKey = `${requested.start}|${requested.end}`;
    try {
      const next = await listTasksForDateRange(db, requested.start, requested.end);
      const current = rangeRef.current;
      if (token !== requestRef.current || current.start !== requested.start || current.end !== requested.end) {
        return;
      }
      setTasks(next);
      setLoadedKey(requestedKey);
      setError(null);
    } catch (loadError) {
      const current = rangeRef.current;
      if (token !== requestRef.current || current.start !== requested.start || current.end !== requested.end) {
        return;
      }
      setError(messageFrom(loadError));
    }
  }, [db]);

  useEffect(() => {
    setError(null);
    void refresh();
  }, [rangeKey, refresh]);

  const reloadIfCurrent = useCallback(
    async (scheduledDate: string, endDate: string) => {
      const { start, end } = rangeRef.current;
      if (scheduledDate <= end && endDate >= start) {
        await refresh();
      }
    },
    [refresh],
  );

  const create = useCallback(
    async (draft: TaskDraft) => {
      const task = await createTask(db, draft);
      await reloadIfCurrent(task.scheduledDate, task.endDate);
      return task;
    },
    [db, reloadIfCurrent],
  );

  const update = useCallback(
    async (id: string, draft: TaskDraft) => {
      const task = await updateTask(db, id, draft);
      await refresh();
      return task;
    },
    [db, refresh],
  );

  const toggleDay = useCallback(
    async (id: string, dateKey: string) => {
      await toggleTaskDay(db, id, dateKey);
      await refresh();
    },
    [db, refresh],
  );

  const hide = useCallback(
    async (id: string) => {
      await hideTask(db, id);
      await refresh();
    },
    [db, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteTask(db, id);
      await refresh();
    },
    [db, refresh],
  );

  const showingRange = loadedKey === rangeKey;

  return {
    tasks: showingRange ? tasks : [],
    summary: summarizeDay(showingRange ? tasks : []),
    loading: !showingRange && error == null,
    error,
    refresh,
    create,
    update,
    toggleDay,
    hide,
    remove,
  };
}
