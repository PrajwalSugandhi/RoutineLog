import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatMonthHeading, formatWeekHeading, type CalendarView } from '@/utils/calendar';
import { formatDayHeading, todayKey } from '@/utils/date';

type DateNavigatorProps = {
  dateKey: string;
  view: CalendarView;
  showBrand?: boolean;
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

export function DateNavigator({
  dateKey,
  view,
  showBrand = true,
  onPrevious,
  onNext,
  onToday,
}: DateNavigatorProps) {
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
      {showBrand ? (
        <ThemedText type="small" themeColor="textSecondary">
          DayFlow
        </ThemedText>
      ) : null}
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
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={PREVIOUS_LABEL[view]}
          onPress={onPrevious}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">Previous</ThemedText>
        </Pressable>
        {isToday ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to today"
            onPress={onToday}
            style={({ pressed }) => [
              styles.control,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            <ThemedText type="smallBold">Today</ThemedText>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={NEXT_LABEL[view]}
          onPress={onNext}
          style={({ pressed }) => [
            styles.control,
            { backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">Next</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  heading: {
    gap: Spacing.half,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
  },
  controls: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  control: {
    flex: 1,
    minHeight: 48,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
