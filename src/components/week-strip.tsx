import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task } from '@/types/task';
import { buildWeek, dayNumber } from '@/utils/calendar';
import { formatDayHeading, parseDateKey, todayKey } from '@/utils/date';

type WeekStripProps = {
  selectedDate: string;
  tasksByDate: Map<string, Task[]>;
  onSelectDate: (dateKey: string) => void;
};

export function WeekStrip({ selectedDate, tasksByDate, onSelectDate }: WeekStripProps) {
  const theme = useTheme();
  const today = todayKey();
  const week = buildWeek(selectedDate);

  return (
    <View style={styles.row}>
      {week.map((dateKey) => {
        const tasks = tasksByDate.get(dateKey) ?? [];
        const pending = tasks.filter((task) => task.status === 'pending').length;
        const selected = dateKey === selectedDate;
        const isToday = dateKey === today;
        const heading = formatDayHeading(dateKey);
        const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' }).format(
          parseDateKey(dateKey),
        );
        const taskLabel =
          tasks.length === 0
            ? 'no tasks'
            : pending === 0
              ? `${tasks.length} complete`
              : `${tasks.length} tasks, ${pending} unfinished`;

        return (
          <Pressable
            key={dateKey}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${heading.title}, ${heading.detail}, ${taskLabel}`}
            onPress={() => onSelectDate(dateKey)}
            style={[
              styles.day,
              { backgroundColor: selected ? theme.accent : theme.backgroundElement },
              isToday && !selected && { borderColor: theme.accent, borderWidth: 2 },
            ]}>
            <ThemedText
              type="small"
              style={{ color: selected ? theme.onAccent : theme.textSecondary }}>
              {weekday}
            </ThemedText>
            <ThemedText type="smallBold" style={{ color: selected ? theme.onAccent : theme.text }}>
              {dayNumber(dateKey)}
            </ThemedText>
            {tasks.length === 0 ? (
              <View style={styles.countSpacer} />
            ) : (
              <ThemedText
                style={[
                  styles.count,
                  { color: selected ? theme.onAccent : pending > 0 ? theme.medium : theme.success },
                ]}>
                {tasks.length}
              </ThemedText>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  day: {
    flex: 1,
    minHeight: 72,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: Spacing.one,
  },
  count: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
  countSpacer: {
    height: 14,
  },
});
