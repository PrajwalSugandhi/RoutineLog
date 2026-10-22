import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_VERSION } from '@/database/constants';

const INITIAL_SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date TEXT NOT NULL CHECK (scheduled_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
  priority TEXT CHECK (priority IS NULL OR priority IN ('low', 'medium', 'high')),
  due_time TEXT CHECK (due_time IS NULL OR due_time GLOB '[0-9][0-9]:[0-9][0-9]'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  original_scheduled_date TEXT NOT NULL CHECK (
    original_scheduled_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  postponed_count INTEGER NOT NULL DEFAULT 0 CHECK (postponed_count >= 0),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_date ON tasks (scheduled_date);

CREATE TABLE IF NOT EXISTS task_history (
  id TEXT PRIMARY KEY NOT NULL,
  task_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('created', 'completed', 'reopened', 'rescheduled', 'deleted')
  ),
  from_date TEXT,
  to_date TEXT,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (task_id) REFERENCES tasks (id)
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history (task_id);
`;

const RECURRING_SCHEMA = `
CREATE TABLE IF NOT EXISTS recurring_tasks (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'numeric')),
  start_date TEXT NOT NULL CHECK (start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_recurring_tasks_start_date ON recurring_tasks (start_date);

CREATE TABLE IF NOT EXISTS recurring_logs (
  id TEXT PRIMARY KEY NOT NULL,
  recurring_task_id TEXT NOT NULL,
  log_date TEXT NOT NULL CHECK (log_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  value INTEGER NOT NULL CHECK (value >= 0),
  updated_at TEXT NOT NULL,
  FOREIGN KEY (recurring_task_id) REFERENCES recurring_tasks (id),
  UNIQUE (recurring_task_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_recurring_logs_date ON recurring_logs (log_date);
`;

const REVIEW_SCHEMA = `
CREATE TABLE IF NOT EXISTS day_reviews (
  review_date TEXT PRIMARY KEY NOT NULL CHECK (
    review_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
  ),
  status TEXT NOT NULL CHECK (
    status IN ('not_started', 'in_progress', 'completed_clear', 'completed_with_unresolved')
  ),
  started_at TEXT,
  finished_at TEXT,
  updated_at TEXT NOT NULL
);
`;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < DATABASE_VERSION) {
    if (currentVersion === 0) {
      await db.execAsync(INITIAL_SCHEMA);
    }
    if (currentVersion < 3) {
      await db.execAsync(RECURRING_SCHEMA);
    }
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }

  await db.execAsync(REVIEW_SCHEMA);
  await db.execAsync('PRAGMA foreign_keys = ON;');
}
