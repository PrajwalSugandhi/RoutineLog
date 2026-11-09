import { Pressable, StyleSheet, View } from 'react-native';

import { RowActionSheet } from '@/components/row-action-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task, TaskPriority } from '@/types/task';
import { formatDayHeading, formatTimeLabel } from '@/utils/date';

type TaskItemProps = {
  dateKey: string;
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  onHide: () => void;
  onDelete: () => void;
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskItem({ dateKey, task, onToggle, onPress, onHide, onDelete }: TaskItemProps) {
  const theme = useTheme();
  const dayChecked = task.checkedDates.includes(dateKey);
  const finished = task.status === 'completed';
  const priorityColor = task.priority ? theme[task.priority] : undefined;

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: dayChecked }}
        accessibilityLabel={`${dayChecked ? 'Clear this day' : 'Tick this day'}: ${task.title}`}
        onPress={onToggle}
        hitSlop={4}
        style={({ pressed }) => [styles.checkHit, pressed && styles.pressed]}
        testID={`task-toggle-${task.id}`}>
        <View
          style={[
            styles.check,
            {
              borderColor: dayChecked ? theme.success : theme.textSecondary,
              backgroundColor: dayChecked ? theme.success : 'transparent',
            },
          ]}>
          {dayChecked ? <ThemedText style={[styles.checkMark, { color: theme.onAccent }]}>✓</ThemedText> : null}
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${task.title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        testID={`task-item-${task.id}`}>
        <ThemedText
          numberOfLines={2}
          style={[styles.title, finished && { color: theme.textSecondary, textDecorationLine: 'line-through' }]}>
          {task.title}
        </ThemedText>
        {task.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {task.description}
          </ThemedText>
        ) : null}
        {task.endDate > task.scheduledDate ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            Through {formatDayHeading(task.endDate).detail}
          </ThemedText>
        ) : null}
        {dayChecked && !finished ? (
          <ThemedText type="small" themeColor="textSecondary">
            Still open
          </ThemedText>
        ) : null}
        {task.dueTime || task.priority ? (
          <View style={styles.meta}>
            {task.dueTime ? (
              <ThemedText type="small" themeColor="textSecondary">
                {formatTimeLabel(task.dueTime)}
              </ThemedText>
            ) : null}
            {task.priority && priorityColor ? (
              <ThemedText type="smallBold" style={{ color: priorityColor }}>
                {PRIORITY_LABEL[task.priority]}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      <RowActionSheet name={task.title} onHide={onHide} onDelete={onDelete} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    paddingRight: Spacing.two,
  },
  checkHit: {
    width: 52,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
  body: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.three,
  },
  title: {
    fontSize: 17,
    lineHeight: 22,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
