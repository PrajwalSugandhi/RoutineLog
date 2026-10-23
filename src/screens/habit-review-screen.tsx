import { HabitHeatmap } from "@/components/habit-heatmap";
import { NumericDayInput } from "@/components/numeric-day-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useRecurringDetail } from "@/hooks/use-recurring-detail";
import { useTheme } from "@/hooks/use-theme";
import {
  formatDayHeading,
  isDateKey,
  parseDateKey,
  toDateKey,
  todayKey,
} from "@/utils/date";
import {
  clipRecurringWindow,
  defaultRecurringRange,
  habitPatternStats,
  summarizeBooleanRange,
  summarizeNumericRange,
} from "@/utils/recurring";
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type HabitReviewScreenProps = {
  taskId: string;
};

export function HabitReviewScreen({ taskId }: HabitReviewScreenProps) {
  const theme = useTheme();
  const [rangeFrom, setRangeFrom] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [seededId, setSeededId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const today = todayKey();
  const detail = useRecurringDetail(taskId, rangeFrom, today);
  const task = detail.task;

  useFocusEffect(
    useCallback(() => {
      void detail.refresh();
    }, [detail.refresh]),
  );

  useEffect(() => {
    if (!task || rangeFrom === task.startDate) return;
    setRangeFrom(task.startDate);
  }, [rangeFrom, task]);

  useEffect(() => {
    if (!task || seededId === task.id) return;
    const range = defaultRecurringRange(task.startDate, today);
    setFrom(range.from);
    setTo(range.to);
    setSeededId(task.id);
  }, [seededId, task, today]);

  useEffect(() => {
    if (!task || !isDateKey(from) || from >= task.startDate) return;
    setFrom(task.startDate);
  }, [from, task]);

  const amounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const log of detail.logs) map.set(log.logDate, log.value);
    return map;
  }, [detail.logs]);
  const stats = task ? habitPatternStats(amounts, task.startDate, today) : null;
  const totalDone = useMemo(() => {
    if (!task) return 0;
    let count = 0;
    for (const [dateKey, amount] of amounts) {
      if (amount > 0 && dateKey >= task.startDate && dateKey <= today)
        count += 1;
    }
    return count;
  }, [amounts, task, today]);
  const tracked = task ? trackedDays(task.startDate, today) : 0;
  const todayValue = amounts.get(today) ?? null;
  const todayLogged = todayValue != null && todayValue > 0;
  const notStarted = task != null && task.startDate > today;
  const notes = task?.description?.trim() ?? "";
  const patternLogs = detail.logs.map((log) => ({
    dateKey: log.logDate,
    amount: log.value,
  }));
  const datesReady = isDateKey(from) && isDateKey(to);
  const window =
    task && datesReady
      ? clipRecurringWindow(task.startDate, from, to, today)
      : null;
  const booleanSummary =
    task?.valueType === "boolean" && detail.ready
      ? summarizeBooleanRange(window, detail.logs)
      : null;
  const numericSummary =
    task?.valueType === "numeric" && detail.ready
      ? summarizeNumericRange(window, detail.logs)
      : null;
  const summary = booleanSummary ?? numericSummary;
  const logValues = new Map(detail.logs.map((log) => [log.logDate, log.value]));

  async function saveDay(dateKey: string, value: number | null) {
    if (pending) return;
    setPending(true);
    try {
      await detail.setValue(dateKey, value);
    } catch (error) {
      Alert.alert(
        "Could not update this day",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  let rangeMessage: string | null = null;
  if (seededId === task?.id) {
    if (!datesReady) {
      rangeMessage = "Use dates like YYYY-MM-DD.";
    } else if (from > to) {
      rangeMessage = "The start of the range has to be on or before the end.";
    } else if (detail.loading) {
      rangeMessage = "Loading days...";
    } else if (summary?.tooLong) {
      rangeMessage =
        "Choose a shorter range. This one is longer than 10 years.";
    } else if (summary && summary.days.length === 0) {
      rangeMessage = "No days in this range yet.";
    }
  }

  const countingLabel =
    window && summary && summary.days.length > 0
      ? window.start === window.end
        ? shortDate(window.start)
        : `${shortDate(window.start)} – ${shortDate(window.end)}`
      : null;

  const todayStatus = !task
    ? ""
    : notStarted
      ? "Starts later"
      : task.valueType === "boolean"
        ? todayLogged
          ? "Done"
          : "Pending"
        : todayValue == null
          ? "Pending"
          : String(todayValue);

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          </Pressable>
          <ThemedText numberOfLines={1} style={styles.headerTitle}>
            {task?.title ?? "Review"}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={task ? `Edit ${task.title}` : "Edit habit"}
            onPress={() => router.push(`/habits/${taskId}/edit`)}
            style={({ pressed }) => [
              styles.headerButton,
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name="edit" size={22} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {detail.error ? (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {detail.error}
            </ThemedText>
          ) : null}
          {!task || !stats ? (
            <ThemedText themeColor="textSecondary">Loading task...</ThemedText>
          ) : (
            <>
              <View
                style={[
                  styles.card,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <View style={styles.todayRow}>
                  <View style={styles.todayCopy}>
                    <ThemedText style={styles.blockTitle}>Today</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {todayStatus}
                    </ThemedText>
                  </View>
                  {task.valueType === "numeric" && !notStarted ? (
                    <NumericDayInput
                      value={todayValue}
                      accessibilityLabel={`Count for ${formatDayHeading(today).detail}`}
                      onCommit={(value) => saveDay(today, value)}
                    />
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        todayLogged ? "Clear today" : "Log today"
                      }
                      disabled={notStarted || pending}
                      onPress={() => {
                        void saveDay(today, todayLogged ? null : 1);
                      }}
                      style={({ pressed }) => [
                        styles.logButton,
                        {
                          backgroundColor: theme.success,
                          opacity:
                            notStarted || pending ? 0.5 : pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.onAccent }}
                      >
                        {todayLogged ? "Done" : "+  Log"}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
                <View
                  style={[
                    styles.track,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <View
                    style={[
                      styles.trackFill,
                      {
                        backgroundColor: theme.success,
                        width: todayLogged ? "100%" : "0%",
                      },
                    ]}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Insights</ThemedText>
                <View style={styles.insights}>
                  <Insight
                    label="Current streak"
                    value={dayCount(stats.streak)}
                  />
                  <Insight
                    label="Last 30 days"
                    value={`${stats.percentOver30}%`}
                  />
                  <Insight label="Total done" value={dayCount(totalDone)} />
                  <Insight label="Tracked" value={dayCount(tracked)} />
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>
                  Habit HeatMap
                </ThemedText>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <HabitHeatmap
                    startDate={task.startDate}
                    today={today}
                    logs={patternLogs}
                    showCaption={false}
                  />
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
                <View
                  style={[
                    styles.card,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText themeColor={notes ? "text" : "textSecondary"}>
                    {notes || "No notes yet."}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Details</ThemedText>
                <View style={styles.rangeRow}>
                  <RangeDate
                    label="From"
                    value={from}
                    minimumDate={task.startDate}
                    maximumDate={isDateKey(to) && to >= task.startDate ? to : today}
                    onChange={(next) => setFrom(next < task.startDate ? task.startDate : next)}
                  />
                  <RangeDate
                    label="To"
                    value={to}
                    minimumDate={isDateKey(from) && from >= task.startDate ? from : task.startDate}
                    maximumDate={today}
                    onChange={setTo}
                  />
                </View>
                {countingLabel ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    Counting {countingLabel}
                  </ThemedText>
                ) : null}
                {booleanSummary && booleanSummary.days.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SummaryLine
                      label="Visited"
                      value={booleanSummary.visited}
                    />
                    <SummaryLine
                      label="Not visited"
                      value={booleanSummary.notVisited}
                    />
                  </View>
                ) : null}
                {numericSummary && numericSummary.days.length > 0 ? (
                  <View
                    style={[
                      styles.card,
                      { backgroundColor: theme.backgroundElement },
                    ]}
                  >
                    <SummaryLine label="Total" value={numericSummary.total} />
                  </View>
                ) : null}
                {rangeMessage ? (
                  <ThemedText themeColor="textSecondary">
                    {rangeMessage}
                  </ThemedText>
                ) : null}
                {booleanSummary && booleanSummary.days.length > 0
                  ? booleanSummary.days.map((day) => {
                      const heading = formatDayHeading(day.dateKey);
                      return (
                        <Pressable
                          key={day.dateKey}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: day.visited }}
                          accessibilityLabel={`${day.visited ? "Clear" : "Tick"} ${heading.detail}`}
                          disabled={pending}
                          onPress={() => {
                            void saveDay(day.dateKey, day.visited ? null : 1);
                          }}
                          style={({ pressed }) => [
                            styles.dayRow,
                            {
                              backgroundColor: theme.backgroundElement,
                              opacity: pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.check,
                              {
                                borderColor: day.visited
                                  ? theme.success
                                  : theme.textSecondary,
                                backgroundColor: day.visited
                                  ? theme.success
                                  : "transparent",
                              },
                            ]}
                          >
                            {day.visited ? (
                              <ThemedText
                                style={[
                                  styles.checkMark,
                                  { color: theme.onAccent },
                                ]}
                              >
                                ✓
                              </ThemedText>
                            ) : null}
                          </View>
                          <View style={styles.dayCopy}>
                            <ThemedText>{heading.title}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {heading.detail}
                            </ThemedText>
                          </View>
                          <ThemedText type="smallBold">
                            {day.visited ? "Went" : "Didn't go"}
                          </ThemedText>
                        </Pressable>
                      );
                    })
                  : null}
                {numericSummary && numericSummary.days.length > 0
                  ? numericSummary.days.map((day) => {
                      const heading = formatDayHeading(day.dateKey);
                      const stored = logValues.get(day.dateKey);
                      return (
                        <View
                          key={day.dateKey}
                          style={[
                            styles.dayRow,
                            { backgroundColor: theme.backgroundElement },
                          ]}
                        >
                          <View style={styles.dayCopy}>
                            <ThemedText>{heading.title}</ThemedText>
                            <ThemedText type="small" themeColor="textSecondary">
                              {heading.detail}
                            </ThemedText>
                          </View>
                          <NumericDayInput
                            value={stored ?? null}
                            accessibilityLabel={`Count for ${heading.detail}`}
                            onCommit={(value) => saveDay(day.dateKey, value)}
                          />
                        </View>
                      );
                    })
                  : null}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function RangeDate({
  label,
  value,
  minimumDate,
  maximumDate,
  onChange,
}: {
  label: string;
  value: string;
  minimumDate?: string;
  maximumDate?: string;
  onChange: (value: string) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const valid = isDateKey(value);
  const date = valid ? parseDateKey(value) : new Date();
  const text = valid
    ? new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date)
    : "Choose";

  return (
    <View style={styles.rangeDate}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${text}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.rangeButton,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="small" themeColor="textSecondary">
          {label}
        </ThemedText>
        <ThemedText type="smallBold">{text}</ThemedText>
      </Pressable>
      {open ? (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === "ios" ? "compact" : "default"}
          minimumDate={isDateKey(minimumDate ?? "") ? parseDateKey(minimumDate ?? "") : undefined}
          maximumDate={isDateKey(maximumDate ?? "") ? parseDateKey(maximumDate ?? "") : undefined}
          onValueChange={(_event, next) => {
            const picked = toDateKey(next);
            const earliest = isDateKey(minimumDate ?? "") ? minimumDate ?? picked : picked;
            const latest = isDateKey(maximumDate ?? "") ? maximumDate ?? picked : picked;
            const clamped = picked < earliest ? earliest : picked > latest ? latest : picked;
            onChange(clamped);
            setOpen(false);
          }}
          onDismiss={() => setOpen(false)}
        />
      ) : null}
    </View>
  );
}

function SummaryLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.summaryLine}>
      <ThemedText>{label}</ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

function shortDate(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(parseDateKey(dateKey));
}

function Insight({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.insight, { backgroundColor: theme.backgroundElement }]}
    >
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText style={styles.insightValue}>{value}</ThemedText>
    </View>
  );
}

function dayCount(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

function trackedDays(start: string, today: string): number {
  if (start > today) return 0;
  const elapsed = parseDateKey(today).getTime() - parseDateKey(start).getTime();
  return Math.round(elapsed / 86_400_000) + 1;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    minHeight: 52,
    paddingHorizontal: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.55,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  section: {
    gap: Spacing.three,
  },
  rangeRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  rangeDate: {
    flex: 1,
  },
  rangeButton: {
    minHeight: 64,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: "center",
    gap: Spacing.half,
  },
  sectionTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 600,
  },
  card: {
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  todayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  todayCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  blockTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 600,
  },
  logButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.four,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  insights: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  insight: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: 92,
    justifyContent: "center",
  },
  insightValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.three,
  },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  dayCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  checkMark: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
  },
});
