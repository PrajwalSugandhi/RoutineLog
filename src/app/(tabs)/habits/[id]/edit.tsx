import { useLocalSearchParams } from 'expo-router';

import { HabitEditScreen } from '@/screens/habit-edit-screen';

export default function HabitEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Array.isArray(id) ? id[0] : id;
  if (!taskId) return null;
  return <HabitEditScreen taskId={taskId} />;
}
