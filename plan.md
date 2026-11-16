# Survive College - Project Handbook (`plan.md`)

> **Read this before touching code.** This file is the authoritative description of how this app is built, what it must remain, and the rules a model must follow when extending it. `README.md` and `AGENTS.md` are partially outdated (see section 16). When they conflict with this document or the code, **this document and the code win**.

---

## 1. What this project is

**Survive College** is a **local-first, offline Android mobile app** built with **React Native + Expo SDK 58 + TypeScript + Expo Router**. It simulates a full college campus experience for three personas - **Student**, **Faculty**, **Administrator** - with academics, attendance, assignments, notes/PYQs, events, clubs, internships, discussions, gamification ("Campus Quest" XP/badges/leaderboard), notifications, faculty/admin governance portals, and an **online AI academic companion** (Groq Cloud; Hugging Face fallback).

Key truths:

- **No login, no backend, no cloud database in the live flow.** All app data lives on device (AsyncStorage + app document directory). There is no sign-out.
- **Personas are switched instantly** from the Roles tab / header. `isAuthenticated` is always `true`. This is a demo-grade role switch, **not** real authorization. Do not claim otherwise in UI copy.
- **The AI is the only network feature.** It calls Groq Cloud directly from the device using a user-supplied free API key stored in `expo-secure-store`.
- The pre-existing `server/` (Gemini Express proxy) and `supabase/` (Postgres schema/RLS) folders are **legacy/reference artifacts, not wired into the running app**. Do not reintroduce them into the client without an explicit request.
- App identity: **Survive College** (retro arcade "SC" badge, purple/neon palette). The repo folder name (`Smart College`), `package.json` name (`smart-campus-app`), README title ("Smart Campus AI"), and email domains (`@smartcampus.edu`) are legacy naming. **User-visible UI says "Survive College."**

Platform target: Android-first (Expo Go / APK), with web kept buildable but secondary.

---

## 2. Tech stack (exact)

| Area | Choice / version |
|---|---|
| Expo | `expo ~58.0.21` (SDK 58) |
| React Native | `0.88.1` |
| React | `19.3.0` |
| Language | TypeScript `~6.0.3`, `strict: true` |
| Routing | Expo Router `~58.0.29` (file-based), typed routes enabled |
| Animations | `react-native-reanimated 4.7.1` + `react-native-worklets 0.13.0` |
| Gestures/Safe area | `react-native-safe-area-context ~5.10.1`, `react-native-screens ~4.30.0` |
| Storage | `@react-native-async-storage/async-storage 2.2.0` |
| Secure storage | `expo-secure-store ~58.0.2` |
| Files | `expo-file-system ~58.0.13` - **always import `expo-file-system/legacy`** (new API not used here) |
| UI extras | `expo-blur` (tab bar), `@expo/vector-icons` (Ionicons only), `expo-document-picker`, `expo-intent-launcher`, `expo-web-browser`, `expo-sharing`, `expo-splash-screen`, `expo-linear-gradient` (installed, unused) |
| Notifications | `expo-notifications ~58.1.8` (local only) |
| AI | `fetch` to `https://api.groq.com/openai/v1/chat/completions`; HF Inference fallback; `pako` for PDF stream inflate |
| Legacy/unused | `@supabase/supabase-js`, `react-native-url-polyfill`, `expo-symbols`, `expo-application` |

- Package manager: **npm** (`package-lock.json` present; no bun lock).
- No NativeWind/Tailwind. No Redux/Zustand/React Query. No Jest/test runner configured.
- Path alias `@/*` maps to repo root (configured in `tsconfig.json`; do not add a custom babel config).
- No `android/` or `ios/` folders - **Continuous Native Generation**. Never create native folders; configure in `app.json`.
- No git repository initialized in this directory. There is **no undo** - prefer small targeted edits; never bulk-delete or reformat.

---

## 3. Repo map (where everything lives)

