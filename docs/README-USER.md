# RoutineLog user guide

RoutineLog helps you plan a single day, see what you finished, and decide what to do with anything left over. It is a calendar and a to-do list together. Closing the app does not clear your tasks. They stay on this phone.

Nothing moves itself to the next day. A task stays on the date you gave it until you complete it, delete it, or choose a new date.

## Open the app

On a computer, in the project folder:

```bash
yarn install
yarn expo start --android
```

That starts the app on an Android emulator. You can also install Expo Go on a phone, run `yarn expo start`, and scan the QR code. The phone and the computer need to be on the same network.

To install RoutineLog without Expo Go, use the APK described in the developer guide. Copy `dist/routinelog.apk` to the phone and open it, or with the phone connected run `adb install -r dist/routinelog.apk`. That install does not need the computer to stay on. Uninstalling it deletes the tasks saved in that copy.

The first screen is **Home**. The other tabs are **Habits** and **History**.

## Home

Home opens on the current week. The heading is the month, for example **October**. The icon just left of the three dots switches between **Week** and **Month**. **Week** is the default.

- **Week** is Sunday through Saturday under the month name. Tap a day to see it. Swipe the heading or the week left for the next week, and right for the previous week.
- **Month** replaces the week with a month grid. Swipe it to change the month. Days from the previous or next month are faded but can still be tapped. A number on a date is how many tasks are planned there. An unfinished day and a fully finished day use different colors.

The three-dot menu is for the day you have selected:

- **Review this day** opens the review. The line under it is the review status.
- **Go to today** appears when you are looking at any other date.

In Week view the date number and the dot under it mean different things.

- A **blue circle** is the day you are looking at.
- A **blue number**, with no circle, is today when you are looking at another day.
- A **blue dot** means at least one task on that day is still open.
- A **green dot** means every task on that day is done.
- **No dot** means that day has no tasks. Habits do not add a dot.

Under the calendar the selected day has two sections.

- **Tasks** is the one-off list for that day. If the day has habits but no tasks, the section says nothing is planned.
- **Habits** is every habit that has already started by that date. If the day has tasks but no habits, the section says so.

If the day has neither tasks nor habits, those headings stay hidden and the screen says **You have a free day**.

### Add a task

Tap the **+** button. That opens a new screen for the day you are viewing.

- **Title** is required.
- **Notes**, **priority**, and **time** are optional.
- **Date** is the day the task is planned for. You can type `YYYY-MM-DD`, step to the previous or next day, or use **Choose date** on Android.
- **Save task** writes it immediately and returns to Home on that date.

The task is given its own id. Renaming it does not create a second task.

If you save a task onto a different day from the one you were viewing, Home opens on the saved day.

### Work through the list

- Tap the circle to mark a task done. Tap it again to reopen it.
- Tap the title to edit the task.
- Tap **Delete** and confirm. Cancel leaves the task in place.

A finished task stays on that day, crossed out, so you can still see that it was part of the plan. Completing it does not move it and does not create a copy.

Priority is shown as Low, Medium, or High. A time, if you set one, is the local time of day.

The **Habits** section does not change the dots on the week strip.

- A **yes/no** habit, such as the gym, has a circle. Tick it on a day you went. Leave it clear on a day you did not.
- A **number** habit, such as practice questions, has a field for that day. Type a whole number and leave the field, or open the review or the habit’s own screen and enter it there. A blank field stores nothing and counts as zero.

## Habits

Habits is the second tab. It is for something you do every day, separate from a task that belongs to one date.

Each row shows the habit’s type and today’s status. Tap the row to open the habit. Tap **+** to add one. The new-habit screen asks you to choose:

- **Yes/no** — tick the days you did it.
- **Number** — record how many you did on each day.

Title is required. Notes are optional. **Starts** is the first day that counts. The type cannot be changed later. The habit then repeats on every calendar day from that start date. There is no weekly or monthly repeat.

The habit screen is a review of that habit, not the edit form.

- **Today** logs the current day. Yes/no uses **+ Log** and **Done**. Number uses the count field.
- **Insights** shows the current streak, the last 30 days, how many days were done, and how many days have been tracked.
- **Habit HeatMap** shows the days since the start date.
- **Notes** shows the saved notes.
- **From** and **To** choose a range. Yes/no shows how many days you went and how many you did not. Number shows the total for the range. Each day in the range is listed, and you can correct it there.

