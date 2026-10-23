import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { createRecurringTask } from '@/services/recurring-service';
import { useTheme } from '@/hooks/use-theme';
import type { RecurringValueType } from '@/types/recurring-task';
import { todayKey } from '@/utils/date';

const KINDS: { value: RecurringValueType; label: string }[] = [
  { value: 'boolean', label: 'Yes/no' },
  { value: 'numeric', label: 'Number' },
];

export function NewHabitScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [valueType, setValueType] = useState<RecurringValueType>('boolean');
  const [startDate, setStartDate] = useState(() => todayKey());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setFormError(null);
    try {
      await createRecurringTask(db, {
        title,
        description,
        valueType,
        startDate,
      });
      router.back();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not save this task.');
      setSaving(false);
    }
  }

  return (
      <ThemedView style={styles.screen}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                disabled={saving}
                onPress={() => router.back()}
                style={styles.headerButton}>
                <MaterialIcons
                  name="chevron-left"
                  size={28}
                  color={saving ? theme.textSecondary : theme.text}
                />
              </Pressable>
              <ThemedText type="smallBold">New everyday task</ThemedText>
              <View style={styles.headerButton} />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
              <View style={styles.field}>
                <ThemedText type="smallBold">Title</ThemedText>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Gym, DSA, reading..."
                  placeholderTextColor={theme.textSecondary}
                  maxLength={200}
                  autoFocus
                  returnKeyType="done"
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
                <View style={styles.chips}>
                  {KINDS.map((option) => {
                    const selected = valueType === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        onPress={() => setValueType(option.value)}
                        style={[
                          styles.chip,
                          { backgroundColor: selected ? theme.accent : theme.backgroundElement },
                        ]}>
                        <ThemedText type="smallBold" style={{ color: selected ? theme.onAccent : theme.text }}>
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {valueType === 'boolean'
                    ? 'Tick each day you do it. A day you skip counts as not visited.'
                    : 'Enter the day’s count in the review. A blank day counts as zero.'}
                </ThemedText>
              </View>

              <DateKeyField label="Starts" value={startDate} onChange={setStartDate} />

              {formError ? (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {formError}
                </ThemedText>
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
                testID="save-habit-button"
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
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
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
