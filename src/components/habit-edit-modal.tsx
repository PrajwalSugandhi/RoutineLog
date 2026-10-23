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
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRecurringDetail } from '@/hooks/use-recurring-detail';
import { useTheme } from '@/hooks/use-theme';
import { todayKey } from '@/utils/date';
import { recurringTypeLabel } from '@/utils/recurring';

type HabitEditModalProps = {
  taskId: string | null;
  onClose: () => void;
  onChanged: () => void;
};

export function HabitEditModal({ taskId, onClose, onChanged }: HabitEditModalProps) {
  const theme = useTheme();
  const today = todayKey();
  const detail = useRecurringDetail(taskId, today, today, onChanged);
  const task = detail.task;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [seededId, setSeededId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) return;
    setSeededId(null);
    setFormError(null);
    setSaving(false);
  }, [taskId]);

  useEffect(() => {
    if (!task || seededId === task.id) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setStartDate(task.startDate);
    setFormError(null);
    setSeededId(task.id);
  }, [seededId, task]);

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      await detail.update({ title, description, startDate });
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this task.');
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

  return (
    <Modal
      visible={taskId != null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => {
        if (!saving) onClose();
      }}>
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                disabled={saving}
                onPress={onClose}
                style={styles.headerButton}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Close
                </ThemedText>
              </Pressable>
              <ThemedText type="smallBold">Edit</ThemedText>
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
                </>
              )}
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save changes"
                disabled={saving || !task || title.trim().length === 0}
                onPress={() => {
                  void handleSave();
                }}
                style={({ pressed }) => [
                  styles.saveButton,
                  {
                    backgroundColor: theme.accent,
                    opacity: saving || !task || title.trim().length === 0 ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}>
                <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
                  {saving ? 'Saving...' : 'Save changes'}
                </ThemedText>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
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
