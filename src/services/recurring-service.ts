import type { SQLiteDatabase } from 'expo-sqlite';

import { runInTransaction, runSerialized } from '@/database/transaction';
import * as recurringRepository from '@/repositories/recurring-repository';
import type {
  RecurringDayEntry,
  RecurringLog,
  RecurringTask,
  RecurringTaskDraft,
  RecurringTaskUpdate,
  RecurringValueType,
} from '@/types/recurring-task';
import { isDateKey } from '@/utils/date';
import { createId } from '@/utils/ids';
import { clipRecurringWindow } from '@/utils/recurring';

const MAX_NUMERIC_VALUE = 100000;

export type RecurringDetail = {
  task: RecurringTask;
  logs: RecurringLog[];
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

function requireValueType(valueType: RecurringValueType): RecurringValueType {
  if (valueType === 'boolean' || valueType === 'numeric') return valueType;
  throw new Error('Choose yes/no or a number.');
}

function normalizeLogValue(valueType: RecurringValueType, value: number | null): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Enter a whole number, 0 or greater.');
  }
  if (valueType === 'boolean') {
    if (value !== 1) {
      throw new Error('Tick the day or leave it clear.');
    }
    return 1;
  }
  if (value > MAX_NUMERIC_VALUE) {
    throw new Error('Enter a number up to 100000.');
  }
  return value;
}

async function requireActiveTask(db: SQLiteDatabase, id: string): Promise<RecurringTask> {
  const task = await recurringRepository.findRecurringTaskById(db, id);
  if (!task || task.deletedAt) {
    throw new Error('This everyday task is no longer available.');
  }
  return task;
}

function withValues(tasks: RecurringTask[], logs: RecurringLog[]): RecurringDayEntry[] {
  const values = new Map(logs.map((log) => [log.recurringTaskId, log.value]));
  return tasks.map((task) => ({ task, value: values.get(task.id) ?? null }));
}

export function listRecurringDay(db: SQLiteDatabase, dateKey: string): Promise<RecurringDayEntry[]> {
  const date = requireDate(dateKey);
  return runSerialized(async () => {
    const tasks = await recurringRepository.listRecurringTasksActiveOnDate(db, date);
    const logs = await recurringRepository.listLogsForDate(db, date);
    return withValues(tasks, logs);
  });
}

export function listRecurringTasksWithLog(
  db: SQLiteDatabase,
  dateKey: string,
): Promise<RecurringDayEntry[]> {
  const date = requireDate(dateKey);
  return runSerialized(async () => {
    const tasks = await recurringRepository.listActiveRecurringTasks(db);
    const logs = await recurringRepository.listLogsForDate(db, date);
    return withValues(tasks, logs);
  });
}

export function loadRecurringDetail(
  db: SQLiteDatabase,
  id: string,
  from: string | null,
  to: string | null,
  today: string,
): Promise<RecurringDetail> {
  const todayKey = requireDate(today);
  return runSerialized(async () => {
    const task = await requireActiveTask(db, id);
    if (!from || !to || !isDateKey(from) || !isDateKey(to)) {
      return { task, logs: [] };
    }
    const window = clipRecurringWindow(task.startDate, from, to, todayKey);
    const logs = window
      ? await recurringRepository.listLogsForTask(db, id, window.start, window.end)
      : [];
    return { task, logs };
  });
}

export function createRecurringTask(
  db: SQLiteDatabase,
  draft: RecurringTaskDraft,
): Promise<RecurringTask> {
  const title = requireTitle(draft.title);
  const description = normalizeDescription(draft.description);
  const valueType = requireValueType(draft.valueType);
  const startDate = requireDate(draft.startDate);
  const timestamp = new Date().toISOString();
  const id = createId();

  return runInTransaction(db, (txn) =>
    recurringRepository.insertRecurringTask(txn, {
      id,
      title,
      description,
      valueType,
      startDate,
      createdAt: timestamp,
    }),
  );
}

export function updateRecurringTask(
  db: SQLiteDatabase,
  id: string,
  draft: RecurringTaskUpdate,
): Promise<RecurringTask> {
  const title = requireTitle(draft.title);
  const description = normalizeDescription(draft.description);
  const startDate = requireDate(draft.startDate);
  const timestamp = new Date().toISOString();

  return runInTransaction(db, async (txn) => {
    await requireActiveTask(txn, id);
    return recurringRepository.updateRecurringTaskDetails(txn, {
      id,
      title,
      description,
      startDate,
      updatedAt: timestamp,
    });
  });
}

export function archiveRecurringTask(db: SQLiteDatabase, id: string): Promise<void> {
  const timestamp = new Date().toISOString();
  return runInTransaction(db, async (txn) => {
    await requireActiveTask(txn, id);
    await recurringRepository.archiveRecurringTask(txn, id, timestamp);
  });
}

export function setRecurringLog(
  db: SQLiteDatabase,
  taskId: string,
  dateKey: string,
  value: number | null,
): Promise<void> {
  const logDate = requireDate(dateKey);
  const timestamp = new Date().toISOString();

  return runInTransaction(db, async (txn) => {
    const task = await requireActiveTask(txn, taskId);
    if (logDate < task.startDate) {
      throw new Error('A day has to be on or after the start date.');
    }
    const next = normalizeLogValue(task.valueType, value);
    if (next == null) {
      await recurringRepository.deleteRecurringLog(txn, taskId, logDate);
      return;
    }
    await recurringRepository.upsertRecurringLog(txn, {
      id: createId(),
      recurringTaskId: taskId,
      logDate,
      value: next,
      updatedAt: timestamp,
    });
  });
}
