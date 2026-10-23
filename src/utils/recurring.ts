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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];

export type HabitHeatCell = {
  dateKey: string;
  amount: number;
};

export type HabitHeatWeek = {
  days: HabitHeatCell[];
  monthLabel: string | null;
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
): HabitHeatWeek[] {
  if (!isDateKey(start) || !isDateKey(end) || start > end) return [];
  const gridStart = startOfMonday(start);
  const weeks: HabitHeatWeek[] = [];
  let cursor = gridStart;
  let labeledMonth = '';
  let labeledYear: number | null = null;
  const weekLimit = Math.ceil(MAX_RECURRING_RANGE_DAYS / 7) + 1;

  while (cursor <= end && weeks.length < weekLimit) {
    const cells: HabitHeatCell[] = [];
    for (let index = 0; index < 7; index += 1) {
      const dateKey = addDays(cursor, index);
      if (dateKey > end) break;
      cells.push({ dateKey, amount: amounts.get(dateKey) ?? 0 });
    }
    if (cells.length === 0) break;
    const first = cells.find((cell) => cell.dateKey >= start);
    let monthLabel: string | null = null;
    if (first) {
      const month = first.dateKey.slice(0, 7);
      if (month !== labeledMonth) {
        const date = parseDateKey(first.dateKey);
        const year = date.getFullYear();
        const name = MONTH_LABELS[date.getMonth()] ?? '';
        monthLabel = labeledYear == null || year !== labeledYear ? `${name} ${year}` : name;
        labeledMonth = month;
        labeledYear = year;
      }
    }
    weeks.push({ days: cells, monthLabel });
    cursor = addDays(cursor, 7);
  }

  return weeks;
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
): HabitPatternStats {
  const counts = (dateKey: string) =>
    (amounts.get(dateKey) ?? 0) > 0 && dateKey >= habitStart && dateKey <= today;

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
    if (amount <= 0 || dateKey < habitStart || dateKey > today) continue;
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
  return valueType === 'boolean' ? 'Yes/no' : 'Number';
}

export function todayRecurringStatus(task: RecurringTask, value: number | null, today: string): string {
  if (task.startDate > today) return 'Starts later';
  if (task.valueType === 'boolean') return value === 1 ? 'Went today' : 'Not yet today';
  if (value == null) return 'Not logged today';
  return `${value} today`;
}
