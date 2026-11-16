export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'faculty' | 'admin';
  department: string;
  semester?: number;
  rollNo?: string;
  cgpa?: number;
  designation?: string;
  cabinLocation?: string;
  officeHours?: string;
  phone?: string;
  avatarUrl?: string;
  bio: string;
  attendancePct?: number;
  xpPoints?: number;
  badgeCount?: number;
}

export interface TimetableSlot {
  id: string;
  courseCode: string;
  courseTitle: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  startTime: string;
  endTime: string;
  room: string;
  facultyName: string;
  type: 'Theory' | 'Lab' | 'Tutorial';
}

export interface AttendanceRecord {
  courseCode: string;
  courseTitle: string;
  attended: number;
  total: number;
  percentage: number;
  facultyName: string;
  status: 'safe' | 'warning' | 'critical'; // >=75 safe, 65-74 warning, <65 critical
  studentId?: string;
  studentName?: string;
}

export interface Assignment {
  id: string;
  courseCode: string;
  courseTitle: string;
  facultyName: string;
  title: string;
  description: string;
  dueDate: string;
  maxMarks: number;
  status: 'pending' | 'submitted' | 'graded';
  submittedDate?: string;
  marksObtained?: number;
  feedback?: string;
}

export interface StudyMaterial {
  id: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  category: 'Notes' | 'PYQ' | 'Syllabus' | 'Lab Manual';
  fileType: 'PDF' | 'DOCX' | 'ZIP';
  fileSize: string;
  uploadedBy: string;
  date: string;
  fileUri?: string;
  fileName?: string;
  textContent?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'Exam' | 'Academic' | 'Event' | 'Placement' | 'Urgent';
  authorName: string;
  authorRole: string;
  date: string;
  isPinned: boolean;
}

export interface CampusEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  organizer: string;
  category: 'Technical' | 'Cultural' | 'Sports' | 'Workshop';
  registeredCount: number;
  isRegistered?: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  organization: string;
  type: 'Internship' | 'Hackathon' | 'Research' | 'Workshop';
  stipendOrPrize: string;
  deadline: string;
  eligibility: string;
  description: string;
  isApplied?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  progress: number;
  maxProgress: number;
  completed: boolean;
  category: 'Academic' | 'Community' | 'Campus Life';
}

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond';
  unlocked: boolean;
  unlockedDate?: string;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  rollNo: string;
  department: string;
  xp: number;
  badgeName: string;
  avatarUrl?: string;
}

export interface ForumReply {
  id: string;
  authorName: string;
  authorRole: string;
  text: string;
  timeAgo: string;
  isVerified?: boolean;
}

export interface ForumPost {
  id: string;
  authorName: string;
  authorRole: string;
  title: string;
  body: string;
  tags: string[];
  likes: number;
  repliesCount: number;
  timeAgo: string;
  verifiedAnswer?: string;
  replies?: ForumReply[];
}

// ============================================================================
// DEMO PERSONAS FOR INSTANT TESTING
// ============================================================================
export const DEMO_USERS: Record<'student' | 'faculty' | 'admin', UserProfile> = {
  student: {
    id: 'usr_student_01',
    fullName: 'Aarav Sharma',
    email: 'aarav.sharma@smartcampus.edu',
    role: 'student',
    department: 'Computer Science & Engineering',
    semester: 4,
    rollNo: '1MS24CS042',
    cgpa: 8.84,
    phone: '+91 98765 99001',
    attendancePct: 86.2,
    xpPoints: 720,
    badgeCount: 4,
    bio: 'B.Tech CSE 4th Semester student. AI Club Technical Lead, competitive coding and hackathon enthusiast.'
  },
  faculty: {
    id: 'usr_faculty_01',
    fullName: 'Dr. Priya Raman',
    email: 'priya.raman@smartcampus.edu',
    role: 'faculty',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor',
    cabinLocation: 'Alan Turing Block, Room 304',
    officeHours: 'Mon, Wed, Fri 2:00 PM - 4:00 PM',
    phone: '+91 98765 43210',
    bio: 'Associate Professor in CSE. Specializes in Algorithms, Graph Neural Networks, and Distributed Computing. Course Coordinator for BCS401.'
  },
  admin: {
    id: 'usr_admin_01',
    fullName: 'Dr. Rajesh Verma',
    email: 'dean.verma@smartcampus.edu',
    role: 'admin',
    department: 'Academic Affairs',
    designation: 'Dean of Academic Affairs',
    cabinLocation: 'Administrative Central Block, Suite 101',
    officeHours: 'Mon - Fri 11:00 AM - 1:00 PM',
    phone: '+91 98765 43200',
    bio: 'Dean of Academic Affairs overseeing curriculum, student progression, institutional accreditations, and policy enforcement.'
  }
};

