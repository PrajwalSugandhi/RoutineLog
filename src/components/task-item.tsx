import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Task, TaskPriority } from '@/types/task';
import { formatTimeLabel } from '@/utils/date';

type TaskItemProps = {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  onDelete: () => void;
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

export function TaskItem({ task, onToggle, onPress, onDelete }: TaskItemProps) {
  const theme = useTheme();
  const completed = task.status === 'completed';
  const priorityColor = task.priority ? theme[task.priority] : undefined;

  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed }}
        accessibilityLabel={`${completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
        onPress={onToggle}
        hitSlop={4}
        style={({ pressed }) => [styles.checkHit, pressed && styles.pressed]}
        testID={`task-toggle-${task.id}`}>
        <View
          style={[
            styles.check,
            {
              borderColor: completed ? theme.success : theme.textSecondary,
              backgroundColor: completed ? theme.success : 'transparent',
            },
          ]}>
          {completed ? <ThemedText style={[styles.checkMark, { color: theme.onAccent }]}>✓</ThemedText> : null}
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
          style={[styles.title, completed && { color: theme.textSecondary, textDecorationLine: 'line-through' }]}>
          {task.title}
        </ThemedText>
        {task.description ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {task.description}
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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${task.title}`}
        accessibilityHint="Asks for confirmation before removing the task"
        onPress={onDelete}
        hitSlop={4}
        style={({ pressed }) => [styles.deleteHit, pressed && styles.pressed]}>
        <ThemedText type="smallBold" style={{ color: theme.danger }}>
          Delete
        </ThemedText>
      </Pressable>
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
  deleteHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
