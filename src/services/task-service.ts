import type { SQLiteDatabase } from 'expo-sqlite';

import { runInTransaction, runSerialized } from '@/database/transaction';
import * as taskRepository from '@/repositories/task-repository';
import type { Task, TaskDraft, TaskHistoryEvent, TaskPriority } from '@/types/task';
import { addDays, daysBetween, eachDateInRange, isDateKey, normalizeTimeKey } from '@/utils/date';
import { createId } from '@/utils/ids';
import { nextPostponedCount } from '@/utils/task-stats';

type NormalizedDraft = {
  title: string;
  description: string | null;
  scheduledDate: string;
  endDate: string;
  priority: TaskPriority | null;
  dueTime: string | null;
};

function requireTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('Add a title for this task.');
  }
  if (trimmed.length > 200) {
    throw new Error('Titles need to be 200 characters or fewer.');
  }
  return trimmed;
}

function normalizeDescription(description: string | null | undefined): string | null {
  if (description == null) return null;
  const trimmed = description.trim();
  if (!trimmed) return null;
  if (trimmed.length > 4000) {
    throw new Error('Notes need to be 4,000 characters or fewer.');
  }
  return trimmed;
}

function requireDate(dateKey: string): string {
  if (!isDateKey(dateKey)) {
    throw new Error('Choose a valid date in YYYY-MM-DD format.');
  }
  return dateKey;
}

function normalizePriority(priority: TaskPriority | null | undefined): TaskPriority | null {
  if (priority == null) return null;
  if (priority === 'low' || priority === 'medium' || priority === 'high') return priority;
  throw new Error('Choose a valid priority.');
}

function normalizeDraft(draft: TaskDraft): NormalizedDraft {
  const scheduledDate = requireDate(draft.scheduledDate);
  const endDate = requireDate(draft.endDate);
  if (endDate < scheduledDate) {
    throw new Error('The end date has to be on or after the start date.');
  }
  return {
    title: requireTitle(draft.title),
    description: normalizeDescription(draft.description),
    scheduledDate,
    endDate,
    priority: normalizePriority(draft.priority),
    dueTime: normalizeTimeKey(draft.dueTime ?? ''),
  };
}

function shiftEndDate(start: string, end: string, nextStart: string): string {
  const length = Math.max(0, daysBetween(start, end));
  return addDays(nextStart, length);
}

async function requireActiveTask(db: SQLiteDatabase, id: string): Promise<Task> {
  const task = await taskRepository.findTaskById(db, id);
  if (!task || task.deletedAt) {
    throw new Error('This task is no longer available.');
  }
  return task;
}

async function applyDraft(
  db: SQLiteDatabase,
  id: string,
  draft: NormalizedDraft,
  timestamp: string,
): Promise<Task> {
  const existing = await requireActiveTask(db, id);
  const dateChanged = draft.scheduledDate !== existing.scheduledDate;
  await taskRepository.updateTaskDetails(db, {
    id,
    title: draft.title,
    description: draft.description,
    scheduledDate: draft.scheduledDate,
    endDate: draft.endDate,
    priority: draft.priority,
    dueTime: draft.dueTime,
    postponedCount: dateChanged
      ? nextPostponedCount(existing.scheduledDate, draft.scheduledDate, existing.postponedCount)
      : existing.postponedCount,
    updatedAt: timestamp,
  });

  if (dateChanged) {
    const startShift = daysBetween(existing.scheduledDate, draft.scheduledDate);
    const endShift = daysBetween(existing.endDate, draft.endDate);
    if (startShift !== 0 && startShift === endShift) {
      await taskRepository.shiftTaskDayChecks(db, id, (day) => addDays(day, startShift));
    }
    await taskRepository.insertHistory(db, {
      id: createId(),
      taskId: id,
      eventType: 'rescheduled',
      fromDate: existing.scheduledDate,
      toDate: draft.scheduledDate,
      timestamp,
    });
  }

  return syncSpanCompletion(db, id, timestamp, draft.scheduledDate);
}

export function listTasksForDate(db: SQLiteDatabase, dateKey: string): Promise<Task[]> {
  const scheduledDate = requireDate(dateKey);
  return runSerialized(() => taskRepository.listTasksForDate(db, scheduledDate));
}

export function listTasksForDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<Task[]> {
  const start = requireDate(startDate);
  const end = requireDate(endDate);
  return runSerialized(() => taskRepository.listTasksForDateRange(db, start, end));
}

export function listTaskHistory(db: SQLiteDatabase, taskId: string): Promise<TaskHistoryEvent[]> {
  return runSerialized(() => taskRepository.listTaskHistory(db, taskId));
}

export function createTask(db: SQLiteDatabase, draft: TaskDraft): Promise<Task> {
  const normalized = normalizeDraft(draft);
  const timestamp = new Date().toISOString();
  const id = createId();

  return runInTransaction(db, async (txn) => {
    const task = await taskRepository.insertTask(txn, {
      id,
      title: normalized.title,
      description: normalized.description,
      scheduledDate: normalized.scheduledDate,
      endDate: normalized.endDate,
      priority: normalized.priority,
      dueTime: normalized.dueTime,
      createdAt: timestamp,
    });
    await taskRepository.insertHistory(txn, {
      id: createId(),
      taskId: id,
      eventType: 'created',
      toDate: normalized.scheduledDate,
      timestamp,
    });
    return task;
  });
}

