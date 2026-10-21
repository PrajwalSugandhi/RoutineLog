import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyProgress } from '@/components/daily-progress';
import { DateNavigator } from '@/components/date-navigator';
import { EmptyState } from '@/components/empty-state';
import { TaskFormModal } from '@/components/task-form-modal';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useDayTasks } from '@/hooks/use-day-tasks';
import { useTheme } from '@/hooks/use-theme';
import type { Task, TaskDraft } from '@/types/task';
import { addDays, todayKey } from '@/utils/date';

type EditorSession = { mode: 'create'; date: string } | { mode: 'edit'; task: Task };

export function TodayScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const [editor, setEditor] = useState<EditorSession | null>(null);
  const { tasks, summary, loading, error, refresh, create, update, complete, reopen, remove } =
    useDayTasks(selectedDate, selectedDate);

  const bottomSpace = insets.bottom + BottomTabInset + Spacing.three;
  const topSpace = Platform.OS === 'web' ? Spacing.six : insets.top;

  async function handleSubmit(draft: TaskDraft) {
    if (!editor) return;
    const saved = editor.mode === 'edit' ? await update(editor.task.id, draft) : await create(draft);
    setEditor(null);
    if (saved.scheduledDate !== selectedDate) setSelectedDate(saved.scheduledDate);
  }

  function handleToggle(task: Task) {
    const action = task.status === 'completed' ? reopen(task.id) : complete(task.id);
    action.catch((toggleError: unknown) => {
      Alert.alert(
        'Could not update this task',
        toggleError instanceof Error ? toggleError.message : 'Please try again.',
      );
    });
  }

  function handleDelete(task: Task) {
    Alert.alert('Delete this task?', 'It leaves this day. The archived copy keeps its history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          remove(task.id).catch((deleteError: unknown) => {
            Alert.alert(
              'Could not delete this task',
              deleteError instanceof Error ? deleteError.message : 'Please try again.',
            );
          });
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.body, { paddingTop: topSpace + Spacing.two }]}>
        <DateNavigator
          dateKey={selectedDate}
          onPrevious={() => setSelectedDate((date) => addDays(date, -1))}
          onNext={() => setSelectedDate((date) => addDays(date, 1))}
          onToday={() => setSelectedDate(todayKey())}
        />
        {loading ? (
          <ThemedText type="small" themeColor="textSecondary">
            Loading tasks...
          </ThemedText>
        ) : (
          <DailyProgress summary={summary} />
        )}
        {error && tasks.length > 0 ? (
          <View style={styles.errorRow}>
            <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
              {error}
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}>
              <ThemedText type="smallBold">Retry</ThemedText>
            </Pressable>
          </View>
        ) : null}
        {loading && tasks.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error && tasks.length === 0 ? (
          <View style={styles.loading}>
            <EmptyState
              title="Could not load tasks"
              message="Your saved tasks are still on this device. Try loading them again."
              actionLabel="Retry"
              onAction={() => void refresh()}
            />
          </View>
        ) : (
          <TaskList
            tasks={tasks}
            bottomInset={bottomSpace}
            onToggle={handleToggle}
            onPress={(task) => setEditor({ mode: 'edit', task })}
            onDelete={handleDelete}
            onAdd={() => setEditor({ mode: 'create', date: selectedDate })}
          />
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add task"
        onPress={() => setEditor({ mode: 'create', date: selectedDate })}
        testID="add-task-button"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent, bottom: bottomSpace, opacity: pressed ? 0.85 : 1 },
        ]}>
        <ThemedText style={[styles.fabLabel, { color: theme.onAccent }]}>+</ThemedText>
      </Pressable>
      <TaskFormModal session={editor} onClose={() => setEditor(null)} onSubmit={handleSubmit} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1, paddingHorizontal: Spacing.three, gap: Spacing.three },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: Spacing.two },
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
  fabLabel: { fontSize: 32, lineHeight: 34, fontWeight: 500 },
});