// ============================================================================
// ACADEMIC TIMETABLE (SEMESTER 4 - REAL VTU / UNIVERSITY CURRICULUM)
// ============================================================================
export const SAMPLE_TIMETABLE: TimetableSlot[] = [
  {
    id: 'tt_1',
    courseCode: 'BCS401',
    courseTitle: 'Analysis and Design of Algorithms',
    day: 'Monday',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    room: 'LH-301 (Turing Hall)',
    facultyName: 'Dr. Priya Raman',
    type: 'Theory'
  },
  {
    id: 'tt_2',
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    day: 'Monday',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    room: 'LH-302 (Data Lab)',
    facultyName: 'Prof. K. Venkatesh',
    type: 'Theory'
  },
  {
    id: 'tt_3',
    courseCode: 'BCS405A',
    courseTitle: 'Discrete Mathematical Structures',
    day: 'Monday',
    startTime: '11:15 AM',
    endTime: '12:15 PM',
    room: 'LH-301',
    facultyName: 'Dr. Priya Raman',
    type: 'Theory'
  },
  {
    id: 'tt_4',
    courseCode: 'BCS401',
    courseTitle: 'Design of Algorithms Lab',
    day: 'Tuesday',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    room: 'Systems Lab 3',
    facultyName: 'Dr. Priya Raman',
    type: 'Lab'
  },
  {
    id: 'tt_5',
    courseCode: 'BCS403',
    courseTitle: 'DBMS Query Optimization Lab',
    day: 'Wednesday',
    startTime: '02:00 PM',
    endTime: '04:00 PM',
    room: 'Database Lab 2',
    facultyName: 'Prof. K. Venkatesh',
    type: 'Lab'
  },
  {
    id: 'tt_6',
    courseCode: 'BBOK407',
    courseTitle: 'Biology For Engineers',
    day: 'Thursday',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    room: 'LH-204',
    facultyName: 'Dr. Ananya Sen',
    type: 'Theory'
  },
  {
    id: 'tt_7',
    courseCode: 'BUHK408',
    courseTitle: 'Universal Human Values',
    day: 'Friday',
    startTime: '11:15 AM',
    endTime: '12:15 PM',
    room: 'Auditorium West',
    facultyName: 'Dr. Rajesh Verma',
    type: 'Theory'
  }
];

// ============================================================================
// ATTENDANCE LEDGER
// ============================================================================
export const SAMPLE_ATTENDANCE: AttendanceRecord[] = [
  {
    courseCode: 'BCS401',
    courseTitle: 'Analysis & Design of Algorithms',
    attended: 32,
    total: 36,
    percentage: 88.9,
    facultyName: 'Dr. Priya Raman',
    status: 'safe'
  },
  {
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    attended: 28,
    total: 32,
    percentage: 87.5,
    facultyName: 'Prof. K. Venkatesh',
    status: 'safe'
  },
  {
    courseCode: 'BCS405A',
    courseTitle: 'Discrete Mathematical Structures',
    attended: 26,
    total: 34,
    percentage: 76.5,
    facultyName: 'Dr. Priya Raman',
    status: 'safe'
  },
  {
    courseCode: 'BBOK407',
    courseTitle: 'Biology For Engineers',
    attended: 19,
    total: 26,
    percentage: 73.1,
    facultyName: 'Dr. Ananya Sen',
    status: 'warning' // Near 75% limit!
  },
  {
    courseCode: 'BUHK408',
    courseTitle: 'Universal Human Values',
    attended: 21,
    total: 24,
    percentage: 87.5,
    facultyName: 'Dr. Rajesh Verma',
    status: 'safe'
  }
];

