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
  footer?: ReactElement | null;
};

export function TaskList({ tasks, bottomInset, onToggle, onPress, onDelete, onAdd, footer }: TaskListProps) {
  return (
    <FlatList
      data={tasks}
      keyExtractor={(task) => task.id}
      style={styles.list}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: bottomInset + 88 },
        tasks.length === 0 && styles.emptyContent,
      ]}
      ListFooterComponent={footer ?? null}
      ListEmptyComponent={
        <EmptyState
          title="Nothing planned"
          message="Add a task for this day, or move to another date."
          actionLabel="Add task"
          onAction={onAdd}
        />
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
