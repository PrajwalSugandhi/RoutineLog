import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthHeading, formatWeekHeading, type CalendarView } from '@/utils/calendar';
import { formatDayHeading, todayKey } from '@/utils/date';

type DateNavigatorProps = {
  dateKey: string;
  view: CalendarView;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
};

const PREVIOUS_LABEL: Record<CalendarView, string> = {
  day: 'Previous day',
  week: 'Previous week',
  month: 'Previous month',
};

const NEXT_LABEL: Record<CalendarView, string> = {
  day: 'Next day',
  week: 'Next week',
  month: 'Next month',
};

export function DateNavigator({ dateKey, view, onPrevious, onNext, onToday }: DateNavigatorProps) {
  const theme = useTheme();
  const heading =
    view === 'month'
      ? formatMonthHeading(dateKey)
      : view === 'week'
        ? formatWeekHeading(dateKey)
        : formatDayHeading(dateKey);
  const isToday = dateKey === todayKey();

  return (
    <View style={styles.container}>
      <ThemedText type="small" themeColor="textSecondary">
        DayFlow
      </ThemedText>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={PREVIOUS_LABEL[view]}
          onPress={onPrevious}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
          <ThemedText style={styles.chevron}>‹</ThemedText>
        </Pressable>
        <View style={styles.heading}>
          <ThemedText
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={styles.title}>
            {heading.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {heading.detail}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={NEXT_LABEL[view]}
          onPress={onNext}
          style={({ pressed }) => [styles.stepButton, pressed && styles.pressed]}>
          <ThemedText style={styles.chevron}>›</ThemedText>
        </Pressable>
      </View>
      {isToday ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go to today"
          onPress={onToday}
          style={({ pressed }) => [
            styles.todayButton,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">Today</ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  heading: { flex: 1, gap: Spacing.half },
  title: { fontSize: 32, lineHeight: 38, fontWeight: 600 },
  stepButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  chevron: { fontSize: 34, lineHeight: 38 },
  todayButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.7 },
});