// ============================================================================
// ASSIGNMENTS
// ============================================================================
export const SAMPLE_ASSIGNMENTS: Assignment[] = [
  {
    id: 'asg_1',
    courseCode: 'BCS401',
    courseTitle: 'Analysis and Design of Algorithms',
    facultyName: 'Dr. Priya Raman',
    title: 'Dynamic Programming vs Greedy Algorithms',
    description: 'Implement 0/1 Knapsack using Dynamic Programming (Bottom-Up) and compare execution benchmarks against Fractional Greedy Knapsack with input sizes up to 10,000 items. Submit PDF report and GitHub code link.',
    dueDate: 'Nov 05, 2026 • 11:59 PM',
    maxMarks: 25,
    status: 'pending'
  },
  {
    id: 'asg_2',
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    facultyName: 'Prof. K. Venkatesh',
    title: 'Relational Algebra & B+ Tree Indexing',
    description: 'Construct query trees for multi-join enrollment queries. Compute disk I/O cost reduction using secondary dense B+ Tree index vs table full scan.',
    dueDate: 'Nov 08, 2026 • 11:59 PM',
    maxMarks: 20,
    status: 'submitted',
    submittedDate: 'Oct 28, 2026'
  },
  {
    id: 'asg_3',
    courseCode: 'BCS405A',
    courseTitle: 'Discrete Mathematical Structures',
    facultyName: 'Dr. Priya Raman',
    title: 'Eulerian Graphs & Planarity Proofs',
    description: 'Formal mathematical proofs for Kuratowski theorem and Euler planar formula V - E + R = 2.',
    dueDate: 'Oct 24, 2026',
    maxMarks: 20,
    status: 'graded',
    marksObtained: 19,
    feedback: 'Excellent rigor and neat diagrammatic proofs for K5 and K3,3 planarity.'
  }
];

// ============================================================================
// STUDY MATERIALS & PREVIOUS YEAR QUESTION PAPERS (PYQs)
// ============================================================================
export const SAMPLE_STUDY_MATERIALS: StudyMaterial[] = [
  {
    id: 'mat_1',
    courseCode: 'BCS401',
    courseTitle: 'Analysis & Design of Algorithms',
    title: 'Module 3: Dynamic Programming Complete Notes & Recurrences',
    category: 'Notes',
    fileType: 'PDF',
    fileSize: '4.2 MB',
    uploadedBy: 'Dr. Priya Raman',
    date: 'Oct 20, 2026'
  },
  {
    id: 'mat_2',
    courseCode: 'BCS401',
    courseTitle: 'Analysis & Design of Algorithms',
    title: 'VTU BCS401 June-July 2025 Solved Question Paper',
    category: 'PYQ',
    fileType: 'PDF',
    fileSize: '3.8 MB',
    uploadedBy: 'Department Academic Cell',
    date: 'Oct 15, 2026'
  },
  {
    id: 'mat_3',
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    title: 'BCS403 June-July 2025 Model Question Paper & Solutions',
    category: 'PYQ',
    fileType: 'PDF',
    fileSize: '5.1 MB',
    uploadedBy: 'Prof. K. Venkatesh',
    date: 'Oct 18, 2026'
  },
  {
    id: 'mat_4',
    courseCode: 'BCS403',
    courseTitle: 'Database Management Systems',
    title: 'Normalization (1NF to BCNF) & Lossless Join Decomposition Guide',
    category: 'Notes',
    fileType: 'PDF',
    fileSize: '2.6 MB',
    uploadedBy: 'Prof. K. Venkatesh',
    date: 'Oct 12, 2026'
  },
  {
    id: 'mat_5',
    courseCode: 'BBOK407',
    courseTitle: 'Biology For Engineers',
    title: 'BBOK407 Comprehensive Question Bank & Solutions',
    category: 'PYQ',
    fileType: 'PDF',
    fileSize: '2.1 MB',
    uploadedBy: 'Dr. Ananya Sen',
    date: 'Oct 08, 2026'
  }
];

// ============================================================================
// ANNOUNCEMENTS
// ============================================================================
export const SAMPLE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'anc_1',
    title: 'Mid-Semester Examinations Schedule (Nov 2026)',
    content: 'The official schedule for 4th Semester Mid-Term Examinations starting from 18th November 2026 is published. Hall tickets will be issued through the portal. Note that 75% attendance is mandatory.',
    category: 'Exam',
    authorName: 'Dr. Rajesh Verma',
    authorRole: 'Dean of Academic Affairs',
    date: 'Today, 10:30 AM',
    isPinned: true
  },
  {
    id: 'anc_2',
    title: 'Smart Campus Hackathon 2026 — 36hr Build Sprint',
    content: 'Registration is now live for Smart Campus Hackathon 2026. Exciting tracks in Generative AI, Campus Mobility, and Cyber Security with cash pool of INR 1,50,000.',
    category: 'Event',
    authorName: 'Dr. Priya Raman',
    authorRole: 'AI Club Faculty Mentor',
    date: 'Yesterday, 3:15 PM',
    isPinned: true
  },
  {
    id: 'anc_3',
    title: 'Central Library Extended Night Hours',
    content: 'In view of upcoming tests and project submissions, Central Library reading halls will stay open until 11:30 PM on all weekdays.',
    category: 'Academic',
    authorName: 'Chief Librarian',
    authorRole: 'Central Library',
    date: 'Oct 26, 2026',
    isPinned: false
  }
];

