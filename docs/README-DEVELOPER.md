# DayFlow developer guide

DayFlow is an Expo SDK 57 app. Android is the product target. Routes live in `src/app`. Business rules live outside those route files. SQLite is the only store.

Read this before changing task dates, history, or reviews. Those three are easy to corrupt if a calendar day is derived from a UTC timestamp, or if a statistic uses only `tasks.scheduled_date`.

## Stack

| Package | Version in this repo |
| --- | --- |
| expo | ~57.0.30 |
| react-native | 0.86.3 |
| react | 19.2.3 |
| expo-router | ~57.0.28 |
| expo-sqlite | ~57.0.4 |
| typescript | ~6.0.3, `strict` |

`@expo/ui` supplies the community date/time picker (`@expo/ui/community/datetime-picker`). Do not add `@react-native-community/datetimepicker` unless you have a reason to leave Expo UI.

The display name, npm package name, Expo slug, and URL scheme are DayFlow (`dayflow` in `package.json`, `app.json` slug, and `app.json` scheme).

## Commands

```bash
npm install
npx expo start --android
npx tsc --noEmit
```

`npm run android` is `expo start --android`.

Install native modules with `npx expo install <package>` so the version matches SDK 57. Do not bump Expo or React Native unless you have checked the SDK 57 docs.

`npm run reset-project` is the original Expo template script. It moves the current app aside and creates a blank one. Do not run it.

`npm run lint` / `npx expo lint` is not usable on Node 20. `eslint-plugin-expo` asks for Node 22, 24, or 26. This environment is Node 20.19.4, so lint was left uninstalled. Typecheck is the check that runs today.

There is no Jest suite. Pure date, calendar, review, and history rules can be executed by compiling `src/utils` with `tsc` and asserting in Node. The device checks below were done on a Pixel 7 emulator with Expo Go 57.

`ios/` and `android/` are not in the repo. Native config belongs in `app.json` and config plugins. `android.softwareKeyboardLayoutMode` is `resize` so form footers stay above the keyboard.

## Layout

```text
src/app/_layout.tsx          providers: theme, SQLite, splash
src/app/index.tsx            re-exports TodayScreen
src/app/habits.tsx           re-exports HabitsScreen
src/app/history.tsx          re-exports HistoryScreen
src/screens                  screen state and composition
src/components               presentational UI
src/hooks                    subscribe to SQLite and refresh after writes
src/services                 validation, transactions, review and history assembly
src/repositories             parameterized SQL only
src/database                 open, migrate, serialize writes
src/utils                    pure functions, no SQLite
src/types/task.ts            Task and TaskDraft
```

Navigation is Expo Router native tabs in `src/components/app-tabs.tsx`. The web tab bar is `app-tabs.web.tsx`. Trigger `name` must match the route file (`index`, `habits`, `history`).

`src/components/ui/collapsible.tsx`, `animated-icon.tsx`, `hint-row.tsx`, and `web-badge.tsx` are leftovers from the Expo starter. DayFlow does not depend on them for its flows. The splash overlay in the root layout is still the starter animation.

## Rules that must stay true

### Calendar days are local

Store and compare dates as `YYYY-MM-DD` from the device’s local calendar.

Use `toDateKey`, `parseDateKey`, `addDays`, and `addMonths` in `src/utils/date.ts`. `parseDateKey` builds `new Date(year, monthIndex, day)`, which is local midnight. Do not use `date.toISOString().slice(0, 10)` for a calendar day. In a timezone ahead of UTC, local midnight is still the previous UTC date.

Timestamps (`createdAt`, `completedAt`, history `timestamp`) are real instants, `new Date().toISOString()`. When a feature needs “the day this instant happened,” convert with `localDateKeyFromTimestamp` in `src/utils/history.ts`.

Weeks start on Sunday (`Date#getDay()`). Month grids are 4, 5, or 6 rows and include leading and trailing days from the adjacent months. `addMonths` clamps the day so 31 January becomes 28 or 29 February.

