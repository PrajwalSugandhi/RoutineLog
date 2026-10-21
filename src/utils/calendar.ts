import { addDays, addMonths, parseDateKey, toDateKey, todayKey } from '@/utils/date';

export type CalendarView = 'day' | 'week' | 'month';

export type MonthCell = {
  dateKey: string;
  inMonth: boolean;
};

const WEEK_LENGTH = 7;

export function startOfWeek(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return addDays(dateKey, -date.getDay());
}

export function buildWeek(dateKey: string): string[] {
  const start = startOfWeek(dateKey);
  return Array.from({ length: WEEK_LENGTH }, (_, index) => addDays(start, index));
}

export function buildMonthGrid(dateKey: string): MonthCell[][] {
  const selected = parseDateKey(dateKey);
  const year = selected.getFullYear();
  const month = selected.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - firstOfMonth.getDay());
  const weeks: MonthCell[][] = [];

  for (let weekIndex = 0; weekIndex < 6; weekIndex += 1) {
    const week: MonthCell[] = [];
    for (let dayIndex = 0; dayIndex < WEEK_LENGTH; dayIndex += 1) {
      const cell = new Date(gridStart);
      cell.setDate(gridStart.getDate() + weekIndex * WEEK_LENGTH + dayIndex);
      week.push({
        dateKey: toDateKey(cell),
        inMonth: cell.getMonth() === month && cell.getFullYear() === year,
      });
    }
    weeks.push(week);
  }

  while (weeks.length > 4 && weeks[weeks.length - 1].every((cell) => !cell.inMonth)) {
    weeks.pop();
  }

  return weeks;
}

export function visibleRange(view: CalendarView, dateKey: string): { start: string; end: string } {
  if (view === 'day') {
    return { start: dateKey, end: dateKey };
  }
  if (view === 'week') {
    const week = buildWeek(dateKey);
    return { start: week[0], end: week[WEEK_LENGTH - 1] };
  }
  const weeks = buildMonthGrid(dateKey);
  return {
    start: weeks[0][0].dateKey,
    end: weeks[weeks.length - 1][WEEK_LENGTH - 1].dateKey,
  };
}

export function shiftVisibleDate(view: CalendarView, dateKey: string, direction: -1 | 1): string {
  if (view === 'month') return addMonths(dateKey, direction);
  if (view === 'week') return addDays(dateKey, direction * WEEK_LENGTH);
  return addDays(dateKey, direction);
}

export function weekdayLabels(): string[] {
  const sunday = new Date(2023, 0, 1);
  return Array.from({ length: WEEK_LENGTH }, (_, index) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + index);
    return new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(date);
  });
}

export function formatWeekHeading(
  dateKey: string,
  now = new Date(),
): { title: string; detail: string } {
  const week = buildWeek(dateKey);
  const start = parseDateKey(week[0]);
  const end = parseDateKey(week[WEEK_LENGTH - 1]);
  const startLabel = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(start);
  const endLabel =
    start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
      ? new Intl.DateTimeFormat(undefined, { day: 'numeric' }).format(end)
      : new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(end);
  const range = `${startLabel} – ${endLabel}`;
  const containsToday = week.includes(todayKey(now));
  const year =
    start.getFullYear() === end.getFullYear()
      ? String(end.getFullYear())
      : `${start.getFullYear()} – ${end.getFullYear()}`;

  if (containsToday) {
    return { title: 'This week', detail: range };
  }
  return { title: range, detail: year };
}

export function formatMonthHeading(dateKey: string): { title: string; detail: string } {
  const date = parseDateKey(dateKey);
  return {
    title: new Intl.DateTimeFormat(undefined, { month: 'long' }).format(date),
    detail: String(date.getFullYear()),
  };
}

export function dayNumber(dateKey: string): number {
  return parseDateKey(dateKey).getDate();
}