```
app/
  _layout.tsx              Root stack + all providers + global Stack.Screen registry
  (tabs)/
    _layout.tsx            7 tabs, role tint, blurred absolute tab bar
    index.tsx              Home (role-specific dashboards)
    academics.tsx          Student/Faculty academics (1,757 lines - big)
    assistant.tsx          AI chat UI (1,201 lines)
    portal.tsx             Faculty/Admin governance portal (3,520 lines - biggest)
    events.tsx             Events, clubs, internships/opportunities
    roles.tsx              Persona switcher
    profile.tsx            Profile, settings, feature hub, notification test
    admin-console.tsx      LEGACY / DEAD (hidden tab, Supabase + NativeWind classes)
  screens/
    academics|assistant|portal.tsx   1-line re-exports of the tab screens
    campus-quest.tsx       XP, badges, leaderboard screens/quests
    discussions.tsx        Forum list/create/reply
    faculty-directory.tsx  Faculty cabins + office hours
    study-materials.tsx    Notes/PYQs library, open/view files
    admin-console.tsx      REAL admin console (broadcast, reset, users)
  modal.tsx                "About app" modal
  +not-found.tsx, +html.tsx
components/
  common/   Header, RetroLogo, RoleBadge, RoleSwitcherSheet (unused), FormattedMarkdownText, DocumentReaderModal (unused)
  ui/       Card, Button, Badge, ProgressRing (AttendanceMeter), NextLectureCard,
            CustomNotice (legacy), PortalSection (legacy/dead)
  Themed.tsx, StyledText.tsx, ExternalLink.tsx, EditScreenInfo.tsx, useColorScheme*.ts   (template leftovers)
constants/
  CampusData.ts   Types + demo users + all seed sample content + FACULTY_DIRECTORY + CAMPUS_SERVICES
  Colors.ts       Light/dark design tokens
  Config.ts       App meta + Supabase/AI-server env + (deprecated) HF token loader
context/
  ThemeContext.tsx      light | dark | system, persisted
  AuthContext.tsx       active persona + student/faculty lists
  CampusDataContext.tsx All academic data + mutations + XP (661 lines)
  NoticeContext.tsx     Animated in-app toast banner (useNotice)
services/
  localDb.ts       LocalCampusDB: AsyncStorage collections, seeds, per-student attendance,
                   exam marks, opportunity records, clubs, document vault, semester reset (861 lines)
  aiService.ts     Models, tokens, chat, PDF extraction, timetable/calendar analysis (1,048 lines)
  documentService.ts  Open/save PDFs via Android intent, generate fallback PDF
  notificationService.ts  Permission + local scheduling for exams/assignments
  supabase.ts      Legacy client (only dead files import it)
  ocrService.ts    Legacy, uses removed `Constants.manifest`
  secureStorage.ts SecureStore wrapper with `sc_survive_college_` prefix + web fallback
utils/
  lectureUtils.ts        Next-lecture state machine, time parsing, holidays, room display
  lectureUtils.test.ts   Not run by any runner
  testNextLecture.js     Scratch script
server/            Legacy Express + Gemini proxy (own node_modules), not used by app
supabase/          Legacy SQL schema + RLS + seed, not used by app
scripts/generate-keystore.js   Local APK signing keystore generator (node-forge)
keystores/release.keystore     Local signing key (gitignored) - DO NOT delete/rotate
credentials.json                Local EAS credentials (gitignored) - DO NOT commit
assets/            icons/splash/font (SpaceMono loaded, mostly unused)
app.json, eas.json, tsconfig.json, eslint.config.js, opencode.json, AGENTS.md
```

Rough size map: `portal.tsx` 3,520 lines, `academics.tsx` 1,757, `assistant.tsx` 1,201, `aiService.ts` 1,048, `localDb.ts` 861, `CampusData.ts` 806, `index.tsx` 685, `CampusDataContext.tsx` 661.

---

## 4. Runtime architecture

```
app/_layout.tsx
+-- SafeAreaProvider
    +-- ThemeProvider (ThemeContext: colors, mode, isDark)
        +-- AuthProvider (persona, role, students/faculties lists)
            +-- CampusDataProvider (all data collections + actions)
                +-- NoticeProvider (global animated toast overlay)
                    +-- RootLayoutNav (NavigationThemeProvider + Stack)
```

- `_layout.tsx` registers every stack screen: `(tabs)`, `screens/campus-quest`, `screens/discussions`, `screens/faculty-directory`, `screens/study-materials`, `screens/admin-console`, `screens/academics`, `screens/assistant`, `screens/portal`, and `modal`.
- Stack options: `headerShown:false`, `animation:'slide_from_right'`, `animationDuration:90`, gestures enabled, theme background.
- **Every screen renders `<Header />` itself.** There are no native stack headers except the About modal.
- Data flow: screen -> `useCampusData()` action -> optimistic React state update -> `LocalCampusDB` write (often fire-and-forget) -> `refreshAllData()` where needed.
- Providers initialize from storage on mount (`AuthContext` -> `LocalCampusDB.init()` + lists; `CampusDataContext` -> `refreshAllData()`).
- `AuthContext` restores active user from `@sc_current_active_user` and role from `@current_active_role`.

---

## 5. Local data layer - the rules

`services/localDb.ts` is the **single source of truth** for persistence. Screen code must not use `AsyncStorage` directly.

### 5.1 AsyncStorage keys

All collections are JSON arrays under `@sc_local_*_v1`:

`STUDENTS`, `FACULTIES`, `TIMETABLE`, `CALENDAR_EVENTS`, `ATTENDANCE`, `STUDENT_ATTENDANCE`, `EXAMINATION_MARKS`, `ASSIGNMENTS`, `STUDY_MATERIALS`, `CAMPUS_EVENTS`, `QUESTS`, `CLUBS`, `INTERNSHIPS`, `STUDENT_OPPORTUNITIES`, `ANNOUNCEMENTS`.

Other keys:
- `@sc_local_db_initialized_v2` - seed sentinel. **Bump the suffix** if you change seed shape/content and want existing installs to reseed (this overwrites local edits; there is no migration system).
- `@sc_current_active_user`, `@current_active_role` - persona session.
- `@app_theme_mode` - `light | dark | system`.
- SecureStore keys (prefixed `sc_survive_college_`): `GROQ_TOKEN`, `HF_TOKEN`.

### 5.2 Initialization and seeding

- `LocalCampusDB.init()` is idempotent, guarded by an in-memory flag + sentinel.
- `seedAll()` seeds **14 collections**: 5 students, 4 faculties, timetable, 8 calendar events, aggregate attendance, exam marks for `usr_student_01`, assignments, materials, events, quests, 3 clubs, internships, student opportunity records, announcements.
- Getters take a fallback array, so a missing key returns seed data without persisting it.
- Seed content is intentionally a realistic Indian VTU-style campus (Sem 4 CSE, course codes BCS401/403/405A/BBOK407, Nov 2026 dates, Bengaluru context). **Keep new content consistent with this fiction.**

