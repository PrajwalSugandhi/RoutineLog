import type { Task } from '@/types/task';
import { addDays } from '@/utils/date';

export type ReviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed_clear'
  | 'completed_with_unresolved';

export type ReviewSummary = {
  planned: number;
  completed: number;
  pending: number;
  movedToTomorrow: number;
  movedToOther: number;
};

export type DayReview = {
  date: string;
  status: ReviewStatus;
  startedAt?: string;
  finishedAt?: string;
  updatedAt: string;
};

export function summarizeReview(
  dateKey: string,
  tasksOnDate: readonly Pick<Task, 'status'>[],
  movedDates: readonly string[],
): ReviewSummary {
  const tomorrow = addDays(dateKey, 1);
  const completed = tasksOnDate.filter((task) => task.status === 'completed').length;
  const pending = tasksOnDate.length - completed;
  const movedToTomorrow = movedDates.filter((date) => date === tomorrow).length;

  return {
    planned: tasksOnDate.length + movedDates.length,
    completed,
    pending,
    movedToTomorrow,
    movedToOther: movedDates.length - movedToTomorrow,
  };
}

export function reviewStatusAfterFinish(pending: number): Extract<
  ReviewStatus,
  'completed_clear' | 'completed_with_unresolved'
> {
  return pending === 0 ? 'completed_clear' : 'completed_with_unresolved';
}

export function reviewStatusLabel(status: ReviewStatus, pending = 0): string {
  if (status === 'completed_clear' && pending > 0) {
    return 'New tasks are still open';
  }
  switch (status) {
    case 'not_started':
      return 'Not started';
    case 'in_progress':
      return 'In progress';
    case 'completed_clear':
      return 'Finished';
    case 'completed_with_unresolved':
      return pending === 0 ? 'Finished' : 'Finished with tasks still open';
  }
}
