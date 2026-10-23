import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildHabitHeatmap, habitPatternLabel, habitPatternStats } from '@/utils/recurring';

type HabitLog = {
  dateKey: string;
  amount: number;
};

type HabitHeatmapProps = {
  startDate: string;
  today: string;
  logs: readonly HabitLog[];
  showCaption?: boolean;
};

const GAP = 3;
const CELL = 12;
const MONTH_GAP = 14;

export function HabitHeatmap({ startDate, today, logs, showCaption = true }: HabitHeatmapProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const amounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) map.set(log.dateKey, log.amount);
    return map;
  }, [logs]);
  const months = useMemo(
    () => buildHabitHeatmap(startDate, today, amounts),
    [amounts, startDate, today],
  );
  const label = habitPatternLabel(habitPatternStats(amounts, startDate, today));
  const empty = theme.background === '#000000' ? '#3A3D42' : '#D5D5DA';

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [months.length]);

  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={styles.block}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        <View style={styles.months}>
          {months.map((month) => (
            <View
              key={month.key}
              accessibilityLabel={`${month.label} ${month.year}`}
              style={styles.month}>
              <View style={[styles.grid, { gap: GAP }]}>
                {month.weeks.map((week, weekIndex) => (
                  <View key={`${month.key}-${weekIndex}`} style={{ width: CELL, gap: GAP }}>
                    {week.map((day, dayIndex) => {
                      if (!day.dateKey) {
                        return <View key={`${month.key}-pad-${weekIndex}-${dayIndex}`} style={styles.cell} />;
                      }
                      const started = day.dateKey >= startDate && day.dateKey <= today;
                      const done = started && day.amount > 0;
                      const pendingToday = day.dateKey === today && started && !done;
                      return (
                        <View
                          key={day.dateKey}
                          style={[
                            styles.cell,
                            {
                              backgroundColor: done ? theme.success : pendingToday ? 'transparent' : empty,
                              borderWidth: pendingToday ? 1.5 : 0,
                              borderColor: theme.textSecondary,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
              <ThemedText themeColor="textSecondary" style={styles.monthLabel}>
                {month.label}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>
      {showCaption ? (
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  months: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: MONTH_GAP,
  },
  month: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 3,
  },
  monthLabel: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
});
