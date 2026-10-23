import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { HabitActionsModal, type HabitMenuAnchor } from '@/components/habit-actions-modal';
import { HabitEditModal } from '@/components/habit-edit-modal';
import { HabitReviewModal } from '@/components/habit-review-modal';
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
  const { entries, loading, error, refresh, create } = useRecurringTasks();
  const [creating, setCreating] = useState(false);
  const [menu, setMenu] = useState<{ id: string; anchor: HabitMenuAnchor } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
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

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.body, { paddingTop: topSpace + Spacing.two }]}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          Habits
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Everyday tasks. Use the menu on a habit to edit it or review a date range.
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
                onMenu={(anchor) => setMenu({ id: item.task.id, anchor })}
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
      <HabitActionsModal
        visible={menu != null}
        anchor={menu?.anchor ?? null}
        onClose={() => setMenu(null)}
        onEdit={() => {
          setEditId(menu?.id ?? null);
          setMenu(null);
        }}
        onReview={() => {
          setReviewId(menu?.id ?? null);
          setMenu(null);
        }}
      />
      <HabitEditModal taskId={editId} onClose={() => setEditId(null)} onChanged={handleChanged} />
      <HabitReviewModal taskId={reviewId} onClose={() => setReviewId(null)} onChanged={handleChanged} />
    </ThemedView>
  );
}

function HabitRow({
  entry,
  today,
  onMenu,
}: {
  entry: RecurringDayEntry;
  today: string;
  onMenu: (anchor: HabitMenuAnchor) => void;
}) {
  const theme = useTheme();
  const menuAnchorRef = useRef<View>(null);

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
        <View style={[styles.rowBody, styles.bodyInset]} testID={`habit-item-${entry.task.id}`}>
          <ThemedText numberOfLines={2}>{entry.task.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {recurringTypeLabel(entry.task.valueType)} · {todayRecurringStatus(entry.task, entry.value, today)}
          </ThemedText>
        </View>
        <View ref={menuAnchorRef} collapsable={false}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More options for ${entry.task.title}`}
            onPress={() => {
              menuAnchorRef.current?.measureInWindow((x, y, width, height) => {
                onMenu({ x, y, width, height });
              });
            }}
            hitSlop={4}
            testID={`habit-menu-${entry.task.id}`}
            style={({ pressed }) => [styles.menuHit, pressed && styles.pressed]}>
            <ThemedText accessibilityElementsHidden importantForAccessibility="no" style={styles.menuIcon}>
              ⋮
            </ThemedText>
          </Pressable>
        </View>
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
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.three,
  },
  bodyInset: {
    paddingLeft: Spacing.three,
  },
  menuHit: {
    width: 48,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: 700,
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
