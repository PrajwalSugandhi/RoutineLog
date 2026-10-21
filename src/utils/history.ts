import type { TaskStatus } from '@/types/task';
import { toDateKey } from '@/utils/date';

export type HistoryTask = {
  id: string;
  title: string;
  scheduledDate: string;
  status: TaskStatus;
  postponedCount: number;
  originalScheduledDate: string;
};

export type ActivityEvent = {
  id: string;
  taskId: string;
  eventType: 'completed' | 'reopened' | 'rescheduled';
  fromDate?: string;
  toDate?: string;
  timestamp: string;
};

export type DayInspection = {
  pending: HistoryTask[];
  completed: HistoryTask[];
  movedAway: HistoryTask[];
  planned: number;
  completedCount: number;
  rate: number | null;
};

export function localDateKeyFromTimestamp(timestamp: string): string | null {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKey(date);
}

function byTitle(left: HistoryTask, right: HistoryTask): number {
  return left.title.localeCompare(right.title);
}

function eventsFor(events: readonly ActivityEvent[], taskId: string): ActivityEvent[] {
  return events
    .filter((event) => event.taskId === taskId)
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id));
}

export function wasCompletedForDate(
  events: readonly ActivityEvent[],
  taskId: string,
  dateKey: string,
): boolean {
  let completed = false;
  for (const event of eventsFor(events, taskId)) {
    if (event.eventType === 'completed' && event.fromDate === dateKey) {
      completed = true;
    } else if (event.eventType === 'reopened') {
      completed = false;
    }
  }
  return completed;
}

export function rescheduleCount(events: readonly ActivityEvent[], taskId: string): number {
  return events.filter((event) => event.taskId === taskId && event.eventType === 'rescheduled').length;
}

export function checkedOffOn(events: readonly ActivityEvent[], dateKeys: readonly string[]): number {
  const wanted = new Set(dateKeys);
  const openStamp = new Map<string, string>();
  const ordered = [...events].sort(
    (left, right) => left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id),
  );
  for (const event of ordered) {
    if (event.eventType === 'completed') {
      openStamp.set(event.taskId, event.timestamp);
    } else if (event.eventType === 'reopened') {
      openStamp.delete(event.taskId);
    }
  }
  let count = 0;
  for (const timestamp of openStamp.values()) {
    const day = localDateKeyFromTimestamp(timestamp);
    if (day && wanted.has(day)) count += 1;
  }
  return count;
}

export function buildDayInspection(
  dateKey: string,
  tasks: readonly HistoryTask[],
  events: readonly ActivityEvent[],
): DayInspection {
  const pending = tasks
    .filter((task) => task.scheduledDate === dateKey && task.status === 'pending')
    .sort(byTitle);
  const completed = tasks
    .filter((task) => wasCompletedForDate(events, task.id, dateKey))
    .sort(byTitle);
  const completedIds = new Set(completed.map((task) => task.id));
  const movedAway = tasks
    .filter(
      (task) =>
        task.scheduledDate !== dateKey &&
        !completedIds.has(task.id) &&
        events.some(
          (event) =>
            event.taskId === task.id && event.eventType === 'rescheduled' && event.fromDate === dateKey,
        ),
    )
    .sort(byTitle);
  const planned = pending.length + completed.length + movedAway.length;
  return {
    pending,
    completed,
    movedAway,
    planned,
    completedCount: completed.length,
    rate: planned === 0 ? null : completed.length / planned,
  };
}

export function completionLabel(completed: number, planned: number): string {
  if (planned === 0) return 'Nothing planned';
  const percent = Math.round((completed / planned) * 100);
  return `${completed} of ${planned} finished · ${percent}%`;
}
