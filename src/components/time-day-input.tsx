import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { parseDurationMinutes } from '@/utils/date';

type TimeDayInputProps = {
  value: number | null;
  onCommit: (value: number | null) => Promise<void>;
  accessibilityLabel: string;
};

export function TimeDayInput({ value, onCommit, accessibilityLabel }: TimeDayInputProps) {
  const theme = useTheme();
  const [text, setText] = useState(value == null ? '' : String(value));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(value == null ? '' : String(value));
    setError(null);
  }, [value]);

  async function commit() {
    let next: number | null;
    try {
      next = parseDurationMinutes(text);
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : 'Enter minutes, or a duration like 1:30.');
      return;
    }
    if (next === value) return;
    setSaving(true);
    setError(null);
    try {
      await onCommit(next);
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : 'Could not save this duration.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        accessibilityLabel={accessibilityLabel}
        value={text}
        onChangeText={(next) => {
          setText(next);
          setError(null);
        }}
        onBlur={() => {
          void commit();
        }}
        onSubmitEditing={() => {
          void commit();
        }}
        editable={!saving}
        keyboardType="numbers-and-punctuation"
        placeholder="min"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
      />
      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 96,
    gap: Spacing.one,
  },
  input: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: Spacing.two,
    fontSize: 16,
    textAlign: 'center',
  },
});
