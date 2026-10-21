import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Task,
  TaskHistoryEvent,
  TaskHistoryEventType,
  TaskPriority,
  TaskStatus,
} from '@/types/task';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  status: string;
  priority: string | null;
  due_time: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  original_scheduled_date: string;
  postponed_count: number;
  deleted_at: string | null;
};

type HistoryRow = {
  id: string;
  task_id: string;
  event_type: string;
  from_date: string | null;
  to_date: string | null;
  timestamp: string;
};

export type NewTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  priority: TaskPriority | null;
  dueTime: string | null;
  createdAt: string;
};

export type TaskUpdateRecord = {
  id: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  priority: TaskPriority | null;
  dueTime: string | null;
  postponedCount: number;
  updatedAt: string;
};

export type HistoryRecord = {
  id: string;
  taskId: string;
  eventType: TaskHistoryEventType;
  fromDate?: string;
  toDate?: string;
  timestamp: string;
};

const TASK_COLUMNS = `
  id, title, description, scheduled_date, status, priority, due_time,
  created_at, updated_at, completed_at, original_scheduled_date,
  postponed_count, deleted_at
`;

const TASK_ORDER = `
  CASE status WHEN 'pending' THEN 0 ELSE 1 END,
  CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
  CASE WHEN due_time IS NULL THEN 1 ELSE 0 END,
  due_time ASC,
  created_at ASC
`;

function assertStatus(value: string): TaskStatus {
  if (value === 'pending' || value === 'completed') return value;
  throw new Error('A saved task has an invalid status.');
}

function assertPriority(value: string | null): TaskPriority | undefined {
  if (value == null) return undefined;
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  throw new Error('A saved task has an invalid priority.');
}

function assertEventType(value: string): TaskHistoryEventType {
  if (
    value === 'created' ||
    value === 'completed' ||
    value === 'reopened' ||
    value === 'rescheduled' ||
    value === 'deleted'
  ) {
    return value;
  }
  throw new Error('A saved task event has an invalid type.');
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    scheduledDate: row.scheduled_date,
    status: assertStatus(row.status),
    priority: assertPriority(row.priority),
    dueTime: row.due_time ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    originalScheduledDate: row.original_scheduled_date,
    postponedCount: row.postponed_count,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapHistory(row: HistoryRow): TaskHistoryEvent {
  return {
    id: row.id,
    taskId: row.task_id,
    eventType: assertEventType(row.event_type),
    fromDate: row.from_date ?? undefined,
    toDate: row.to_date ?? undefined,
    timestamp: row.timestamp,
  };
}

async function requireTask(db: SQLiteDatabase, id: string): Promise<Task> {
  const task = await findTaskById(db, id);
  if (!task) {
    throw new Error('This task is no longer available.');
  }
  return task;
}

export async function findTaskById(db: SQLiteDatabase, id: string): Promise<Task | null> {
  const row = await db.getFirstAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS} FROM tasks WHERE id = ?`,
    id,
  );
  return row ? mapTask(row) : null;
}

export async function listTasksForDate(db: SQLiteDatabase, dateKey: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM tasks
     WHERE scheduled_date = ? AND deleted_at IS NULL
     ORDER BY ${TASK_ORDER}`,
    dateKey,
  );
  return rows.map(mapTask);
}

export async function listTasksForDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM tasks
     WHERE scheduled_date >= ? AND scheduled_date <= ? AND deleted_at IS NULL
     ORDER BY scheduled_date ASC, ${TASK_ORDER}`,
    startDate,
    endDate,
  );
  return rows.map(mapTask);
}

export async function listTasksMovedFromDate(db: SQLiteDatabase, dateKey: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM tasks
     WHERE deleted_at IS NULL
       AND scheduled_date != ?
       AND id IN (
         SELECT task_id FROM task_history
         WHERE event_type = 'rescheduled' AND from_date = ?
       )
     ORDER BY scheduled_date ASC, ${TASK_ORDER}`,
    dateKey,
    dateKey,
  );
  return rows.map(mapTask);
}

export async function listTaskHistory(db: SQLiteDatabase, taskId: string): Promise<TaskHistoryEvent[]> {
  const rows = await db.getAllAsync<HistoryRow>(
    `SELECT id, task_id, event_type, from_date, to_date, timestamp
     FROM task_history
     WHERE task_id = ?
     ORDER BY timestamp ASC, rowid ASC`,
    taskId,
  );
  return rows.map(mapHistory);
}

export async function insertTask(db: SQLiteDatabase, record: NewTaskRecord): Promise<Task> {
  await db.runAsync(
    `INSERT INTO tasks (
      id, title, description, scheduled_date, status, priority, due_time,
      created_at, updated_at, completed_at, original_scheduled_date, postponed_count, deleted_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, ?, 0, NULL)`,
    record.id,
    record.title,
    record.description,
    record.scheduledDate,
    record.priority,
    record.dueTime,
    record.createdAt,
    record.createdAt,
    record.scheduledDate,
  );
  return requireTask(db, record.id);
}

export async function updateTaskDetails(db: SQLiteDatabase, record: TaskUpdateRecord): Promise<Task> {
  const result = await db.runAsync(
    `UPDATE tasks
     SET title = ?,
         description = ?,
         scheduled_date = ?,
         priority = ?,
         due_time = ?,
         postponed_count = ?,
         updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    record.title,
    record.description,
    record.scheduledDate,
    record.priority,
    record.dueTime,
    record.postponedCount,
    record.updatedAt,
    record.id,
  );
  if (result.changes === 0) {
    throw new Error('This task is no longer available.');
  }
  return requireTask(db, record.id);
}

export async function markTaskCompleted(
  db: SQLiteDatabase,
  id: string,
  timestamp: string,
): Promise<Task> {
  const result = await db.runAsync(
    `UPDATE tasks
     SET status = 'completed', completed_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL AND status = 'pending'`,
    timestamp,
    timestamp,
    id,
  );
  if (result.changes === 0) {
    throw new Error('This task is no longer available.');
  }
  return requireTask(db, id);
}

export async function markTaskPending(db: SQLiteDatabase, id: string, timestamp: string): Promise<Task> {
  const result = await db.runAsync(
    `UPDATE tasks
     SET status = 'pending', completed_at = NULL, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL AND status = 'completed'`,
    timestamp,
    id,
  );
  if (result.changes === 0) {
    throw new Error('This task is no longer available.');
  }
  return requireTask(db, id);
}

export async function archiveTask(db: SQLiteDatabase, id: string, timestamp: string): Promise<void> {
  const result = await db.runAsync(
    `UPDATE tasks
     SET deleted_at = ?, updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    timestamp,
    timestamp,
    id,
  );
  if (result.changes === 0) {
    throw new Error('This task is no longer available.');
  }
}

export async function insertHistory(db: SQLiteDatabase, record: HistoryRecord): Promise<void> {
  await db.runAsync(
    `INSERT INTO task_history (id, task_id, event_type, from_date, to_date, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`,
    record.id,
    record.taskId,
    record.eventType,
    record.fromDate ?? null,
    record.toDate ?? null,
    record.timestamp,
  );
}
