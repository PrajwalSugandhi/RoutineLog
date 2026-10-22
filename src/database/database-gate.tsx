import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { Component, Suspense, useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { DATABASE_NAME } from '@/database/constants';
import { migrateDatabase } from '@/database/migrate';

type BoundaryState = {
  error: Error | null;
};

class DatabaseErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <DatabaseErrorScreen message={this.state.error.message} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function DatabaseErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <ThemedView style={styles.errorScreen}>
      <ThemedText type="subtitle">Could not open your tasks</ThemedText>
      <ThemedText themeColor="textSecondary">{message}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Your existing tasks were not replaced. Close RoutineLog and open it again if this continues.
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
        <ThemedText type="smallBold">Try again</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

export function DatabaseGate({ children }: { children: ReactNode }) {
  return (
    <DatabaseErrorBoundary>
      <Suspense fallback={null}>
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrateDatabase} useSuspense>
          {children}
        </SQLiteProvider>
      </Suspense>
    </DatabaseErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
});