### 5.3 Important data shapes

- **Identity:** `usr_student_01` (Aarav Sharma, 1MS24CS042), `usr_faculty_01` (Dr. Priya Raman), `usr_admin_01` (Dr. Rajesh Verma). All emails `@smartcampus.edu`.
- **Attendance is dual-stored:**
  - `ATTENDANCE`: aggregate `AttendanceRecord[]` per course (`attended`, `total`, derived `percentage`, `status`).
  - `STUDENT_ATTENDANCE`: `Record<studentId, Record<courseCode, {attended,total}>>`, overlaid by `getAttendance(studentId)` / `getStudentAttendanceRecords(studentId)`.
  - Baseline map is returned as a fallback but **not persisted** until a write occurs.
  - Thresholds: `>=75%` safe, `65-74%` warning, `<65%` critical. Keep these colors/labels consistent everywhere.
- **Exam marks:** `internal1 + internal2 + labInternal` (25 each) + `externalExam` (100) = `totalMarks` / 175. `getExaminationMarks()` auto-generates plausible marks for students that lack records. Grades: O/A+/A/B+/B/C/F; status: Distinction/First Class/Pass/Backlog.
- **XP:** `CampusDataContext` starts at `720`; actions add: event register `+30`, opportunity apply `+40`, club join `+25`, discussion reply `+25`, quest claim `+20` or the quest's reward `+50`; event cancel `-30`. Show XP through `showNotice({ xpReward })`.
- **Clubs:** `joinedMemberIds[]` + `isMember`; join returns a welcome message used in a notice.
- **IDs:** prefixes `tt_`, `cal_`, `asg_`, `mat_`, `anc_`, `evt_`, `opp_`, `qst_`, `club_`, plus `Date.now()` + short random suffix for created records. Reuse these conventions.
- **Dates:** stored as display strings like `Nov 18, 2026`, calendar dates as `YYYY-MM-DD`; timetable times as `09:00 AM`. Use `utils/lectureUtils.ts` helpers; do not introduce a date library.

### 5.4 File vault

- Uploaded documents are copied to `${FileSystem.documentDirectory}survive_college_docs/` with a `Date.now()` prefix and sanitized filename (`saveLocalDocument`). Metadata (uri/path/size/text) is stored on the `StudyMaterial` record.
- Web uploads use base64/data-URI fallbacks.
- Opening uses Android `ACTION_VIEW` via `expo-intent-launcher` (content URI conversion), falling back to `expo-web-browser` / `expo-sharing`; a valid fallback PDF is generated if the file is missing.

### 5.5 Semester reset

`LocalCampusDB.resetSemester()` clears timetable, calendar events, aggregate attendance, exam marks, assignments and resets quest progress. It **keeps** students, faculties, clubs, events, notes, internships, announcements. Triggered from the admin console/portal behind a destructive confirmation. Preserve this contract.

---

## 6. Navigation and routing rules

- Use **Expo Router** only. `Link`, `router.push/back`, `useRouter`, `usePathname`, `useLocalSearchParams`.
- Route files live in `app/`. Non-route logic stays in `components/`, `context/`, `services/`, `utils/`, `constants/`.
- **Detail-screen pattern:** the real implementation is often a tab screen, and `app/screens/academics.tsx`, `assistant.tsx`, `portal.tsx` are 1-line `export { default } from '../(tabs)/...'` wrappers that only exist to give a stack route. Edit the `(tabs)` file, not the wrapper.
- When adding a stack screen: create `app/screens/<name>.tsx`, register it in `app/_layout.tsx` inside the `<Stack>`, and navigate with `router.push('/screens/<name>')`.
- Tabs are fixed and icon-labeled with Ionicons: Home, Academics, AI Companion, Portal (faculty/admin only), Roles, Events, Profile.
  - Portal tab visibility: `href: isFacultyOrAdmin ? '/(tabs)/portal' : null`.
  - Hidden routes use `href: null` (e.g. the dead `(tabs)/admin-console`).
  - Default tab tint is role-based: student `#2563EB`, faculty `#059669`, admin `#7C3AED`.
- Tab bar is **absolute + transparent with a BlurView**, except the Assistant tab where it is solid and relative (`position: 'relative'`). Content scroll views therefore need `paddingBottom: 90-100`.
- All non-tab screens are pushed on the root stack; the back button appears automatically in `<Header />` when `pathname` starts with `/screens/`.
- Root stack `unstable_settings.anchor = '(tabs)'`.
- Role gating is **UI-level only** (Portal tab hidden for students, portal early return for non-faculty/admin). There is no cryptographic enforcement. Keep role checks consistent, but do not describe them as secure RBAC.

---

## 7. Design system and UI rules

### 7.1 Theme tokens (`constants/Colors.ts`)

Use `const { colors, isDark } = useAppTheme()` and theme values. Never hardcode base UI colors; hardcoded retro accents are allowed only for the intentional neon moments listed below.

