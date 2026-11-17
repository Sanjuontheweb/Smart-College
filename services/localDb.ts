import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DEMO_USERS,
  SAMPLE_TIMETABLE,
  SAMPLE_ATTENDANCE,
  SAMPLE_ASSIGNMENTS,
  SAMPLE_STUDY_MATERIALS,
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_EVENTS,
  SAMPLE_OPPORTUNITIES,
  SAMPLE_QUESTS,
  SAMPLE_BADGES,
  BadgeItem,
  FACULTY_DIRECTORY,
  UserProfile,
  TimetableSlot,
  AttendanceRecord,
  Assignment,
  StudyMaterial,
  Announcement,
  CampusEvent,
  Opportunity,
  Quest,
} from '@/constants/CampusData';
import SecureStorage from './secureStorage';

export interface ExaminationMark {
  id: string;
  studentId: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  internal1: number; // out of 25
  internal2: number; // out of 25
  labInternal: number; // out of 25
  externalExam: number; // out of 100
  totalMarks: number; // computed
  maxMarks: number;
  percentage: number;
  grade: 'O' | 'A+' | 'A' | 'B+' | 'B' | 'C' | 'F';
  status: 'Distinction' | 'First Class' | 'Pass' | 'Backlog';
  cgpa?: number;
  aggregateScore?: number;
  aggregateClassification?: 'Distinction' | 'First Class' | 'Second Class' | 'Pass';
}

export interface ClubItem {
  id: string;
  name: string;
  category: string;
  leads: string;
  members: number;
  description: string;
  icon: string;
  welcomeMessage?: string;
  joinedMemberIds?: string[];
  isMember?: boolean;
}

export interface StudentOpportunityRecord {
  id: string;
  oppId: string;
  studentId: string;
  studentName: string;
  studentRollNo?: string;
  status: 'applied' | 'accepted' | 'rejected';
  appliedAt: string;
  skillsDeveloped?: string[];
  exposureExperience?: string;
}

export interface EventRegistrationRecord {
  id: string;
  eventId: string;
  studentId: string;
  studentName: string;
  studentRollNo?: string;
  registeredAt: string;
}

export interface StudentProgressRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNo?: string;
  department?: string;
  xp: number;
  quests: Quest[];
  badges: BadgeItem[];
}

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string;
  dateSpan?: string;
  startDate?: string;
  endDate?: string;
  type: 'Holiday' | 'Exam' | 'Semester Milestones' | 'Classes Resume' | 'Cultural Fest';
  description?: string;
  isImportant?: boolean;
}

export interface PrivateChannel {
  id: string;
  participantIds: string[];
  participantNames: string[];
  participantRoles: ('student' | 'faculty' | 'admin')[];
  createdAt: string;
  createdBy: string;
  reported: boolean;
  reportedBy?: string;
  reportedByRole?: 'student' | 'faculty' | 'admin';
  reportedAt?: string;
}

export interface PrivateMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderRole: 'student' | 'faculty' | 'admin';
  text: string;
  createdAt: string;
}

export interface CollegeLayout {
  localUri: string;
  fileName: string;
  fileSize: string;
  summary: string;
  uploadedAt: string;
  notes?: string;
}

const STORAGE_KEYS = {
  STUDENTS: '@sc_local_students_v1',
  FACULTIES: '@sc_local_faculties_v1',
  TIMETABLE: '@sc_local_timetable_v1',
  CALENDAR_EVENTS: '@sc_local_calendar_events_v1',
  ATTENDANCE: '@sc_local_attendance_v1',
  STUDENT_ATTENDANCE: '@sc_local_student_attendance_v1',
  EXAMINATION_MARKS: '@sc_local_examination_marks_v1',
  ASSIGNMENTS: '@sc_local_assignments_v1',
  STUDY_MATERIALS: '@sc_local_study_materials_v1',
  CAMPUS_EVENTS: '@sc_local_campus_events_v1',
  QUESTS: '@sc_local_quests_v1',
  CLUBS: '@sc_local_clubs_v1',
  INTERNSHIPS: '@sc_local_internships_v1',
  STUDENT_OPPORTUNITIES: '@sc_local_student_opp_records_v1',
  EVENT_REGISTRATIONS: '@sc_local_event_registrations_v1',
  STUDENT_PROGRESS: '@sc_local_student_progress_v1',
  ANNOUNCEMENTS: '@sc_local_announcements_v1',
  NOTIFICATION_SCHEDULE: '@sc_local_notification_schedule_v1',
  PRIVATE_CHANNELS: '@sc_local_private_channels_v1',
  PRIVATE_MESSAGES: '@sc_local_private_messages_v1',
  COLLEGE_LAYOUT: '@sc_local_college_layout_v1',
  INITIALIZED: '@sc_local_db_initialized_v2',
};