// ============================================================================
// CAMPUS EVENTS & CLUBS
// ============================================================================
export const SAMPLE_EVENTS: CampusEvent[] = [
  {
    id: 'evt_1',
    title: 'CodeStorm 2026: 24-Hour University Hackathon',
    description: 'Compete in teams of 2-4 to build mobile and AI solutions for smart city and campus infrastructure.',
    date: 'Nov 14, 2026',
    time: '09:00 AM onwards',
    venue: 'Auditorium & Turing Innovation Labs',
    organizer: 'Developer Student Club',
    category: 'Technical',
    registeredCount: 142,
    isRegistered: true
  },
  {
    id: 'evt_2',
    title: 'Hands-on Workshop: React Native & Supabase Edge Functions',
    description: 'Learn modern mobile architecture, offline-first syncing, and secure serverless backend functions.',
    date: 'Nov 07, 2026',
    time: '02:00 PM - 05:00 PM',
    venue: 'Seminar Hall 2, Sarabhai Block',
    organizer: 'Mobile Computing Club',
    category: 'Workshop',
    registeredCount: 88,
    isRegistered: false
  },
  {
    id: 'evt_3',
    title: 'Campus Robotics & IoT Expo 2026',
    description: 'Live demonstration of autonomous drones, line-following rovers, and smart green energy campus sensors.',
    date: 'Nov 21, 2026',
    time: '10:00 AM - 04:00 PM',
    venue: 'Visvesvaraya Mechanical Quadrangle',
    organizer: 'Robotics Society',
    category: 'Technical',
    registeredCount: 195,
    isRegistered: false
  }
];

// ============================================================================
// INTERNSHIPS & HACKATHONS
// ============================================================================
export const SAMPLE_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'opp_1',
    title: 'AI & Multimodal Vision Research Intern',
    organization: 'Google Research India',
    type: 'Internship',
    stipendOrPrize: 'INR 85,000 / month',
    deadline: 'Nov 20, 2026',
    eligibility: 'Pre-final & Final year CSE/ECE with Python & PyTorch experience.',
    description: 'Work with the Gemini Research team on edge model optimization and on-device machine intelligence.',
    isApplied: true
  },
  {
    id: 'opp_2',
    title: 'Smart India Hackathon (SIH 2026)',
    organization: 'Ministry of Education & AICTE',
    type: 'Hackathon',
    stipendOrPrize: 'INR 1,00,000 per problem statement',
    deadline: 'Nov 12, 2026',
    eligibility: 'All undergraduate engineering branches. Teams of 6 members.',
    description: 'Solve problem statements provided by central ministries, state departments, and leading PSUs.',
    isApplied: false
  },
  {
    id: 'opp_3',
    title: 'Mobile App Engineer Intern (React Native)',
    organization: 'Zerodha Tech',
    type: 'Internship',
    stipendOrPrize: 'INR 60,000 / month',
    deadline: 'Nov 16, 2026',
    eligibility: 'Passionate about mobile UX, animations, and TypeScript.',
    description: 'Collaborate with mobile engineering teams on ultra-fast financial interfaces and charting widgets.',
    isApplied: false
  }
];

// ============================================================================
// CAMPUS QUESTS & GAMIFICATION
// ============================================================================
export const SAMPLE_QUESTS: Quest[] = [
  {
    id: 'qst_1',
    title: 'Flawless Week: 100% Attendance',
    description: 'Attend all scheduled lectures and labs from Monday to Friday without missing any class.',
    xpReward: 150,
    progress: 4,
    maxProgress: 5,
    completed: false,
    category: 'Academic'
  },
  {
    id: 'qst_2',
    title: 'Early Bird Submissions',
    description: 'Submit an assignment at least 24 hours before the deadline.',
    xpReward: 100,
    progress: 1,
    maxProgress: 1,
    completed: true,
    category: 'Academic'
  },
  {
    id: 'qst_3',
    title: 'Campus Helper',
    description: 'Write 3 helpful replies in the Campus Discussion forum.',
    xpReward: 120,
    progress: 2,
    maxProgress: 3,
    completed: false,
    category: 'Community'
  }
];