| Token | Light | Dark |
|---|---|---|
| background | `#F8FAFC` | `#0B0F19` |
| card | `#FFFFFF` | `#161F30` |
| cardBorder / border | `#E2E8F0` | `#233048` / `#1F2937` |
| text / secondary / muted | `#0F172A` / `#64748B` / `#94A3B8` | `#F8FAFC` / `#94A3B8` / `#64748B` |
| primary | `#4F46E5` | `#6366F1` |
| accent | `#7C3AED` | `#A855F7` |
| success / warning / danger / info | `#10B981` / `#F59E0B` / `#EF4444` / `#0284C7` | `#34D399` / `#FBBF24` / `#F87171` / `#38BDF8` |
| roleStudent / roleFaculty / roleAdmin | `#2563EB` / `#059669` / `#7C3AED` | `#60A5FA` / `#34D399` / `#C084FC` |
| aiBubble / aiBorder | `#F0F9FF` / `#BAE6FD` | `#172554` / `#1E3A8A` |
| tabBarBackground | `#FFFFFF` | `#111827` |
| searchBarBg | `#F1F5F9` | `#1F2937` |

**Retro arcade accents** (brand moments only - logo, notices, portal highlights, splash):
- Deep purple `#1A0F3C`, neon purple `#7A3CFF`, yellow `#FFE14D`, cyan `#2EF2FF`, pink `#FF2E88`.
- `app.json` splash/adaptive icon background `#1A0F3C`; app background `#0B0F19`.

### 7.2 Layout and spacing

- Screen padding `16`; section spacing `20`; content bottom padding `90-100`.
- Radii: cards `16`, buttons `12`, badges `8`, icon squares `10-12`, pills `6-10`.
- No fixed screen widths. Use flex, percentage widths (e.g. `48%` grid items), and `gap`.
- Use `useSafeAreaInsets()` for top/bottom; `<Header />` handles its own top inset.
- Android tab bar height: `52 + insets.bottom`; iOS `56 + insets.bottom`.

### 7.3 Typography

- System font; weights `600/700/800/900`.
- Section titles `17` / 800, letter-spacing `-0.2`; body `13-14` / line-height `18-20`; captions `11-12`; metric numbers `24` / 800.
- `SpaceMono` is loaded but not part of the design system. Do not switch the app to a custom font without an explicit request.

### 7.4 Components to reuse (do not re-invent)

- `Header` (`subtitle`, `showRoleBadge`, `showBackButton`) - app name, greeting, role badge, roles shortcut, theme toggle.
- `Card` (`default | elevated | outlined`), `Button` (`primary | secondary | outline | ghost | danger`, sizes, icon, loading), `Badge` (`primary | success | warning | danger | info | neutral`).
- `AttendanceMeter` (`ProgressRing.tsx`) - percentage, attended/total, 75% threshold marker, status colors.
- `NextLectureCard` + `utils/lectureUtils.ts` - next/current/completed/weekend/holiday states.
- `FormattedMarkdownText` - inline `**bold**`, `*italic*`, backtick code, bullets. Use it for AI answers, not a markdown library.
- `RoleBadge`, `RetroLogo`.
- `useNotice()` for feedback, not `Alert` (except destructive confirmations/file errors).
- Legacy-but-unused: `RoleSwitcherSheet`, `DocumentReaderModal`, `CustomNotice`, `PortalSection`. **Do not import these.** They are dead code (some depend on Supabase/NativeWind).

### 7.5 Motion

- Reanimated `FadeInDown` entrances, `duration(150-250)`, delays `60 / 100 / 140 / 180 / 220`.
- Springs: `damping(15-18)`, `stiffness(250-260)` for small pops (role badge, pinned cards).
- No looping/decorative animation, no parallax, no gesture-driven complexity unless requested.
- Keep the root stack animation at `slide_from_right`, `90ms`.

### 7.6 Feedback, empty states, accessibility

- Every action gives immediate feedback: optimistic state update + `showNotice(...)` with title/message/type and optional XP.
- Notice banner is a dark `#1A0F3C` card with neon border, icon, optional `+XP`, auto-dismiss around 3.5s. It renders globally above screens.
- Empty states: icon + short title + helper text + CTA where relevant.
- Icon-only buttons need `accessibilityLabel` and `hitSlop` 6-8.
- Press feedback: `activeOpacity={0.7-0.8}`.
- Check **both themes** and **all three roles** for any UI change.
- Android back must work in modals (`onRequestClose`).

### 7.7 Hard "do not" list for UI

- No NativeWind/Tailwind `className` (not installed; such code is broken).
- No new UI kit/design library; no custom icon packs (Ionicons only).
- No gradients unless explicitly requested (LinearGradient is installed but unused).
- No light-only screens; no hardcoded backgrounds that break dark mode.
- No alerts for success paths; no toast libraries.
- No custom navigation stacks/React Navigation navigators; Expo Router only.

---

## 8. Roles and feature matrix

| Area | Student | Faculty | Admin |
|---|---|---|---|
| Home | attendance meter, next lecture, quick services, quests, announcements | next lecture to conduct, attendance/grading actions, submissions, pinned notices | telemetry, broadcast, users, portal links |
| Academics | attendance per subject, timetable, assignments (submit), exam marks, notes | roster/attendance marking, create assignment, grade, upload notes, class views | read/oversight via portal |
| Portal (tab) | hidden | timetable/calendar CRUD, events, quests, notes, attendance, assignments, marks, internships, clubs | all of the above + user management, admin-only sections |
| Events | register/cancel, apply to opportunities, join clubs | same | same |
| Admin console | hidden | hidden | semester reset, broadcast, directory |
| AI | full chat | full chat | full chat |
| Roles tab | switch any persona | switch any persona | switch any persona |

