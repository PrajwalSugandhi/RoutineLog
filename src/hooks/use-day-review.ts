import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';

import { beginReview, finishReview, loadReviewSnapshot } from '@/services/review-service';
import { completeTask, rescheduleTask } from '@/services/task-service';
import type { Task } from '@/types/task';
import type { ReviewSnapshot } from '@/services/review-service';
import type { ReviewStatus } from '@/utils/review';

type DayReviewState = {
  status: ReviewStatus;
  tasksOnDate: Task[];
  movedTasks: Task[];
  summary: ReviewSnapshot['summary'];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  begin: () => Promise<void>;
  finish: () => Promise<void>;
  complete: (taskId: string) => Promise<void>;
  reschedule: (taskId: string, dateKey: string) => Promise<void>;
};

const EMPTY_SUMMARY = {
  planned: 0,
  completed: 0,
  pending: 0,
  movedToTomorrow: 0,
  movedToOther: 0,
};

function messageFrom(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Could not update this review.';
}

export function useDayReview(
  dateKey: string,
  onTasksChanged?: () => Promise<void>,
): DayReviewState {
  const db = useSQLiteContext();
  const dateRef = useRef(dateKey);
  const requestRef = useRef(0);
  const [snapshot, setSnapshot] = useState<ReviewSnapshot | null>(null);
  const [loadedDate, setLoadedDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  dateRef.current = dateKey;

  const refresh = useCallback(async () => {
    const token = ++requestRef.current;
    const requested = dateRef.current;
    try {
      const next = await loadReviewSnapshot(db, requested);
      if (token !== requestRef.current || dateRef.current !== requested) return;
      setSnapshot(next);
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

  const afterTaskChange = useCallback(async () => {
    await Promise.all([refresh(), onTasksChanged?.() ?? Promise.resolve()]);
  }, [onTasksChanged, refresh]);

  const begin = useCallback(async () => {
    await beginReview(db, dateRef.current);
    await refresh();
  }, [db, refresh]);

  const finish = useCallback(async () => {
    const next = await finishReview(db, dateRef.current);
    if (dateRef.current !== dateKey) return;
    setSnapshot(next);
    setLoadedDate(dateRef.current);
    setError(null);
  }, [dateKey, db]);

  const complete = useCallback(
    async (taskId: string) => {
      await completeTask(db, taskId);
      await afterTaskChange();
    },
    [afterTaskChange, db],
  );

  const reschedule = useCallback(
    async (taskId: string, nextDate: string) => {
      await rescheduleTask(db, taskId, nextDate);
      await afterTaskChange();
    },
    [afterTaskChange, db],
  );

  const current = loadedDate === dateKey ? snapshot : null;

  return {
    status: current?.review?.status ?? 'not_started',
    tasksOnDate: current?.tasksOnDate ?? [],
    movedTasks: current?.movedTasks ?? [],
    summary: current?.summary ?? EMPTY_SUMMARY,
    loading: current == null && error == null,
    error,
    refresh,
    begin,
    finish,
    complete,
    reschedule,
  };
}
