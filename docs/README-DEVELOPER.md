# RoutineLog developer guide

RoutineLog is an Expo SDK 57 app. Android is the product target. Routes live in `src/app`. Business rules live outside those route files. SQLite is the only store.

Read this before changing task dates, history, or reviews. Those three are easy to corrupt if a calendar day is derived from a UTC timestamp, or if a statistic uses only `tasks.scheduled_date` and ignores `tasks.end_date`.

## Stack

| Package      | Version in this repo |
| ------------ | -------------------- |
| expo         | ~57.0.30             |
| react-native | 0.86.3               |
| react        | 19.2.3               |
| expo-router  | ~57.0.28             |
| expo-sqlite  | ~57.0.4              |
| typescript   | ~6.0.3, `strict`     |

`@expo/ui` supplies the community date/time picker (`@expo/ui/community/datetime-picker`). Do not add `@react-native-community/datetimepicker` unless you have a reason to leave Expo UI.

The display name, npm package name, Expo slug, and URL scheme are RoutineLog (`routinelog` in `package.json`, `app.json` slug, and `app.json` scheme).

## Commands

Yarn 1 is the package manager. `yarn.lock` is the lockfile. `package-lock.json` is gitignored and should not be added back.

```bash
yarn install
yarn expo start --android
yarn tsc --noEmit
```

`yarn start` is `expo start`. After `expo prebuild`, `yarn android` is `expo run:android` and `yarn ios` is `expo run:ios`. Those native scripts compile a debug app and expect a dev server. `yarn expo start --android` is the Expo Go path.

Install native modules with `yarn expo install <package>` so the version matches SDK 57. Do not use `yarn add` for an Expo package, and do not bump Expo or React Native unless you have checked the SDK 57 docs.

`yarn reset-project` is the original Expo template script. It moves the current app aside and creates a blank one. Do not run it.

`yarn lint` / `yarn expo lint` is not usable on Node 20. `eslint-plugin-expo` asks for Node 22, 24, or 26. This environment is Node 20.19.4, so lint was left uninstalled. Typecheck is the check that runs today.

There is no Jest suite. Pure date, calendar, review, and history rules can be executed by compiling `src/utils` with `tsc` and asserting in Node. The device checks below were done on a Pixel 7 emulator with Expo Go 57.

`ios/` and `android/` are not in the repo. Native config belongs in `app.json` and config plugins. `android.softwareKeyboardLayoutMode` is `resize` so form footers stay above the keyboard. The Android application id is `com.routinelog.app`.

## Android APK

The installable file is a release APK. A debug APK would look for the Expo dev server, so it is not the file to copy to a phone. `assembleRelease` bundles the JavaScript into the APK. The generated `android/` project signs that release build with the debug keystore (`android/app/debug.keystore`, store password `android`, alias `androiddebugkey`). That signature is enough to install the APK. It is not a Play Store upload key. `yarn expo prebuild --platform android` clears `android/` and writes a new debug keystore, even without `--clean`. Android will refuse to upgrade an install signed by the previous key. Uninstall the old copy first.

`android/` and `dist/` are gitignored. Generate them when you need a new APK. JDK 17 and Android SDK 36 are required. Android Studio’s bundled JDK is enough:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
yarn install
yarn expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
mkdir -p ../dist
cp app/build/outputs/apk/release/app-release.apk ../dist/routinelog.apk
```

`dist/routinelog.apk` is the file to copy or download. Install it with the phone connected:

```bash
adb install -r dist/routinelog.apk
```

Related commands:

| Command                                         | Result                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `yarn expo start --android`                     | Expo Go, or a dev client, against the dev server                                             |
| `yarn android`                                  | `expo run:android`, a debug native build that still needs the dev server                     |
| `yarn expo prebuild --platform android --clean` | Regenerate `android/` from `app.json`                                                        |
| `cd android && ./gradlew assembleRelease`       | Standalone APK at `android/app/build/outputs/apk/release/app-release.apk`                    |
| `cd android && ./gradlew bundleRelease`         | An `.aab` for Play. That path needs an upload keystore. See the Expo local production guide. |

## Layout

```text
src/app/_layout.tsx          stack, theme, SQLite, splash
src/app/(tabs)/_layout.tsx   native tabs
src/app/(tabs)/index.tsx     re-exports HomeScreen
src/app/(tabs)/habits/       habits list, review, and edit
src/app/(tabs)/history.tsx   re-exports HistoryScreen
src/app/new-task.tsx         new task screen
src/app/new-habit.tsx        new habit screen
src/app/end-of-day-review.tsx  review for the date passed in the route
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

