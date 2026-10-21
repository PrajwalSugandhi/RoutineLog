import type { SQLiteDatabase } from 'expo-sqlite';

import { runSerialized } from '@/database/transaction';
import * as reviewRepository from '@/repositories/review-repository';
import { listTasksForDate, listTasksMovedFromDate } from '@/repositories/task-repository';
import type { Task } from '@/types/task';
import { isDateKey } from '@/utils/date';
import {
  summarizeReview,
  type DayReview,
  type ReviewSummary,
} from '@/utils/review';

export type ReviewSnapshot = {
  review: DayReview | null;
  tasksOnDate: Task[];
  movedTasks: Task[];
  summary: ReviewSummary;
};

function requireDate(dateKey: string): string {
  if (!isDateKey(dateKey)) {
    throw new Error('Choose a valid date in YYYY-MM-DD format.');
  }
  return dateKey;
}

export function loadReviewSnapshot(db: SQLiteDatabase, dateKey: string): Promise<ReviewSnapshot> {
  const reviewDate = requireDate(dateKey);
  return runSerialized(async () => {
    const review = await reviewRepository.findReview(db, reviewDate);
    const tasksOnDate = await listTasksForDate(db, reviewDate);
    const movedTasks = await listTasksMovedFromDate(db, reviewDate);
    return {
      review,
      tasksOnDate,
      movedTasks,
      summary: summarizeReview(
        reviewDate,
        tasksOnDate,
        movedTasks.map((task) => task.scheduledDate),
      ),
    };
  });
}

export function beginReview(db: SQLiteDatabase, dateKey: string): Promise<void> {
  const reviewDate = requireDate(dateKey);
  const timestamp = new Date().toISOString();
  return runSerialized(() => reviewRepository.insertInProgressReview(db, reviewDate, timestamp));
}

export async function finishReview(db: SQLiteDatabase, dateKey: string): Promise<ReviewSnapshot> {
  const reviewDate = requireDate(dateKey);
  const timestamp = new Date().toISOString();
  return runSerialized(async () => {
    const tasksOnDate = await listTasksForDate(db, reviewDate);
    const movedTasks = await listTasksMovedFromDate(db, reviewDate);
    const summary = summarizeReview(
      reviewDate,
      tasksOnDate,
      movedTasks.map((task) => task.scheduledDate),
    );
    const status = summary.pending === 0 ? 'completed_clear' : 'completed_with_unresolved';
    await reviewRepository.finishReviewRecord(db, reviewDate, status, timestamp);
    const review = await reviewRepository.findReview(db, reviewDate);
    return { review, tasksOnDate, movedTasks, summary };
  });
}
