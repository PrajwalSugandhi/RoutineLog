import { addDays, isDateKey, parseDateKey, toDateKey } from '@/utils/date';
import type { RecurringLog, RecurringTask, RecurringValueType } from '@/types/recurring-task';

export const MAX_RECURRING_RANGE_DAYS = 3660;

export type RecurringWindow = {
  start: string;
  end: string;
};

export type BooleanDayStat = {
  dateKey: string;
  visited: boolean;
};

export type NumericDayStat = {
  dateKey: string;
  value: number;
};

export type BooleanRangeSummary = {
  visited: number;
  notVisited: number;
  days: BooleanDayStat[];
  tooLong: boolean;
};

export type NumericRangeSummary = {
  total: number;
  days: NumericDayStat[];
  tooLong: boolean;
};

export function laterDateKey(left: string, right: string): string {
  return left > right ? left : right;
}

export function earlierDateKey(left: string, right: string): string {
  return left < right ? left : right;
}

export function startOfMonth(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function endOfMonth(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

export function clipRecurringWindow(
  habitStart: string,
  from: string,
  to: string,
  today: string,
): RecurringWindow | null {
  if (!isDateKey(habitStart) || !isDateKey(from) || !isDateKey(to) || !isDateKey(today)) {
    return null;
  }
  if (from > to) return null;
  const start = laterDateKey(habitStart, from);
  const end = earlierDateKey(to, today);
  if (start > end) return null;
  return { start, end };
}

export function recurringRangeTooLong(start: string, end: string): boolean {
  if (start > end) return false;
  let count = 1;
  let cursor = start;
  while (cursor < end) {
    cursor = addDays(cursor, 1);
    count += 1;
    if (count > MAX_RECURRING_RANGE_DAYS) return true;
  }
  return false;
}

export function listDateKeys(start: string, end: string): string[] {
  if (start > end) return [];
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    if (dates.length >= MAX_RECURRING_RANGE_DAYS) break;
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function defaultRecurringRange(habitStart: string, today: string): { from: string; to: string } {
  const clipped = clipRecurringWindow(habitStart, startOfMonth(today), endOfMonth(today), today);
  if (clipped) return { from: clipped.start, to: clipped.end };
  return { from: habitStart, to: habitStart };
}

export function summarizeBooleanRange(
  window: RecurringWindow | null,
  logs: RecurringLog[],
): BooleanRangeSummary {
  if (!window) return { visited: 0, notVisited: 0, days: [], tooLong: false };
  if (recurringRangeTooLong(window.start, window.end)) {
    return { visited: 0, notVisited: 0, days: [], tooLong: true };
  }
  const visitedDates = new Set(
    logs
      .filter((log) => log.value === 1 && log.logDate >= window.start && log.logDate <= window.end)
      .map((log) => log.logDate),
  );
  const days = listDateKeys(window.start, window.end).map((dateKey) => ({
    dateKey,
    visited: visitedDates.has(dateKey),
  }));
  const visited = days.reduce((count, day) => count + (day.visited ? 1 : 0), 0);
  return { visited, notVisited: days.length - visited, days, tooLong: false };
}

export function summarizeNumericRange(
  window: RecurringWindow | null,
  logs: RecurringLog[],
): NumericRangeSummary {
  if (!window) return { total: 0, days: [], tooLong: false };
  if (recurringRangeTooLong(window.start, window.end)) {
    return { total: 0, days: [], tooLong: true };
  }
  const values = new Map(
    logs
      .filter((log) => log.logDate >= window.start && log.logDate <= window.end)
      .map((log) => [log.logDate, log.value]),
  );
  const days = listDateKeys(window.start, window.end).map((dateKey) => ({
    dateKey,
    value: values.get(dateKey) ?? 0,
  }));
  const total = days.reduce((sum, day) => sum + day.value, 0);
  return { total, days, tooLong: false };
}

export function recurringTypeLabel(valueType: RecurringValueType): string {
  return valueType === 'boolean' ? 'Yes/no' : 'Number';
}

export function todayRecurringStatus(task: RecurringTask, value: number | null, today: string): string {
  if (task.startDate > today) return 'Starts later';
  if (task.valueType === 'boolean') return value === 1 ? 'Went today' : 'Not yet today';
  if (value == null) return 'Not logged today';
  return `${value} today`;
}
