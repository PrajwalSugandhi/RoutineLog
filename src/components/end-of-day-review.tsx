import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecurringDaySection } from '@/components/recurring-day-section';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringDayEntry } from '@/types/recurring-task';
import type { Task } from '@/types/task';
import { addDays, formatDayHeading, isDateKey, parseDateKey, toDateKey } from '@/utils/date';
import {
  reviewStatusLabel,
  type ReviewStatus,
  type ReviewSummary,
} from '@/utils/review';

type EndOfDayReviewProps = {
  visible: boolean;
  dateKey: string;
  status: ReviewStatus;
  summary: ReviewSummary;
  pending: Task[];
  completed: Task[];
  moved: Task[];
  loading?: boolean;
  onClose: () => void;
  onBegin: () => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onReschedule: (taskId: string, dateKey: string) => Promise<void>;
  onFinish: () => Promise<void>;
  recurringEntries: RecurringDayEntry[];
  onSetRecurring: (taskId: string, value: number | null) => Promise<void>;
};

export function EndOfDayReview({
  visible,
  dateKey,
  status,
  summary,
  pending,
  completed,
  moved,
  loading = false,
  onClose,
  onBegin,
  onComplete,
  onReschedule,
  onFinish,
  recurringEntries,
  onSetRecurring,
}: EndOfDayReviewProps) {
  const theme = useTheme();
  const heading = formatDayHeading(dateKey);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [keptIds, setKeptIds] = useState<string[]>([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [dateText, setDateText] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setActionError(null);
    setKeptIds([]);
    setMovingTaskId(null);
    setPickerOpen(false);
    setDateText(addDays(dateKey, 1));
    onBegin().catch((error: unknown) => {
      setActionError(error instanceof Error ? error.message : 'Could not open this review.');
    });
  }, [visible, dateKey, onBegin]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Could not update this review.');
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    if (summary.pending === 0) {
      void run(onFinish);
      return;
    }
    const countLabel = summary.pending === 1 ? '1 task stays' : `${summary.pending} tasks stay`;
    Alert.alert(
      'Finish with unfinished tasks?',
      `${countLabel} on this day until you complete or move them.`,
      [
        { text: 'Keep reviewing', style: 'cancel' },
        { text: 'Finish review', onPress: () => void run(onFinish) },
      ],
    );
  }

  async function moveToDate(taskId: string, nextDate: string) {
    if (!isDateKey(nextDate)) {
      setActionError('Choose a valid date in YYYY-MM-DD format.');
      return;
    }
    if (nextDate === dateKey) {
      setActionError('Choose a different date. This task is already on this day.');
      return;
    }
    await run(async () => {
      await onReschedule(taskId, nextDate);
      setMovingTaskId(null);
      setPickerOpen(false);
    });
  }

  const finished =
    status === 'completed_clear' || status === 'completed_with_unresolved';
  const finishLabel =
    summary.pending === 0
      ? status === 'completed_clear'
        ? 'Review finished'
        : 'Finish review'
      : summary.pending === 1
        ? 'Finish with 1 still open'
        : `Finish with ${summary.pending} still open`;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.safeArea}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={onClose} style={styles.headerButton}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Close
              </ThemedText>
            </Pressable>
            <ThemedText type="smallBold">End-of-day review</ThemedText>
            <View style={styles.headerButton} />
          </View>

          <ScrollView
            style={styles.safeArea}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}>
            <View>
              <ThemedText accessibilityRole="header" style={styles.title}>
                {heading.title}
              </ThemedText>
              <ThemedText themeColor="textSecondary">{heading.detail}</ThemedText>
              <ThemedText type="small" style={{ color: statusColor(theme, status) }}>
                {reviewStatusLabel(status, summary.pending)}
              </ThemedText>
            </View>

            <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
              <SummaryLine label="Planned" value={summary.planned} />
              <SummaryLine label="Completed" value={summary.completed} />
              <SummaryLine label="Still open" value={summary.pending} />
              {finished || summary.movedToTomorrow > 0 ? (
                <SummaryLine label="Moved to tomorrow" value={summary.movedToTomorrow} />
              ) : null}
              {finished || summary.movedToOther > 0 ? (
                <SummaryLine label="Moved to another date" value={summary.movedToOther} />
              ) : null}
            </View>

            <RecurringDaySection
              entries={recurringEntries}
              hint="Tick a yes/no day, or enter how many you did. A blank number counts as zero and does not change this review."
              onToggleBoolean={(entry) =>
                void run(() => onSetRecurring(entry.task.id, entry.value === 1 ? null : 1))
              }
              onCommitNumber={onSetRecurring}
            />

            <View style={styles.section}>
              <ThemedText type="smallBold">Tasks to review</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                A task stays on this day unless you mark it done or choose a new date.
              </ThemedText>
              {loading ? (
                <ThemedText themeColor="textSecondary">Loading review...</ThemedText>
              ) : pending.length === 0 ? (
                <ThemedText themeColor="textSecondary">Nothing left to review.</ThemedText>
              ) : (
                pending.map((task) => (
                  <View key={task.id} style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
                    <ThemedText>{task.title}</ThemedText>
                    {keptIds.includes(task.id) ? (
                      <ThemedText type="small" themeColor="textSecondary">
                        Left on this day. The review stays incomplete until you finish it.
                      </ThemedText>
                    ) : null}
                    <View style={styles.actions}>
                      <ActionButton
                        label="Done"
                        disabled={busy}
                        onPress={() => void run(() => onComplete(task.id))}
                      />
                      <ActionButton
                        label="Tomorrow"
                        disabled={busy}
                        onPress={() => void run(() => onReschedule(task.id, addDays(dateKey, 1)))}
                      />
                      <ActionButton
                        label="Another date"
                        disabled={busy}
                        onPress={() => {
                          setMovingTaskId(task.id);
                          setDateText(addDays(dateKey, 1));
                          setPickerOpen(Platform.OS !== 'web');
                        }}
                      />
                      <ActionButton
                        label="Keep here"
                        disabled={busy}
                        onPress={() =>
                          setKeptIds((current) => (current.includes(task.id) ? current : [...current, task.id]))
                        }
                      />
                    </View>
                    {movingTaskId === task.id ? (
                      <View style={styles.moveBox}>
                        <TextInput
                          value={dateText}
                          onChangeText={setDateText}
                          autoCapitalize="none"
                          autoCorrect={false}
                          placeholder="YYYY-MM-DD"
                          placeholderTextColor={theme.textSecondary}
                          style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
                        />
                        <ActionButton
                          label="Move"
                          disabled={busy}
                          onPress={() => void moveToDate(task.id, dateText)}
                        />
                        {pickerOpen && isDateKey(dateText) ? (
                          <DateTimePicker
                            value={parseDateKey(dateText)}
                            mode="date"
                            onValueChange={(_event, date) => {
                              const nextDate = toDateKey(date);
                              setDateText(nextDate);
                              if (Platform.OS === 'android') {
                                setPickerOpen(false);
                                void moveToDate(task.id, nextDate);
                              }
                            }}
                            onDismiss={() => setPickerOpen(false)}
                          />
                        ) : null}
                        {pickerOpen && Platform.OS === 'ios' ? (
                          <ActionButton label="Use this date" disabled={busy} onPress={() => void moveToDate(task.id, dateText)} />
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ))
              )}
            </View>

            {actionError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {actionError}
              </ThemedText>
            ) : null}

            <ToggleSection
              title={`Completed (${completed.length})`}
              open={showCompleted}
              onPress={() => setShowCompleted((open) => !open)}
            >
              {completed.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  None yet.
                </ThemedText>
              ) : (
                completed.map((task) => (
                  <ThemedText key={task.id} themeColor="textSecondary">
                    {task.title}
                  </ThemedText>
                ))
              )}
            </ToggleSection>

            {moved.length > 0 ? (
              <View style={styles.section}>
                <ThemedText type="smallBold">Moved away</ThemedText>
                {moved.map((task) => (
                  <ThemedText key={task.id} type="small" themeColor="textSecondary">
                    {task.title} · {formatDayHeading(task.scheduledDate).detail}
                  </ThemedText>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <Pressable
              accessibilityRole="button"
              disabled={busy || (status === 'completed_clear' && summary.pending === 0)}
              onPress={finish}
              style={({ pressed }) => [
                styles.finish,
                {
                  backgroundColor: theme.accent,
                  opacity:
                    busy || (status === 'completed_clear' && summary.pending === 0) ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                {busy ? 'Saving...' : finishLabel}
              </ThemedText>
            </Pressable>
          </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
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

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.background, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

function ToggleSection({
  title,
  open,
  onPress,
  children,
}: {
  title: string;
  open: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onPress} style={styles.toggle}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {open ? 'Hide' : 'Show'}
        </ThemedText>
      </Pressable>
      {open ? (
        <View style={[styles.completedList, { backgroundColor: theme.backgroundElement }]}>{children}</View>
      ) : null}
    </View>
  );
}

function statusColor(
  theme: { success: string; medium: string; textSecondary: string },
  status: ReviewStatus,
): string {
  if (status === 'completed_clear') return theme.success;
  if (status === 'completed_with_unresolved' || status === 'in_progress') return theme.medium;
  return theme.textSecondary;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    minWidth: 72,
    minHeight: 44,
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
  },
  summary: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  summaryLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.two,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  action: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveBox: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  toggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedList: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  finish: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
