import type { Task } from '@/types/task';
import { eachDateInRange } from '@/utils/date';

export type DaySummary = {
  total: number;
  completed: number;
  remaining: number;
  progress: number;
};

export function isDayChecked(task: Pick<Task, 'checkedDates'>, dateKey: string): boolean {
  return task.checkedDates.includes(dateKey);
}

export function summarizeDay(tasks: readonly Task[], dateKey?: string): DaySummary {
  const total = tasks.length;
  const completed = tasks.reduce((count, task) => {
    const done = dateKey ? isDayChecked(task, dateKey) : task.status === 'completed';
    return count + (done ? 1 : 0);
  }, 0);
  const remaining = total - completed;
  return {
    total,
    completed,
    remaining,
    progress: total === 0 ? 0 : completed / total,
  };
}

export function progressLabel(summary: DaySummary): string {
  if (summary.total === 0) return 'No tasks yet';
  if (summary.remaining === 0) {
    return summary.total === 1 ? '1 task complete' : `All ${summary.total} tasks complete`;
  }
  return `${summary.completed} of ${summary.total} complete`;
}

export function indexTasksByDate(tasks: readonly Task[]): Map<string, Task[]> {
  const tasksByDate = new Map<string, Task[]>();
  for (const task of tasks) {
    for (const dateKey of eachDateInRange(task.scheduledDate, task.endDate)) {
      const existing = tasksByDate.get(dateKey);
      if (existing) {
        existing.push(task);
      } else {
        tasksByDate.set(dateKey, [task]);
      }
    }
  }
  return tasksByDate;
}

export function nextPostponedCount(
  fromDate: string,
  toDate: string,
  postponedCount: number,
): number {
  if (toDate > fromDate) return postponedCount + 1;
  return postponedCount;
}
