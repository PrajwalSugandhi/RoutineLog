import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildWeek, dayNumber } from '@/utils/calendar';
import { formatDayHeading, parseDateKey, todayKey } from '@/utils/date';

export type WeekDaySummary = {
  count: number;
  pending: number;
  label: string;
};

type WeekStripProps = {
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  summaryForDate: (dateKey: string) => WeekDaySummary;
};

export function summarizeTasksForWeek(
  tasks: readonly { status: string }[],
): WeekDaySummary {
  const pending = tasks.filter((task) => task.status === 'pending').length;
  const label =
    tasks.length === 0
      ? 'no tasks'
      : pending === 0
        ? `${tasks.length} complete`
        : `${tasks.length} tasks, ${pending} unfinished`;
  return { count: tasks.length, pending, label };
}

export function WeekStrip({ selectedDate, onSelectDate, summaryForDate }: WeekStripProps) {
  const theme = useTheme();
  const today = todayKey();
  const week = buildWeek(selectedDate);

  return (
    <View style={styles.row}>
      {week.map((dateKey) => {
        const summary = summaryForDate(dateKey);
        const selected = dateKey === selectedDate;
        const isToday = dateKey === today;
        const heading = formatDayHeading(dateKey);
        const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
          parseDateKey(dateKey),
        );
        const numberColor = selected ? theme.onAccent : isToday ? theme.accent : theme.text;
        const dotColor = summary.pending > 0 ? theme.accent : theme.success;

        return (
          <Pressable
            key={dateKey}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${heading.title}, ${heading.detail}, ${summary.label}`}
            onPress={() => onSelectDate(dateKey)}
            style={styles.day}>
            <ThemedText
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[styles.weekday, { color: theme.textSecondary }]}>
              {weekday}
            </ThemedText>
            <View style={[styles.date, selected && { backgroundColor: theme.accent }]}>
              <ThemedText style={[styles.dateNumber, { color: numberColor }]}>
                {dayNumber(dateKey)}
              </ThemedText>
            </View>
            <View style={[styles.dot, summary.count > 0 && { backgroundColor: dotColor }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  day: {
    flex: 1,
    minHeight: 72,
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  weekday: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
    textAlign: 'center',
  },
  date: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNumber: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 600,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
