const DATE_KEY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_KEY = /^(\d{1,2}):(\d{2})$/;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey(now = new Date()): string {
  return toDateKey(now);
}

export function parseDateKey(dateKey: string): Date {
  const match = DATE_KEY.exec(dateKey);
  if (!match) {
    throw new Error('Choose a valid date.');
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return new Date(year, month - 1, day);
}

export function isDateKey(value: string): boolean {
  const match = DATE_KEY.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function daysBetween(fromDate: string, toDate: string): number {
  const from = parseDateKey(fromDate);
  const to = parseDateKey(toDate);
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export function rangeCoversDate(start: string, end: string, dateKey: string): boolean {
  const last = end >= start ? end : start;
  return start <= dateKey && dateKey <= last;
}

export function eachDateInRange(start: string, end: string): string[] {
  const last = end >= start ? end : start;
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= last) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function addMonths(dateKey: string, months: number): string {
  const date = parseDateKey(dateKey);
  const day = date.getDate();
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, lastDay));
  return toDateKey(target);
}

export function isTimeKey(value: string): boolean {
  try {
    normalizeTimeKey(value);
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeKey(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = TIME_KEY.exec(trimmed);
  if (!match) {
    throw new Error('Use a time like 09:30.');
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    throw new Error('Use a time like 09:30.');
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export const MAX_DURATION_MINUTES = 99 * 60 + 59;

export function parseDurationMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const minutes = Number(trimmed);
    if (minutes > MAX_DURATION_MINUTES) {
      throw new Error('Enter a duration up to 99:59.');
    }
    return minutes;
  }
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(trimmed);
  if (!match) {
    throw new Error('Enter minutes, or a duration like 1:30.');
  }
  const total = Number(match[1]) * 60 + Number(match[2]);
  if (total > MAX_DURATION_MINUTES) {
    throw new Error('Enter a duration up to 99:59.');
  }
  return total;
}

export function formatDurationLabel(minutes: number): string {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export function toTimeKey(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTimeLabel(timeKey: string): string {
  const normalized = normalizeTimeKey(timeKey);
  if (!normalized) return '';
  const [hours, minutes] = normalized.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function formatDayHeading(
  dateKey: string,
  now = new Date(),
): { title: string; detail: string } {
  const today = toDateKey(now);
  const date = parseDateKey(dateKey);
  const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(date);
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
  }).format(date);
  const dated =
    date.getFullYear() === now.getFullYear() ? monthDay : `${monthDay}, ${date.getFullYear()}`;

  if (dateKey === today) {
    return { title: 'Today', detail: `${weekday}, ${dated}` };
  }
  if (dateKey === addDays(today, -1)) {
    return { title: 'Yesterday', detail: `${weekday}, ${dated}` };
  }
  if (dateKey === addDays(today, 1)) {
    return { title: 'Tomorrow', detail: `${weekday}, ${dated}` };
  }
  return { title: weekday, detail: dated };
}

export function dateWithTime(dateKey: string, timeKey: string | null): Date {
  const date = parseDateKey(dateKey);
  if (!timeKey) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  const normalized = normalizeTimeKey(timeKey);
  if (!normalized) {
    date.setHours(9, 0, 0, 0);
    return date;
  }
  const [hours, minutes] = normalized.split(':').map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date;
}
