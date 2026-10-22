# DayFlow user guide

DayFlow helps you plan a single day, see what you finished, and decide what to do with anything left over. It is a calendar and a to-do list together. Closing the app does not clear your tasks. They stay on this phone.

Nothing moves itself to the next day. A task stays on the date you gave it until you complete it, delete it, or choose a new date.

## Open the app

On a computer, in the project folder:

```bash
npm install
npx expo start --android
```

That starts the app on an Android emulator. You can also install Expo Go on a phone, run `npx expo start`, and scan the QR code. The phone and the computer need to be on the same network.

The first screen is **Today**. The other tabs are **Habits** and **History**.

## Today

Today opens on the current date. The heading shows the day. Under it:

- **Previous** and **Next** move by one day, one week, or one month, depending on the view you are in.
- **Today** appears when you are looking at any other date. It jumps back to the current day.
- **Day**, **Week**, and **Month** change only the calendar. The tasks underneath are always the tasks for the date you selected.

**Day** is a simple list.

**Week** is the seven days of that week, Sunday through Saturday. A number on a day is how many tasks are planned there. The color shows whether any of them are still open. Tap a day to see its tasks.

**Month** is a normal month grid. Days from the previous or next month are faded but can still be tapped. A number on a date means that date has tasks. An unfinished day and a fully finished day use different colors.

The progress line under the calendar is only for the selected day, for example “2 of 5 complete.”

### Add a task

Tap the **+** button, or **Add task** when the day is empty.

- **Title** is required.
- **Notes**, **priority**, and **time** are optional.
- **Date** is the day the task is planned for. You can type `YYYY-MM-DD`, step to the previous or next day, or use **Choose date** on Android.
- **Save task** writes it immediately.

The task is given its own id. Renaming it does not create a second task.

If you save a task onto a different day from the one you are viewing, DayFlow switches to that day so you can see it.

### Work through the list

- Tap the circle to mark a task done. Tap it again to reopen it.
- Tap the title to edit the task.
- Tap **Delete** and confirm. Cancel leaves the task in place.

A finished task stays on that day, crossed out, so you can still see that it was part of the plan. Completing it does not move it and does not create a copy.

Priority is shown as Low, Medium, or High. A time, if you set one, is the local time of day.

Under the one-off list, **Every day** shows habits that have already started by the selected date. That block does not change the “2 of 5 complete” line.

- A **yes/no** habit, such as the gym, has a circle. Tick it on a day you went. Leave it clear on a day you did not.
- A **number** habit, such as practice questions, shows the count saved for that day. You type the number in the review, or on the habit’s own screen. Blank counts as zero.

## Habits

Habits is the second tab. It is for something you do every day, separate from a task that belongs to one date.

Tap **+** and choose:

- **Yes/no** — tick the days you did it.
- **Number** — record how many you did on each day.

Title is required. Notes are optional. **Starts** is the first day that counts. The type cannot be changed later. The habit then repeats on every calendar day from that start date. There is no weekly or monthly repeat.

Each row shows today. A yes/no row can be ticked there. A number row shows today’s count. Tap the row to open the habit.

The habit screen is where you change the title, notes, or start date, and where you see a range:

- Set **From** and **To**.
- Yes/no shows how many days you went and how many you did not.
- Number shows the total for the range.
- Each day in the range is listed, and you can correct it there.

Days before the start date are ignored. Days after today are ignored, so a future day is not counted as missed and is not added into the total. A day you never ticked counts as not visited. A number you never entered counts as zero.

Delete asks you to confirm, then hides the habit. The saved days stay on the phone.

## Review this day

**Review this day** sits under the Day / Week / Month switch. It always reviews the date you currently have selected, which may be today or an earlier day.

The status under the button means:

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

**Finish review** saves that outcome. If anything is still open, DayFlow asks you to confirm and tells you how many tasks will stay. You can come back later. The same tasks and the same status are shown again.

## History

History is the second tab. The numbers at the top are about the real current week:

- **Checked off today** — tasks you marked done today, by the clock on this phone.
- **Checked off this week** — the same, for Sunday through Saturday of this week.
- **Still open** — every unfinished task, on any date.
- **Postponed** — tasks you moved to a later day at least once.

The week row follows the date you are inspecting. Each day shows the percent of that day’s plan that was finished for that day. A dash means nothing was planned. A number on the Today tab’s week strip is different: that one is a task count. Moving a task off a day does not make that day look empty, and it does not make the remaining tasks look like a perfect day.

Under the selected date:

- **Still pending** — unfinished tasks that are still scheduled there.
- **Completed for this day** — tasks finished while they were planned for that day. If you later moved one, the row says where it is now. Reopening a task removes that credit.
- **Moved away** — tasks that left this day before they were finished. The first planned date stays visible.
- **Postponed tasks** — the longer list of tasks that have been pushed to a later day, with how many times that happened.

The review line tells you whether that date’s review was started or finished.

## What is saved

Tasks, completion, dates, postpone counts, review status, history, everyday habits, and the day-by-day log for each habit are stored on the device. Force-stopping or restarting the phone does not wipe them. Uninstalling the app does.

There is no account. There is no copy in the cloud. A second phone will not have these tasks.

## What DayFlow will not do yet

- It will not remind you to review the day.
- It will not repeat a habit on chosen weekdays, or every week or month. An everyday habit repeats every calendar day from its start date.
- It will not sync to another device.
- It will not carry every unfinished task forward at midnight. Only a choice in the review, or an edit to the date, moves a task.

On the web preview, the calendar popup for a date is not available. Type the date as `YYYY-MM-DD`. Android and the emulator have the system date picker.
