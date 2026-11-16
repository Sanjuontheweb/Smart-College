# 🎓 Smart Campus AI — Native Android Mobile Application

A mobile-first, enterprise-grade Android application engineered for university ecosystems with **React Native**, **Expo SDK 58**, **TypeScript**, **Expo Router**, **Supabase** (PostgreSQL with Row Level Security & Authentication), and a **secure server-side Google Gemini AI Assistant**.

---

## 📱 Mobile Application Architecture Overview

Smart Campus AI delivers dedicated, role-protected experiences for **Students**, **Faculty**, and **Administrators**:

```
┌─────────────────────────────────────────────────────────────┐
│                 React Native / Expo App (Android)           │
│  - Expo SDK 58 + Expo Router (File-based navigation)        │
│  - TypeScript + Safe Area Context + React Native Reanimated │
│  - Dynamic Light & Dark Mode Tokens (ThemeContext)          │
│  - @expo/vector-icons (Ionicons & Feather)                  │
│  - Interactive Role Switcher Sheet (Student, Faculty, Admin)│
└───────────────────────┬──────────────────────────────┬──────┘
                        │                              │
                        ▼                              ▼
    ┌───────────────────────────────────┐    ┌──────────────────────────────────┐
    │       Supabase Cloud / Local      │    │     Secure AI Assistant Server   │
    │  - Supabase Auth (JWT & Roles)    │    │  - Node.js / Express proxy       │
    │  - PostgreSQL DB with RLS Policies│    │  - Gemini API (Server-side key)  │
    │  - Secure File Storage Buckets    │    │  - Campus Knowledge Grounding    │
    │  - Role Verification Trigger      │    │  - Fallback Offline Demo Mode    │
    └───────────────────────────────────┘    └──────────────────────────────────┘
```

---

## 🌟 Key Features by Academic Role

### 1. 🎓 Student Experience (`Aarav Sharma • 4th Sem CSE • Roll: 1MS24CS042`)
- **Academic Attendance Ring**: Real-time percentage meter with color-coded safety indicators (`Safe >=75%`, `Warning 65-74%`, `Critical <65%`) and exact lecture breakdown.
- **Timetable & Next Lecture**: Day-by-day lecture schedule (Monday to Friday) with course codes, faculty names, and hall room numbers.
- **Assignments & Submissions**: View due dates, upload solution reports / GitHub URLs, and receive grades & faculty feedback.
- **Curriculum Notes & Solved PYQs**: Browse and download lecture slides and real university question papers (*BCS401 ADA, BCS403 DBMS, BCS405A Discrete Maths, BBOK407 Biology*).
- **Campus Quest & Gamification**: Earn XP points for early assignment submissions, flawless attendance, and forum replies. Unlock badges (*Campus Pioneer*, *Consistent Scholar*, *Code Ninja*) and climb the semester leaderboard.
- **Events, Clubs & Internships**: 1-tap registration for university hackathons (*CodeStorm 2026*), technical workshops, and verified internship listings (*Google Research India, Zerodha Tech*).

### 2. 👩‍🏫 Faculty Experience (`Dr. Priya Raman • Associate Professor • Cabin: Turing 304`)
- **Faculty Profile**: Displays designation, department, cabin location, office hours (*Mon, Wed, Fri 2:00 PM - 4:00 PM*), and assigned courses.
- **Lecture Management**: Daily teaching schedule with lecture room assignments and student enrollment rosters.
- **Mark Class Attendance**: Interactive attendance recorder to log present/absent students with instant live percentage recalculation.
- **Create & Grade Assignments**: Publish new assignments with deadlines and score submissions with personalized qualitative feedback.
- **Upload Study Materials**: Share lecture notes, reference PDFs, and model exam papers.
- **Department Announcements**: Post urgent batch-level or department-wide alerts.

### 3. 🏛️ Administrator Experience (`Dr. Rajesh Verma • Dean of Academic Affairs • Suite 101`)
- **Campus Live Telemetry**: Monitor real-time campus statistics (active enrolled students, faculty on duty, overall attendance compliance rate).
- **User Role Management**: Protected user directory enforcing PostgreSQL Row Level Security (RLS) to prevent unauthorized privilege escalation.
- **Emergency Broadcast Dispatch**: Publish high-priority pinned notices across all student and faculty feeds with 1 tap.
- **Campus Services Directory**: Oversee campus shuttle bus routes, library exam schedules, and health center protocols.

---

## 🤖 Smart Campus AI Assistant (Secure Grounded Architecture)

The dedicated AI Assistant chat screen (`/(tabs)/assistant`) provides conversational campus support with zero tolerance for hallucinations:

