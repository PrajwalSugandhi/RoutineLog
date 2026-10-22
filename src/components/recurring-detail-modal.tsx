import { useEffect, useState } from 'react';
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

import { DateKeyField } from '@/components/date-key-field';
import { NumericDayInput } from '@/components/numeric-day-input';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRecurringDetail } from '@/hooks/use-recurring-detail';
import { useTheme } from '@/hooks/use-theme';
import { formatDayHeading, isDateKey, parseDateKey, todayKey } from '@/utils/date';
import {
  clipRecurringWindow,
  defaultRecurringRange,
  recurringTypeLabel,
  summarizeBooleanRange,
  summarizeNumericRange,
} from '@/utils/recurring';

type RecurringDetailModalProps = {
  taskId: string | null;
  onClose: () => void;
  onChanged: () => void;
};

export function RecurringDetailModal({ taskId, onClose, onChanged }: RecurringDetailModalProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [seededId, setSeededId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const detail = useRecurringDetail(taskId, from, to, onChanged);
  const task = detail.task;
  const today = todayKey();

  useEffect(() => {
    if (taskId) return;
    setSeededId(null);
    setFormError(null);
    setSaving(false);
    setPendingDate(null);
  }, [taskId]);

  useEffect(() => {
    if (!task || seededId === task.id) return;
    const range = defaultRecurringRange(task.startDate, todayKey());
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStartDate(task.startDate);
    setFrom(range.from);
    setTo(range.to);
    setFormError(null);
    setSeededId(task.id);
  }, [seededId, task]);

  const datesReady = isDateKey(from) && isDateKey(to);
  const window =
    task && datesReady ? clipRecurringWindow(task.startDate, from, to, today) : null;
  const booleanSummary =
    task?.valueType === 'boolean' && detail.ready
      ? summarizeBooleanRange(window, detail.logs)
      : null;
  const numericSummary =
    task?.valueType === 'numeric' && detail.ready
      ? summarizeNumericRange(window, detail.logs)
      : null;
  const summary = booleanSummary ?? numericSummary;
  const logValues = new Map(detail.logs.map((log) => [log.logDate, log.value]));

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      await detail.update({ title, description, startDate });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this task.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete this everyday task?', 'It leaves your list. The saved days stay on this phone, hidden.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void detail.remove().then(onClose).catch((error: unknown) => {
            Alert.alert(
              'Could not delete this task',
              error instanceof Error ? error.message : 'Please try again.',
            );
          });
        },
      },
    ]);
  }

  async function toggleDay(dateKey: string, visited: boolean) {
    if (pendingDate) return;
    setPendingDate(dateKey);
    try {
      await detail.setValue(dateKey, visited ? null : 1);
    } catch (error) {
      Alert.alert(
        'Could not update this day',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setPendingDate(null);
    }
  }

  let rangeMessage: string | null = null;
  if (seededId === task?.id) {
    if (!datesReady) {
      rangeMessage = 'Use dates like YYYY-MM-DD.';
    } else if (from > to) {
      rangeMessage = 'The start of the range has to be on or before the end.';
    } else if (detail.loading) {
      rangeMessage = 'Loading days...';
    } else if (summary?.tooLong) {
      rangeMessage = 'Choose a shorter range. This one is longer than 10 years.';
    } else if (summary && summary.days.length === 0) {
      rangeMessage = 'No days in this range yet.';
    }
  }

  const countingLabel =
    window && summary && summary.days.length > 0
      ? window.start === window.end
        ? shortDate(window.start)
        : `${shortDate(window.start)} – ${shortDate(window.end)}`
      : null;

  return (
    <Modal visible={taskId != null} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={styles.headerButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Close
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">Every day</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete everyday task"
                onPress={handleDelete}
                style={[styles.headerButton, styles.headerEnd]}>
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  Delete
                </ThemedText>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              {detail.error ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {detail.error}
                </ThemedText>
              ) : null}
              {!task ? (
                <ThemedText themeColor="textSecondary">Loading task...</ThemedText>
              ) : (
                <>
                  <View style={styles.field}>
                    <ThemedText type="smallBold">Title</ThemedText>
                    <TextInput
                      value={title}
                      onChangeText={setTitle}
                      maxLength={200}
                      style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                    />
                  </View>
                  <View style={styles.field}>
                    <ThemedText type="smallBold">Notes</ThemedText>
                    <TextInput
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Optional details"
                      placeholderTextColor={theme.textSecondary}
                      maxLength={4000}
                      multiline
                      textAlignVertical="top"
                      style={[
                        styles.input,
                        styles.notes,
                        { color: theme.text, backgroundColor: theme.backgroundElement },
                      ]}
                    />
                  </View>
                  <View style={styles.field}>
                    <ThemedText type="smallBold">Type</ThemedText>
                    <ThemedText>{recurringTypeLabel(task.valueType)}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      This stays fixed.
                    </ThemedText>
                  </View>
                  <DateKeyField label="Starts" value={startDate} onChange={setStartDate} />
                  {formError ? (
                    <ThemedText type="small" style={{ color: theme.danger }}>
                      {formError}
                    </ThemedText>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Save changes"
                    disabled={saving || title.trim().length === 0}
                    onPress={() => {
                      void handleSave();
                    }}
                    style={({ pressed }) => [
                      styles.saveButton,
                      {
                        backgroundColor: theme.accent,
                        opacity: saving || title.trim().length === 0 ? 0.5 : pressed ? 0.85 : 1,
                      },
                    ]}>
                    <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                      {saving ? 'Saving...' : 'Save changes'}
                    </ThemedText>
                  </Pressable>

                  <View style={styles.field}>
                    <ThemedText type="smallBold">Range</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      Days before the start date, and days after today, are left out.
                    </ThemedText>
                  </View>
                  <DateKeyField label="From" value={from} onChange={setFrom} />
                  <DateKeyField label="To" value={to} onChange={setTo} />

                  {countingLabel ? (
                    <ThemedText type="small" themeColor="textSecondary">
                      Counting {countingLabel}
                    </ThemedText>
                  ) : null}

                  {booleanSummary && booleanSummary.days.length > 0 ? (
                    <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
                      <SummaryLine label="Visited" value={booleanSummary.visited} />
                      <SummaryLine label="Not visited" value={booleanSummary.notVisited} />
                    </View>
                  ) : null}
                  {numericSummary && numericSummary.days.length > 0 ? (
                    <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
                      <SummaryLine label="Total" value={numericSummary.total} />
                    </View>
                  ) : null}
                  {rangeMessage ? <ThemedText themeColor="textSecondary">{rangeMessage}</ThemedText> : null}

                  {booleanSummary && booleanSummary.days.length > 0
                    ? booleanSummary.days.map((day) => {
                        const heading = formatDayHeading(day.dateKey);
                        return (
                          <Pressable
                            key={day.dateKey}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: day.visited }}
                            accessibilityLabel={`${day.visited ? 'Clear' : 'Tick'} ${heading.detail}`}
                            disabled={pendingDate != null}
                            onPress={() => {
                              void toggleDay(day.dateKey, day.visited);
                            }}
                            style={({ pressed }) => [
                              styles.dayRow,
                              { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
                            ]}>
                            <View
                              style={[
                                styles.check,
                                {
                                  borderColor: day.visited ? theme.success : theme.textSecondary,
                                  backgroundColor: day.visited ? theme.success : 'transparent',
                                },
                              ]}>
                              {day.visited ? (
                                <ThemedText style={[styles.checkMark, { color: theme.onAccent }]}>✓</ThemedText>
                              ) : null}
                            </View>
                            <View style={styles.dayCopy}>
                              <ThemedText>{heading.title}</ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {heading.detail}
                              </ThemedText>
                            </View>
                            <ThemedText type="smallBold">{day.visited ? 'Went' : "Didn't go"}</ThemedText>
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
                            style={[styles.dayRow, { backgroundColor: theme.backgroundElement }]}>
                            <View style={styles.dayCopy}>
                              <ThemedText>{heading.title}</ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                {heading.detail}
                              </ThemedText>
                            </View>
                            <NumericDayInput
                              value={stored ?? null}
                              accessibilityLabel={`Count for ${heading.detail}`}
                              onCommit={(value) => detail.setValue(day.dateKey, value)}
                            />
                          </View>
                        );
                      })
                    : null}
                </>
              )}
            </ScrollView>
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

function shortDate(dateKey: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(parseDateKey(dateKey));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
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
  headerEnd: {
    alignItems: 'flex-end',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  notes: {
    minHeight: 96,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
  },
});