// Seed student list
const SEED_STUDENTS: UserProfile[] = [
  DEMO_USERS.student,
  {
    id: 'usr_student_02',
    fullName: 'Sneha Patel',
    email: 'sneha.patel@smartcampus.edu',
    role: 'student',
    department: 'Computer Science & Engineering',
    semester: 4,
    rollNo: '1MS24CS112',
    cgpa: 9.15,
    phone: '+91 98765 99002',
    attendancePct: 92.4,
    xpPoints: 870,
    badgeCount: 5,
    bio: 'Competitive coder and GDSC core member. Interested in distributed algorithms and machine learning.',
  },
  {
    id: 'usr_student_03',
    fullName: 'Rohit Kulkarni',
    email: 'rohit.k@smartcampus.edu',
    role: 'student',
    department: 'Computer Science & Engineering',
    semester: 4,
    rollNo: '1MS24CS088',
    cgpa: 9.42,
    phone: '+91 98765 99003',
    attendancePct: 95.0,
    xpPoints: 940,
    badgeCount: 6,
    bio: 'Department topper and open-source contributor. Currently hacking on compilers and database kernels.',
  },
  {
    id: 'usr_student_04',
    fullName: 'Kavya Nair',
    email: 'kavya.nair@smartcampus.edu',
    role: 'student',
    department: 'Computer Science & Engineering',
    semester: 4,
    rollNo: '1MS24CS064',
    cgpa: 8.70,
    phone: '+91 98765 99004',
    attendancePct: 88.5,
    xpPoints: 760,
    badgeCount: 4,
    bio: 'Full-stack mobile developer and AI enthusiast. Passionate about UX and college campus tech.',
  },
  {
    id: 'usr_student_05',
    fullName: 'Meera Iyer',
    email: 'meera.iyer@smartcampus.edu',
    role: 'student',
    department: 'Electronics & Communication',
    semester: 4,
    rollNo: '1MS24EC055',
    cgpa: 8.65,
    phone: '+91 98765 99005',
    attendancePct: 84.0,
    xpPoints: 690,
    badgeCount: 3,
    bio: 'IoT and embedded systems builder. President of the Campus Literary & Debate Circle.',
  },
];

// Seed faculty list
const SEED_FACULTIES: UserProfile[] = [
  DEMO_USERS.faculty,
  {
    id: 'usr_faculty_02',
    fullName: 'Prof. K. Venkatesh',
    email: 'k.venkatesh@smartcampus.edu',
    role: 'faculty',
    department: 'Computer Science & Engineering',
    designation: 'Assistant Professor',
    cabinLocation: 'Alan Turing Block, Room 312',
    officeHours: 'Tue, Thu 10:00 AM - 12:30 PM',
    phone: '+91 98765 43211',
    bio: 'Faculty in CSE specializing in Relational Databases, Transaction Processing, and Operating Systems.',
  },
  {
    id: 'usr_faculty_03',
    fullName: 'Dr. Rajesh Verma',
    email: 'dean.verma@smartcampus.edu',
    role: 'faculty',
    department: 'Academic Affairs',
    designation: 'Dean of Academic Affairs',
    cabinLocation: 'Central Administrative Block, Suite 101',
    officeHours: 'Mon - Fri 11:00 AM - 1:00 PM',
    phone: '+91 98765 43200',
    bio: 'Dean of Academic Affairs and Professor for Universal Human Values (BUHK408).',
  },
  {
    id: 'usr_faculty_04',
    fullName: 'Dr. Ananya Sen',
    email: 'ananya.sen@smartcampus.edu',
    role: 'faculty',
    department: 'Applied Sciences',
    designation: 'Assistant Professor',
    cabinLocation: 'Sarabhai Block, Room 114',
    officeHours: 'Wed, Fri 10:00 AM - 11:30 AM',
    phone: '+91 98765 43215',
    bio: 'Assistant Professor in Applied Sciences. Course coordinator for Biology for Engineers (BBOK407).',
  },
];

// Seed examination marks (Subject-wise marks for students)
const SEED_EXAM_MARKS: ExaminationMark[] = [
  {
    id: 'mrk_1',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    courseCode: 'BCS401',
    courseTitle: 'Analysis & Design of Algorithms',
    internal1: 23,
    internal2: 24,
    labInternal: 25,
    externalExam: 88,
    totalMarks: 160,
    maxMarks: 175,
    percentage: 91.4,
    grade: 'A+',
    status: 'Distinction',
  },
  {
    id: 'mrk_2',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    internal1: 22,
    internal2: 23,
    labInternal: 24,
    externalExam: 82,
    totalMarks: 151,
    maxMarks: 175,
    percentage: 86.3,
    grade: 'A',
    status: 'Distinction',
  },
  {
    id: 'mrk_3',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    courseCode: 'BCS404',
    courseTitle: 'Operating Systems',
    internal1: 21,
    internal2: 22,
    labInternal: 23,
    externalExam: 79,
    totalMarks: 145,
    maxMarks: 175,
    percentage: 82.8,
    grade: 'A',
    status: 'First Class',
  },
  {
    id: 'mrk_4',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    courseCode: 'BCS405A',
    courseTitle: 'Discrete Mathematical Structures',
    internal1: 24,
    internal2: 25,
    labInternal: 25,
    externalExam: 94,
    totalMarks: 168,
    maxMarks: 175,
    percentage: 96.0,
    grade: 'O',
    status: 'Distinction',
  },
  {
    id: 'mrk_5',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    courseCode: 'BBOK407',
    courseTitle: 'Biology For Engineers',
    internal1: 20,
    internal2: 22,
    labInternal: 22,
    externalExam: 75,
    totalMarks: 139,
    maxMarks: 175,
    percentage: 79.4,
    grade: 'B+',
    status: 'First Class',
  },
];

