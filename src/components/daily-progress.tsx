import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { progressLabel, type DaySummary } from '@/utils/task-stats';

type DailyProgressProps = {
  summary: DaySummary;
};

export function DailyProgress({ summary }: DailyProgressProps) {
  const theme = useTheme();
  const width = `${Math.round(summary.progress * 100)}%` as const;
  const remainingLabel =
    summary.total === 0
      ? 'Add a task to plan this day.'
      : summary.remaining === 0
        ? 'Nothing left on this day.'
        : summary.remaining === 1
          ? '1 remaining'
          : `${summary.remaining} remaining`;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: Math.max(summary.total, 1), now: summary.completed }}
      style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.labels}>
        <ThemedText type="smallBold">{progressLabel(summary)}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {remainingLabel}
        </ThemedText>
      </View>
      <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.fill, { width, backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  labels: {
    gap: Spacing.half,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
