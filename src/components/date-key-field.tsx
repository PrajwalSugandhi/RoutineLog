import DateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDayHeading, isDateKey, parseDateKey, toDateKey } from '@/utils/date';

type DateKeyFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

export function DateKeyField({ label, value, onChange }: DateKeyFieldProps) {
  const theme = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const valid = isDateKey(value);
  const heading = valid ? formatDayHeading(value) : null;

  function shift(days: number) {
    if (!valid) return;
    onChange(addDays(value, days));
    setPickerOpen(false);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {heading ? (
        <ThemedText>
          {heading.title} · {heading.detail}
        </ThemedText>
      ) : (
        <ThemedText themeColor="textSecondary">Enter a calendar date</ThemedText>
      )}
      <TextInput
        value={value}
        onChangeText={(next) => {
          onChange(next.trim());
          setPickerOpen(false);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <View style={styles.actions}>
        <TextButton label="Previous day" onPress={() => shift(-1)} />
        <TextButton label="Next day" onPress={() => shift(1)} />
        {Platform.OS === 'web' ? null : (
          <TextButton label="Choose date" onPress={() => setPickerOpen(true)} />
        )}
      </View>
      {pickerOpen && valid ? (
        <DateTimePicker
          value={parseDateKey(value)}
          mode="date"
          onValueChange={(_event, date) => {
            onChange(toDateKey(date));
            if (Platform.OS === 'android') setPickerOpen(false);
          }}
          onDismiss={() => setPickerOpen(false)}
        />
      ) : null}
      {pickerOpen && !valid ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          Fix the date before opening the calendar.
        </ThemedText>
      ) : null}
      {pickerOpen && Platform.OS === 'ios' ? (
        <TextButton label="Done" onPress={() => setPickerOpen(false)} />
      ) : null}
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
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold">{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  actions: {
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
});