- Student/faculty lists for switching come from `LocalCampusDB` (`studentsList`, `facultiesList`), with `DEMO_USERS` fallback.
- `switchRole('student' | 'faculty')` picks the **first** entry in the corresponding list, not necessarily the demo persona.
- Students cannot switch into a "secure" admin area because there is no security boundary at all; portal screens early-return for non-faculty/admin.

---

## 9. Screen-by-screen reference

### Home (`app/(tabs)/index.tsx`)
- Greeting header, pinned announcement, role-specific dashboards.
- Student: attendance meter, next lecture card, quick services (academics, AI, events, notes, quest, directory), weekly quests, announcements.
- Faculty: actions (mark attendance, create assignment, upload notes), today's lectures for the logged-in faculty name, submissions to grade.
- Admin: campus telemetry numbers, broadcast CTA, pinned notices, governance links.
- Recomputes next lecture every 60s.

### Academics (`app/(tabs)/academics.tsx`)
- Tabs/segments for attendance, timetable, assignments, marks, notes depending on role.
- Modals: submit assignment, faculty roster attendance (present/absent per student), grade submission, create assignment, upload material.
- Uses `CampusDataContext` actions; keep modal patterns/state naming consistent.

### Assistant (`app/(tabs)/assistant.tsx`)
- Header + model picker + token status pill ("Free Key Active" / "Add Free Key") + clear chat.
- Chat bubbles, markdown rendering, model tag, attachment previews, loading indicator, rate-limit banner + "Switch Model", offline/error bubbles.
- Suggested "college survival prompts".
- Token modal explains: `console.groq.com` -> API Keys -> create -> `gsk_...` -> save (SecureStore).
- Input: multiline, `maxLength=600`, attach button (document picker), send button disabled while loading/rate-limited.
- Attachment flow auto-switches to the vision model (`qwen/qwen3.8-27b`).

### Portal (`app/(tabs)/portal.tsx`)
- Faculty/Admin-only governance hub with horizontal option tabs and 11 sections: `timetable`, `calendar`, `users` (admin only), `events`, `quests`, `notes`, `attendance`, `assignments`, `marks`, `internships`, `clubs`.
- Timetable/calendar: AI-assisted **PNG/PDF upload** (`analyzeTimetableDocument`, `analyzeCalendarDocument`), clarification modal for missing details (`refineDocumentAnalysis`), then saves locally and refreshes all screens.
- Users: student/faculty directory with edit.
- Attendance: roster marking and per-student numeric editing.
- Marks: subject -> student -> edit internals/lab/external with derived total/grade.
- Notes: upload documents into the local vault.
- Admin "Sem End" destructive reset with confirmation.
- Header shows "100% Local DB".
- **Edit by section**, not wholesale; this file is 3.5k lines.

### Events (`app/(tabs)/events.tsx`)
- Tabs for events, internships/opportunities, clubs.
- Actions: register/cancel (+30/-30 XP), apply (+40 XP), join club (+25 XP + welcome message).
- Uses `useCampusData` actions and notices.

### Roles (`app/(tabs)/roles.tsx`)
- Active persona spotlight card, admin block, faculty list, student list; tapping switches instantly and persists.
- Used as a demo tool; no passwords.

### Profile (`app/(tabs)/profile.tsx`)
- Avatar/logo, name/role, metrics (semester/CGPA/XP), feature hub (quest, notes, discussions, directory, portal), settings (dark mode switch, push test, "Production Local Database" badge), footer `v1.0.0 (Build 2026.2)`.
- No sign-out (deliberately removed).

### Detail screens (`app/screens/`)
- `campus-quest`: quests with progress/target, claim XP, badges, leaderboard.
- `discussions`: search/filter, create post modal, reply modal, verified answers.
- `faculty-directory`: search by name/department/subject, cabin/office hours card, notice action.
- `study-materials`: search/filter by category, open via `documentService`, faculty upload.
- `admin-console`: admin-only broadcast composer, semester reset, user list, link to portal.

### Other
- `modal.tsx`: About/architecture/how-to-run sheet.
- `+not-found.tsx`: template 404 using `components/Themed` (fine to leave, but do not extend `Themed` usage).
- `(tabs)/admin-console.tsx`: **dead**; uses Supabase + `className` and would fail. Never route to it or copy from it.

---

## 10. AI subsystem rules

### 10.1 Models and endpoint (`services/aiService.ts`)

`FREE_AI_MODELS` (displayed in the model switcher):

| id | name | notes |
|---|---|---|
| `openai/gpt-oss-120b` | OpenAI GPT-OSS (120B) | default, "Flagship" |
| `openai/gpt-oss-20b` | OpenAI GPT-OSS (20B) | ultra-fast |
| `qwen/qwen3.8-27b` | Qwen 3.8 (27B) | multimodal/vision; auto-selected with attachments |
| `deepseek-r1-distill-qwen-32b` | DeepSeek R1 (32B) | reasoning/math |

- Primary call: Groq Cloud OpenAI-compatible chat completions with `temperature` around 0.4 and `max_tokens` around 1200.
- Legacy model IDs are remapped (`mixtral-8x7b-32768`, `gemma2-9b-it`, `llama-3.1-8b-instant`, `llama-3.3-70b-versatile`).
- On 404/decommissioned model, retry once with `openai/gpt-oss-120b`.
- HF Inference fallback is attempted **only when the token is not a Groq key** (`gsk_`), across router/api-inference endpoints.
- Error contract:
  - `GROQ_AUTH_REQUIRED` -> UI opens token modal/instruction.
  - `AIRateLimitError` (429) -> rate-limit banner + switch-model CTA.
  - `AIOfflineError` -> offline bubble.
  - other errors -> friendly bubble with model name.
