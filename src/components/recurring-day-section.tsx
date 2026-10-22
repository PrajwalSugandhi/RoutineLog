import { Pressable, StyleSheet, View } from 'react-native';

import { NumericDayInput } from '@/components/numeric-day-input';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringDayEntry } from '@/types/recurring-task';
import { recurringTypeLabel } from '@/utils/recurring';

type RecurringDaySectionProps = {
  entries: RecurringDayEntry[];
  hint: string;
  onToggleBoolean: (entry: RecurringDayEntry) => void;
  onCommitNumber?: (taskId: string, value: number | null) => Promise<void>;
};

export function RecurringDaySection({
  entries,
  hint,
  onToggleBoolean,
  onCommitNumber,
}: RecurringDaySectionProps) {
  const theme = useTheme();
  if (entries.length === 0) return null;

  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">Every day</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {hint}
      </ThemedText>
      {entries.map((entry) => {
        const checked = entry.task.valueType === 'boolean' && entry.value === 1;
        return (
          <View key={entry.task.id} style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
            {entry.task.valueType === 'boolean' ? (
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${checked ? 'Clear' : 'Tick'} ${entry.task.title}`}
                onPress={() => onToggleBoolean(entry)}
                hitSlop={4}
                style={({ pressed }) => [styles.checkHit, pressed && styles.pressed]}>
                <View
                  style={[
                    styles.check,
                    {
                      borderColor: checked ? theme.success : theme.textSecondary,
                      backgroundColor: checked ? theme.success : 'transparent',
                    },
                  ]}>
                  {checked ? (
                    <ThemedText style={[styles.checkMark, { color: theme.onAccent }]}>✓</ThemedText>
                  ) : null}
                </View>
              </Pressable>
            ) : null}
            <View style={[styles.body, entry.task.valueType === 'numeric' && styles.bodyInset]}>
              <ThemedText numberOfLines={2}>{entry.task.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {recurringTypeLabel(entry.task.valueType)}
              </ThemedText>
            </View>
            {entry.task.valueType === 'numeric' && onCommitNumber ? (
              <NumericDayInput
                value={entry.value}
                accessibilityLabel={`Count for ${entry.task.title}`}
                onCommit={(value) => onCommitNumber(entry.task.id, value)}
              />
            ) : entry.task.valueType === 'numeric' ? (
              <ThemedText type="smallBold" style={styles.count}>
                {entry.value == null ? 'Not logged' : String(entry.value)}
              </ThemedText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingRight: Spacing.two,
  },
  checkHit: {
    width: 52,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
  },
  body: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.three,
  },
  bodyInset: {
    paddingLeft: Spacing.three,
  },
  count: {
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
