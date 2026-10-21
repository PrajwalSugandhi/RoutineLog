import type { SQLiteDatabase } from 'expo-sqlite';

import type { ReviewStatus } from '@/utils/review';

type ReviewRow = {
  review_date: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string;
};

const STATUSES: readonly ReviewStatus[] = [
  'not_started',
  'in_progress',
  'completed_clear',
  'completed_with_unresolved',
];

function assertStatus(value: string): ReviewStatus {
  if (STATUSES.includes(value as ReviewStatus)) return value as ReviewStatus;
  throw new Error('A saved review has an invalid status.');
}

export function mapReview(row: ReviewRow) {
  return {
    date: row.review_date,
    status: assertStatus(row.status),
    startedAt: row.started_at ?? undefined,
    finishedAt: row.finished_at ?? undefined,
    updatedAt: row.updated_at,
  };
}

export async function findReview(db: SQLiteDatabase, dateKey: string) {
  const row = await db.getFirstAsync<ReviewRow>(
    `SELECT review_date, status, started_at, finished_at, updated_at
     FROM day_reviews
     WHERE review_date = ?`,
    dateKey,
  );
  return row ? mapReview(row) : null;
}

export async function listReviews(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ReviewRow>(
    `SELECT review_date, status, started_at, finished_at, updated_at
     FROM day_reviews
     ORDER BY review_date ASC`,
  );
  return rows.map(mapReview);
}

export async function insertInProgressReview(
  db: SQLiteDatabase,
  dateKey: string,
  timestamp: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO day_reviews (review_date, status, started_at, finished_at, updated_at)
     VALUES (?, 'in_progress', ?, NULL, ?)
     ON CONFLICT(review_date) DO UPDATE SET
       status = CASE
         WHEN day_reviews.status = 'not_started' THEN 'in_progress'
         ELSE day_reviews.status
       END,
       started_at = COALESCE(day_reviews.started_at, excluded.started_at),
       updated_at = excluded.updated_at`,
    dateKey,
    timestamp,
    timestamp,
  );
}

export async function finishReviewRecord(
  db: SQLiteDatabase,
  dateKey: string,
  status: Extract<ReviewStatus, 'completed_clear' | 'completed_with_unresolved'>,
  timestamp: string,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO day_reviews (review_date, status, started_at, finished_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(review_date) DO UPDATE SET
       status = excluded.status,
       started_at = COALESCE(day_reviews.started_at, excluded.started_at),
       finished_at = excluded.finished_at,
       updated_at = excluded.updated_at`,
    dateKey,
    status,
    timestamp,
    timestamp,
    timestamp,
  );
}