`src/components/ui/collapsible.tsx`, `animated-icon.tsx`, `hint-row.tsx`, and `web-badge.tsx` are leftovers from the Expo starter. RoutineLog does not depend on them for its flows. The splash overlay in the root layout is still the starter animation.

## Rules that must stay true

### Calendar days are local

Store and compare dates as `YYYY-MM-DD` from the device’s local calendar.

Use `toDateKey`, `parseDateKey`, `addDays`, and `addMonths` in `src/utils/date.ts`. `parseDateKey` builds `new Date(year, monthIndex, day)`, which is local midnight. Do not use `date.toISOString().slice(0, 10)` for a calendar day. In a timezone ahead of UTC, local midnight is still the previous UTC date.

Timestamps (`createdAt`, `completedAt`, history `timestamp`) are real instants, `new Date().toISOString()`. When a feature needs “the day this instant happened,” convert with `localDateKeyFromTimestamp` in `src/utils/history.ts`.

Weeks start on Sunday (`Date#getDay()`). Month grids are 4, 5, or 6 rows and include leading and trailing days from the adjacent months. `addMonths` clamps the day so 31 January becomes 28 or 29 February.

### One task, one id

Identity is `tasks.id`, a UUID from `src/utils/ids.ts` (`crypto.randomUUID` when it exists). Title is not an id. `scheduled_date` is the first day and `end_date` is the last day. Equal dates are a one-day task. Reschedule updates `scheduled_date`, shifts `end_date` by the same number of days, and inserts one `rescheduled` history row. It does not insert a new task. Changing only `end_date` does not write history and does not increment `postponed_count`. `original_scheduled_date` is set once at insert and is not part of the update statement.

`postponed_count` increments only when the new start date is later than the current start date. A move to an earlier date still writes a `rescheduled` event, so “rescheduled N times” on the History screen counts events, while “postponed N times” reads `postponed_count`.

### History is the record of a day

These questions use different data:

| Question                                 | Source                                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| What is planned on this day right now?   | `scheduled_date <= day <= end_date`, `deleted_at IS NULL`                                                                    |
| What is still open on this day?          | the span covers that day and `task_day_checks` has no row for it                                                             |
| What was completed for this planned day? | a row in `task_day_checks` for that day, or a `completed` event with `from_date` equal to that day, if a later `reopened` event has not cleared it |
| What was checked off today?              | the local calendar day of the latest uncleared `completed` timestamp                                                         |
| What left this day unfinished?           | a `rescheduled` event with `from_date` equal to that day, the span no longer covers that day, and it was not completed for that day |

`buildDayInspection` in `src/utils/history.ts` is the function History must keep using. A day with 1 completion and 1 move is `1 of 2`, not `1 of 1` and not an empty day. Everyday habit logs are not part of that inspection, and they do not change the week-strip dot.

A tick writes one `task_day_checks` row for that calendar day. `tasks.status` becomes `completed` only when every day from `scheduled_date` through `end_date` has a check. That write sets `completed_at` and a history row whose `from_date` is the day that completed the span. Clearing a check on a finished task sets `status` back to `pending` and writes `reopened`. Extending `end_date` does not tick the new days and does not increment `postponed_count`. A finished task opens again because those new days have no check.

### Reviews do not mutate tasks by themselves

`day_reviews.status` is one of `not_started`, `in_progress`, `completed_clear`, `completed_with_unresolved`. No row means not started.

Opening the review calls `beginReview`. That inserts `in_progress`, or leaves an existing finished status alone. Finish writes `completed_clear` when nothing on that date is pending, otherwise `completed_with_unresolved`.

The counts on the review screen are live: tasks still scheduled that day, plus tasks moved away (`listTasksMovedFromDate`). They are not frozen columns on `day_reviews`.

