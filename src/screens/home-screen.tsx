import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { MonthCalendar } from "@/components/month-calendar";
import { RecurringDaySection } from "@/components/recurring-day-section";
import { TaskForm } from "@/components/task-form";
import { TaskList } from "@/components/task-list";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { HomeHeader } from "@/components/home-header";
import { summarizeTasksForWeek, WeekStrip } from "@/components/week-strip";
import { Spacing } from "@/constants/theme";
import { useDayReview } from "@/hooks/use-day-review";
import { useDayTasks } from "@/hooks/use-day-tasks";
import { useRecurringDay } from "@/hooks/use-recurring-day";
import { useTheme } from "@/hooks/use-theme";
import type { RecurringDayEntry } from "@/types/recurring-task";
import type { Task, TaskDraft } from "@/types/task";
import {
  formatMonthHeading,
  shiftVisibleDate,
  visibleRange,
  type CalendarView,
} from "@/utils/calendar";
import { formatDayHeading, isDateKey, todayKey } from "@/utils/date";
import { reviewStatusLabel } from "@/utils/review";
import { indexTasksByDate } from "@/utils/task-stats";

type EditorSession =
  | { mode: "create"; date: string }
  | { mode: "edit"; task: Task };

const SWIPE_HINT: Record<CalendarView, string> = {
  day: "Swipe left or right to change the day",
  week: "Swipe left or right to change the week",
  month: "Swipe left or right to change the month",
};

