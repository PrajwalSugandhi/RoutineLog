import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Keyboard,
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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task, TaskDraft, TaskPriority } from '@/types/task';
import {
  addDays,
  dateWithTime,
  formatDayHeading,
  formatTimeLabel,
  isDateKey,
  isTimeKey,
  normalizeTimeKey,
  parseDateKey,
  toDateKey,
  toTimeKey,
} from '@/utils/date';

type EditorSession =
  | { mode: 'create'; date: string }
  | { mode: 'edit'; task: Task };

type TaskFormModalProps = {
  session: EditorSession | null;
  onClose: () => void;
  onSubmit: (draft: TaskDraft) => Promise<void>;
};

const PRIORITIES: { value: TaskPriority | null; label: string }[] = [
  { value: null, label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export function TaskFormModal({ session, onClose, onSubmit }: TaskFormModalProps) {
  const theme = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [dateText, setDateText] = useState('');
  const [dueTimeText, setDueTimeText] = useState('');
  const [picker, setPicker] = useState<'date' | 'time' | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    if (session.mode === 'edit') {
      setTitle(session.task.title);
      setDescription(session.task.description ?? '');
      setPriority(session.task.priority ?? null);
      setDateText(session.task.scheduledDate);
      setDueTimeText(session.task.dueTime ?? '');
    } else {
      setTitle('');
      setDescription('');
      setPriority(null);
      setDateText(session.date);
      setDueTimeText('');
    }
    setPicker(null);
    setSaving(false);
    setFormError(null);
  }, [session]);

  const visible = session != null;
  const fallbackDate = session?.mode === 'edit' ? session.task.scheduledDate : session?.date ?? dateText;
  const validDate = isDateKey(dateText) ? dateText : null;
  const heading = validDate ? formatDayHeading(validDate) : null;

  function shiftDate(days: number) {
    const base = validDate ?? (isDateKey(fallbackDate) ? fallbackDate : null);
    if (!base) return;
    setDateText(addDays(base, days));
    setFormError(null);
  }

  function openDatePicker() {
    Keyboard.dismiss();
    setPicker('date');
    setFormError(null);
  }

  async function handleSave() {
    if (!isDateKey(dateText)) {
      setFormError('Choose a valid date in YYYY-MM-DD format.');
      return;
    }
    let dueTime: string | null;
    try {
      dueTime = normalizeTimeKey(dueTimeText);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Use a time like 09:30.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onSubmit({
        title,
        description,
        scheduledDate: dateText,
        priority,
        dueTime,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this task.');
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!saving) onClose();
      }}
      statusBarTranslucent>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                disabled={saving}
                onPress={onClose}
                style={styles.headerButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Cancel
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">{session?.mode === 'edit' ? 'Edit task' : 'New task'}</ThemedText>
              <View style={styles.headerButton} />
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.content}>
              <Field label="Title">
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What do you need to do?"
                  placeholderTextColor={theme.textSecondary}
                  maxLength={200}
                  autoFocus
                  returnKeyType="done"
                  style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                />
              </Field>

              <Field label="Notes">
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
              </Field>

              <Field label="Priority">
                <View style={styles.chips}>
                  {PRIORITIES.map((option) => {
                    const selected = priority === option.value;
                    return (
                      <Pressable
                        key={option.label}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setPriority(option.value)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected ? theme.accent : theme.backgroundElement,
                          },
                        ]}>
                        <ThemedText
                          type="smallBold"
                          style={{ color: selected ? theme.onAccent : theme.text }}>
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>

              <Field label="Date">
                <ThemedText>
                  {heading ? `${heading.title} · ${heading.detail}` : 'Choose a calendar date'}
                </ThemedText>
                {Platform.OS === 'web' ? (
                  <TextInput
                    value={dateText}
                    onChangeText={(value) => {
                      setDateText(value.trim());
                      setFormError(null);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Choose date"
                    onPress={openDatePicker}
                    style={({ pressed }) => [
                      styles.input,
                      styles.dateTrigger,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText>{heading ? heading.detail : 'Choose date'}</ThemedText>
                  </Pressable>
                )}
                <View style={styles.inlineActions}>
                  <TextButton label="Previous day" onPress={() => shiftDate(-1)} />
                  <TextButton label="Next day" onPress={() => shiftDate(1)} />
                </View>
              </Field>

              <Field label="Time">
                {Platform.OS === 'web' ? (
                  <TextInput
                    value={dueTimeText}
                    onChangeText={setDueTimeText}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="09:30"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                  />
                ) : (
                  <View style={styles.inlineActions}>
                    <TextButton
                      label={
                        dueTimeText && isTimeKey(dueTimeText) ? formatTimeLabel(dueTimeText) : 'Add time'
                      }
                      onPress={() => setPicker('time')}
                    />
                    {dueTimeText ? <TextButton label="Clear time" onPress={() => setDueTimeText('')} /> : null}
                  </View>
                )}
                <ThemedText type="small" themeColor="textSecondary">
                  Optional. Stored as the local time of day.
                </ThemedText>
              </Field>

              {formError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {formError}
                </ThemedText>
              ) : null}

              {picker === 'date' && validDate ? (
                <DateTimePicker
                  value={parseDateKey(validDate)}
                  mode="date"
                  onValueChange={(_event, date) => {
                    setDateText(toDateKey(date));
                    if (Platform.OS === 'android') setPicker(null);
                  }}
                  onDismiss={() => setPicker(null)}
                />
              ) : null}
              {picker === 'date' && !validDate ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  Fix the date before opening the calendar.
                </ThemedText>
              ) : null}
              {picker === 'time' && validDate ? (
                <DateTimePicker
                  value={dateWithTime(validDate, dueTimeText || null)}
                  mode="time"
                  is24Hour
                  onValueChange={(_event, date) => {
                    setDueTimeText(toTimeKey(date));
                    if (Platform.OS === 'android') setPicker(null);
                  }}
                  onDismiss={() => setPicker(null)}
                />
              ) : null}
              {picker && Platform.OS === 'ios' ? (
                <TextButton label="Done" onPress={() => setPicker(null)} />
              ) : null}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save task"
                disabled={saving || title.trim().length === 0}
                onPress={() => {
                  void handleSave();
                }}
                testID="save-task-button"
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: saving || title.trim().length === 0 ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {saving ? 'Saving...' : 'Save task'}
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {children}
    </View>
  );
}

function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.textButton,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    minHeight: 52,
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
  dateTrigger: {
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  textButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
  saveButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
