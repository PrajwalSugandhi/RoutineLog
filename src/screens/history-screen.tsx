import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateNavigator } from '@/components/date-navigator';
import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useHistory } from '@/hooks/use-history';
import { useTheme } from '@/hooks/use-theme';
import { buildWeek } from '@/utils/calendar';
import { addDays, formatDayHeading, todayKey } from '@/utils/date';
import {
  buildDayInspection,
  checkedOffOn,
  completionLabel,
  rescheduleCount,
  type HistoryTask,
} from '@/utils/history';
import { reviewStatusLabel } from '@/utils/review';

export function HistoryScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { bundle, loading, error, refresh } = useHistory();
  const [selectedDate, setSelectedDate] = useState(() => todayKey());
  const today = todayKey();
  const thisWeek = buildWeek(today);
  const selectedWeek = buildWeek(selectedDate);

  const inspection = useMemo(
    () => (bundle ? buildDayInspection(selectedDate, bundle.tasks, bundle.events) : null),
    [bundle, selectedDate],
  );
  const weekInspections = useMemo(
    () =>
      bundle
        ? selectedWeek.map((dateKey) => ({
            dateKey,
            inspection: buildDayInspection(dateKey, bundle.tasks, bundle.events),
          }))
        : [],
    [bundle, selectedWeek],
  );
  const postponed = useMemo(
    () =>
      bundle
        ? bundle.tasks
            .filter((task) => task.postponedCount > 0)
            .sort((left, right) => right.postponedCount - left.postponedCount || left.title.localeCompare(right.title))
        : [],
    [bundle],
  );
  const review = bundle?.reviews.find((item) => item.date === selectedDate) ?? null;
  const heading = formatDayHeading(selectedDate);
  const topSpace = Platform.OS === 'web' ? Spacing.six : insets.top;
  const bottomSpace = insets.bottom + BottomTabInset + Spacing.three;

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topSpace + Spacing.two, paddingBottom: bottomSpace },
        ]}>
        <ThemedText accessibilityRole="header" style={styles.title}>
          History
        </ThemedText>
        <DateNavigator
          dateKey={selectedDate}
          view="day"
          showBrand={false}
          onPrevious={() => setSelectedDate((date) => addDays(date, -1))}
          onNext={() => setSelectedDate((date) => addDays(date, 1))}
          onToday={() => setSelectedDate(todayKey())}
        />

        {loading ? (
          <ActivityIndicator color={theme.accent} />
        ) : error ? (
          <EmptyState title="Could not load history" message={error} actionLabel="Retry" onAction={() => void refresh()} />
        ) : bundle && inspection ? (
          <>
            <View style={styles.metrics}>
              <Metric label="Checked off today" value={String(checkedOffOn(bundle.events, [today]))} />
              <Metric label="Checked off this week" value={String(checkedOffOn(bundle.events, thisWeek))} />
              <Metric
                label="Still open"
                value={String(bundle.tasks.filter((task) => task.status === 'pending').length)}
              />
              <Metric label="Postponed" value={String(postponed.length)} />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold">
                {selectedWeek.includes(today) ? 'This week' : 'Selected week'}
              </ThemedText>
              <View style={styles.weekRow}>
                {weekInspections.map(({ dateKey, inspection: day }) => {
                  const selected = dateKey === selectedDate;
                  const dayNumber = Number(dateKey.slice(8));
                  return (
                    <Pressable
                      key={dateKey}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${formatDayHeading(dateKey).detail}, ${completionLabel(day.completedCount, day.planned)}`}
                      onPress={() => setSelectedDate(dateKey)}
                      style={[
                        styles.weekDay,
                        { backgroundColor: selected ? theme.accent : theme.backgroundElement },
                      ]}>
                      <ThemedText type="smallBold" style={{ color: selected ? theme.onAccent : theme.text }}>
                        {dayNumber}
                      </ThemedText>
                      <ThemedText
                        style={[styles.weekRate, { color: selected ? theme.onAccent : theme.textSecondary }]}>
                        {day.planned === 0 ? '–' : `${Math.round((day.rate ?? 0) * 100)}%`}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">
                {heading.title} · {heading.detail}
              </ThemedText>
              <ThemedText>{completionLabel(inspection.completedCount, inspection.planned)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {review ? `Review ${reviewStatusLabel(review.status, inspection.pending.length).toLowerCase()}` : 'Review not started'}
              </ThemedText>
            </View>

            <TaskSection title="Still pending" tasks={inspection.pending} empty="Nothing is still waiting on this day.">
              {(task) => <TaskMeta task={task} events={bundle.events} />}
            </TaskSection>
            <TaskSection
              title="Completed for this day"
              tasks={inspection.completed}
              empty="Nothing was completed for this day.">
              {(task) => (
                <ThemedText type="small" themeColor="textSecondary">
                  {task.scheduledDate === selectedDate
                    ? 'Still on this day'
                    : `Now on ${formatDayHeading(task.scheduledDate).detail}`}
                </ThemedText>
              )}
            </TaskSection>
            <TaskSection title="Moved away" tasks={inspection.movedAway} empty="Nothing was moved off this day.">
              {(task) => (
                <ThemedText type="small" themeColor="textSecondary">
                  Now on {formatDayHeading(task.scheduledDate).detail}
                  {task.originalScheduledDate !== task.scheduledDate
                    ? ` · first planned ${formatDayHeading(task.originalScheduledDate).detail}`
                    : ''}
                </ThemedText>
              )}
            </TaskSection>

            <View style={styles.section}>
              <ThemedText type="smallBold">Postponed tasks</ThemedText>
              {postponed.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No task has been moved to a later day.
                </ThemedText>
              ) : (
                postponed.map((task) => (
                  <View key={task.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText>{task.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Postponed {task.postponedCount} {task.postponedCount === 1 ? 'time' : 'times'}
                      {' · '}
                      Rescheduled {rescheduleCount(bundle.events, task.id)}{' '}
                      {rescheduleCount(bundle.events, task.id) === 1 ? 'time' : 'times'}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      First planned {formatDayHeading(task.originalScheduledDate).detail} · now{' '}
                      {formatDayHeading(task.scheduledDate).detail}
                    </ThemedText>
                  </View>
                ))
              )}
            </View>
          </>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.metric, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText style={styles.metricValue}>{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function TaskSection({
  title,
  tasks,
  empty,
  children,
}: {
  title: string;
  tasks: HistoryTask[];
  empty: string;
  children: (task: HistoryTask) => ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">
        {title} ({tasks.length})
      </ThemedText>
      {tasks.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {empty}
        </ThemedText>
      ) : (
        tasks.map((task) => (
          <View key={task.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText>{task.title}</ThemedText>
            {children(task)}
          </View>
        ))
      )}
    </View>
  );
}

function TaskMeta({ task, events }: { task: HistoryTask; events: Parameters<typeof rescheduleCount>[0] }) {
  const moves = rescheduleCount(events, task.id);
  const planned =
    task.originalScheduledDate === task.scheduledDate
      ? null
      : `First planned ${formatDayHeading(task.originalScheduledDate).detail}`;
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {[moves > 0 ? `Rescheduled ${moves} ${moves === 1 ? 'time' : 'times'}` : null, planned]
        .filter(Boolean)
        .join(' · ') || 'Not rescheduled'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  metric: {
    width: '48%',
    flexGrow: 1,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  metricValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 600,
  },
  weekRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  weekDay: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRate: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
