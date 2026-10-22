import type { SQLiteDatabase } from 'expo-sqlite';

import type { RecurringLog, RecurringTask, RecurringValueType } from '@/types/recurring-task';

type RecurringTaskRow = {
  id: string;
  title: string;
  description: string | null;
  value_type: string;
  start_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type RecurringLogRow = {
  id: string;
  recurring_task_id: string;
  log_date: string;
  value: number;
  updated_at: string;
};

export type NewRecurringTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  valueType: RecurringValueType;
  startDate: string;
  createdAt: string;
};

export type RecurringTaskUpdateRecord = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  updatedAt: string;
};

export type RecurringLogRecord = {
  id: string;
  recurringTaskId: string;
  logDate: string;
  value: number;
  updatedAt: string;
};

const TASK_COLUMNS = `
  id, title, description, value_type, start_date, created_at, updated_at, deleted_at
`;

function assertValueType(value: string): RecurringValueType {
  if (value === 'boolean' || value === 'numeric') return value;
  throw new Error('A saved everyday task has an invalid type.');
}

function mapTask(row: RecurringTaskRow): RecurringTask {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    valueType: assertValueType(row.value_type),
    startDate: row.start_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapLog(row: RecurringLogRow): RecurringLog {
  return {
    id: row.id,
    recurringTaskId: row.recurring_task_id,
    logDate: row.log_date,
    value: row.value,
    updatedAt: row.updated_at,
  };
}

export async function findRecurringTaskById(
  db: SQLiteDatabase,
  id: string,
): Promise<RecurringTask | null> {
  const row = await db.getFirstAsync<RecurringTaskRow>(
    `SELECT ${TASK_COLUMNS} FROM recurring_tasks WHERE id = ?`,
    id,
  );
  return row ? mapTask(row) : null;
}

export async function listActiveRecurringTasks(db: SQLiteDatabase): Promise<RecurringTask[]> {
  const rows = await db.getAllAsync<RecurringTaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM recurring_tasks
     WHERE deleted_at IS NULL
     ORDER BY title COLLATE NOCASE ASC, created_at ASC`,
  );
  return rows.map(mapTask);
}

export async function listRecurringTasksActiveOnDate(
  db: SQLiteDatabase,
  dateKey: string,
): Promise<RecurringTask[]> {
  const rows = await db.getAllAsync<RecurringTaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM recurring_tasks
     WHERE deleted_at IS NULL AND start_date <= ?
     ORDER BY title COLLATE NOCASE ASC, created_at ASC`,
    dateKey,
  );
  return rows.map(mapTask);
}

export async function listLogsForDate(db: SQLiteDatabase, dateKey: string): Promise<RecurringLog[]> {
  const rows = await db.getAllAsync<RecurringLogRow>(
    `SELECT id, recurring_task_id, log_date, value, updated_at
     FROM recurring_logs
     WHERE log_date = ?`,
    dateKey,
  );
  return rows.map(mapLog);
}

export async function listLogsForTask(
  db: SQLiteDatabase,
  taskId: string,
  startDate: string,
  endDate: string,
): Promise<RecurringLog[]> {
  const rows = await db.getAllAsync<RecurringLogRow>(
    `SELECT id, recurring_task_id, log_date, value, updated_at
     FROM recurring_logs
     WHERE recurring_task_id = ? AND log_date >= ? AND log_date <= ?
     ORDER BY log_date ASC`,
    taskId,
    startDate,
    endDate,
  );
  return rows.map(mapLog);
}

export async function insertRecurringTask(
  db: SQLiteDatabase,
  record: NewRecurringTaskRecord,
): Promise<RecurringTask> {
  await db.runAsync(
    `INSERT INTO recurring_tasks (
      id, title, description, value_type, start_date, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`,
    record.id,
    record.title,
    record.description,
    record.valueType,
    record.startDate,
    record.createdAt,
    record.createdAt,
  );
  const task = await findRecurringTaskById(db, record.id);
  if (!task) {
    throw new Error('This everyday task could not be saved.');
  }
  return task;
}

export async function updateRecurringTaskDetails(
  db: SQLiteDatabase,
  record: RecurringTaskUpdateRecord,
): Promise<RecurringTask> {
  const result = await db.runAsync(
    `UPDATE recurring_tasks
     SET title = ?, description = ?, start_date = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    record.title,
    record.description,
    record.startDate,
    record.updatedAt,
    record.id,
  );
  if (result.changes === 0) {
    throw new Error('This everyday task is no longer available.');
  }
  const task = await findRecurringTaskById(db, record.id);
  if (!task) {
    throw new Error('This everyday task is no longer available.');
  }
  return task;
}

export async function archiveRecurringTask(
  db: SQLiteDatabase,
  id: string,
  timestamp: string,
): Promise<void> {
  const result = await db.runAsync(
    `UPDATE recurring_tasks
     SET deleted_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    id,
  );
  if (result.changes === 0) {
    throw new Error('This everyday task is no longer available.');
  }
}

export async function upsertRecurringLog(db: SQLiteDatabase, record: RecurringLogRecord): Promise<void> {
  await db.runAsync(
    `INSERT INTO recurring_logs (id, recurring_task_id, log_date, value, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(recurring_task_id, log_date) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`,
    record.id,
    record.recurringTaskId,
    record.logDate,
    record.value,
    record.updatedAt,
  );
}

export async function deleteRecurringLog(
  db: SQLiteDatabase,
  taskId: string,
  logDate: string,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM recurring_logs WHERE recurring_task_id = ? AND log_date = ?`,
    taskId,
    logDate,
  );
}