“Tomorrow” in the review is `addDays(reviewDate, 1)`, not “tomorrow relative to the phone’s clock.” That new date becomes the start, and `end_date` moves by the same number of days.

Keep here does not write a task or a review decision. It only marks the card in component state so the choice is visible. Reopening the review shows the task as pending again, which is the stored truth.

### Deletes remove the stored rows

`hidden_at` hides a task or habit from every normal list without deleting checks, history, or logs. `NULL` means visible. The Hidden screen only clears that column. `deleteTask` deletes that task’s `task_day_checks`, its `task_history`, and the `tasks` row. A span disappears from every day it covered. `deleteRecurringTask` deletes every `recurring_logs` row for that habit, then the `recurring_tasks` row. Children are deleted first so the foreign keys stay valid. Opening the database also removes rows that an older build only marked with `deleted_at`, along with their checks, history, and logs.

## Everyday habits are one row

A habit is not a copy of `tasks` and it is not created inside `rescheduleTask`. `recurring_tasks` holds the habit: `value_type` is `boolean`, `numeric`, or `time`, chosen at insert and never updated. `recurring_logs` holds one integer per `(recurring_task_id, log_date)`.

- Boolean stores `1` for a tick and deletes the row when cleared. A missing row counts as not visited.
- Numeric stores the integer, including `0` when that zero was saved. A missing row counts as 0. Blank input deletes the row.
- Time stores how many minutes were spent, as an integer. `90` is 1 hour 30 minutes. A missing row means the day was not logged. Clearing the duration deletes the row. The longest value is 99 hours 59 minutes.
- A log date has to be on or after `start_date`.
- Range counts use `clipRecurringWindow` in `src/utils/recurring.ts`: from `max(start_date, from)` through `min(to, today)`. Future days are not missed and are not added into a numeric total.
- Delete removes the habit and every log. Active queries still filter `deleted_at IS NULL` for rows left by an older build until the next open clears them.

The selected day on Home can tick a boolean habit, save a number, or save minutes spent in the **Habits** section. The day review can do the same, under **Every day**. The habit screen can log today and any day in its range. A time habit shows minutes against the date instead of the heatmap. None of those writes change `day_reviews.status` or the week-strip dot. A blank number, or a cleared duration, deletes the log row.

## Writes and the database

`src/database/transaction.ts` runs all writes and the serialized reads through one promise queue, then `db.withTransactionAsync` for multi-statement changes (insert task + history, update date + history, complete + history). Do not call `runInTransaction` from inside another queued function or the queue will deadlock. Repository functions assume they are already inside that queue. Service functions are the ones that enqueue.

`SQLiteProvider` in `src/database/database-gate.tsx` opens `routinelog.db` and runs `migrateDatabase` before children render. The published schema is version 1 (`DATABASE_VERSION`). Installed copies are version 0. Opening one creates any missing tables, then rebuilds only `recurring_tasks` when its check still excludes `time`. That rebuild copies every habit row, then replaces the table. It does not rewrite `task_history`, `day_reviews`, or `recurring_logs`. The same open adds `tasks.end_date` with `ALTER TABLE` when the column is missing, then sets `end_date = scheduled_date` for rows that have none. It checks the task count before and after and stops if a row was lost. It also creates `task_day_checks` if that table is missing, then inserts one check for every day in the span of each task that is already `completed`. Pending tasks are left unchecked. Reopening the database does not duplicate those checks. The same open adds `hidden_at` to `tasks` and `recurring_tasks` when the column is missing. Existing rows stay visible. A database already stamped version 1 by an unpublished build gets that column check too. The same open deletes any task or habit that only has `deleted_at` set, after deleting its checks, history, or logs. Running it again deletes nothing further. The version stays 1. A newer `user_version` is refused and the file is left in place.

Do not put sample tasks in `migrateDatabase`.

Foreign keys are enabled per connection after migrate. History rows and day checks reference `tasks.id`. Habit logs reference `recurring_tasks.id`. Delete the child rows before the parent.

## Where to change things

