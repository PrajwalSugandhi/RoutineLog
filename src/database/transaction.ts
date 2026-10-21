import type { SQLiteDatabase } from 'expo-sqlite';

let queue: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export function runSerialized<T>(task: () => Promise<T>): Promise<T> {
  return enqueue(task);
}

export function runInTransaction<T>(
  db: SQLiteDatabase,
  task: (database: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  return enqueue(async () => {
    let completed = false;
    let result: T | undefined;
    await db.withTransactionAsync(async () => {
      result = await task(db);
      completed = true;
    });
    if (!completed) {
      throw new Error('The database transaction did not finish.');
    }
    return result as T;
  });
}