// Seed calendar of events
const SEED_CALENDAR_EVENTS: CalendarEventItem[] = [
  {
    id: 'cal_1',
    title: 'Commencement of 4th Semester Classes',
    date: '2026-08-10',
    type: 'Semester Milestones',
    description: 'Classes begin for Even Semester across all engineering branches.',
    isImportant: true,
  },
  {
    id: 'cal_2',
    title: 'Mahatma Gandhi Jayanti Holiday',
    date: '2026-10-02',
    type: 'Holiday',
    description: 'National holiday. Campus offices and lectures suspended.',
    isImportant: false,
  },
  {
    id: 'cal_3',
    title: 'Internal Assessment I (CIE-1)',
    date: '2026-10-14',
    type: 'Exam',
    description: 'Continuous Internal Evaluation test covering Units 1 & 2 for all subjects.',
    isImportant: true,
  },
  {
    id: 'cal_4',
    title: 'Deepavali Festival Break',
    date: '2026-11-01',
    type: 'Holiday',
    description: 'Institutional holiday for Diwali celebrations.',
    isImportant: false,
  },
  {
    id: 'cal_5',
    title: 'Internal Assessment II (CIE-2)',
    date: '2026-11-18',
    type: 'Exam',
    description: 'Second internal assessment covering Units 3 & 4. 75% attendance required.',
    isImportant: true,
  },
  {
    id: 'cal_6',
    title: 'Smart Campus Annual Tech & Cultural Fest',
    date: '2026-11-25',
    type: 'Cultural Fest',
    description: '3-day university-wide fest featuring hackathons, gaming tournaments and music.',
    isImportant: false,
  },
  {
    id: 'cal_7',
    title: 'Last Working Day & Classes Conclude',
    date: '2026-12-05',
    type: 'Semester Milestones',
    description: 'Final teaching day of semester. Attendance and internal marks finalized.',
    isImportant: true,
  },
  {
    id: 'cal_8',
    title: 'Semester End Theory & Lab Examinations (SEE)',
    date: '2026-12-15',
    type: 'Exam',
    description: 'University final semester examinations begin across all designated exam halls.',
    isImportant: true,
  },
];

// Seed clubs
const SEED_CLUBS: ClubItem[] = [
  {
    id: 'clb_1',
    name: 'Google Developer Student Club (GDSC)',
    category: 'Technical & AI',
    leads: 'Aarav Sharma & Sneha Patel',
    members: 340,
    description: 'Community for hands-on tech projects, mobile dev with Flutter & React Native, and Google Cloud study jams.',
    icon: 'code-slash',
    welcomeMessage: 'Welcome to Google Developer Student Club! 🚀 Connect with fellow tech enthusiasts, build real-world mobile & cloud apps, and attend exclusive hackathons.',
    joinedMemberIds: ['usr_student_01'],
    isMember: true,
  },
  {
    id: 'clb_2',
    name: 'Smart Campus Robotics Society',
    category: 'Hardware & IoT',
    leads: 'Dr. Ramesh Naidu (Mentor)',
    members: 185,
    description: 'Designing autonomous rovers, smart campus sensor networks, and participating in national Robocon.',
    icon: 'hardware-chip-outline',
    welcomeMessage: 'Welcome to the Robotics Society! 🤖 Get ready for microcontroller workshops, drone builds, and autonomous hardware hackathons.',
    joinedMemberIds: [],
    isMember: false,
  },
  {
    id: 'clb_3',
    name: 'Campus Literary & Debate Circle',
    category: 'Cultural & Arts',
    leads: 'Meera Iyer',
    members: 120,
    description: 'Weekly parliamentary debates, literary fest organization, and creative writing workshops.',
    icon: 'mic-outline',
    welcomeMessage: 'Welcome to the Literary & Debate Circle! 🎙️ Hone your public speaking, join parliamentary debates, and write for the campus journal.',
    joinedMemberIds: [],
    isMember: false,
  },
];

const SEED_STUDENT_OPPS: StudentOpportunityRecord[] = [
  {
    id: 'usr_student_01_opp_1',
    oppId: 'opp_1',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    studentRollNo: '1MS24CS001',
    status: 'applied',
    appliedAt: 'Nov 10, 2026',
    skillsDeveloped: ['React Native', 'TypeScript', 'Node.js'],
    exposureExperience: 'Built offline-first mobile features, handled asynchronous state sync, and participated in sprint reviews with engineering leads.',
  },
  {
    id: 'usr_student_02_opp_1',
    oppId: 'opp_1',
    studentId: 'usr_student_02',
    studentName: 'Sneha Patel',
    studentRollNo: '1MS24CS112',
    status: 'accepted',
    appliedAt: 'Nov 08, 2026',
    skillsDeveloped: ['AI Prompt Engineering', 'Full-stack UI', 'Cloud Firestore'],
    exposureExperience: 'Contributed to AI document scanning algorithms and presented project milestones to campus faculty committee.',
  },
];

