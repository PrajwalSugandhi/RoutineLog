import { router, useLocalSearchParams } from 'expo-router';

import { EndOfDayReview } from '@/components/end-of-day-review';
import { useDayReview } from '@/hooks/use-day-review';
import { useRecurringDay } from '@/hooks/use-recurring-day';
import { isDateKey, todayKey } from '@/utils/date';

export default function EndOfDayReviewScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const dateKey = typeof date === 'string' && isDateKey(date) ? date : todayKey();
  const review = useDayReview(dateKey);
  const recurring = useRecurringDay(dateKey);

  return (
    <EndOfDayReview
      dateKey={dateKey}
      status={review.status}
      summary={review.summary}
      pending={review.tasksOnDate.filter((task) => task.status === 'pending')}
      completed={review.tasksOnDate.filter((task) => task.status === 'completed')}
      moved={review.movedTasks}
      loading={review.loading}
      onClose={() => router.back()}
      onBegin={review.begin}
      onComplete={review.complete}
      onReschedule={review.reschedule}
      onFinish={review.finish}
      recurringEntries={recurring.entries}
      onSetRecurring={recurring.setValue}
    />
  );
}