export function updateTask(db: SQLiteDatabase, id: string, draft: TaskDraft): Promise<Task> {
  const normalized = normalizeDraft(draft);
  const timestamp = new Date().toISOString();
  return runInTransaction(db, (txn) => applyDraft(txn, id, normalized, timestamp));
}

export function rescheduleTask(db: SQLiteDatabase, id: string, scheduledDate: string): Promise<Task> {
  const nextDate = requireDate(scheduledDate);
  const timestamp = new Date().toISOString();

  return runInTransaction(db, async (txn) => {
    const existing = await requireActiveTask(txn, id);
    return applyDraft(
      txn,
      id,
      {
        title: existing.title,
        description: existing.description ?? null,
        scheduledDate: nextDate,
        endDate: shiftEndDate(existing.scheduledDate, existing.endDate, nextDate),
        priority: existing.priority ?? null,
        dueTime: existing.dueTime ?? null,
      },
      timestamp,
    );
  });
}

function requireDayInSpan(task: Task, dateKey: string): string {
  const day = requireDate(dateKey);
  if (day < task.scheduledDate || day > task.endDate) {
    throw new Error('That day is outside this task.');
  }
  return day;
}

async function syncSpanCompletion(
  db: SQLiteDatabase,
  id: string,
  timestamp: string,
  triggerDate: string,
): Promise<Task> {
  const task = await requireActiveTask(db, id);
  const complete = eachDateInRange(task.scheduledDate, task.endDate).every((day) =>
    task.checkedDates.includes(day),
  );
  if (complete && task.status !== 'completed') {
    await taskRepository.markTaskCompleted(db, id, timestamp);
    await taskRepository.insertHistory(db, {
      id: createId(),
      taskId: id,
      eventType: 'completed',
      fromDate: triggerDate,
      timestamp,
    });
  } else if (!complete && task.status === 'completed') {
    await taskRepository.markTaskPending(db, id, timestamp);
    await taskRepository.insertHistory(db, {
      id: createId(),
      taskId: id,
      eventType: 'reopened',
      fromDate: triggerDate,
      timestamp,
    });
  }
  return requireActiveTask(db, id);
}

async function setTaskDay(
  db: SQLiteDatabase,
  id: string,
  dateKey: string,
  checked: boolean,
): Promise<Task> {
  const timestamp = new Date().toISOString();
  const existing = await requireActiveTask(db, id);
  const day = requireDayInSpan(existing, dateKey);
  const already = existing.checkedDates.includes(day);
  if (checked && !already) {
    await taskRepository.insertTaskDayCheck(db, id, day, timestamp);
  } else if (!checked && already) {
    await taskRepository.deleteTaskDayCheck(db, id, day);
  } else {
    return existing;
  }
  return syncSpanCompletion(db, id, timestamp, day);
}

export function checkTaskDay(db: SQLiteDatabase, id: string, dateKey: string): Promise<Task> {
  return runInTransaction(db, (txn) => setTaskDay(txn, id, dateKey, true));
}

export function toggleTaskDay(db: SQLiteDatabase, id: string, dateKey: string): Promise<Task> {
  return runInTransaction(db, async (txn) => {
    const existing = await requireActiveTask(txn, id);
    const day = requireDayInSpan(existing, dateKey);
    return setTaskDay(txn, id, day, !existing.checkedDates.includes(day));
  });
}

export function extendTask(db: SQLiteDatabase, id: string, endDate: string): Promise<Task> {
  const nextEnd = requireDate(endDate);
  const timestamp = new Date().toISOString();
  return runInTransaction(db, async (txn) => {
    const existing = await requireActiveTask(txn, id);
    if (nextEnd <= existing.endDate) {
      throw new Error('Choose a date after the current end date.');
    }
    await taskRepository.updateTaskDetails(txn, {
      id,
      title: existing.title,
      description: existing.description ?? null,
      scheduledDate: existing.scheduledDate,
      endDate: nextEnd,
      priority: existing.priority ?? null,
      dueTime: existing.dueTime ?? null,
      postponedCount: existing.postponedCount,
      updatedAt: timestamp,
    });
    return syncSpanCompletion(txn, id, timestamp, existing.scheduledDate);
  });
}

export function deleteTask(db: SQLiteDatabase, id: string): Promise<void> {
  const timestamp = new Date().toISOString();
  return runInTransaction(db, async (txn) => {
    const existing = await requireActiveTask(txn, id);
    await taskRepository.archiveTask(txn, id, timestamp);
    await taskRepository.insertHistory(txn, {
      id: createId(),
      taskId: id,
      eventType: 'deleted',
      fromDate: existing.scheduledDate,
      timestamp,
    });
  });
}