const SEED_EVENT_REGISTRATIONS: EventRegistrationRecord[] = [
  {
    id: 'usr_student_01_evt_1',
    eventId: 'evt_1',
    studentId: 'usr_student_01',
    studentName: 'Aarav Sharma',
    studentRollNo: '1MS24CS001',
    registeredAt: 'Nov 05, 2026',
  },
  {
    id: 'usr_student_02_evt_1',
    eventId: 'evt_1',
    studentId: 'usr_student_02',
    studentName: 'Sneha Patel',
    studentRollNo: '1MS24CS112',
    registeredAt: 'Nov 06, 2026',
  },
  {
    id: 'usr_student_03_evt_2',
    eventId: 'evt_2',
    studentId: 'usr_student_03',
    studentName: 'Rohit Kulkarni',
    studentRollNo: '1MS24CS088',
    registeredAt: 'Nov 02, 2026',
  },
];

// Build an isolated quest + badge record for every seeded student
const SEED_STUDENT_PROGRESS: StudentProgressRecord[] = SEED_STUDENTS.filter(
  (s) => s.role === 'student'
).map((student, idx) => ({
  id: `prog_${student.id}`,
  studentId: student.id,
  studentName: student.fullName,
  studentRollNo: student.rollNo,
  department: student.department,
  xp: student.xpPoints ?? 0,
  quests: SAMPLE_QUESTS.map((q, qi) => {
    const mode = (idx + qi) % 3;
    if (mode === 2) return { ...q, progress: q.maxProgress, completed: false };
    if (mode === 1) return { ...q, progress: Math.max(0, q.maxProgress - 1), completed: false };
    return { ...q, progress: q.maxProgress, completed: true };
  }),
  badges: SAMPLE_BADGES.map((b, bi) => ({
    ...b,
    unlocked: bi < (student.badgeCount ?? 0),
    unlockedDate: bi < (student.badgeCount ?? 0) ? b.unlockedDate : undefined,
  })),
}));

/**
 * LocalCampusDB: Fully local persistent store for the Surviving College app.
 * All data runs inside the device via AsyncStorage and FileSystem.
 */