export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { focusDate } = useLocalSearchParams<{ focusDate?: string }>();
  const requestedDate = Array.isArray(focusDate) ? focusDate[0] : focusDate;
  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const [view, setView] = useState<CalendarView>("week");
  const [editor, setEditor] = useState<EditorSession | null>(null);
  const range = visibleRange(view, selectedDate);
  const {
    tasks,
    loading,
    error,
    refresh,
    update,
    complete,
    reopen,
    remove,
  } = useDayTasks(range.start, range.end);
  const review = useDayReview(selectedDate, refresh);
  const recurring = useRecurringDay(selectedDate);
  const tasksByDate = indexTasksByDate(tasks);
  const dayTasks = tasksByDate.get(selectedDate) ?? [];
  const dayHeading = formatDayHeading(selectedDate);
  const monthHeading = formatMonthHeading(selectedDate);
  const showingToday = selectedDate === todayKey();
  const title = view === "day" ? dayHeading.title : monthHeading.title;
  const detail =
    view === "day"
      ? dayHeading.detail
      : monthHeading.detail === String(new Date().getFullYear())
        ? undefined
        : monthHeading.detail;
  const habitsPending =
    recurring.loading && recurring.entries.length === 0 && !recurring.error;
  const showFreeDay =
    !loading &&
    !error &&
    !habitsPending &&
    !recurring.error &&
    dayTasks.length === 0 &&
    recurring.entries.length === 0;
  const reviewDetail = review.error
    ? review.error
    : review.loading
      ? "Loading review..."
      : reviewStatusLabel(review.status, review.summary.pending);

  const listBottomInset = insets.bottom + Spacing.three + 56 + Spacing.three;
  const fabBottom = insets.bottom + Spacing.three;
  const topSpace = Platform.OS === "web" ? Spacing.six : insets.top;

  useEffect(() => {
    if (requestedDate && isDateKey(requestedDate)) setSelectedDate(requestedDate);
  }, [requestedDate]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void review.refresh();
    }, [refresh, review.refresh]),
  );

  const shiftDate = useCallback(
    (direction: -1 | 1) => {
      setSelectedDate((date) => shiftVisibleDate(view, date, direction));
    },
    [view],
  );

  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_event, gesture) =>
          Math.abs(gesture.dx) > 24 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
        onPanResponderRelease: (_event, gesture) => {
          if (gesture.dx <= -48) shiftDate(1);
          else if (gesture.dx >= 48) shiftDate(-1);
        },
      }),
    [shiftDate],
  );

  function openNewTask() {
    router.push({ pathname: "/new-task", params: { date: selectedDate } });
  }

  async function handleSubmit(draft: TaskDraft) {
    if (!editor || editor.mode !== "edit") return;
    const saved = await update(editor.task.id, draft);
    setEditor(null);
    if (saved.scheduledDate !== selectedDate) {
      setSelectedDate(saved.scheduledDate);
    }
  }

  function handleToggle(task: Task) {
    const action =
      task.status === "completed" ? reopen(task.id) : complete(task.id);
    action.catch((toggleError: unknown) => {
      Alert.alert(
        "Could not update this task",
        toggleError instanceof Error
          ? toggleError.message
          : "Please try again.",
      );
    });
  }

  function handleRecurringToggle(entry: RecurringDayEntry) {
    if (entry.task.valueType !== "boolean") return;
    const next = entry.value === 1 ? null : 1;
    recurring.setValue(entry.task.id, next).catch((toggleError: unknown) => {
      Alert.alert(
        "Could not update this habit",
        toggleError instanceof Error
          ? toggleError.message
          : "Please try again.",
      );
    });
  }

  function handleDelete(task: Task) {
    Alert.alert(
      "Delete this task?",
      "It leaves this day. The archived copy keeps its history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            remove(task.id).catch((deleteError: unknown) => {
              Alert.alert(
                "Could not delete this task",
                deleteError instanceof Error
                  ? deleteError.message
                  : "Please try again.",
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
        <HomeHeader
          title={title}
          detail={detail}
          view={view}
          reviewDetail={reviewDetail}
          swipeHint={SWIPE_HINT[view]}
          swipeHandlers={swipe.panHandlers}
          onChangeView={setView}
          onReview={() =>
            router.push({
              pathname: "/end-of-day-review",
              params: { date: selectedDate },
            })
          }
          onToday={showingToday ? undefined : () => setSelectedDate(todayKey())}
          trailingInset={0}
        />
        {view === "week" ? (
          <View {...swipe.panHandlers}>
            <WeekStrip
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              summaryForDate={(dateKey) =>
                summarizeTasksForWeek(tasksByDate.get(dateKey) ?? [])
              }
            />
          </View>
        ) : null}
        {view === "month" ? (
          <View {...swipe.panHandlers}>
            <MonthCalendar
              selectedDate={selectedDate}
              tasksByDate={tasksByDate}
              onSelectDate={setSelectedDate}
            />
          </View>
        ) : null}
        {error && dayTasks.length > 0 ? (
          <View style={styles.errorRow}>
            <ThemedText type="small" style={{ color: theme.danger, flex: 1 }}>
              {error}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => void refresh()}
              style={styles.retry}
            >
              <ThemedText type="smallBold">Retry</ThemedText>
            </Pressable>
          </View>
        ) : null}
        {loading && dayTasks.length === 0 && recurring.entries.length === 0 ? (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.accent} />
          </View>
        ) : error && dayTasks.length === 0 && recurring.entries.length === 0 ? (
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
            bottomInset={listBottomInset}
            onToggle={handleToggle}
            onPress={(task) => setEditor({ mode: "edit", task })}
            onDelete={handleDelete}
            onAdd={openNewTask}
            centerEmpty={showFreeDay}
            header={showFreeDay ? null : <SectionLabel label="Tasks" />}
            empty={
              showFreeDay ? (
                <FreeDay />
              ) : error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {error}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Nothing planned for this day.
                </ThemedText>
              )
            }
            footer={
              showFreeDay ? null : (
                <View style={styles.section}>
                  <SectionLabel label="Habits" />
                  {recurring.error ? (
                    <View style={styles.errorRow}>
                      <ThemedText
                        type="small"
                        style={{ color: theme.danger, flex: 1 }}
                      >
                        {recurring.error}
                      </ThemedText>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void recurring.refresh()}
                        style={styles.retry}
                      >
                        <ThemedText type="smallBold">Retry</ThemedText>
                      </Pressable>
                    </View>
                  ) : habitsPending ? (
                    <ActivityIndicator color={theme.accent} />
                  ) : recurring.entries.length === 0 ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      No habits on this day.
                    </ThemedText>
                  ) : (
                    <RecurringDaySection
                      entries={recurring.entries}
                      showHeading={false}
                      onToggleBoolean={handleRecurringToggle}
                      onCommitNumber={recurring.setValue}
                    />
                  )}
                </View>
              )
            }
          />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add task"
        onPress={openNewTask}
        testID="add-task-button"
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.accent,
            bottom: fabBottom,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <ThemedText style={[styles.fabLabel, { color: theme.onAccent }]}>
          +
        </ThemedText>
      </Pressable>

      <TaskForm
        session={editor}
        onClose={() => setEditor(null)}
        onSubmit={handleSubmit}
      />
    </ThemedView>
  );
}

function SectionLabel({ label }: { label: string }) {
  return <ThemedText type="smallBold">{label}</ThemedText>;
}

function FreeDay() {
  const theme = useTheme();

  return (
    <View style={styles.freeDay}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={styles.art}
      >
        <View
          style={[styles.artCard, { backgroundColor: theme.backgroundElement }]}
        >
          <View style={[styles.artBand, { backgroundColor: theme.accent }]} />
          <View style={styles.artGrid}>
            {Array.from({ length: 6 }, (_, index) => (
              <View
                key={index}
                style={[
                  styles.artCell,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
      <ThemedText style={styles.freeTitle}>You have a free day</ThemedText>
      <ThemedText themeColor="textSecondary">Take it easy</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  retry: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.four,
  },
  freeDay: {
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  freeTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
    textAlign: "center",
  },
  art: {
    marginBottom: Spacing.three,
  },
  artCard: {
    width: 120,
    height: 104,
    borderRadius: 16,
    overflow: "hidden",
  },
  artBand: {
    height: 24,
  },
  artGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    padding: Spacing.three,
    alignContent: "center",
    justifyContent: "center",
  },
  artCell: {
    width: 22,
    height: 14,
    borderRadius: 3,
  },
  fab: {
    position: "absolute",
    right: Spacing.three,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  fabLabel: {
    fontSize: 32,
    lineHeight: 34,
    fontWeight: 500,
  },
});
