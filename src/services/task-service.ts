import type { SQLiteDatabase } from 'expo-sqlite';

import { runInTransaction, runSerialized } from '@/database/transaction';
import * as taskRepository from '@/repositories/task-repository';
import type { Task, TaskDraft, TaskHistoryEvent, TaskPriority } from '@/types/task';
import { isDateKey, normalizeTimeKey } from '@/utils/date';
import { createId } from '@/utils/ids';
import { nextPostponedCount } from '@/utils/task-stats';

type NormalizedDraft = {
  title: string;
  description: string | null;
  scheduledDate: string;
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
  return {
    title: requireTitle(draft.title),
    description: normalizeDescription(draft.description),
    scheduledDate: requireDate(draft.scheduledDate),
    priority: normalizePriority(draft.priority),
    dueTime: normalizeTimeKey(draft.dueTime ?? ''),
  };
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
  const updated = await taskRepository.updateTaskDetails(db, {
    id,
    title: draft.title,
    description: draft.description,
    scheduledDate: draft.scheduledDate,
    priority: draft.priority,
    dueTime: draft.dueTime,
    postponedCount: dateChanged
      ? nextPostponedCount(existing.scheduledDate, draft.scheduledDate, existing.postponedCount)
      : existing.postponedCount,
    updatedAt: timestamp,
  });

  if (dateChanged) {
    await taskRepository.insertHistory(db, {
      id: createId(),
      taskId: id,
      eventType: 'rescheduled',
      fromDate: existing.scheduledDate,
      toDate: draft.scheduledDate,
      timestamp,
    });
  }

  return updated;
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
        priority: existing.priority ?? null,
        dueTime: existing.dueTime ?? null,
      },
      timestamp,
    );
  });
}

export function completeTask(db: SQLiteDatabase, id: string): Promise<Task> {
  const timestamp = new Date().toISOString();
  return runInTransaction(db, async (txn) => {
    const existing = await requireActiveTask(txn, id);
    if (existing.status === 'completed') return existing;
    const updated = await taskRepository.markTaskCompleted(txn, id, timestamp);
    await taskRepository.insertHistory(txn, {
      id: createId(),
      taskId: id,
      eventType: 'completed',
      fromDate: existing.scheduledDate,
      timestamp,
    });
    return updated;
  });
}

export function reopenTask(db: SQLiteDatabase, id: string): Promise<Task> {
  const timestamp = new Date().toISOString();
  return runInTransaction(db, async (txn) => {
    const existing = await requireActiveTask(txn, id);
    if (existing.status === 'pending') return existing;
    const updated = await taskRepository.markTaskPending(txn, id, timestamp);
    await taskRepository.insertHistory(txn, {
      id: createId(),
      taskId: id,
      eventType: 'reopened',
      fromDate: existing.scheduledDate,
      timestamp,
    });
    return updated;
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
