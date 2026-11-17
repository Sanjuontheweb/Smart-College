# Survive College

> One app for the whole campus — timetable, attendance, marks, events, quests and direct lines to faculty. Built for phones, not laptops.

**Expo SDK 58 · React Native 0.88 · React 19 · TypeScript · Expo Router**

---

## Why it's different

| Typical college app | Survive College |
| --- | --- |
| Read-only notice board | Every role edits what it owns, and the change lands **instantly across the app** — no refresh |
| One-size screen | **Three role lenses** (student / faculty / admin) on the same data, switchable from Profile |
| Needs a server to be useful | **Local-first**: device storage + a file vault; works offline, cloud is optional |
| Dumb uploads | **AI reads your real timetable & academic calendar** from a photo or PDF and rebuilds them slot by slot |

## The three lenses

**Student** — colour-coded timetable · attendance meter with a 75% threshold marker and safety bands · collapsible exam marks with aggregate + classification · assignment submission · notes & PYQs · XP, badges, leaderboard · event registration.

**Faculty** — own teaching schedule · mark class attendance · publish and grade assignments · upload study material · top-scorer insight per subject · cabin card, college-layout pointers and private channels with students.

**Admin** — campus CRUD via Portal: subjects, students, faculty, timetable, calendar, marks, attendance, events, clubs, internships, notices · read-only review of reported private channels · one-tap broadcasts.

## Feature highlights

- **Academics** — six segments: Timetable, Attendance, Exam Marks, Assignments, All Study Materials, and a **month-grid Academic Calendar** with per-day agenda. Every subject keeps one consistent tint everywhere; `Others` stays grey.
- **Exam marks** — admin sees collapsible subject cards without the Top Scorer card; faculty gets Top Scorer inside the subject. Student marks cards stay readable on tinted backgrounds.
- **Portal AI import** — timetable analysis runs as a pipeline: validate the document → read the header → locate the grid → detect the day axis → rebuild period and break timings → enumerate cells (labs as one multi-period slot) → resolve subject and faculty abbreviations, including subjects shared by two faculty. Clarifications are applied as a **surgical patch** (`updates` / `additions` / `removals`), never a rewrite of the week.
- **Academic calendar import** — holidays, CIE/SEE blocks, fests and multi-day spans, with range parsing.
- **Private channels** — 1:1 chat opened from the faculty directory; one channel per pair, capped at 50, no self-chat. Either participant or an admin can delete; a report notifies admins, who can read the channel without sending. Faculty reporting an admin conversation deletes it immediately.
- **College layout** — upload a campus map as image or PDF, add faculty/admin pointers below it (students read-only), view, or delete with an in-app confirmation.
- **Campus Quest** — XP from submissions, attendance and replies; staff see the reward without the progress bar.
- **Notifications** — local scheduling with exact-alarm permission: CIE 5 days ahead, SEE 10 days, assignments 1 day, all at 09:00, de-duplicated by signature.
- **Design system** — light/dark theme tokens, 13 equally-bright subject tints, no per-screen colour hacks; destructive prompts are in-app, never OS alerts.

## Getting started

```bash
npm install
npx expo start          # scan the QR with Expo Go (same Wi-Fi) or press `a`
```

The app seeds itself on first launch — students, faculty, timetable, calendar, marks, events, quests — so there is nothing to configure before exploring.

**AI Assistant:** open the AI Companion tab and paste a free [Groq](https://console.groq.com) key. It is kept in `expo-secure-store` on the device and used for chat, timetable OCR and calendar OCR.

**Optional cloud:** `.env` can hold `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`; SQL lives in `supabase/` (`schema.sql`, `seed.sql`). The app runs fully without it.

## Ship an APK

```bash
npx eas-cli@latest build -p android --profile preview
```

EAS returns a download link and QR code when the build finishes. For a local build with Android Studio installed, use `npx expo run:android`.

`ios/` and `android/` are generated — configure native behaviour in `app.json`, never by editing those folders.

## Verify before committing

```bash
npx tsc --noEmit     # types
npx expo lint        # eslint
npx expo-doctor      # dependency / config health
```

## Project map

```
app/(tabs)/        Home · Academics · AI Companion · Portal · Events · Profile
app/screens/       Quest · Discussions · Private chat · Faculty directory · Study materials · Roles
context/           Auth, Campus data, Theme, Notices
services/          localDb (storage), aiService (chat + OCR), notifications, documents, Supabase
utils/             subject colours, CGPA bands, lecture helpers
supabase/          schema.sql, seed.sql
server/            optional Node proxy (legacy Gemini path)
```

## Data & privacy

- Campus records live on the device (AsyncStorage) and uploaded files in the app's local vault.
- AI keys stay in secure storage; no secrets are committed — `.env`, plans and scratch folders are git-ignored.
- Attendance and marks are scoped per role: students see their own, faculty see their subjects, admins review everything.