The edit button on that screen is where you change the title, notes, or start date.

Days before the start date are ignored. Days after today are ignored, so a future day is not counted as missed and is not added into the total. A day you never ticked counts as not visited. A number you never entered counts as zero.

Delete is on the edit screen. It asks you to confirm, then hides the habit. The saved days stay on the phone.

## Review this day

**Review this day** is in the three-dot menu on Home. It always reviews the date you currently have selected, which may be today or an earlier day.

The status under that menu row means:

| Status | Meaning |
| --- | --- |
| Not started | You have not opened the review. |
| In progress | You opened it, or started deciding, and have not finished. |
| Finished | You finished the review and nothing was left open. |
| Finished with tasks still open | You finished on purpose while some tasks stayed on that day. |
| New tasks are still open | You had finished, then added more tasks afterward. |

Opening the review does not finish it, and it does not complete or move any task.

If you have everyday habits, they appear under **Every day** before the one-off tasks. Tick a yes/no habit, or type a number. Leaving a number blank stores nothing and counts as zero. Those entries do not decide whether the review is finished.

For each task still open you get four choices:

- **Done** — mark it complete and keep it on this day.
- **Tomorrow** — move it to the next calendar day. Reviewing Monday means Tuesday, not “whatever tomorrow is when you happen to open the app.”
- **Another date** — type a date or pick one, then tap **Move**. The same date is rejected.
- **Keep here** — leave it on this day. It stays in the list. The review is still incomplete until you finish.

Completed tasks are in a separate section you can show or hide. Tasks you already moved are listed under **Moved away**.

The summary counts:

- Planned
- Completed
- Still open
- Moved to tomorrow
- Moved to another date

**Finish review** saves that outcome. If anything is still open, RoutineLog asks you to confirm and tells you how many tasks will stay. You can come back later. The same tasks and the same status are shown again.

## History

History is the third tab. The numbers at the top are about the real current week:

- **Checked off today** — tasks you marked done today, by the clock on this phone.
- **Checked off this week** — the same, for Sunday through Saturday of this week.
- **Still open** — every unfinished task, on any date.
- **Postponed** — tasks you moved to a later day at least once.

The week strip matches Home: weekday, date, and a dot. The arrows beside the week title move to the previous or next week. Tap a day to inspect it. The sections under the strip are unchanged.

A dot here uses History’s count for that day, which includes tasks later moved away. It is not the same dot as on Home, which only looks at tasks still scheduled there.

- A **blue dot** means at least one task is still waiting on that day.
- A **green dot** means the day had a plan and nothing is still waiting there. A task you moved away unfinished does not keep the dot blue.
- **No dot** means nothing was planned.

The line under the selected date is still the full count, such as “1 of 2 finished.” Moving a task off a day does not make that line empty, and it does not make that line 100 percent.

Under the selected date:

- **Still pending** — unfinished tasks that are still scheduled there.
- **Completed for this day** — tasks finished while they were planned for that day. If you later moved one, the row says where it is now. Reopening a task removes that credit.
- **Moved away** — tasks that left this day before they were finished. The first planned date stays visible.
- **Postponed tasks** — the longer list of tasks that have been pushed to a later day, with how many times that happened.

The review line tells you whether that date’s review was started or finished.

## What is saved

Tasks, completion, dates, postpone counts, review status, history, everyday habits, and the day-by-day log for each habit are stored on the device. Force-stopping or restarting the phone does not wipe them. Uninstalling the app does.

There is no account. There is no copy in the cloud. A second phone will not have these tasks.

## What RoutineLog will not do yet

- It will not remind you to review the day.
- It will not repeat a habit on chosen weekdays, or every week or month. An everyday habit repeats every calendar day from its start date.
- It will not sync to another device.
- It will not carry every unfinished task forward at midnight. Only a choice in the review, or an edit to the date, moves a task.

On the web preview, the calendar popup for a date is not available. Type the date as `YYYY-MM-DD`. Android and the emulator have the system date picker.