- Keep these error types/messages intact; the Assistant screen branches on them.

### 10.2 Tokens and secrets

- Token resolution order: SecureStore `GROQ_TOKEN` -> SecureStore `HF_TOKEN` -> `EXPO_PUBLIC_GROQ_TOKEN` -> `EXPO_PUBLIC_HF_TOKEN`.
- `saveHuggingFaceToken()` sanitizes (strips zero-width chars, quotes, newlines) and writes both SecureStore keys.
- Never print, log, render in plain text, or persist a key in AsyncStorage.
- The key is entered by the user in-app; **there is no bundled secret**. Do not add one.
- The old "server-side Gemini" architecture (`server/`, `EXPO_PUBLIC_AI_SERVER_URL`) is not part of the running app. Do not route chat through it or claim server-side key protection.

### 10.3 Grounding prompt

`buildCollegeSystemPrompt(userName, role)` injects: faculty directory (cabins/hours/subjects), first 5 timetable slots, campus services (shuttles, library, health center), 75% attendance rule (65-74 condonable with medical certificate, below 65 detained), exam schedule, and the app's encouraging "survive and thrive" tone. It explicitly allows general academic/coding questions.

**Rule:** campus facts are duplicated in `constants/CampusData.ts` (`FACULTY_DIRECTORY`, `CAMPUS_SERVICES`, timetable/attendance seeds), the AI prompt, and (legacy) `server/src/knowledgeBase.ts`. If you change campus facts, update the prompt and constants together; leave the legacy server alone unless asked.

### 10.4 Attachments and document analysis

- Images -> base64 `image_url`; documents -> text extraction, with a **custom PDF extractor** (`pako` inflate for FlateDecode, regex text extraction, code-fence cleanup). No native PDF library.
- `analyzeTimetableDocument(uri, mime)` and `analyzeCalendarDocument(uri, mime)` return structured `{ items, doubts, summary }`; `refineDocumentAnalysis` merges user clarifications.
- Models: vision model for images/PDFs; fallback to `openai/gpt-oss-120b` with extracted text.
- Treat AI JSON as untrusted: validate/normalize before writing to `LocalCampusDB`; the portal already presents doubts when data is incomplete.
- `services/ocrService.ts` is legacy and broken (`Constants.manifest`); **do not use it**.
- `extractDocumentInfo` is a legacy wrapper for `analyzeTimetableDocument`.

### 10.5 Chat persistence

- Conversation lives in component state only (no storage across app restarts). Clearing chat resets to the welcome message.
- Sent messages include recent history mapped to Groq `user`/`assistant` roles (no `system` entries from history).

---

## 11. Documents and notifications

### Documents
- `expo-document-picker` for uploads; copy into the vault via `saveLocalDocument`.
- `documentService.openStudyMaterial()` is the canonical opener; it can generate a valid minimal PDF when the stored file is missing. Keep the Android content-URI conversion and fallbacks.
- File names are sanitized (`[^a-zA-Z0-9._-]` -> `_`); sizes shown in KB/MB.

### Notifications
- `notificationService.initNotifications()` requests permission, creates Android channel `survive_college_alerts` (MAX importance, neon light color `#7A3CFF`), and swallows Expo Go channel NPEs.
- `scheduleAcademicPushNotifications()` cancels all scheduled notifications then schedules:
  - internals/CIE/mid-term within `notificationLeadDays.internal` (5 days) - triggers at 4-5 days;
  - externals/SEE/final within `notificationLeadDays.external` (10 days);
  - assignments due tomorrow.
- Called from `CampusDataContext.refreshAllData()` and after timetable/calendar updates.
- Local notifications only; no remote push/FCM. Profile has a "Test Alert" action.
- If you touch scheduling, keep idempotency (`cancelAllScheduledNotificationsAsync` first) and the web guard.

---

## 12. Environment, secrets, builds

### 12.1 Env

- `.env` exists but is **empty** (intentionally). `.env.example` is the template.
- `.env.example` currently documents only:
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (legacy)
  - `EXPO_PUBLIC_AI_SERVER_URL` (legacy)
- Actual optional AI env vars supported by `aiService`: `EXPO_PUBLIC_GROQ_TOKEN`, `EXPO_PUBLIC_HF_TOKEN`. (Update `.env.example` if you touch this area, but **never** write real keys there.)
- `constants/Config.ts` also reads the Supabase/AI-server env vars and contains a deprecated `Constants.manifest` HF-token loader. It auto-runs `loadHFToken()` on import (harmless, ineffective for extra-based tokens). Do not build new features on `Config.HF_TOKEN`.
- `opencode.json` denies reading/editing `.env`, `.env.*`, `*.key`, `*.pem`, `secrets/*`, and denies `cat/head/tail` on env files. Respect that.

### 12.2 Secrets and signing