class LocalCampusDBEngine {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const isInit = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
      if (!isInit) {
        await this.seedAll();
        await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
      }
      this.initialized = true;
    } catch (e) {
      console.warn('[LocalCampusDB] Init warning:', e);
    }
  }

  private async seedAll(): Promise<void> {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS)],
      [STORAGE_KEYS.FACULTIES, JSON.stringify(SEED_FACULTIES)],
      [STORAGE_KEYS.TIMETABLE, JSON.stringify(SAMPLE_TIMETABLE)],
      [STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify(SEED_CALENDAR_EVENTS)],
      [STORAGE_KEYS.ATTENDANCE, JSON.stringify(SAMPLE_ATTENDANCE)],
      [STORAGE_KEYS.EXAMINATION_MARKS, JSON.stringify(SEED_EXAM_MARKS)],
      [STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(SAMPLE_ASSIGNMENTS)],
      [STORAGE_KEYS.STUDY_MATERIALS, JSON.stringify(SAMPLE_STUDY_MATERIALS)],
      [STORAGE_KEYS.CAMPUS_EVENTS, JSON.stringify(SAMPLE_EVENTS)],
      [STORAGE_KEYS.QUESTS, JSON.stringify(SAMPLE_QUESTS)],
      [STORAGE_KEYS.CLUBS, JSON.stringify(SEED_CLUBS)],
      [STORAGE_KEYS.INTERNSHIPS, JSON.stringify(SAMPLE_OPPORTUNITIES)],
      [STORAGE_KEYS.STUDENT_OPPORTUNITIES, JSON.stringify(SEED_STUDENT_OPPS)],
      [STORAGE_KEYS.EVENT_REGISTRATIONS, JSON.stringify(SEED_EVENT_REGISTRATIONS)],
      [STORAGE_KEYS.STUDENT_PROGRESS, JSON.stringify(SEED_STUDENT_PROGRESS)],
      [STORAGE_KEYS.ANNOUNCEMENTS, JSON.stringify(SAMPLE_ANNOUNCEMENTS)],
    ]);
  }

  // Generic getter
  async getCollection<T>(key: string, fallback: T[]): Promise<T[]> {
    await this.init();
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw) as T[];
    } catch (err) {
      console.error(`[LocalDB] Error reading ${key}:`, err);
      return fallback;
    }
  }

  // Generic setter
  async setCollection<T>(key: string, items: T[]): Promise<void> {
    await this.init();
    try {
      await AsyncStorage.setItem(key, JSON.stringify(items));
    } catch (err) {
      console.error(`[LocalDB] Error saving ${key}:`, err);
    }
  }

  // Local notification scheduling signature (prevents duplicate re-scheduling)
  async getNotificationScheduleSignature(): Promise<string> {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_SCHEDULE)) || '';
    } catch {
      return '';
    }
  }

  async setNotificationScheduleSignature(signature: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_SCHEDULE, signature);
    } catch {
      // ignore persistence failures
    }
  }

  // Specific Collection Accessors
  getStudents(): Promise<UserProfile[]> {
    return this.getCollection<UserProfile>(STORAGE_KEYS.STUDENTS, SEED_STUDENTS);
  }
  setStudents(items: UserProfile[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.STUDENTS, items);
  }

  getFaculties(): Promise<UserProfile[]> {
    return this.getCollection<UserProfile>(STORAGE_KEYS.FACULTIES, SEED_FACULTIES);
  }
  setFaculties(items: UserProfile[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.FACULTIES, items);
  }

  getTimetable(): Promise<TimetableSlot[]> {
    return this.getCollection<TimetableSlot>(STORAGE_KEYS.TIMETABLE, SAMPLE_TIMETABLE);
  }
  setTimetable(items: TimetableSlot[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.TIMETABLE, items);
  }

  getCalendarEvents(): Promise<CalendarEventItem[]> {
    return this.getCollection<CalendarEventItem>(STORAGE_KEYS.CALENDAR_EVENTS, SEED_CALENDAR_EVENTS);
  }
  setCalendarEvents(items: CalendarEventItem[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.CALENDAR_EVENTS, items);
  }

  async getAttendance(studentId?: string): Promise<AttendanceRecord[]> {
    const records = await this.getCollection<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, SAMPLE_ATTENDANCE);
    const studentData = await this.getStudentAttendance();
    
    // If studentId provided, overlay or build that student's specific attendance
    if (studentId) {
      const studentMap = studentData[studentId] || {};
      return records.map((rec) => {
        const studentRec = studentMap[rec.courseCode];
        if (studentRec && studentRec.total > 0) {
          const pct = Math.round((studentRec.attended / studentRec.total) * 1000) / 10;
          return {
            ...rec,
            studentId,
            attended: studentRec.attended,
            total: studentRec.total,
            percentage: pct,
            status: (pct >= 75 ? 'safe' : pct >= 65 ? 'warning' : 'critical') as any,
          };
        }
        return { ...rec, studentId };
      });
    }

    return records;
  }
  setAttendance(items: AttendanceRecord[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.ATTENDANCE, items);
  }

  // Per-student attendance: Record<studentId, Record<courseCode, { attended: number; total: number }>>
  async getStudentAttendance(): Promise<Record<string, Record<string, { attended: number; total: number }>>> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.STUDENT_ATTENDANCE);
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    // Return baseline seed attendance for each demo student
    return {
      usr_student_01: {
        BCS401: { attended: 38, total: 42 },
        BCS402: { attended: 32, total: 36 },
        BCS403: { attended: 35, total: 40 },
        BCS404: { attended: 27, total: 34 },
        BCS405A: { attended: 28, total: 30 },
        BBOK407: { attended: 22, total: 24 },
      },
      usr_student_02: {
        BCS401: { attended: 39, total: 42 },
        BCS402: { attended: 34, total: 36 },
        BCS403: { attended: 37, total: 40 },
        BCS404: { attended: 31, total: 34 },
        BCS405A: { attended: 29, total: 30 },
        BBOK407: { attended: 23, total: 24 },
      },
      usr_student_03: {
        BCS401: { attended: 41, total: 42 },
        BCS402: { attended: 35, total: 36 },
        BCS403: { attended: 39, total: 40 },
        BCS404: { attended: 33, total: 34 },
        BCS405A: { attended: 30, total: 30 },
        BBOK407: { attended: 24, total: 24 },
      },
    };
  }
  async setStudentAttendance(data: Record<string, Record<string, { attended: number; total: number }>>): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_ATTENDANCE, JSON.stringify(data));
  }
  async markStudentAttendance(studentId: string, courseCode: string, isPresent: boolean): Promise<void> {
    const all = await this.getStudentAttendance();
    if (!all[studentId]) all[studentId] = {};
    const prev = all[studentId][courseCode] ?? { attended: 0, total: 0 };
    all[studentId][courseCode] = {
      attended: prev.attended + (isPresent ? 1 : 0),
      total: prev.total + 1,
    };
    await this.setStudentAttendance(all);
  }
  async setStudentCourseAttendance(studentId: string, courseCode: string, attended: number, total: number): Promise<void> {
    const all = await this.getStudentAttendance();
    if (!all[studentId]) all[studentId] = {};
    all[studentId][courseCode] = { attended, total };
    await this.setStudentAttendance(all);
  }

  async getExaminationMarks(studentId?: string): Promise<ExaminationMark[]> {
    const marks = await this.getCollection<ExaminationMark>(STORAGE_KEYS.EXAMINATION_MARKS, SEED_EXAM_MARKS);
    if (!studentId) return marks;
    const studentMarks = marks.filter((m) => m.studentId === studentId);
    if (studentMarks.length > 0) return studentMarks;

    // Generate individual baseline subject marks for this student so they have isolated records
    const students = await this.getStudents();
    const target = students.find((s) => s.id === studentId);
    const sName = target?.fullName || 'Student';
    const courses = [
      { code: 'BCS401', title: 'Analysis & Design of Algorithms', i1: 22, i2: 23, lab: 24, ext: 82 },
      { code: 'BCS403', title: 'Database Management Systems', i1: 21, i2: 24, lab: 23, ext: 80 },
      { code: 'BCS404', title: 'Operating Systems', i1: 23, i2: 22, lab: 24, ext: 78 },
      { code: 'BCS405A', title: 'Discrete Mathematical Structures', i1: 24, i2: 24, lab: 25, ext: 90 },
      { code: 'BBOK407', title: 'Biology For Engineers', i1: 20, i2: 21, lab: 22, ext: 74 },
    ];
    const generated: ExaminationMark[] = courses.map((c, idx) => {
      const tot = c.i1 + c.i2 + c.lab + c.ext;
      const pct = Math.round((tot / 175) * 1000) / 10;
      return {
        id: `mrk_${studentId}_${idx + 1}`,
        studentId,
        studentName: sName,
        courseCode: c.code,
        courseTitle: c.title,
        internal1: c.i1,
        internal2: c.i2,
        labInternal: c.lab,
        externalExam: c.ext,
        totalMarks: tot,
        maxMarks: 175,
        percentage: pct,
        grade: pct >= 90 ? 'O' : pct >= 80 ? 'A+' : pct >= 70 ? 'A' : 'B+',
        status: pct >= 85 ? 'Distinction' : 'First Class',
      };
    });
    const combined = [...marks, ...generated];
    await this.setExaminationMarks(combined);
    return generated;
  }
  setExaminationMarks(items: ExaminationMark[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.EXAMINATION_MARKS, items);
  }

  getAssignments(): Promise<Assignment[]> {
    return this.getCollection<Assignment>(STORAGE_KEYS.ASSIGNMENTS, SAMPLE_ASSIGNMENTS);
  }
  setAssignments(items: Assignment[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.ASSIGNMENTS, items);
  }

  getStudyMaterials(): Promise<StudyMaterial[]> {
    return this.getCollection<StudyMaterial>(STORAGE_KEYS.STUDY_MATERIALS, SAMPLE_STUDY_MATERIALS);
  }
  setStudyMaterials(items: StudyMaterial[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.STUDY_MATERIALS, items);
  }

  getCampusEvents(): Promise<CampusEvent[]> {
    return this.getCollection<CampusEvent>(STORAGE_KEYS.CAMPUS_EVENTS, SAMPLE_EVENTS);
  }
  setCampusEvents(items: CampusEvent[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.CAMPUS_EVENTS, items);
  }

  getQuests(): Promise<Quest[]> {
    return this.getCollection<Quest>(STORAGE_KEYS.QUESTS, SAMPLE_QUESTS);
  }
  setQuests(items: Quest[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.QUESTS, items);
  }

  getClubs(): Promise<ClubItem[]> {
    return this.getCollection<ClubItem>(STORAGE_KEYS.CLUBS, SEED_CLUBS);
  }
  setClubs(items: ClubItem[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.CLUBS, items);
  }

  getInternships(): Promise<Opportunity[]> {
    return this.getCollection<Opportunity>(STORAGE_KEYS.INTERNSHIPS, SAMPLE_OPPORTUNITIES);
  }
  setInternships(items: Opportunity[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.INTERNSHIPS, items);
  }

  getStudentOpportunities(): Promise<StudentOpportunityRecord[]> {
    return this.getCollection<StudentOpportunityRecord>(
      STORAGE_KEYS.STUDENT_OPPORTUNITIES,
      SEED_STUDENT_OPPS
    );
  }

  setStudentOpportunities(items: StudentOpportunityRecord[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.STUDENT_OPPORTUNITIES, items);
  }

  getEventRegistrations(): Promise<EventRegistrationRecord[]> {
    return this.getCollection<EventRegistrationRecord>(
      STORAGE_KEYS.EVENT_REGISTRATIONS,
      SEED_EVENT_REGISTRATIONS
    );
  }

  setEventRegistrations(items: EventRegistrationRecord[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.EVENT_REGISTRATIONS, items);
  }

  getStudentProgressRecords(): Promise<StudentProgressRecord[]> {
    return this.getCollection<StudentProgressRecord>(
      STORAGE_KEYS.STUDENT_PROGRESS,
      SEED_STUDENT_PROGRESS
    );
  }

  setStudentProgressRecords(items: StudentProgressRecord[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.STUDENT_PROGRESS, items);
  }

  async applyOpportunity(
    studentId: string,
    studentName: string,
    oppId: string,
    rollNo?: string
  ): Promise<StudentOpportunityRecord> {
    const list = await this.getStudentOpportunities();
    const existing = list.find((r) => r.studentId === studentId && r.oppId === oppId);
    if (existing) return existing;

    const newRecord: StudentOpportunityRecord = {
      id: `${studentId}_${oppId}`,
      oppId,
      studentId,
      studentName,
      studentRollNo: rollNo,
      status: 'applied',
      appliedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      skillsDeveloped: [],
      exposureExperience: '',
    };
    const updated = [newRecord, ...list];
    await this.setStudentOpportunities(updated);
    return newRecord;
  }

  async updateOpportunityStatus(
    studentId: string,
    oppId: string,
    status: 'applied' | 'accepted' | 'rejected'
  ): Promise<void> {
    const list = await this.getStudentOpportunities();
    const updated = list.map((r) =>
      r.studentId === studentId && r.oppId === oppId ? { ...r, status } : r
    );
    await this.setStudentOpportunities(updated);
  }

  async updateStudentSkillsAndExperience(
    studentId: string,
    oppId: string,
    skills: string[],
    experience: string
  ): Promise<void> {
    const list = await this.getStudentOpportunities();
    const updated = list.map((r) =>
      r.studentId === studentId && r.oppId === oppId
        ? { ...r, skillsDeveloped: skills, exposureExperience: experience }
        : r
    );
    await this.setStudentOpportunities(updated);
  }

  async joinClub(
    userId: string,
    clubId: string
  ): Promise<{ isJoined: boolean; welcomeMessage?: string; clubName: string }> {
    const clubs = await this.getClubs();
    let welcomeMessage = '';
    let clubName = 'Club';
    let isJoined = false;

    const updated = clubs.map((c) => {
      if (c.id === clubId) {
        clubName = c.name;
        welcomeMessage =
          c.welcomeMessage ||
          `Welcome to ${c.name}! We're thrilled to have you as part of our campus community.`;
        const members = c.joinedMemberIds || (c.isMember ? ['usr_student_01'] : []);
        const alreadyJoined = members.includes(userId);
        if (alreadyJoined) {
          isJoined = true;
          return { ...c, isMember: true, joinedMemberIds: members };
        } else {
          isJoined = true;
          const nextMembers = [...members, userId];
          return {
            ...c,
            isMember: true,
            members: (c.members || 0) + 1,
            joinedMemberIds: nextMembers,
          };
        }
      }
      return c;
    });

    await this.setClubs(updated);
    return { isJoined, welcomeMessage, clubName };
  }

  getAnnouncements(): Promise<Announcement[]> {
    return this.getCollection<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS, SAMPLE_ANNOUNCEMENTS);
  }
  setAnnouncements(items: Announcement[]): Promise<void> {
    return this.setCollection(STORAGE_KEYS.ANNOUNCEMENTS, items);
  }

  /**
   * Save an uploaded document locally on the phone's persistent storage.
   */
  async saveLocalDocument(
    sourceUri: string,
    fileName: string
  ): Promise<{ localUri: string; fileSize: string }> {
    try {
      const docDir = `${FileSystem.documentDirectory}survive_college_docs/`;
      const dirInfo = await FileSystem.getInfoAsync(docDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(docDir, { intermediates: true });
      }

      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const destination = `${docDir}${Date.now()}_${cleanName}`;

      let copied = false;
      try {
        await FileSystem.copyAsync({ from: sourceUri, to: destination });
        copied = true;
      } catch (copyErr) {
        console.warn('[LocalDB] copyAsync failed, trying fallback:', copyErr);
      }

      if (!copied) {
        try {
          const base64 = await FileSystem.readAsStringAsync(sourceUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          await FileSystem.writeAsStringAsync(destination, base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
          copied = true;
        } catch {
          try {
            const res = await fetch(sourceUri);
            const blob = await res.blob();
            const reader = new FileReader();
            await new Promise<void>((resolve, reject) => {
              reader.onloadend = async () => {
                try {
                  const b64 = ((reader.result as string) || '').split(',')[1] || '';
                  if (b64) {
                    await FileSystem.writeAsStringAsync(destination, b64, {
                      encoding: FileSystem.EncodingType.Base64,
                    });
                    copied = true;
                  }
                  resolve();
                } catch (e) {
                  reject(e);
                }
              };
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch (fetchErr) {
            console.warn('[LocalDB] Fallback fetch failed:', fetchErr);
          }
        }
      }

      const finalPath = copied ? destination : sourceUri;
      let fileSize = '1.5 MB';
      try {
        const fileInfo = await FileSystem.getInfoAsync(finalPath);
        const sizeBytes = (fileInfo as any).size || 0;
        if (sizeBytes > 0) {
          const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(1);
          fileSize = `${sizeMb} MB`;
        }
      } catch {
        // Keep default
      }

      return { localUri: finalPath, fileSize };
    } catch (e) {
      console.warn('[LocalDB] Document copy error:', e);
      return { localUri: sourceUri, fileSize: '1.2 MB' };
    }
  }

  /**
   * Requirement #8: Semester End Reset.
   * Resets timetable, calendar of events, attendance, assignments, examination marks, and active quests.
   * PRESERVES: Notes, PYQs (study materials), Clubs, Students, and Faculties!
   */
  // ==================================================================
  // Private discussion channels (1-to-1, faculty anchor)
  // ==================================================================
  private readonly MAX_PRIVATE_CHANNELS = 50;

  async getPrivateChannels(): Promise<PrivateChannel[]> {
    return this.getCollection<PrivateChannel>(STORAGE_KEYS.PRIVATE_CHANNELS, []);
  }

  async setPrivateChannels(items: PrivateChannel[]): Promise<void> {
    await this.setCollection(STORAGE_KEYS.PRIVATE_CHANNELS, items);
  }

  async getPrivateMessages(): Promise<PrivateMessage[]> {
    return this.getCollection<PrivateMessage>(STORAGE_KEYS.PRIVATE_MESSAGES, []);
  }

  async setPrivateMessages(items: PrivateMessage[]): Promise<void> {
    await this.setCollection(STORAGE_KEYS.PRIVATE_MESSAGES, items);
  }

  private privateChannelPairId(a: string, b: string): string {
    return `pc_${[a, b].sort().join('_')}`;
  }

  async createPrivateChannel(
    me: { id: string; name: string; role: 'student' | 'faculty' | 'admin' },
    other: { id: string; name: string; role: 'student' | 'faculty' | 'admin' }
  ): Promise<PrivateChannel | null> {
    if (me.id === other.id) return null;

    const channels = await this.getPrivateChannels();
    const existing = channels.find(
      (c) =>
        c.participantIds.includes(me.id) &&
        c.participantIds.includes(other.id)
    );
    if (existing) return existing;

    if (channels.length >= this.MAX_PRIVATE_CHANNELS) {
      throw new Error('Private channel limit reached (50). Delete an existing channel first.');
    }

    const channel: PrivateChannel = {
      id: this.privateChannelPairId(me.id, other.id),
      participantIds: [me.id, other.id],
      participantNames: [me.name, other.name],
      participantRoles: [me.role, other.role],
      createdAt: new Date().toISOString(),
      createdBy: me.id,
      reported: false,
    };
    await this.setPrivateChannels([channel, ...channels]);
    return channel;
  }

  async deletePrivateChannel(channelId: string): Promise<void> {
    const [channels, messages] = await Promise.all([
      this.getPrivateChannels(),
      this.getPrivateMessages(),
    ]);
    await this.setPrivateChannels(channels.filter((c) => c.id !== channelId));
    await this.setPrivateMessages(messages.filter((m) => m.channelId !== channelId));
  }

  async reportPrivateChannel(
    channelId: string,
    reporter: { id: string; role: 'student' | 'faculty' | 'admin' }
  ): Promise<{ deleted: boolean }> {
    const channels = await this.getPrivateChannels();
    const channel = channels.find((c) => c.id === channelId);
    if (!channel) return { deleted: false };

    // Special rule: faculty reporting an admin<->faculty channel deletes it instantly
    const otherParticipantId = channel.participantIds.find((id) => id !== reporter.id);
    const otherParticipantRole = channel.participantRoles[
      channel.participantIds.findIndex((id) => id === otherParticipantId)
    ];
    if (reporter.role === 'faculty' && otherParticipantRole === 'admin') {
      await this.deletePrivateChannel(channelId);
      return { deleted: true };
    }

    const next = channels.map((c) =>
      c.id === channelId
        ? {
            ...c,
            reported: true,
            reportedBy: reporter.id,
            reportedByRole: reporter.role,
            reportedAt: new Date().toISOString(),
          }
        : c
    );
    await this.setPrivateChannels(next);
    return { deleted: false };
  }

  async addPrivateMessage(
    channelId: string,
    sender: { id: string; name: string; role: 'student' | 'faculty' | 'admin' },
    text: string
  ): Promise<PrivateMessage> {
    const message: PrivateMessage = {
      id: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      channelId,
      senderId: sender.id,
      senderName: sender.name,
      senderRole: sender.role,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    const messages = await this.getPrivateMessages();
    await this.setPrivateMessages([message, ...messages]);
    return message;
  }

  // ==================================================================
  // College layout (campus map) storage
  // ==================================================================
  async getCollegeLayout(): Promise<CollegeLayout | null> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.COLLEGE_LAYOUT);
      return raw ? (JSON.parse(raw) as CollegeLayout) : null;
    } catch {
      return null;
    }
  }

  async setCollegeLayout(layout: CollegeLayout): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.COLLEGE_LAYOUT, JSON.stringify(layout));
  }

  async deleteCollegeLayout(): Promise<void> {
    try {
      const layout = await this.getCollegeLayout();
      if (layout?.localUri) {
        await FileSystem.deleteAsync(layout.localUri, { idempotent: true }).catch(() => {});
      }
    } finally {
      await AsyncStorage.removeItem(STORAGE_KEYS.COLLEGE_LAYOUT);
    }
  }

  async resetSemester(): Promise<{ clearedCount: number }> {
    await this.init();

    // Reset timetable to empty / new semester ready
    await AsyncStorage.setItem(STORAGE_KEYS.TIMETABLE, JSON.stringify([]));

    // Reset calendar of events to new semester ready
    await AsyncStorage.setItem(STORAGE_KEYS.CALENDAR_EVENTS, JSON.stringify([]));

    // Reset attendance records (fully clear for fresh term)
    await AsyncStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));

    // Reset examination marks
    await AsyncStorage.setItem(STORAGE_KEYS.EXAMINATION_MARKS, JSON.stringify([]));

    // Reset assignments
    await AsyncStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify([]));

    // Reset quests progress
    const currentQuests = await this.getQuests();
    const resetQuests = currentQuests.map((q) => ({
      ...q,
      progress: 0,
      completed: false,
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.QUESTS, JSON.stringify(resetQuests));

    // Reset per-student quest progress while keeping XP and earned badges
    const progress = await this.getStudentProgressRecords();
    const resetProgress = progress.map((rec) => ({
      ...rec,
      quests: rec.quests.map((q) => ({ ...q, progress: 0, completed: false })),
    }));
    await AsyncStorage.setItem(STORAGE_KEYS.STUDENT_PROGRESS, JSON.stringify(resetProgress));

    // Notes/PYQs (study materials), clubs, students and faculties STAY INTACT!
    return { clearedCount: 6 };
  }
}

export const LocalCampusDB = new LocalCampusDBEngine();
export default LocalCampusDB;
