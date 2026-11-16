# Final Phase Implementation Plan

Scope: per-subject admin attendance, faculty-scoped attendance/assignments, Portal subject editing + cascade deletion, discussions navigation, notification reliability, Roles tab removal, and final cross-app consistency.

## What I found in the current code

- `updateTimetable()` already rebuilds attendance from timetable subjects, but it **fabricates exam marks** (`22/23/24/80`) for every student whenever the timetable changes. That is why marks look "random" and why empty states rarely appear.
- Admin Academics attendance falls back to aggregate `attendance`, not a student directory or per-subject student rows. Per-student attendance also falls back to aggregate totals for students with no map entry.
- Faculty attendance/assignments are **not** filtered by the logged-in faculty; they show every subject.
- Portal subject edits/deletes are section-local: deleting an attendance subject leaves marks intact, and editing a subject title does not update assignments/marks/per-student attendance.
- Discussions community taps only `setViewId(...)`; no stack push, so there is no slide animation and back skips the community list.
- Notifications use 2–4 second triggers and compare raw date strings (so calendar display dates/ranges are missed), and they are only scheduled from `refreshAllData`.
- Roles tab is a bottom tab; Header links to `/(tabs)/roles`.
- Home next-lecture already reads context timetable/calendar, so instant refresh mostly works; accuracy gaps are date parsing, day/name normalization, and faculty-name matching.

---

## 1. Admin attendance: all subjects, with per-student percentages

Files: `app/(tabs)/academics.tsx`

For `role === 'admin'`, the Attendance segment shows **all subjects** (from the shared timetable/attendance source) as subject blocks.

Inside each subject block:

- Header: subject code, title, faculty name, and the class-level percentage badge (existing card layout).
- Below it, the **student list from the single students source** (`useCampusData().students`), one row per student:
  - Student name + roll number
  - That student's attendance percentage for **that subject** (from `getStudentAttendanceRecords(student.id)` / `studentAttendanceMap`)
  - Status color consistent with the app's 75% rule
  - "Not marked" when the student has no saved record for that subject (instead of falling back to aggregate totals)
- No roster/mark controls for admin — editing remains in Portal.
- Empty states: no subjects, no students, and "Not marked" per student row.
- No font-size changes; reuse the existing attendance card typography and spacing.

Faculty (own subjects, roster marking) and student (own records) views remain as planned.

---

## 2. Faculty scoping + instant sync

Files: `app/(tabs)/academics.tsx`, `context/CampusDataContext.tsx`, `utils/lectureUtils.ts`

- Add a normalized faculty-name matcher (case-insensitive, strips `Dr./Prof./Mr./Mrs./Ms.`, punctuation, extra spaces) and use it everywhere faculty ownership is detected.
- Build `facultySubjectCodes` from timetable for the logged-in faculty.
  - **Attendance tab:** only show attendance records whose `courseCode` is in that set; roster button only for those subjects. Marking present/absent continues to update only that student + subject.
  - **Assignments tab:** derive subject blocks and assignment list only from `facultySubjectCodes`; counts use the filtered list. "Add Assignment" subject input becomes a picker limited to the faculty's subjects (pre-selected), instead of free text that can target another subject.
  - **Marks tab:** keep current faculty/admin behavior, but reset the selected subject if it disappears after a timetable edit.
- Instant updates: `createAssignment`, `gradeAssignment`, `submitAssignment`, and attendance actions already update context state. Add notification re-scheduling to assignment mutations, and ensure Portal edits still end with `refreshAllData()`.

---

## 3. Portal subject editing, deletion cascade, marks UI

Files: `app/(tabs)/portal.tsx`, `context/CampusDataContext.tsx`, `services/localDb.ts`

- **Fix marks header overlap:** give the marks section title `flex: 1` + right padding and make the Add Exam Marks button `flexShrink: 0`. Keep font sizes unchanged.
- **Pencil icon on subject blocks:**
  - Marks subject cards: pencil at top-right (card body still opens the student list).
  - Attendance cards: pencil at top-right.
  - Pencil opens a small "Edit Subject" modal with Course Code, Subject Title, Faculty Name.
  - Saving updates timetable slots, aggregate attendance, per-student attendance keys, exam marks rows, and assignments for that course.
  - Include a trash action in the modal (destructive confirm via `Alert`) to delete the subject everywhere.
- **Cascade delete fix:** add shared context functions:
  - `updateSubjectDetails(originalCode, { courseCode, courseTitle, facultyName })`
  - `deleteSubject(courseCode)`
  - They update/persist: `TIMETABLE`, `ATTENDANCE`, `STUDENT_ATTENDANCE`, `EXAMINATION_MARKS`, `ASSIGNMENTS`, update context state, and refresh notifications.
  - Timetable slot save/delete in Portal routes through these helpers when subject-level fields change or the last slot for a subject is removed.
- **Stop fake marks:** change `updateTimetable` to preserve existing marks, update metadata, and prune marks for removed subjects only — never generate marks. New subjects appear in Portal marks with "0 student records" until marks are entered.
- **Subject union in Portal marks:** derive marks subjects from `timetable + attendance + existing marks` so a newly added attendance subject also appears in marks, and vice versa.
- Ensure all save/delete paths persist then `refreshAllData()` so Academics, Home, and Quest update immediately.