- `keystores/release.keystore` + `credentials.json` (alias/passwords) are local EAS signing credentials. **Never delete, rotate, print, or commit.** `eas.json` uses `"credentialsSource": "local"` for preview/production.
- `scripts/generate-keystore.js` regenerates a 2048-bit RSA keystore via `node-forge`; only run on explicit request (it would break update continuity).
- `app.json` `extra.eas.projectId` is configured; package `com.survivecollege.app`; scheme `survivecollege`; portrait; `userInterfaceStyle: automatic`.
- Do not edit generated `android/`/`ios/` (they do not exist). Configure native bits in `app.json`.
- `.gitignore` already excludes keystores, credentials, `.env*.local`, `node_modules`, generated native folders, and also `AGENTS.md`/`opencode.json`.

### 12.3 Commands

```bash
npm install                 # npm + package-lock
npx expo start              # dev server
npx expo start --android    # Android
npx expo start --tunnel     # if LAN discovery is blocked
npx tsc --noEmit            # typecheck gate
npx expo lint               # lint gate
npx expo-doctor             # dependency/config diagnosis
npx expo install <pkg>      # ONLY way to add Expo/RN deps
npx eas build -p android --profile preview   # APK (local credentials)
npx expo run:android        # local native build if needed
```

- Windows/PowerShell execution policy may block `npx.ps1`; use `cmd /c "npx.cmd <args>"` (this was needed in this environment).
- There is **no test runner**; `utils/lectureUtils.test.ts` and `testNextLecture.js` are not executed by `npm test` (no such script). Validate with `tsc`, lint, and manual Android checks.
- Expo Go supports all currently used modules; if you add native code, switch to a development build.

---

## 13. Coding conventions

- TypeScript strict. Prefer explicit interfaces/types; avoid adding new `any`. Existing code uses some `as any` for router paths/icon names - match locally only when necessary.
- One screen per file; default export for routes; named exports for components/utilities.
- `StyleSheet.create` at the **bottom** of the file; inline style only for dynamic theme/state values.
- Imports order (as existing): React/RN -> Expo -> icons/router -> local `@/` modules.
- State: `useState` + context actions; no external state library. Memoize derived lists with `useMemo`; avoid re-creating handlers needlessly.
- Async mutations: update React state optimistically, then persist; surface failures via `showNotice`/`console.warn`. Existing code generally does not block UI on persistence.
- Naming: PascalCase components/screens, camelCase functions/vars, SCREAMING_SNAKE constants, feature-prefixed IDs.
- Comments: short section banners (`// ===== SECTION: ...`) and requirement references exist; keep them meaningful, avoid noise.
- Copy: sentence case for headings, encouraging tone, short mobile-friendly lines, emoji sparingly. Avoid claiming security/cloud features that do not exist.
- Platform: guard web-only/Android-only APIs (`Platform.OS`), prefer Expo modules, and use legacy `expo-file-system/legacy` imports.
- Do not add config files (babel, metro, tailwind) unless required; the project relies on Expo defaults + `tsconfig` paths.
- Do not reformat or re-sort entire large files; make surgical `edit` changes.

---

## 14. How to extend safely (recipes)

### Add a tab
1. Create `app/(tabs)/<name>.tsx` with `<Header subtitle="..." />`, a themed screen wrapper, and content padding.
2. Add `<Tabs.Screen name="<name>" options={{ title, tabBarIcon: Ionicons }} />` in `app/(tabs)/_layout.tsx`.
3. Keep outline/filled icon pairs and role visibility consistent.

### Add a detail screen
1. Create `app/screens/<name>.tsx`.
2. Register `<Stack.Screen name="screens/<name>" ... />` in `app/_layout.tsx`.
3. Navigate with `router.push('/screens/<name>')`; `<Header />` shows the back button automatically.
4. If it reuses a tab screen, add a 1-line re-export wrapper instead of duplicating code.

### Add a persisted entity
1. Define the interface (in `constants/CampusData.ts` if shared, or `services/localDb.ts` if DB-only).
2. Add `STORAGE_KEYS.<NAME>`, seed it in `seedAll()`, and bump the `INITIALIZED` key suffix if seeds change.
3. Add `get<X>()` / `set<X>()` using `getCollection`/`setCollection`.
4. Expose it in `CampusDataContext` (state, refresh in `refreshAllData`, mutation actions).
5. Build UI against the context, not `AsyncStorage`.

### Add a portal section
1. Extend the `PortalOption` union and `PORTAL_OPTIONS` (label/icon/`adminOnly`).
2. Add handlers near the existing section handlers.
3. Add a numbered `activeOption === '<id>'` block in the ScrollView, reusing `Card`/`Badge`/modal patterns.
4. Gate with `adminOnly` where appropriate; add reset semantics only if required.

### Add an AI capability
1. Add the function in `aiService.ts`, reusing `getGroqToken`, `sanitizeApiKey`, `readFileAsBase64Safe`, `extractTextFromPdfContent`, and the existing model constants.
2. Reuse `AIRateLimitError`/`AIOfflineError` and friendly errors.
3. If a new model is needed, add it to `FREE_AI_MODELS` + `legacyRemap` + the assistant model picker.
4. Keep the grounding prompt in sync with constants; never put keys in code.

### Add a notification
Extend `scheduleAcademicPushNotifications()` using the existing `now`/`addDays`/`scheduleNotificationAsync` pattern; keep cancel-all-first and the web guard.

### Add a theme token
Add it to **both** `Colors.light` and `Colors.dark`; consume via `useAppTheme().colors`. Do not hardcode.

---

## 15. Pre-flight checklist (before declaring any task done)

