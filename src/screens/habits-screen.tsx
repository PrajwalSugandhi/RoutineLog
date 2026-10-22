import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { RecurringDetailModal } from '@/components/recurring-detail-modal';
import { RecurringFormModal } from '@/components/recurring-form-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRecurringTasks } from '@/hooks/use-recurring-tasks';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringDayEntry, RecurringTaskDraft } from '@/types/recurring-task';
import { todayKey } from '@/utils/date';
import { recurringTypeLabel, todayRecurringStatus } from '@/utils/recurring';

export function HabitsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { entries, loading, error, refresh, create, setTodayValue } = useRecurringTasks();
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const today = todayKey();
  const topSpace = Platform.OS === 'web' ? Spacing.six : insets.top;
  const bottomSpace = insets.bottom + BottomTabInset + Spacing.three;

  const handleChanged = useCallback(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate(draft: RecurringTaskDraft) {
    await create(draft);
    setCreating(false);
  }

  function handleToggle(entry: RecurringDayEntry) {
    if (entry.task.valueType !== 'boolean' || entry.task.startDate > today) return;
    const next = entry.value === 1 ? null : 1;
    setTodayValue(entry.task.id, next).catch((toggleError: unknown) => {
      Alert.alert(
        'Could not update this task',
        toggleError instanceof Error ? toggleError.message : 'Please try again.',
      );
    });
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.body, { paddingTop: topSpace + Spacing.two }]}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          Habits
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Everyday tasks. Open one to count a date range.
        </ThemedText>
        {error ? (
          <View style={styles.errorRow}>
            <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
              {error}
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}>
              <ThemedText type="smallBold">Retry</ThemedText>
            </Pressable>
          </View>
        ) : null}
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : (
          <FlatList
            data={entries}
            keyExtractor={(entry) => entry.task.id}
            style={styles.list}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: bottomSpace + 72 },
              entries.length === 0 && styles.emptyContent,
            ]}
            ListEmptyComponent={
              <EmptyState
                title="No everyday tasks"
                message="Add one for something you do every day, like the gym or practice questions."
                actionLabel="Add everyday task"
                onAction={() => setCreating(true)}
              />
            }
            renderItem={({ item }) => (
              <HabitRow
                entry={item}
                today={today}
                onPress={() => setOpenId(item.task.id)}
                onToggle={() => handleToggle(item)}
              />
            )}
          />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add everyday task"
        onPress={() => setCreating(true)}
        testID="add-habit-button"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: bottomSpace, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText style={[styles.fabLabel, { color: theme.onAccent }]}>+</ThemedText>
      </Pressable>

      <RecurringFormModal visible={creating} onClose={() => setCreating(false)} onSubmit={handleCreate} />
      <RecurringDetailModal taskId={openId} onClose={() => setOpenId(null)} onChanged={handleChanged} />
    </ThemedView>
  );
}

function HabitRow({
  entry,
  today,
  onPress,
  onToggle,
}: {
  entry: RecurringDayEntry;
  today: string;
  onPress: () => void;
  onToggle: () => void;
}) {
  const theme = useTheme();
  const booleanTask = entry.task.valueType === 'boolean';
  const started = entry.task.startDate <= today;
  const checked = booleanTask && entry.value === 1;

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      {booleanTask ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked, disabled: !started }}
          accessibilityLabel={`${checked ? 'Clear' : 'Tick'} ${entry.task.title} for today`}
          disabled={!started}
          onPress={onToggle}
          hitSlop={4}
          style={({ pressed }) => [styles.checkHit, pressed && started && styles.pressed]}>
          <View
            style={[
              styles.check,
              {
                borderColor: checked ? theme.success : theme.textSecondary,
                backgroundColor: checked ? theme.success : 'transparent',
                opacity: started ? 1 : 0.4,
              },
            ]}>
            {checked ? <ThemedText style={[styles.checkMark, { color: theme.onAccent }]}>✓</ThemedText> : null}
          </View>
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${entry.task.title}`}
        onPress={onPress}
        style={({ pressed }) => [
          styles.rowBody,
          !booleanTask && styles.bodyInset,
          pressed && styles.pressed,
        ]}
        testID={`habit-item-${entry.task.id}`}>
        <ThemedText numberOfLines={2}>{entry.task.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {recurringTypeLabel(entry.task.valueType)} · {todayRecurringStatus(entry.task, entry.value, today)}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
  },
  list: { flex: 1 },
  content: {
    gap: Spacing.two,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
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
  rowBody: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.three,
  },
  bodyInset: {
    paddingLeft: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabLabel: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: 500,
  },
});
