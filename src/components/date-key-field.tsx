import DateTimePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { formatDayHeading, isDateKey, parseDateKey, toDateKey } from "@/utils/date";

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

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {heading ? (
        <ThemedText>
          {heading.title} · {heading.detail}
        </ThemedText>
      ) : (
        <ThemedText themeColor="textSecondary">Choose a calendar date</ThemedText>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={heading ? `${label}, ${heading.detail}` : `Choose ${label}`}
        onPress={() => setPickerOpen(true)}
        style={({ pressed }) => [
          styles.input,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={{ color: valid ? theme.text : theme.textSecondary }}>
          {valid ? value : "Choose date"}
        </ThemedText>
      </Pressable>
      {pickerOpen ? (
        <DateTimePicker
          value={valid ? parseDateKey(value) : new Date()}
          mode="date"
          onValueChange={(_event, date) => {
            onChange(toDateKey(date));
            if (Platform.OS === "android") setPickerOpen(false);
          }}
          onDismiss={() => setPickerOpen(false)}
        />
      ) : null}
      {pickerOpen && Platform.OS === "ios" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Done"
          onPress={() => setPickerOpen(false)}
          style={({ pressed }) => [
            styles.done,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold">Done</ThemedText>
        </Pressable>
      ) : null}
    </View>
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
    justifyContent: "center",
  },
  done: {
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  pressed: {
    opacity: 0.7,
  },
});