- [ ] `npx tsc --noEmit` passes (currently one known error - see section 16.1; do not add more).
- [ ] `npx expo lint` passes or only pre-existing warnings remain.
- [ ] Tested as **Student**, **Faculty**, **Admin**; portal hidden for students.
- [ ] Tested in **light and dark** mode (toggle in Header/Profile).
- [ ] Data persists after a full app reload; first-run seeding still works.
- [ ] If storage changed: bump the seed sentinel and verify existing-install behavior.
- [ ] No new dependency unless installed with `npx expo install` and justified; no NativeWind.
- [ ] No new `supabase`/`server` imports; no secrets in code, logs, or `.env.example`.
- [ ] No direct `AsyncStorage` in screens; no direct file-system writes outside the vault.
- [ ] AI key flows still work (save/remove/rate-limit/offline) and tokens never render.
- [ ] Android back, keyboard avoidance, safe areas, and tab-bar padding respected.
- [ ] Large files edited surgically; imports/naming/style match neighbors.
- [ ] UI copy does not claim real auth, cloud sync, server-side secrets, or "Smart Campus AI".

---

## 16. Known issues and traps (read before editing)

1. **Typecheck error (verified):** `context/CampusDataContext.tsx:150` - `TS2304: Cannot find name 'stdOpps'`. The 14th `Promise.all` result is not destructured. This aborts `refreshAllData()` at the end and prevents `scheduleAcademicPushNotifications()` from running. Fix by adding `stdOpps` to the destructuring (after `stdAtt`); do not change the load order.
2. **Docs drift:** `README.md` describes "Smart Campus AI", a Gemini server, Supabase-only storage, and 5 tabs; `AGENTS.md` refers to `src/app/` (which does not exist; routes are in `app/`). This `plan.md` is authoritative.
3. **Dead legacy code:** `app/(tabs)/admin-console.tsx` (Supabase + `className`), `components/ui/PortalSection.tsx`, `components/ui/CustomNotice.tsx`, `components/common/RoleSwitcherSheet.tsx`, `components/common/DocumentReaderModal.tsx`, `services/ocrService.ts`, `server/*`, `supabase/*`, `components/Themed.tsx` (only 404), `expo-linear-gradient`, `expo-symbols`, `expo-application`. Do not import/extend them; deleting requires explicit approval.
4. **Two admin consoles:** `app/screens/admin-console.tsx` is real; `app/(tabs)/admin-console.tsx` is hidden and broken. Do not "fix" the hidden one by copying its patterns.
5. **Deprecated APIs:** `Constants.manifest` in `Config.ts`/`ocrService.ts` no longer exists in SDK 58; `expo-file-system` must be imported from `/legacy` (existing code does this); `shouldShowAlert` is deprecated but harmless.
6. **Model IDs may 404:** `qwen/qwen3.8-27b` and similar free-tier model names can be renamed/removed by the provider. Fallback logic exists only for Groq 404s; test the active path before shipping AI changes.
7. **No auth/security boundary:** `isAuthenticated: true`, instant role switch, UI-only gating, no sign-out. Do not add fake "protected" claims.
8. **Seed/refresh caveats:** `getStudentAttendance()` baseline fallback is not persisted; the `INITIALIZED` sentinel means seed edits will not appear on existing installs; there is no migration framework. `resetSemester()` is destructive and incomplete by design (see section 5.5).
9. **Profile divergence:** `updateProfile()` writes the active user JSON but not the `students`/`faculties` collections, so lists may show stale data until refresh/reseed.
10. **No VCS:** no git history; destructive commands are unrecoverable. Prefer `edit` over rewrite; keep backups if renaming/moving.
11. **Naming drift:** folder/US package names say "Smart College"/"smart-campus-app"; the Android package is `com.survivecollege.app`; the UI is "Survive College". Do not rename packages/config without an explicit migration request.
12. **No test runner:** lint + tsc + manual device QA. `utils/*.test.ts` will not run via npm.
13. **PowerShell:** `npx` may be blocked by execution policy; use `cmd /c "npx.cmd ..."`.
14. **Dead docs claim Supabase is active:** `services/supabase.ts` is importable but only dead files use it; if imported it may throw on a placeholder URL at call time. Do not wire it in.
15. **Fictional data:** names, phone numbers, courses, dates, and the AI's "official facts" are demo content. Keep the same fictional universe; do not present them as real institutional records.

---

## 17. Token-efficient workflow for the next model

1. Read this file fully (once).
2. Identify your task in section 9 or 14, then open only the referenced files.
3. For styling work: `constants/Colors.ts`, `components/common/Header.tsx`, `components/ui/*`.
4. For data work: `services/localDb.ts` -> `context/CampusDataContext.tsx` -> the screen.
5. For AI work: `services/aiService.ts` + `app/(tabs)/assistant.tsx` (search for `askSmartCampusAI`, `FREE_AI_MODELS`, `handleSend`).
6. For portal work: search `SECTION` and the relevant `activeOption ===` block in `app/(tabs)/portal.tsx`; never read all 3.5k lines.
7. For navigation work: `app/_layout.tsx` + `app/(tabs)/_layout.tsx`.
8. Run `cmd /c "npx.cmd tsc --noEmit"` before finishing; fix only what you introduced (except the known `stdOpps` fix if asked).
9. Match existing patterns exactly; when in doubt, copy a neighboring screen's structure rather than inventing a new approach.

---

*Last verified against the codebase: November 2026. If you change architecture, storage keys, AI provider, navigation, or design tokens, update this file in the same change.*