export const SAMPLE_BADGES: BadgeItem[] = [
  {
    id: 'bdg_1',
    name: 'Campus Pioneer',
    description: 'Joined Smart Campus AI and completed student profile onboarding.',
    iconName: 'compass-outline',
    tier: 'Bronze',
    unlocked: true,
    unlockedDate: 'Oct 01, 2026'
  },
  {
    id: 'bdg_2',
    name: 'Consistent Scholar',
    description: 'Maintained >= 85% attendance across all registered courses for 30 consecutive days.',
    iconName: 'ribbon-outline',
    tier: 'Silver',
    unlocked: true,
    unlockedDate: 'Oct 22, 2026'
  },
  {
    id: 'bdg_3',
    name: 'Algorithm Master',
    description: 'Achieved top marks on the Dynamic Programming & Greedy benchmark assignments.',
    iconName: 'code-slash-outline',
    tier: 'Gold',
    unlocked: true,
    unlockedDate: 'Oct 25, 2026'
  },
  {
    id: 'bdg_4',
    name: 'Hackathon Hero',
    description: 'Participated in a university hackathon and presented an innovative project.',
    iconName: 'trophy-outline',
    tier: 'Gold',
    unlocked: true,
    unlockedDate: 'Oct 28, 2026'
  },
  {
    id: 'bdg_5',
    name: 'Grand Scholar',
    description: 'Achieved 1,000+ XP points and earned 5 gold badges.',
    iconName: 'sparkles-outline',
    tier: 'Diamond',
    unlocked: false
  }
];

export const SAMPLE_LEADERBOARD: LeaderboardUser[] = [
  {
    rank: 1,
    name: 'Rohit Kulkarni',
    rollNo: '1MS24CS088',
    department: 'CSE',
    xp: 940,
    badgeName: 'Diamond Champion'
  },
  {
    rank: 2,
    name: 'Sneha Patel',
    rollNo: '1MS24CS112',
    department: 'CSE',
    xp: 870,
    badgeName: 'Gold Scholar'
  },
  {
    rank: 3,
    name: 'Aarav Sharma (You)',
    rollNo: '1MS24CS042',
    department: 'CSE',
    xp: 720,
    badgeName: 'Gold Scholar'
  },
  {
    rank: 4,
    name: 'Meera Iyer',
    rollNo: '1MS24EC055',
    department: 'ECE',
    xp: 690,
    badgeName: 'Silver Scholar'
  },
  {
    rank: 5,
    name: 'Vikram Aditya',
    rollNo: '1MS24ME019',
    department: 'MECH',
    xp: 640,
    badgeName: 'Silver Scholar'
  }
];

// ============================================================================
// CAMPUS FORUM / DISCUSSIONS
// ============================================================================
export const SAMPLE_DISCUSSIONS: ForumPost[] = [
  {
    id: 'disc_1',
    authorName: 'Aarav Sharma',
    authorRole: 'Student (CSE)',
    title: 'Tips for BCS401 Dynamic Programming Knapsack implementation?',
    body: 'For Assignment 1, did anyone find a significant cache performance difference between 1D array space optimization vs 2D table in C++?',
    tags: ['Algorithms', 'BCS401', 'C++'],
    likes: 14,
    repliesCount: 2,
    timeAgo: '3 hours ago',
    verifiedAnswer: 'Dr. Priya Raman: "Using a single 1D array with reverse iteration significantly reduces cache misses from O(N*W) to O(W) with L1/L2 cache fits. Recommended for large W!"',
    replies: [
      {
        id: 'rep_1_1',
        authorName: 'Dr. Priya Raman',
        authorRole: 'Associate Professor',
        text: 'Using a single 1D array with reverse iteration significantly reduces cache misses from O(N*W) to O(W) with L1/L2 cache fits. Recommended for large W!',
        timeAgo: '2 hours ago',
        isVerified: true,
      },
      {
        id: 'rep_1_2',
        authorName: 'Sneha Patel',
        authorRole: 'Student (CSE)',
        text: 'Can confirm! Benchmarked on Linux GCC 13: 1D vector cut runtime by 42% on 10,000 items test case.',
        timeAgo: '1 hour ago',
        isVerified: false,
      },
    ],
  },
  {
    id: 'disc_2',
    authorName: 'Kavya Nair',
    authorRole: 'Student (CSE)',
    title: 'Are solved PYQs available for BCS403 DBMS June 2025?',
    body: 'Looking for query decomposition solutions for question 4b in the module 2 paper.',
    tags: ['DBMS', 'PYQ', 'Exams'],
    likes: 8,
    repliesCount: 1,
    timeAgo: '1 day ago',
    verifiedAnswer: 'Prof. K. Venkatesh uploaded the complete solutions in the Study Materials tab under BCS403!',
    replies: [
      {
        id: 'rep_2_1',
        authorName: 'Prof. K. Venkatesh',
        authorRole: 'Assistant Professor',
        text: 'Uploaded the complete step-by-step query decomposition solutions in the Study Materials tab under BCS403 Notes & PYQs section!',
        timeAgo: '18 hours ago',
        isVerified: true,
      },
    ],
  }
];