### One task, one id

Identity is `tasks.id`, a UUID from `src/utils/ids.ts` (`crypto.randomUUID` when it exists). Title is not an id. Reschedule updates `scheduled_date` and inserts one `rescheduled` history row. It does not insert a new task. `original_scheduled_date` is set once at insert and is not part of the update statement.

`postponed_count` increments only when the new date is later than the current scheduled date. A move to an earlier date still writes a `rescheduled` event, so “rescheduled N times” on the History screen counts events, while “postponed N times” reads `postponed_count`.

### History is the record of a day

These questions use different data:

| Question | Source |
| --- | --- |
| What is planned on this day right now? | `tasks.scheduled_date`, `deleted_at IS NULL` |
| What is still open on this day? | same, `status = 'pending'` |
| What was completed for this planned day? | a `completed` event with `from_date` equal to that day, if a later `reopened` event has not cleared it |
| What was checked off today? | the local calendar day of the latest uncleared `completed` timestamp |
| What left this day unfinished? | a `rescheduled` event with `from_date` equal to that day, task not currently scheduled there, and not completed for that day |

`buildDayInspection` in `src/utils/history.ts` is the function History must keep using. A day with 1 completion and 1 move is `1 of 2`, not `1 of 1` and not an empty day. Everyday habit logs are not part of that inspection, and they do not change the selected day’s “2 of 5 complete” line.

Completed tasks stay on their scheduled date. Completion writes `completed_at` and a history row whose `from_date` is the scheduled date at that moment. It does not change `scheduled_date`.

### Reviews do not mutate tasks by themselves

`day_reviews.status` is one of `not_started`, `in_progress`, `completed_clear`, `completed_with_unresolved`. No row means not started.

Opening the review calls `beginReview`. That inserts `in_progress`, or leaves an existing finished status alone. Finish writes `completed_clear` when nothing on that date is pending, otherwise `completed_with_unresolved`.

The counts on the review screen are live: tasks still scheduled that day, plus tasks moved away (`listTasksMovedFromDate`). They are not frozen columns on `day_reviews`.

“Tomorrow” in the review is `addDays(reviewDate, 1)`, not “tomorrow relative to the phone’s clock.”

Keep here does not write a task or a review decision. It only marks the card in component state so the choice is visible. Reopening the review shows the task as pending again, which is the stored truth.

### Deletes are archives

`deleteTask` sets `deleted_at` and writes a `deleted` history event. Queries that feed the UI filter `deleted_at IS NULL`. History events for archived tasks are excluded by the join in `listActivityEvents`. The row is not removed, so a future archive screen can still read it.

## Everyday habits are one row

A habit is not a copy of `tasks` and it is not created inside `rescheduleTask`. `recurring_tasks` holds the habit: `value_type` is `boolean` or `numeric`, chosen at insert and never updated. `recurring_logs` holds one integer per `(recurring_task_id, log_date)`.

- Boolean stores `1` for a tick and deletes the row when cleared. A missing row counts as not visited.
- Numeric stores the integer, including `0` when that zero was saved. A missing row counts as 0. Blank input deletes the row.
- A log date has to be on or after `start_date`.
- Range counts use `clipRecurringWindow` in `src/utils/recurring.ts`: from `max(start_date, from)` through `min(to, today)`. Future days are not missed and are not added into a numeric total.
- Soft delete sets `deleted_at`. Active queries filter that column. Logs stay in the database.

The selected day can tick a boolean habit. The review can tick a boolean habit or save a number. Neither write changes `day_reviews.status`.

## Writes and the database

`src/database/transaction.ts` runs all writes and the serialized reads through one promise queue, then `db.withTransactionAsync` for multi-statement changes (insert task + history, update date + history, complete + history). Do not call `runInTransaction` from inside another queued function or the queue will deadlock. Repository functions assume they are already inside that queue. Service functions are the ones that enqueue.

