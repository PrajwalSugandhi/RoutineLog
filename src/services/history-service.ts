import type { SQLiteDatabase } from 'expo-sqlite';

import { runSerialized } from '@/database/transaction';
import { listReviews } from '@/repositories/review-repository';
import {
  listActiveTaskSummaries,
  listActivityEvents,
} from '@/repositories/task-repository';
import type { DayReview } from '@/utils/review';
import type { ActivityEvent, HistoryTask } from '@/utils/history';

export type HistoryBundle = {
  tasks: HistoryTask[];
  events: ActivityEvent[];
  reviews: DayReview[];
};

export function loadHistory(db: SQLiteDatabase): Promise<HistoryBundle> {
  return runSerialized(async () => {
    const tasks = await listActiveTaskSummaries(db);
    const events = await listActivityEvents(db);
    const reviews = await listReviews(db);
    return { tasks, events, reviews };
  });
}
