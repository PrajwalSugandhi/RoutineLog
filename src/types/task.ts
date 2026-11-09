export type TaskStatus = 'pending' | 'completed';

export type TaskPriority = 'low' | 'medium' | 'high';

export type TaskHistoryEventType = 'created' | 'completed' | 'reopened' | 'rescheduled' | 'deleted';

export type Task = {
  id: string;
  title: string;
  description?: string;
  scheduledDate: string;
  endDate: string;
  status: TaskStatus;
  priority?: TaskPriority;
  dueTime?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  originalScheduledDate: string;
  postponedCount: number;
  checkedDates: string[];
  deletedAt?: string;
};

export type TaskHistoryEvent = {
  id: string;
  taskId: string;
  eventType: TaskHistoryEventType;
  fromDate?: string;
  toDate?: string;
  timestamp: string;
};

export type TaskDraft = {
  title: string;
  description: string;
  scheduledDate: string;
  endDate: string;
  priority: TaskPriority | null;
  dueTime: string | null;
};
