export type RecurringValueType = 'boolean' | 'numeric';

export type RecurringTask = {
  id: string;
  title: string;
  description?: string;
  valueType: RecurringValueType;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export type RecurringLog = {
  id: string;
  recurringTaskId: string;
  logDate: string;
  value: number;
  updatedAt: string;
};

export type RecurringTaskDraft = {
  title: string;
  description: string;
  valueType: RecurringValueType;
  startDate: string;
};

export type RecurringTaskUpdate = {
  title: string;
  description: string;
  startDate: string;
};

export type RecurringDayEntry = {
  task: RecurringTask;
  value: number | null;
};
