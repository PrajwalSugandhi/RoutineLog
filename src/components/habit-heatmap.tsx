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
};

const GAP = 3;
const CELL = 11;

export function HabitHeatmap({ startDate, today, logs }: HabitHeatmapProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const amounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of logs) map.set(log.dateKey, log.amount);
    return map;
  }, [logs]);
  const weeks = useMemo(
    () => buildHabitHeatmap(startDate, today, amounts),
    [amounts, startDate, today],
  );
  const label = habitPatternLabel(habitPatternStats(amounts, startDate, today));
  const empty = theme.background === '#000000' ? '#3A3D42' : '#D5D5DA';
  const stride = CELL + GAP;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: false });
  }, [weeks.length]);

  return (
    <View accessibilityRole="image" accessibilityLabel={label} style={styles.block}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}>
        <View>
          <View style={[styles.monthRow, { width: Math.max(weeks.length, 1) * stride }]}>
            {weeks.map((week, index) =>
              week.monthLabel ? (
                <ThemedText
                  key={week.days[0]?.dateKey ?? index}
                  themeColor="textSecondary"
                  style={[styles.monthLabel, { left: index * stride }]}>
                  {week.monthLabel}
                </ThemedText>
              ) : null,
            )}
          </View>
          <View style={[styles.grid, { gap: GAP }]}>
            {weeks.map((week) => (
              <View key={week.days[0]?.dateKey} style={{ width: CELL, gap: GAP }}>
                {week.days.map((day) => {
                  const started = day.dateKey >= startDate;
                  const done = started && day.amount > 0;
                  const pendingToday = day.dateKey === today && started && !done;
                  return (
                    <View
                      key={day.dateKey}
                      style={{
                        width: CELL,
                        height: CELL,
                        borderRadius: CELL / 2,
                        backgroundColor: done ? theme.success : pendingToday ? 'transparent' : empty,
                        borderWidth: pendingToday ? 1.5 : 0,
                        borderColor: theme.textSecondary,
                      }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  monthRow: {
    height: 16,
    marginBottom: Spacing.one,
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
    width: 72,
    fontSize: 11,
    lineHeight: 14,
  },
  grid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
