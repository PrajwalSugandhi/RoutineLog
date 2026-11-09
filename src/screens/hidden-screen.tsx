import { MaterialIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/empty-state";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  listHiddenRecurringTasks,
  unhideRecurringTask,
} from "@/services/recurring-service";
import { listHiddenTasks, unhideTask } from "@/services/task-service";

type HiddenRow = {
  id: string;
  title: string;
  kind: "task" | "habit";
};

export function HiddenScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<HiddenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [tasks, habits] = await Promise.all([
        listHiddenTasks(db),
        listHiddenRecurringTasks(db),
      ]);
      const next = [
        ...tasks.map((task) => ({
          id: task.id,
          title: task.title,
          kind: "task" as const,
        })),
        ...habits.map((habit) => ({
          id: habit.id,
          title: habit.title,
          kind: "habit" as const,
        })),
      ].sort(
        (left, right) =>
          left.title.localeCompare(right.title) ||
          left.kind.localeCompare(right.kind),
      );
      setRows(next);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load hidden items.",
      );
    } finally {
      setLoading(false);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  function unhide(row: HiddenRow) {
    const action =
      row.kind === "task"
        ? unhideTask(db, row.id)
        : unhideRecurringTask(db, row.id);
    action
      .then(() => refresh())
      .catch((unhideError: unknown) => {
        Alert.alert(
          "Could not unhide this",
          unhideError instanceof Error
            ? unhideError.message
            : "Please try again.",
        );
      });
  }

  return (
    <ThemedView style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={4}
          style={styles.back}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.text} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + Spacing.four },
        ]}
      >
        <ThemedText accessibilityRole="header" style={styles.title}>
          Hidden Tasks
        </ThemedText>
        <ThemedText themeColor="textSecondary">
          Hidden tasks and everyday tasks stay off the calendar until you unhide
          them.
        </ThemedText>
        {loading ? <ActivityIndicator color={theme.accent} /> : null}
        {error ? (
          <EmptyState
            title="Could not load hidden items"
            message={error}
            actionLabel="Retry"
            onAction={() => void refresh()}
          />
        ) : null}
        {!loading && !error && rows.length === 0 ? (
          <EmptyState
            title="Nothing is hidden"
            message="Hide a task or everyday task from its more menu."
          />
        ) : null}
        {rows.map((row) => (
          <View
            key={`${row.kind}-${row.id}`}
            style={[styles.row, { backgroundColor: theme.backgroundElement }]}
          >
            <View style={styles.copy}>
              <ThemedText numberOfLines={2}>{row.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {row.kind === "task" ? "Task" : "Everyday task"}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unhide ${row.title}`}
              onPress={() => unhide(row)}
              style={({ pressed }) => [
                styles.unhide,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.accent }}>
                Unhide
              </ThemedText>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    paddingHorizontal: Spacing.two,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: 600,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Spacing.three,
    paddingLeft: Spacing.three,
  },
  copy: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.three,
  },
  unhide: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
