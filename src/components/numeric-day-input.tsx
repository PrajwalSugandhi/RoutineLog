import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type NumericDayInputProps = {
  value: number | null;
  onCommit: (value: number | null) => Promise<void>;
  accessibilityLabel: string;
};

export function NumericDayInput({ value, onCommit, accessibilityLabel }: NumericDayInputProps) {
  const theme = useTheme();
  const [text, setText] = useState(value == null ? '' : String(value));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(value == null ? '' : String(value));
    setError(null);
  }, [value]);

  async function commit() {
    const trimmed = text.trim();
    let next: number | null;
    if (!trimmed) {
      next = null;
    } else if (!/^\d+$/.test(trimmed)) {
      setError('Enter a whole number, 0 or greater.');
      return;
    } else {
      next = Number(trimmed);
    }
    if (next === value) return;
    setSaving(true);
    setError(null);
    try {
      await onCommit(next);
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : 'Could not save this number.');
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
        keyboardType="number-pad"
        inputMode="numeric"
        placeholder="0"
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
