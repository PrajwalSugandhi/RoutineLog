import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';

import { TaskForm } from '@/components/task-form';
import { createTask } from '@/services/task-service';
import { isDateKey, todayKey } from '@/utils/date';

export default function NewTaskScreen() {
  const db = useSQLiteContext();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const scheduledDate = typeof date === 'string' && isDateKey(date) ? date : todayKey();

  return (
    <TaskForm
      asScreen
      session={{ mode: 'create', date: scheduledDate }}
      onClose={() => router.back()}
      onSubmit={async (draft) => {
        const saved = await createTask(db, draft);
        router.dismissTo({ pathname: '/', params: { focusDate: saved.scheduledDate } });
      }}
    />
  );
}
