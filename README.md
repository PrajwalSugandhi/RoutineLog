# DayFlow

DayFlow is an Android-first daily planner. It combines a to-do list with a calendar so unfinished work stays visible instead of disappearing at midnight.

You plan a day, check tasks off as you finish them, and at the end of the day decide what happens to anything still open: mark it done, move it to tomorrow, move it to another date, or leave it where it is. Week and month views, plus a history screen, all read the same saved tasks.

The app works offline. Tasks, reviews, and history stay on the device in a local SQLite database.

## Who it is for

DayFlow is a personal productivity app. It is meant for someone who wants to plan one day at a time, look back at what was finished or postponed, and carry unfinished work forward only when they choose to.

## What you can do

- Add, edit, complete, reopen, and delete tasks for any date.
- See daily progress: how many tasks are done and how many are still open.
- Switch between day, week, and month. Selecting a date shows that day’s tasks.
- Review a day and explicitly resolve every unfinished task.
- Inspect an earlier day without the record changing just because a task was later moved.
- Keep working after the app is closed. Data is not stored in an account or on a server.

## Tech stack

| Piece | Version |
| --- | --- |
| Expo SDK | 57 |
| React Native | 0.86 |
| React | 19.2 |
| TypeScript | strict |
| Navigation | Expo Router, file-based routes in `src/app` |
| Storage | `expo-sqlite` |
| UI | React Native, plus `@expo/ui` for the native date and time picker |

Android is the target platform. The project can also open in Expo Go on iOS, and a limited web build exists for development.

## Run it

Requirements: Node.js, Yarn 1.22 (`yarn.lock` is the lockfile), and either an Android emulator or the Expo Go app.

```bash
yarn install
yarn expo start --android
```

`yarn start` opens the Expo dev server. From there you can press `a` for Android.

## Android APK

A phone can install DayFlow without Expo Go. The APK is a release build, so the app includes its JavaScript and does not need the computer to stay running. `android/` is generated and not committed. The application id is `com.dayflow.app`.

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
yarn install
yarn expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
mkdir -p ../dist
cp app/build/outputs/apk/release/app-release.apk ../dist/dayflow.apk
```

The file to copy to the phone is `dist/dayflow.apk`. With the phone connected, `adb install -r dist/dayflow.apk` installs it. The APK is signed with the debug keystore created by prebuild, which is enough to install it and is not a Play Store upload key. The same steps, and the commands for Expo Go, a debug run, and a Play bundle, are in [docs/README-DEVELOPER.md](docs/README-DEVELOPER.md).

More detail:

- Using the app day to day: [docs/README-USER.md](docs/README-USER.md)
- Continuing the code: [docs/README-DEVELOPER.md](docs/README-DEVELOPER.md)

## How the app is organized

```text
src/app/            screens and navigation (Today, Habits, History)
src/screens/        screen logic
src/components/     task rows, calendars, review, forms
src/hooks/          load and refresh tasks, reviews, and history
src/services/       validation and multi-step task rules
src/repositories/   SQL
src/database/       SQLite setup and migrations
src/utils/          dates, calendar grids, review and history math
src/types/          shared TypeScript types
```

Screens stay thin. SQL stays in repositories. A task’s scheduled date is a local calendar day (`YYYY-MM-DD`), never a UTC timestamp sliced to a date.

## Data

One database file, `dayflow.db`, holds five tables:

- `tasks` — the current plan for each one-off task
- `task_history` — created, completed, reopened, rescheduled, and deleted events
- `day_reviews` — whether that day’s review is unfinished or finished
- `recurring_tasks` — an everyday habit, either yes/no or a number
- `recurring_logs` — the value logged for one habit on one calendar day

Deleting a task archives it. The row and its history remain, and the task disappears from the calendar.

## Current scope

Included now:

- Daily task management with priority, notes, and an optional time
- Day, week, and month calendars
- End-of-day review with an explicit choice for every open task
- History and simple week rates based on events, not only the task’s current date
- Everyday habits: a yes/no tick or a daily number, with a date-range total

Not included yet:

- Reminders or notifications
- Habits that repeat only on chosen weekdays, or every week or month
- Accounts, sync, or a backend
- A settings screen

Unfinished tasks are never moved automatically overnight.

## Status

This is a working personal app, exercised on an Android emulator with Expo Go. TypeScript checking passes. Automated lint is not set up on Node 20; the Expo lint packages expect Node 22.