1. **Zero Client-Side Secret Leakage**: The mobile client **never** receives or stores the `GEMINI_API_KEY`. Requests are routed through the secure server at `/api/chat`.
2. **Authorized Campus Grounding**: Responses are grounded strictly in official university facts:
   - Faculty cabin locations and student consultation office hours.
   - The official 75% minimum attendance rule and medical condonation procedures.
   - Campus shuttle bus timings and metro station connectivity.
   - Central Library extended night hours during examination periods.
   - Campus health center 24x7 emergency phone and ambulance dispatch.
3. **Strict Anti-Hallucination Guardrail**: If an ungrounded or out-of-scope query is submitted (e.g., non-campus questions or requests for private mobile numbers), the assistant politely refuses and directs the user to the Academic Affairs Office in the Administrative Central Block (Suite 101).
4. **Resilient Demo Mode**: If the backend AI server is temporarily unreachable or running without an API key, the mobile app smoothly engages its built-in verified campus knowledge engine.

---

## 🚀 Quick Start Guide

### Step 1: Start the Secure AI Assistant Server
In a terminal:
```bash
cd "d:\Notes, docs, clg\Projects\Smart College\server"
npm start
```
The server will start on port `5000`:
- **Health check**: `http://localhost:5000/api/health`
- **Chat endpoint**: `http://localhost:5000/api/chat`

*(Optional: Add your free Google Gemini API key to `server/.env`)*
```env
PORT=5000
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 2: Start the Expo Android Mobile Application
In a second terminal:
```bash
cd "d:\Notes, docs, clg\Projects\Smart College"
npm start
```

---

## 📱 Testing on Your Android Smartphone (Expo Go)

1. **Install Expo Go**: Download the free **Expo Go** app from the [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent).
2. **Ensure Same Wi-Fi Network**: Ensure your Android phone and development computer are connected to the same Wi-Fi router.
3. **Start Expo with LAN**:
   ```bash
   npx expo start
   ```
4. **Scan the QR Code**: Open the **Expo Go** app on your Android phone and scan the QR code printed in the terminal.
5. *(Alternative if Wi-Fi blocks LAN discovery)*: Run Expo in tunnel mode:
   ```bash
   npx expo start --tunnel
   ```
6. **Switch Personas Instantly**: Tap the **Switch Role** icon (`⇄`) in the app header to seamlessly experience the app from the perspective of **Student**, **Faculty**, or **Administrator**.

---

## 📦 How to Build an Installable Android Standalone APK

To produce a `.apk` file that can be downloaded and installed directly on any Android smartphone without requiring Google Play Store:

### Method 1: Cloud Build with EAS (Recommended)
1. Install EAS CLI globally if not already installed:
   ```bash
   npm install -g eas-cli
   ```
2. Log in or create a free Expo account:
   ```bash
   npx eas login
   ```
3. Initialize the project build configuration:
   ```bash
   npx eas build:configure
   ```
4. Trigger the standalone Android APK build using the configured `preview` profile:
   ```bash
   npx eas build -p android --profile preview
   ```
5. When the cloud build finishes (typically 5–10 minutes), EAS provides a direct download link and QR code to download the `SmartCampusAI.apk` straight to your phone.

### Method 2: Local Android Build with Gradle
If you have Android Studio and the Android SDK installed on your PC:
```bash
npx expo run:android
```

---

## 🗄️ Supabase PostgreSQL Setup & Row Level Security

The application is fully pre-configured to run out-of-the-box in local verified mode. To connect your own live Supabase Cloud project:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Copy and run the contents of [`supabase/schema.sql`](file:///d:/Notes,%20docs,%20clg/Projects/Smart%20College/supabase/schema.sql) to create all tables, custom enums, PostgreSQL triggers, and Row Level Security policies.
4. Copy and run [`supabase/seed.sql`](file:///d:/Notes,%20docs,%20clg/Projects/Smart%20College/supabase/seed.sql) to populate initial courses (*BCS401, BCS403*), timetables, faculty cabins, and assignments.
5. In your project root, create a `.env` file from `.env.example`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   EXPO_PUBLIC_AI_SERVER_URL=http://<YOUR_PC_LAN_IP>:5000
   ```

---

## 🛡️ Security & Authorization Guarantees

- **PostgreSQL Row Level Security (RLS)**: Enforced across all tables. Students can only view their own attendance and submissions. Faculty can grade only submissions for assigned courses.
- **No Self-Privilege Escalation**: User role assignment is guarded by an `is_admin()` SQL security definer function.
- **Server-Side AI Secrets**: The Gemini API key remains isolated on the backend server.
