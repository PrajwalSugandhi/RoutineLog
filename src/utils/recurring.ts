import {
  addDays,
  addMonths,
  formatDurationLabel,
  isDateKey,
  parseDateKey,
  toDateKey,
} from '@/utils/date';
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

export type TimeDayStat = {
  dateKey: string;
  minutes: number | null;
};

export type TimeRangeSummary = {
  days: TimeDayStat[];
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

export function summarizeTimeRange(
  window: RecurringWindow | null,
  logs: RecurringLog[],
): TimeRangeSummary {
  if (!window) return { days: [], tooLong: false };
  if (recurringRangeTooLong(window.start, window.end)) {
    return { days: [], tooLong: true };
  }
  const values = new Map(
    logs
      .filter((log) => log.logDate >= window.start && log.logDate <= window.end)
      .map((log) => [log.logDate, log.value]),
  );
  const days = listDateKeys(window.start, window.end).map((dateKey) => ({
    dateKey,
    minutes: values.has(dateKey) ? (values.get(dateKey) ?? null) : null,
  }));
  return { days, tooLong: false };
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type HabitHeatCell = {
  dateKey: string | null;
  amount: number;
};

export type HabitHeatMonth = {
  key: string;
  label: string;
  year: number;
  weeks: HabitHeatCell[][];
};

export type HabitPatternStats = {
  streak: number;
  daysThisMonth: number;
  percentOver30: number;
};

export function buildHabitHeatmap(
  start: string,
  end: string,
  amounts: ReadonlyMap<string, number>,
): HabitHeatMonth[] {
  if (!isDateKey(start) || !isDateKey(end) || start > end) return [];
  const anchor = start < end ? start : end;
  let monthCursor = startOfMonth(addMonths(anchor, -1));
  const endMonth = startOfMonth(end);
  const months: HabitHeatMonth[] = [];
  const monthLimit = Math.ceil(MAX_RECURRING_RANGE_DAYS / 28) + 2;

  while (monthCursor <= endMonth && months.length < monthLimit) {
    const monthDate = parseDateKey(monthCursor);
    const monthEnd = earlierDateKey(endOfMonth(monthCursor), end);
    const weeks: HabitHeatCell[][] = [];
    let weekCursor = startOfMonday(monthCursor);

    while (weekCursor <= monthEnd && weeks.length < 6) {
      const cells: HabitHeatCell[] = [];
      for (let index = 0; index < 7; index += 1) {
        const dateKey = addDays(weekCursor, index);
        if (dateKey < monthCursor || dateKey > monthEnd) {
          cells.push({ dateKey: null, amount: 0 });
        } else {
          cells.push({ dateKey, amount: amounts.get(dateKey) ?? 0 });
        }
      }
      weeks.push(cells);
      weekCursor = addDays(weekCursor, 7);
    }

    months.push({
      key: monthCursor.slice(0, 7),
      label: MONTH_LABELS[monthDate.getMonth()] ?? '',
      year: monthDate.getFullYear(),
      weeks,
    });
    monthCursor = startOfMonth(addMonths(monthCursor, 1));
  }

  return months;
}

function startOfMonday(dateKey: string): string {
  const day = parseDateKey(dateKey).getDay();
  const fromMonday = day === 0 ? 6 : day - 1;
  return addDays(dateKey, -fromMonday);
}

export function habitPatternStats(
  amounts: ReadonlyMap<string, number>,
  habitStart: string,
  today: string,
  options?: { countZero?: boolean },
): HabitPatternStats {
  const logged = (dateKey: string, amount: number) => {
    if (dateKey < habitStart || dateKey > today) return false;
    if (options?.countZero) return amounts.has(dateKey);
    return amount > 0;
  };
  const counts = (dateKey: string) => logged(dateKey, amounts.get(dateKey) ?? 0);

  let streak = 0;
  let cursor = today;
  while (counts(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const monthStart = startOfMonth(today);
  const recentStart = addDays(today, -29);
  let daysThisMonth = 0;
  let recent = 0;
  for (const [dateKey, amount] of amounts) {
    if (!logged(dateKey, amount)) continue;
    if (dateKey >= monthStart) daysThisMonth += 1;
    if (dateKey >= recentStart) recent += 1;
  }

  return {
    streak,
    daysThisMonth,
    percentOver30: Math.round((recent / 30) * 100),
  };
}

export function habitPatternLabel(stats: HabitPatternStats): string {
  const days = stats.daysThisMonth === 1 ? 'day' : 'days';
  return `${stats.streak}-day streak · ${stats.daysThisMonth} ${days} this month · ${stats.percentOver30}% over 30 days`;
}

export function recurringTypeLabel(valueType: RecurringValueType): string {
  if (valueType === 'boolean') return 'Yes/no';
  if (valueType === 'time') return 'Time';
  return 'Number';
}

export function todayRecurringStatus(task: RecurringTask, value: number | null, today: string): string {
  if (task.startDate > today) return 'Starts later';
  if (task.valueType === 'boolean') return value === 1 ? 'Went today' : 'Not yet today';
  if (value == null) return 'Not logged today';
  if (task.valueType === 'time') return `${formatDurationLabel(value)} today`;
  return `${value} today`;
}
