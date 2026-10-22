import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DailyProgress } from '@/components/daily-progress';
import { DateNavigator } from '@/components/date-navigator';
import { EmptyState } from '@/components/empty-state';
import { EndOfDayReview } from '@/components/end-of-day-review';
import { MonthCalendar } from '@/components/month-calendar';
import { RecurringDaySection } from '@/components/recurring-day-section';
import { TaskFormModal } from '@/components/task-form-modal';
import { TaskList } from '@/components/task-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ViewSwitcher } from '@/components/view-switcher';
import { WeekStrip } from '@/components/week-strip';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useDayReview } from '@/hooks/use-day-review';
import { useDayTasks } from '@/hooks/use-day-tasks';
import { useRecurringDay } from '@/hooks/use-recurring-day';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringDayEntry } from '@/types/recurring-task';
import type { Task, TaskDraft } from '@/types/task';
import { shiftVisibleDate, visibleRange, type CalendarView } from '@/utils/calendar';
import { formatDayHeading, todayKey } from '@/utils/date';
import { reviewStatusLabel } from '@/utils/review';
import { indexTasksByDate, summarizeDay } from '@/utils/task-stats';

type EditorSession = { mode: 'create'; date: string } | { mode: 'edit'; task: Task };

export function TodayScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const [view, setView] = useState<CalendarView>('day');
  const [editor, setEditor] = useState<EditorSession | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const range = visibleRange(view, selectedDate);
  const { tasks, loading, error, refresh, create, update, complete, reopen, remove } = useDayTasks(
    range.start,
    range.end,
  );
  const review = useDayReview(selectedDate, refresh);
  const recurring = useRecurringDay(selectedDate);
  const tasksByDate = indexTasksByDate(tasks);
  const dayTasks = tasksByDate.get(selectedDate) ?? [];
  const summary = summarizeDay(dayTasks);
  const selectedHeading = formatDayHeading(selectedDate);

  const bottomSpace = insets.bottom + BottomTabInset + Spacing.three;
  const topSpace = Platform.OS === 'web' ? Spacing.six : insets.top;

  async function handleSubmit(draft: TaskDraft) {
    if (!editor) return;
    const saved =
      editor.mode === 'edit' ? await update(editor.task.id, draft) : await create(draft);
    setEditor(null);
    if (saved.scheduledDate !== selectedDate) {
      setSelectedDate(saved.scheduledDate);
    }
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

  function handleRecurringToggle(entry: RecurringDayEntry) {
    if (entry.task.valueType !== 'boolean') return;
    const next = entry.value === 1 ? null : 1;
    recurring.setValue(entry.task.id, next).catch((toggleError: unknown) => {
      Alert.alert(
        'Could not update this task',
        toggleError instanceof Error ? toggleError.message : 'Please try again.',
      );
    });
  }

  function handleDelete(task: Task) {
    Alert.alert(
      'Delete this task?',
      'It leaves this day. The archived copy keeps its history.',
      [
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
      ],
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.body, { paddingTop: topSpace + Spacing.two }]}>
        <DateNavigator
          dateKey={selectedDate}
          view={view}
          onPrevious={() => setSelectedDate((date) => shiftVisibleDate(view, date, -1))}
          onNext={() => setSelectedDate((date) => shiftVisibleDate(view, date, 1))}
          onToday={() => setSelectedDate(todayKey())}
        />
        <ViewSwitcher value={view} onChange={setView} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Review this day"
          onPress={() => setReviewOpen(true)}
          style={({ pressed }) => [
            styles.reviewButton,
            { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold">Review this day</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {review.error
              ? review.error
              : review.loading
                ? 'Loading review...'
                : reviewStatusLabel(review.status, review.summary.pending)}
          </ThemedText>
        </Pressable>
        {view === 'week' ? (
          <WeekStrip
            selectedDate={selectedDate}
            tasksByDate={tasksByDate}
            onSelectDate={setSelectedDate}
          />
        ) : null}
        {view === 'month' ? (
          <MonthCalendar
            selectedDate={selectedDate}
            tasksByDate={tasksByDate}
            onSelectDate={setSelectedDate}
          />
        ) : null}
        {view === 'day' ? null : (
          <ThemedText type="smallBold">
            {selectedHeading.title} · {selectedHeading.detail}
          </ThemedText>
        )}
        {loading ? (
          <ThemedText type="small" themeColor="textSecondary">
            Loading tasks...
          </ThemedText>
        ) : (
          <DailyProgress summary={summary} />
        )}
        {error && dayTasks.length > 0 ? (
          <View style={styles.errorRow}>
            <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
              {error}
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retry}>
              <ThemedText type="smallBold">Retry</ThemedText>
            </Pressable>
          </View>
        ) : null}
        {loading && dayTasks.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error && dayTasks.length === 0 ? (
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
            tasks={dayTasks}
            bottomInset={bottomSpace}
            onToggle={handleToggle}
            onPress={(task) => setEditor({ mode: 'edit', task })}
            onDelete={handleDelete}
            onAdd={() => setEditor({ mode: 'create', date: selectedDate })}
            footer={
              recurring.entries.length > 0 || recurring.error ? (
                <View style={styles.recurringFooter}>
                  {recurring.error ? (
                    <View style={styles.errorRow}>
                      <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
                        {recurring.error}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void recurring.refresh()}
                        style={styles.retry}>
                        <ThemedText type="smallBold">Retry</ThemedText>
                      </Pressable>
                    </View>
                  ) : null}
                  <RecurringDaySection
                    entries={recurring.entries}
                    hint="Yes/no ticks here. Enter a number in the review, or open the task in Habits."
                    onToggleBoolean={handleRecurringToggle}
                  />
                </View>
              ) : null
            }
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
          {
            backgroundColor: theme.accent,
            bottom: bottomSpace,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <ThemedText style={[styles.fabLabel, { color: theme.onAccent }]}>+</ThemedText>
      </Pressable>

      <TaskFormModal session={editor} onClose={() => setEditor(null)} onSubmit={handleSubmit} />
      <EndOfDayReview
        visible={reviewOpen}
        dateKey={selectedDate}
        status={review.status}
        summary={review.summary}
        pending={review.tasksOnDate.filter((task) => task.status === 'pending')}
        completed={review.tasksOnDate.filter((task) => task.status === 'completed')}
        moved={review.movedTasks}
        loading={review.loading}
        onClose={() => setReviewOpen(false)}
        onBegin={review.begin}
        onComplete={review.complete}
        onReschedule={review.reschedule}
        onFinish={review.finish}
        recurringEntries={recurring.entries}
        onSetRecurring={recurring.setValue}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
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
  recurringFooter: {
    gap: Spacing.two,
  },
  reviewButton: {
    minHeight: 56,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: Spacing.half,
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