| Change                                           | Start here                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Validation, postpone rule, what a write persists | `src/services/task-service.ts`                                                                         |
| SQL shape                                        | `src/repositories/task-repository.ts`                                                                  |
| Review status transitions                        | `src/services/review-service.ts`                                                                       |
| Day/week/month grid                              | `src/utils/calendar.ts`, `month-calendar.tsx`, `week-strip.tsx`                                        |
| What History counts                              | `src/utils/history.ts`                                                                                 |
| Selected-day UI                                  | `src/screens/home-screen.tsx`, `src/components/home-header.tsx`                                        |
| Everyday habits                                  | `src/services/recurring-service.ts`, `src/utils/recurring.ts`                                          |
| A new screen                                     | add `src/app/<name>.tsx`, a screen component, and a `NativeTabs.Trigger` whose `name` matches the file |

`useDayTasks(start, end)` loads every visible calendar cell’s tasks in one range query. Mutations call back into the task service and then refresh that range. `useHistory` reloads when the History tab gains focus, so a move made on Home shows up after you switch tabs.

## UI notes

Home’s header is `src/components/home-header.tsx`. The heading is the month. The view menu offers **Week** and **Month** only. The view button and the three-dot menu sit on the right edge; Home passes `trailingInset={0}`, so in Expo Go those buttons can sit under the tools button. **Review this day** opens `/end-of-day-review`. **Go to today** is the other menu row when the selected date is not today. There is no “2 of 5 complete” line. An empty day with no habits shows “You have a free day.” Otherwise the list is two sections, **Tasks** and **Habits**. **+** pushes `/new-task`. Editing a task stays on Home in `TaskForm`.

`WeekStrip` is shared by Home and History. It takes `summaryForDate`. Home fills that with `summarizeTasksForWeek`, which counts tasks still scheduled on the date. A blue dot means `pending > 0`, a green dot means every one of those tasks is done, and no dot means the count is zero. History passes `planned` as the count and `pending.length` from `buildDayInspection`, so a day with only moved-away work can show a green dot while the summary under it is still “1 of 2 finished.”

Home changes week or month with a horizontal swipe on the heading or the calendar. History still changes weeks with the previous and next buttons beside the week title. `DateNavigator` is not used by either screen. The Habits list opens `/habits/[id]`, which is the habit review. Edit and delete live at `/habits/[id]/edit`.

The History tab reuses `assets/images/tabIcons/explore.png` because the template only shipped home and explore icons. Replace it when a real icon exists.

`@expo/ui`’s web date picker renders nothing. Task and review forms keep a `YYYY-MM-DD` field so web is not blocked. Android presents a dialog; iOS presents an inline picker and needs an explicit confirm.

Light and dark colors are the `Colors` map in `src/constants/theme.ts`. `useTheme` reads the system scheme.

## Suggested next work

These were left out on purpose. The data model can take them without a rewrite if the rules above stay intact.

1. **Review reminder.** A local notification should only open the review screen. It must not complete or reschedule tasks. `expo-notifications` has to be checked against SDK 57 before it is added. There is no settings screen yet.
2. **Weekly or monthly habits.** Everyday habits already exist as one `recurring_tasks` row plus `recurring_logs`. Do not add another schedule by copying a row inside `rescheduleTask`.
3. **Sync.** The device database is the source of truth. A backend should ship `tasks`, `task_history`, `day_reviews`, `recurring_tasks`, and `recurring_logs`. A deleted task is gone from this phone, so the other device needs that deletion or it will keep the old days.
4. **Archive browser.** Delete no longer keeps a copy. An archive would need its own table.
5. **Lint.** Use Node 22 or newer, then `yarn expo lint`, and commit the ESLint config Expo generates.

## Checks worth repeating

```bash
yarn tsc --noEmit
```

On a device or emulator, the regression that matters:

1. Create two tasks for today.
2. Complete one. The week dot stays blue. Complete the other. The dot turns green. Reopen one. The dot turns blue again. Habits on that day do not change the dot.
3. Move one to tomorrow from the review. It disappears from today, appears tomorrow, and keeps its title and priority.
4. Open History for today. That day is not empty and is not 100 percent. The moved task is under Moved away, and its first planned date is unchanged. Tomorrow lists it under Still pending.
5. Force-stop the app and reopen it. The moved task is still on tomorrow.
6. Delete it, cancel once, then confirm. Cancel keeps it. Confirm removes it from the calendar.

Do not treat `yarn reset-project` as a test.