---

## 4. Discussions navigation fix

Files: `app/screens/discussions.tsx`

- Replace `setViewId(club.id)` and `setViewId(CAMPUS_FORUM_ID)` with `router.push({ pathname: '/screens/discussions', params: { clubId } })`.
- Sync `viewId` from `params.clubId` when params change, so pushed screens open the right forum.
- Header back and Android back then pop one step: community/forum → community list → prior screen (Events/Profile), never skipping the list.
- This also gives the existing root-stack `slide_from_right` animation automatically (no new animation config needed).
- Keep the community list as the no-param screen.

---

## 5. Notifications (CIE/SEE/assignments, APK-safe)

Files: `services/notificationService.ts`, `utils/lectureUtils.ts`, `services/localDb.ts`, `context/CampusDataContext.tsx`, `app.json`

- Add a flexible calendar date parser (ISO, `Nov 18, 2026`, ranges `2026-11-18 - 2026-11-20`). Reuse it in `isHoliday` and notifications.
- Rewrite scheduling:
  - CIE/internal exam: schedule a **DATE trigger 5 days before the event at 09:00**.
  - SEE/external exam: schedule **10 days before at 09:00**.
  - Assignment: schedule **1 day before due date at 09:00**; skip submitted/graded.
  - If the trigger date is already past but the event/due date is still ahead, fire once shortly after scheduling.
  - Use `Notifications.SchedulableTriggerInputTypes.DATE` with `channelId: 'survive_college_alerts'`.
  - Store a signature of scheduled items in `LocalCampusDB` (new `@sc_notif_schedule_v1` key). Skip re-cancelling/re-firing when nothing changed; this prevents repeated immediate alerts on every portal save.
  - Call scheduling from `createAssignment`, `gradeAssignment`, `submitAssignment`, and existing timetable/calendar/refresh paths.
- `app.json`: add `SCHEDULE_EXACT_ALARM` to Android permissions; on Android 12+ check/request exact-alarm permission once. Note: this requires a fresh APK / EAS build to take effect. Local notifications work offline; no FCM needed.
- Keep the Expo Go channel-NPE suppression and the profile "Test Alert".

---

## 6. Remove Roles tab, add Switch Roles in Profile

Files: `app/(tabs)/_layout.tsx`, `app/screens/roles.tsx` (new), `app/_layout.tsx`, `app/(tabs)/profile.tsx`, `components/common/Header.tsx`

- Hide the Roles tab with `href: null` (remove its icon/label from the bottom bar).
- Add `app/screens/roles.tsx` re-exporting `app/(tabs)/roles.tsx`, and register it in the root stack.
- Add a "Switch Roles" row at the top of **App Settings & Security** in Profile, navigating to `/screens/roles` (same roles UI, with back arrow).
- Update Header role shortcuts (badge + people icon) to open `/screens/roles` so they behave consistently.

---

## 7. Final cross-app consistency checks

- **Students/faculties separation:** keep context `students`/`faculties` as the source; verify Portal, Roles, Academics rosters, marks, attendance, Quest, and event registrations all use the correct list. When a student is deleted in Portal, also clean their progress, per-student attendance, marks, and event registrations so no orphan records show up.
- **Instant portal propagation:** confirm every Portal save/delete calls `refreshAllData()`; `updateTimetable`/`updateCalendarEvents` update context state directly.
- **Next lecture accuracy:** normalize timetable day names and trim times on save/import; use the normalized faculty matcher for Home `nextLectureInfo` and "Today's Lectures to Conduct"; use the new calendar parser for holiday detection so uploaded calendar edits reflect immediately and correctly.
- **Faculty "Today's Lectures":** also show holiday state instead of stale lectures when today is a calendar holiday.
- **Quest:** no further change; leaderboard ordering and `overflow: 'hidden'` radius fix are already in place.

---

## Validation

- `cmd /c "npx.cmd tsc --noEmit"`
- `cmd /c "npx.cmd expo lint"` — only the 6 known pre-existing errors allowed.
- Manual checks:
  - Admin: Attendance tab shows every subject, and every subject lists all students with that student's per-subject attendance percentage.
  - Faculty: only own attendance/assignments; mark roster updates student/faculty/portal instantly.
  - Portal: edit subject title/faculty → timetable, attendance, marks, assignments update instantly; delete subject → disappears everywhere; new timetable subject appears in attendance/marks.
  - Discussions: open community animates in; hardware back returns to community list; back again returns to Events/Profile.
  - Notifications: test alert plus scheduled CIE/SEE/assignment triggers in a release APK.
  - Roles: no bottom tab; Profile → Switch Roles opens the same screen.

---

## Decisions

- Deleting a subject cascades to timetable, attendance, per-student attendance, exam marks, and assignments. Notes/PYQs files are kept.
- Admin attendance is read-only in Academics; all attendance editing remains in Portal.
- No font-size changes — only layout fixes around the Add Exam Marks button.
