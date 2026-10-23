import { useLocalSearchParams } from 'expo-router';

import { HabitReviewScreen } from '@/screens/habit-review-screen';

export default function HabitReviewRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const taskId = Array.isArray(id) ? id[0] : id;
  if (!taskId) return null;
  return <HabitReviewScreen taskId={taskId} />;
}
