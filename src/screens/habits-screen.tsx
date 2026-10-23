import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRecurringTasks } from '@/hooks/use-recurring-tasks';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringDayEntry } from '@/types/recurring-task';
import { todayKey } from '@/utils/date';
import { recurringTypeLabel, todayRecurringStatus } from '@/utils/recurring';

export function HabitsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { entries, loading, error, refresh } = useRecurringTasks();
  const today = todayKey();
  const topSpace = Platform.OS === 'web' ? Spacing.six : insets.top;
  const bottomSpace = insets.bottom + BottomTabInset + Spacing.three;
  const fabBottom = insets.bottom + Spacing.three;

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.body, { paddingTop: topSpace + Spacing.two }]}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          Habits
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Everyday tasks. Tap a habit to review it.
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
                onAction={() => router.push('/new-habit')}
              />
            }
            renderItem={({ item }) => (
              <HabitRow
                entry={item}
                today={today}
                onPress={() => router.push(`/habits/${item.task.id}`)}
              />
            )}
          />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add everyday task"
        onPress={() => router.push('/new-habit')}
        testID="add-habit-button"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: fabBottom, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText style={[styles.fabLabel, { color: theme.onAccent }]}>+</ThemedText>
      </Pressable>

    </ThemedView>
  );
}

function HabitRow({
  entry,
  today,
  onPress,
}: {
  entry: RecurringDayEntry;
  today: string;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review ${entry.task.title}`}
      onPress={onPress}
      testID={`habit-item-${entry.task.id}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
      ]}>
      <View style={styles.rowBody}>
        <ThemedText numberOfLines={2}>{entry.task.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {recurringTypeLabel(entry.task.valueType)} · {todayRecurringStatus(entry.task, entry.value, today)}
        </ThemedText>
      </View>
    </Pressable>
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
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.three,
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
