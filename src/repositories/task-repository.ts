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
  end_date: string | null;
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
  endDate: string;
  priority: TaskPriority | null;
  dueTime: string | null;
  createdAt: string;
};

export type TaskUpdateRecord = {
  id: string;
  title: string;
  description: string | null;
  scheduledDate: string;
  endDate: string;
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
  id, title, description, scheduled_date, end_date, status, priority, due_time,
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
    endDate: row.end_date ?? row.scheduled_date,
    status: assertStatus(row.status),
    priority: assertPriority(row.priority),
    dueTime: row.due_time ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
    originalScheduledDate: row.original_scheduled_date,
    postponedCount: row.postponed_count,
    checkedDates: [],
    deletedAt: row.deleted_at ?? undefined,
  };
}

async function listCheckedDates(
  db: SQLiteDatabase,
  taskIds: readonly string[],
): Promise<Map<string, string[]>> {
  const checks = new Map<string, string[]>();
  const chunkSize = 80;
  for (let index = 0; index < taskIds.length; index += chunkSize) {
    const chunk = taskIds.slice(index, index + chunkSize);
    const placeholders = chunk.map(() => '?').join(', ');
    const rows = await db.getAllAsync<{ task_id: string; day: string }>(
      `SELECT task_id, day FROM task_day_checks WHERE task_id IN (${placeholders}) ORDER BY day ASC`,
      ...chunk,
    );
    for (const row of rows) {
      const existing = checks.get(row.task_id);
      if (existing) existing.push(row.day);
      else checks.set(row.task_id, [row.day]);
    }
  }
  return checks;
}

async function withCheckedDates(db: SQLiteDatabase, tasks: Task[]): Promise<Task[]> {
  if (tasks.length === 0) return tasks;
  const checks = await listCheckedDates(
    db,
    tasks.map((task) => task.id),
  );
  return tasks.map((task) => ({ ...task, checkedDates: checks.get(task.id) ?? [] }));
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
  return row ? (await withCheckedDates(db, [mapTask(row)]))[0] : null;
}

export async function listTasksForDate(db: SQLiteDatabase, dateKey: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM tasks
     WHERE scheduled_date <= ? AND end_date >= ? AND deleted_at IS NULL
     ORDER BY ${TASK_ORDER}`,
    dateKey,
    dateKey,
  );
  return withCheckedDates(db, rows.map(mapTask));
}

export async function listTasksForDateRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM tasks
     WHERE scheduled_date <= ? AND end_date >= ? AND deleted_at IS NULL
     ORDER BY scheduled_date ASC, ${TASK_ORDER}`,
    endDate,
    startDate,
  );
  return withCheckedDates(db, rows.map(mapTask));
}

