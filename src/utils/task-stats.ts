import type { Task } from '@/types/task';

export type DaySummary = {
  total: number;
  completed: number;
  remaining: number;
  progress: number;
};

export function summarizeDay(tasks: readonly Task[]): DaySummary {
  const total = tasks.length;
  const completed = tasks.reduce(
    (count, task) => count + (task.status === 'completed' ? 1 : 0),
    0,
  );
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
    const existing = tasksByDate.get(task.scheduledDate);
    if (existing) {
      existing.push(task);
    } else {
      tasksByDate.set(task.scheduledDate, [task]);
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
