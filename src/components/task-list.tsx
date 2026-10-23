import { type ReactElement } from 'react';
import { FlatList, StyleSheet } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { TaskItem } from '@/components/task-item';
import { Spacing } from '@/constants/theme';
import type { Task } from '@/types/task';

type TaskListProps = {
  tasks: Task[];
  bottomInset: number;
  onToggle: (task: Task) => void;
  onPress: (task: Task) => void;
  onDelete: (task: Task) => void;
  onAdd: () => void;
  header?: ReactElement | null;
  empty?: ReactElement | null;
  footer?: ReactElement | null;
  centerEmpty?: boolean;
};

export function TaskList({
  tasks,
  bottomInset,
  onToggle,
  onPress,
  onDelete,
  onAdd,
  header,
  empty,
  footer,
  centerEmpty = true,
}: TaskListProps) {
  return (
    <FlatList
      data={tasks}
      keyExtractor={(task) => task.id}
      style={styles.list}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + 88 },
        tasks.length === 0 && centerEmpty && styles.emptyContent,
      ]}
      ListHeaderComponent={header ?? null}
      ListFooterComponent={footer ?? null}
      ListEmptyComponent={
        empty ?? (
          <EmptyState
            title="Nothing planned"
            message="Add a task for this day, or move to another date."
            actionLabel="Add task"
            onAction={onAdd}
          />
        )
      }
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onToggle={() => onToggle(item)}
          onPress={() => onPress(item)}
          onDelete={() => onDelete(item)}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  content: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});