`SQLiteProvider` in `src/database/database-gate.tsx` opens `dayflow.db` and runs `migrateDatabase` before children render. `user_version` is `3` (`DATABASE_VERSION`).

Version 0 creates `tasks` and `task_history`. Version 3 creates `recurring_tasks` and `recurring_logs` whenever `user_version` is still below 3, including a database that was already at version 2. A version bump that only set `user_version` would skip those tables on an existing install. Every launch also runs `CREATE TABLE IF NOT EXISTS day_reviews`. That statement is unconditional on purpose: an earlier build set `user_version` to 2 before the review table existed, and a version check alone would skip it forever.

Do not put sample tasks in `migrateDatabase`.

Foreign keys are enabled per connection after migrate. History rows reference `tasks.id`. Soft delete keeps the parent row, so the foreign key stays valid.

## Where to change things

| Change | Start here |
| --- | --- |
| Validation, postpone rule, what a write persists | `src/services/task-service.ts` |
| SQL shape | `src/repositories/task-repository.ts` |
| Review status transitions | `src/services/review-service.ts` |
| Day/week/month grid | `src/utils/calendar.ts`, `month-calendar.tsx`, `week-strip.tsx` |
| What History counts | `src/utils/history.ts` |
| Selected-day UI | `src/screens/today-screen.tsx` |
| Everyday habits | `src/services/recurring-service.ts`, `src/utils/recurring.ts` |
| A new screen | add `src/app/<name>.tsx`, a screen component, and a `NativeTabs.Trigger` whose `name` matches the file |

`useDayTasks(start, end)` loads every visible calendar cell’s tasks in one range query. Mutations call back into the task service and then refresh that range. `useHistory` reloads when the History tab gains focus, so a move made on Today shows up after you switch tabs.

## UI notes

`DateNavigator` puts Previous, Today, and Next on a full-width row under the title. The old corner chevron sat under Expo Go’s developer-tools button. Keep the next control out of that top-right corner while the app is developed in Expo Go.

The History tab reuses `assets/images/tabIcons/explore.png` because the template only shipped home and explore icons. Replace it when a real icon exists.

`@expo/ui`’s web date picker renders nothing. Task and review forms keep a `YYYY-MM-DD` field so web is not blocked. Android presents a dialog; iOS presents an inline picker and needs an explicit confirm.

Light and dark colors are the `Colors` map in `src/constants/theme.ts`. `useTheme` reads the system scheme.

## Suggested next work

These were left out on purpose. The data model can take them without a rewrite if the rules above stay intact.

1. **Review reminder.** A local notification should only open the review screen. It must not complete or reschedule tasks. `expo-notifications` has to be checked against SDK 57 before it is added. There is no settings screen yet.
2. **Weekly or monthly habits.** Everyday habits already exist as one `recurring_tasks` row plus `recurring_logs`. Do not add another schedule by copying a row inside `rescheduleTask`.
3. **Sync.** The device database is the source of truth. A backend should ship `tasks`, `task_history`, `day_reviews`, `recurring_tasks`, and `recurring_logs`, including soft-deleted rows, or the other device will mis-count past days.
4. **Archive browser.** Deleted tasks are already retained. They are filtered out of active queries.
5. **Lint.** Use Node 22 or newer, then `npx expo lint`, and commit the ESLint config Expo generates.

## Checks worth repeating

```bash
npx tsc --noEmit
```

On a device or emulator, the regression that matters:

1. Create two tasks for today.
2. Complete one, reopen it, and confirm the progress counts.
3. Move one to tomorrow from the review. It disappears from today, appears tomorrow, and keeps its title and priority.
4. Open History for today. That day is not empty and is not 100 percent. The moved task is under Moved away, and its first planned date is unchanged. Tomorrow lists it under Still pending.
5. Force-stop the app and reopen it. The moved task is still on tomorrow.
6. Delete it, cancel once, then confirm. Cancel keeps it. Confirm removes it from the calendar.

Do not treat `npm run reset-project` as a test.
