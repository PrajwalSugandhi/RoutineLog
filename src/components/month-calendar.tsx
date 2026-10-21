import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task } from '@/types/task';
import { buildMonthGrid, dayNumber, weekdayLabels } from '@/utils/calendar';
import { formatDayHeading, todayKey } from '@/utils/date';

type MonthCalendarProps = {
  selectedDate: string;
  tasksByDate: Map<string, Task[]>;
  onSelectDate: (dateKey: string) => void;
};

export function MonthCalendar({ selectedDate, tasksByDate, onSelectDate }: MonthCalendarProps) {
  const theme = useTheme();
  const today = todayKey();
  const weeks = buildMonthGrid(selectedDate);
  const labels = weekdayLabels();

  return (
    <View style={styles.grid}>
      <View style={styles.weekRow}>
        {labels.map((label, index) => (
          <ThemedText key={`${label}-${index}`} type="small" themeColor="textSecondary" style={styles.weekday}>
            {label}
          </ThemedText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].dateKey} style={styles.weekRow}>
          {week.map((cell) => {
            const tasks = tasksByDate.get(cell.dateKey) ?? [];
            const pending = tasks.filter((task) => task.status === 'pending').length;
            const selected = cell.dateKey === selectedDate;
            const isToday = cell.dateKey === today;
            const heading = formatDayHeading(cell.dateKey);
            const taskLabel =
              tasks.length === 0
                ? 'no tasks'
                : pending === 0
                  ? `${tasks.length} complete`
                  : `${tasks.length} tasks, ${pending} unfinished`;

            return (
              <Pressable
                key={cell.dateKey}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${heading.title}, ${heading.detail}, ${taskLabel}`}
                onPress={() => onSelectDate(cell.dateKey)}
                style={[
                  styles.cell,
                  selected && { backgroundColor: theme.accent },
                  isToday && !selected && { borderColor: theme.accent, borderWidth: 2 },
                ]}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selected ? theme.onAccent : cell.inMonth ? theme.text : theme.textSecondary,
                  }}>
                  {dayNumber(cell.dateKey)}
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
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: Spacing.one,
  },
  weekRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
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