export async function listTasksMovedFromDate(db: SQLiteDatabase, dateKey: string): Promise<Task[]> {
  const rows = await db.getAllAsync<TaskRow>(
    `SELECT ${TASK_COLUMNS}
     FROM tasks
     WHERE deleted_at IS NULL
       AND (scheduled_date > ? OR end_date < ?)
       AND id IN (
         SELECT task_id FROM task_history
         WHERE event_type = 'rescheduled' AND from_date = ?
       )
     ORDER BY scheduled_date ASC, ${TASK_ORDER}`,
    dateKey,
    dateKey,
    dateKey,
  );
  return withCheckedDates(db, rows.map(mapTask));
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

export type HistoryTaskRecord = {
  id: string;
  title: string;
  scheduledDate: string;
  endDate: string;
  status: TaskStatus;
  postponedCount: number;
  originalScheduledDate: string;
  checkedDates: string[];
};

export type ActivityEventRecord = {
  id: string;
  taskId: string;
  eventType: 'completed' | 'reopened' | 'rescheduled';
  fromDate?: string;
  toDate?: string;
  timestamp: string;
};

export async function listActiveTaskSummaries(db: SQLiteDatabase): Promise<HistoryTaskRecord[]> {
  const rows = await db.getAllAsync<{
    id: string;
    title: string;
    scheduled_date: string;
    end_date: string | null;
    status: string;
    postponed_count: number;
    original_scheduled_date: string;
  }>(
    `SELECT id, title, scheduled_date, end_date, status, postponed_count, original_scheduled_date
     FROM tasks
     WHERE deleted_at IS NULL
     ORDER BY scheduled_date ASC, title ASC`,
  );
  const summaries = rows.map((row) => ({
    id: row.id,
    title: row.title,
    scheduledDate: row.scheduled_date,
    endDate: row.end_date ?? row.scheduled_date,
    status: assertStatus(row.status),
    postponedCount: row.postponed_count,
    originalScheduledDate: row.original_scheduled_date,
    checkedDates: [] as string[],
  }));
  const checks = await listCheckedDates(
    db,
    summaries.map((task) => task.id),
  );
  return summaries.map((task) => ({ ...task, checkedDates: checks.get(task.id) ?? [] }));
}

export async function listActivityEvents(db: SQLiteDatabase): Promise<ActivityEventRecord[]> {
  const rows = await db.getAllAsync<HistoryRow>(
    `SELECT h.id, h.task_id, h.event_type, h.from_date, h.to_date, h.timestamp
     FROM task_history h
     INNER JOIN tasks t ON t.id = h.task_id
     WHERE t.deleted_at IS NULL
       AND h.event_type IN ('completed', 'reopened', 'rescheduled')
     ORDER BY h.timestamp ASC, h.rowid ASC`,
  );
  return rows.flatMap((row) => {
    const eventType = assertEventType(row.event_type);
    if (eventType !== 'completed' && eventType !== 'reopened' && eventType !== 'rescheduled') {
      return [];
    }
    return [
      {
        id: row.id,
        taskId: row.task_id,
        eventType,
        fromDate: row.from_date ?? undefined,
        toDate: row.to_date ?? undefined,
        timestamp: row.timestamp,
      },
    ];
  });
}

export async function insertTask(db: SQLiteDatabase, record: NewTaskRecord): Promise<Task> {
  await db.runAsync(
    `INSERT INTO tasks (
      id, title, description, scheduled_date, end_date, status, priority, due_time,
      created_at, updated_at, completed_at, original_scheduled_date, postponed_count, deleted_at
    ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NULL, ?, 0, NULL)`,
    record.id,
    record.title,
    record.description,
    record.scheduledDate,
    record.endDate,
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
         end_date = ?,
         priority = ?,
         due_time = ?,
         postponed_count = ?,
         updated_at = ?
     WHERE id = ? AND deleted_at IS NULL`,
    record.title,
    record.description,
    record.scheduledDate,
    record.endDate,
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

export async function insertTaskDayCheck(
  db: SQLiteDatabase,
  taskId: string,
  day: string,
  checkedAt: string,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO task_day_checks (task_id, day, checked_at) VALUES (?, ?, ?)`,
    taskId,
    day,
    checkedAt,
  );
}

export async function deleteTaskDayCheck(
  db: SQLiteDatabase,
  taskId: string,
  day: string,
): Promise<void> {
  await db.runAsync(`DELETE FROM task_day_checks WHERE task_id = ? AND day = ?`, taskId, day);
}

export async function shiftTaskDayChecks(
  db: SQLiteDatabase,
  taskId: string,
  dayShift: (day: string) => string,
): Promise<void> {
  const rows = await db.getAllAsync<{ day: string; checked_at: string }>(
    `SELECT day, checked_at FROM task_day_checks WHERE task_id = ?`,
    taskId,
  );
  if (rows.length === 0) return;
  await db.runAsync(`DELETE FROM task_day_checks WHERE task_id = ?`, taskId);
  for (const row of rows) {
    await insertTaskDayCheck(db, taskId, dayShift(row.day), row.checked_at);
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