// ============================================================================
// FACULTY & CABIN DIRECTORY
// ============================================================================
export const FACULTY_DIRECTORY = [
  {
    id: 'fac_1',
    name: 'Dr. Priya Raman',
    designation: 'Associate Professor & Course Lead',
    department: 'Computer Science & Engineering',
    cabin: 'Alan Turing Block, Room 304 (3rd Floor)',
    officeHours: 'Mon, Wed, Fri 2:00 PM - 4:00 PM',
    subjects: ['BCS401 - Analysis and Design of Algorithms', 'BCS405A - Discrete Maths'],
    email: 'priya.raman@smartcampus.edu',
    phone: '+91 98765 43210'
  },
  {
    id: 'fac_2',
    name: 'Prof. K. Venkatesh',
    designation: 'Assistant Professor',
    department: 'Computer Science & Engineering',
    cabin: 'Alan Turing Block, Room 312 (3rd Floor)',
    officeHours: 'Tue, Thu 10:00 AM - 12:30 PM',
    subjects: ['BCS403 - Database Management Systems', 'BCS404 - Operating Systems'],
    email: 'k.venkatesh@smartcampus.edu',
    phone: '+91 98765 43211'
  },
  {
    id: 'fac_3',
    name: 'Dr. Rajesh Verma',
    designation: 'Dean of Academic Affairs',
    department: 'Academic Affairs',
    cabin: 'Central Administrative Block, Suite 101 (Ground Floor)',
    officeHours: 'Mon - Fri 11:00 AM - 1:00 PM',
    subjects: ['BUHK408 - Universal Human Values', 'Curriculum Policy'],
    email: 'dean.verma@smartcampus.edu',
    phone: '+91 98765 43200'
  },
  {
    id: 'fac_4',
    name: 'Dr. Ananya Sen',
    designation: 'Assistant Professor',
    department: 'Applied Sciences',
    cabin: 'Sarabhai Block, Room 114 (1st Floor)',
    officeHours: 'Wed, Fri 10:00 AM - 11:30 AM',
    subjects: ['BBOK407 - Biology For Engineers'],
    email: 'ananya.sen@smartcampus.edu',
    phone: '+91 98765 43215'
  }
];

// ============================================================================
// CAMPUS SERVICES (SHUTTLES, CAFETERIA, LIBRARY)
// ============================================================================
export const CAMPUS_SERVICES = {
  buses: [
    {
      route: 'Route 1: Metro Station ⇄ Main Campus Gate',
      frequency: 'Every 15 minutes',
      timings: '7:30 AM - 10:30 AM & 4:30 PM - 7:00 PM',
      status: 'Active'
    },
    {
      route: 'Route 2: North Campus Hostels ⇄ Turing Engineering Block',
      frequency: 'Every 20 minutes',
      timings: '8:15 AM - 6:00 PM (Circular Loop)',
      status: 'Active'
    },
    {
      route: 'Route 3: City Center Bus Terminal ⇄ South Campus Gate',
      frequency: 'Scheduled Trips',
      timings: 'Morning: 7:45, 8:15, 8:45 AM | Evening: 4:45, 5:30 PM',
      status: 'Active'
    }
  ],
  library: {
    hours: '8:00 AM - 9:30 PM (Regular) | Extended to 11:30 PM during exams',
    borrowLimit: '4 books for 14 days (Undergraduate)',
    digitalRepo: 'Available 24x7 via Smart Campus Portal'
  },
  healthCenter: {
    location: 'Ground Floor, Hostel Block A',
    emergencyPhone: '+91 98765 00108 / Extension 2222',
    doctorHours: '24x7 Resident Doctor & Paramedic Team on campus'
  }
};
