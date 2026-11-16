import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useNotice } from '@/context/NoticeContext';
import { useCampusData } from '@/context/CampusDataContext';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { parseTimeToDate } from '@/utils/lectureUtils';
import { scheduleAcademicPushNotifications } from '@/services/notificationService';
import {
  LocalCampusDB,
  ExaminationMark,
  ClubItem,
  CalendarEventItem,
} from '@/services/localDb';
import {
  analyzeTimetableDocument,
  analyzeCalendarDocument,
  refineDocumentAnalysis,
} from '@/services/aiService';
import {
  TimetableSlot,
  AttendanceRecord,
  Assignment,
  StudyMaterial,
  CampusEvent,
  Opportunity,
  Quest,
} from '@/constants/CampusData';

type PortalOption =
  | 'timetable'
  | 'calendar'
  | 'users'
  | 'events'
  | 'quests'
  | 'notes'
  | 'attendance'
  | 'assignments'
  | 'marks'
  | 'internships'
  | 'clubs';

interface OptionDef {
  id: PortalOption;
  label: string;
  icon: any;
  adminOnly?: boolean;
}

const PORTAL_OPTIONS: OptionDef[] = [
  { id: 'timetable', label: 'Timetable (Upload)', icon: 'calendar' },
  { id: 'calendar', label: 'Calendar of Events', icon: 'today' },
  { id: 'users', label: 'Student & Faculty Details', icon: 'people', adminOnly: true },
  { id: 'events', label: 'Events & Fests', icon: 'sparkles' },
  { id: 'quests', label: 'Active Quests', icon: 'trophy' },
  { id: 'notes', label: 'Notes & PYQs', icon: 'book' },
  { id: 'attendance', label: 'Student Attendance', icon: 'checkmark-done-circle' },
  { id: 'assignments', label: 'Assignments', icon: 'document-text' },
  { id: 'marks', label: 'Examination Marks', icon: 'stats-chart' },
  { id: 'internships', label: 'Internships', icon: 'briefcase' },
  { id: 'clubs', label: 'Communities', icon: 'ribbon' },
];

const formatCalendarDate = (evt: CalendarEventItem): string => {
  if (evt.dateSpan) return evt.dateSpan;
  if (evt.startDate && evt.endDate && evt.startDate !== evt.endDate) {
    const s = evt.startDate.split('-').slice(1).join('/');
    const e = evt.endDate.split('-').slice(1).join('/');
    return `${s} - ${e}`;
  }
  if (evt.date?.includes(' - ')) {
    return evt.date
      .split(' - ')
      .map((d) => (d.includes('-') ? d.split('-').slice(1).join('/') : d))
      .join(' - ');
  }
  if (evt.date?.includes('-')) {
    return evt.date.split('-').slice(1).join('/');
  }
  return evt.date || '';
};

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_ORDER: Record<string, number> = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};

const sortTimetableSlots = (slots: TimetableSlot[]): TimetableSlot[] => {
  return [...slots].sort((a, b) => {
    const dayA = DAY_ORDER[a.day] || 99;
    const dayB = DAY_ORDER[b.day] || 99;
    if (dayA !== dayB) return dayA - dayB;
    const timeA = parseTimeToDate(a.startTime).getTime();
    const timeB = parseTimeToDate(b.startTime).getTime();
    return timeA - timeB;
  });
};

const sortCalendarEvents = (eventsList: CalendarEventItem[]): CalendarEventItem[] => {
  return [...eventsList].sort((a, b) => {
    const dateA = a.startDate || a.date?.split(' - ')[0] || a.date || '';
    const dateB = b.startDate || b.date?.split(' - ')[0] || b.date || '';
    return dateA.localeCompare(dateB);
  });
};

export default function PortalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role, refreshUsers } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();
  const {
    refreshAllData,
    updateTimetable,
    updateSubjectDetails,
    deleteSubject,
    updateCalendarEvents,
    updateStudentAttendanceRecord,
    updateStudentExamMark,
    getStudentAttendanceRecords,
    students,
    faculties,
  } = useCampusData();

  const [activeOption, setActiveOption] = useState<PortalOption>('timetable');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data states
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [events, setEvents] = useState<CampusEvent[]>([]);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [marks, setMarks] = useState<ExaminationMark[]>([]);
  const [selectedMarksStudentId, setSelectedMarksStudentId] = useState<string>('all');
  const [internships, setInternships] = useState<Opportunity[]>([]);
  const [clubs, setClubs] = useState<ClubItem[]>([]);

  // Generic Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isNewItem, setIsNewItem] = useState(false);

  // AI Document Analysis Clarification Modal State (Requirement #7)
  const [clarificationModalVisible, setClarificationModalVisible] = useState(false);
  const [refiningAi, setRefiningAi] = useState(false);
  const [missedItemsInput, setMissedItemsInput] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    type: 'timetable' | 'calendar';
    items: any[];
    doubts: string[];
    summary: string;
    answers: Record<number, string>;
  } | null>(null);

  // Semester End Reset Modal
  const [resetModalVisible, setResetModalVisible] = useState(false);

  // Student Attendance Roster Modal (Portal)
  const [rosterModalVisible, setRosterModalVisible] = useState(false);
  const [selectedRosterCourse, setSelectedRosterCourse] = useState<{ courseCode: string; courseTitle: string } | null>(null);
  const [studentRosterAttendanceMap, setStudentRosterAttendanceMap] = useState<Record<string, boolean>>({});

  // Portal: Per-student attendance edit state
  const [attStudentModalVisible, setAttStudentModalVisible] = useState(false);
  const [attModalCourse, setAttModalCourse] = useState<AttendanceRecord | null>(null);
  const [attStudentEditTarget, setAttStudentEditTarget] = useState<{ studentId: string; name: string; attended: number; total: number } | null>(null);
  const [attEditAttended, setAttEditAttended] = useState('');
  const [attEditTotal, setAttEditTotal] = useState('');

  // Portal: Subject details edit (shared by marks + attendance)
  const [subjectEditModalVisible, setSubjectEditModalVisible] = useState(false);
  const [editingSubjectCode, setEditingSubjectCode] = useState('');
  const [editSubjectCode, setEditSubjectCode] = useState('');
  const [editSubjectTitle, setEditSubjectTitle] = useState('');
  const [editSubjectFaculty, setEditSubjectFaculty] = useState('');

  // Portal: Per-subject-student marks edit state
  const [marksSubjectModalVisible, setMarksSubjectModalVisible] = useState(false);
  const [marksAddModalVisible, setMarksAddModalVisible] = useState(false);
  const [selectedMarksCourse, setSelectedMarksCourse] = useState<{ courseCode: string; courseTitle: string } | null>(null);
  const [marksStudentEditTarget, setMarksStudentEditTarget] = useState<ExaminationMark | null>(null);
  const [marksEditModal, setMarksEditModal] = useState(false);
  const [marksEdit1, setMarksEdit1] = useState('');
  const [marksEdit2, setMarksEdit2] = useState('');
  const [marksEditLab, setMarksEditLab] = useState('');
  const [marksEditExt, setMarksEditExt] = useState('');

  // Timetable Slot Modal State
  const [timetableModalVisible, setTimetableModalVisible] = useState(false);
  const [editingTimetableSlot, setEditingTimetableSlot] = useState<TimetableSlot | null>(null);
  const [isNewTimetableSlot, setIsNewTimetableSlot] = useState(false);
  const [slotDay, setSlotDay] = useState('Monday');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotCourseCode, setSlotCourseCode] = useState('');
  const [slotCourseTitle, setSlotCourseTitle] = useState('');
  const [slotRoom, setSlotRoom] = useState('');
  const [slotFaculty, setSlotFaculty] = useState('');
  const [slotType, setSlotType] = useState<'Theory' | 'Lab'>('Theory');

  const handleOpenAddTimetable = () => {
    setIsNewTimetableSlot(true);
    setEditingTimetableSlot(null);
    setSlotDay('Monday');
    setSlotStartTime('09:00 AM');
    setSlotEndTime('10:00 AM');
    setSlotCourseCode('');
    setSlotCourseTitle('');
    setSlotRoom('');
    setSlotFaculty(role === 'faculty' ? user.fullName : '');
    setSlotType('Theory');
    setTimetableModalVisible(true);
  };

  const handleOpenEditTimetable = (slot: TimetableSlot) => {
    setIsNewTimetableSlot(false);
    setEditingTimetableSlot(slot);
    setSlotDay(slot.day || 'Monday');
    setSlotStartTime(slot.startTime || '');
    setSlotEndTime(slot.endTime || '');
    setSlotCourseCode(slot.courseCode || '');
    setSlotCourseTitle(slot.courseTitle || '');
    setSlotRoom(slot.room || '');
    setSlotFaculty(slot.facultyName || '');
    setSlotType((slot.type as any) === 'Lab' ? 'Lab' : 'Theory');
    setTimetableModalVisible(true);
  };

  const handleSaveTimetableSlot = async () => {
    if (!slotCourseCode.trim() || !slotStartTime.trim() || !slotEndTime.trim()) {
      showNotice({
        title: 'Missing Fields',
        message: 'Please provide Course Code, Class Start Time, and Class End Time.',
        type: 'warning',
      });
      return;
    }

    const slotData: TimetableSlot = {
      id: editingTimetableSlot?.id || `slot_${Date.now()}`,
      day: slotDay as TimetableSlot['day'],
      startTime: slotStartTime.trim(),
      endTime: slotEndTime.trim(),
      courseCode: slotCourseCode.trim().toUpperCase(),
      courseTitle: slotCourseTitle.trim() || slotCourseCode.trim().toUpperCase(),
      room: slotRoom.trim() || 'Room 101',
      facultyName: slotFaculty.trim() || (role === 'faculty' ? user.fullName : 'Faculty'),
      type: slotType,
    };

    const previousCode = (
      isNewTimetableSlot ? '' : editingTimetableSlot?.courseCode || ''
    ).trim().toUpperCase();
    const codeChanged = Boolean(previousCode) && previousCode !== slotData.courseCode;

    // When the subject code changes on a slot, rename every slot of that subject
    // locally so the timetable stays consistent before cascading shared records.
    const baseSlots = codeChanged
      ? timetable.map((s) =>
          (s.courseCode || '').trim().toUpperCase() === previousCode
            ? {
                ...s,
                courseCode: slotData.courseCode,
                courseTitle: slotData.courseTitle,
                facultyName: slotData.facultyName,
              }
            : s
        )
      : timetable;

    let updated: TimetableSlot[];
    if (isNewTimetableSlot) {
      updated = [...baseSlots, slotData];
    } else {
      updated = baseSlots.map((s) => (s.id === slotData.id ? slotData : s));
    }

    if (codeChanged) {
      await updateSubjectDetails(previousCode, {
        courseCode: slotData.courseCode,
        courseTitle: slotData.courseTitle,
        facultyName: slotData.facultyName,
      });
    }

    const sorted = sortTimetableSlots(updated);
    setTimetable(sorted);
    await updateTimetable(sorted);
    await refreshAllData();
    setTimetableModalVisible(false);
    setEditingTimetableSlot(null);
    showNotice({
      title: isNewTimetableSlot ? 'Class Added! 📅' : 'Class Updated! ✏️',
      message: `${slotData.courseCode} on ${slotData.day} (${slotData.startTime} - ${slotData.endTime}) saved and sorted into schedule.`,
      type: 'success',
    });
  };

  const handleDeleteTimetableSlot = async () => {
    if (!editingTimetableSlot) return;
    const updated = timetable.filter((s) => s.id !== editingTimetableSlot.id);
    const sorted = sortTimetableSlots(updated);
    setTimetable(sorted);
    await updateTimetable(sorted);
    await refreshAllData();
    setTimetableModalVisible(false);
    setEditingTimetableSlot(null);
    showNotice({
      title: 'Class Removed',
      message: 'Slot removed from active timetable.',
      type: 'info',
    });
  };

  const handleOpenEditSubject = (
    courseCode: string,
    courseTitle: string,
    facultyName?: string
  ) => {
    setEditingSubjectCode(courseCode);
    setEditSubjectCode(courseCode);
    setEditSubjectTitle(courseTitle || '');
    setEditSubjectFaculty(facultyName || '');
    setSubjectEditModalVisible(true);
  };

  const handleSaveSubjectDetails = async () => {
    if (!editSubjectCode.trim() || !editSubjectTitle.trim()) {
      showNotice({
        title: 'Missing Details',
        message: 'Subject code and title are required.',
        type: 'error',
      });
      return;
    }

    await updateSubjectDetails(editingSubjectCode, {
      courseCode: editSubjectCode,
      courseTitle: editSubjectTitle,
      facultyName: editSubjectFaculty,
    });
    await refreshAllData();
    await loadActiveData();
    if (
      selectedMarksCourse?.courseCode === editingSubjectCode &&
      editSubjectCode.trim().toUpperCase() !== editingSubjectCode
    ) {
      setSelectedMarksCourse({
        courseCode: editSubjectCode.trim().toUpperCase(),
        courseTitle: editSubjectTitle.trim(),
      });
    }
    setSubjectEditModalVisible(false);
    showNotice({
      title: 'Subject Updated',
      message: `${editSubjectCode.trim().toUpperCase()} is synced across attendance, marks and assignments.`,
      type: 'success',
    });
  };

  const handleConfirmDeleteSubject = () => {
    if (!editingSubjectCode) return;
    Alert.alert(
      'Delete Subject',
      `Delete ${editingSubjectCode} and remove its timetable slots, attendance, marks and assignments across the app? Notes and PYQs are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            handleDeleteSubject();
          },
        },
      ]
    );
  };

  const handleDeleteSubject = async () => {
    if (!editingSubjectCode) return;
    await deleteSubject(editingSubjectCode);
    await refreshAllData();
    await loadActiveData();
    if (selectedMarksCourse?.courseCode === editingSubjectCode) {
      setSelectedMarksCourse(null);
      setMarksSubjectModalVisible(false);
    }
    if (selectedRosterCourse?.courseCode === editingSubjectCode) {
      setRosterModalVisible(false);
      setSelectedRosterCourse(null);
    }
    if (attModalCourse?.courseCode === editingSubjectCode) {
      setAttStudentModalVisible(false);
      setAttModalCourse(null);
    }
    setSubjectEditModalVisible(false);
    showNotice({
      title: 'Subject Deleted',
      message: 'Timetable slots, attendance, marks and assignments for this subject were removed everywhere.',
      type: 'info',
    });
  };

  // Calendar Event Modal State
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [editingCalendarEvent, setEditingCalendarEvent] = useState<CalendarEventItem | null>(null);
  const [isNewCalendarEvent, setIsNewCalendarEvent] = useState(false);
  const [calStartDate, setCalStartDate] = useState('');
  const [calEndDate, setCalEndDate] = useState('');
  const [calType, setCalType] = useState<'Holiday' | 'Exam' | 'Semester Milestones'>('Semester Milestones');
  const [calTitle, setCalTitle] = useState('');
  const [calDesc, setCalDesc] = useState('');

  const handleOpenAddCalendar = () => {
    setIsNewCalendarEvent(true);
    setEditingCalendarEvent(null);
    setCalStartDate('');
    setCalEndDate('');
    setCalType('Semester Milestones');
    setCalTitle('');
    setCalDesc('');
    setCalendarModalVisible(true);
  };

  const handleOpenEditCalendar = (evt: CalendarEventItem) => {
    setIsNewCalendarEvent(false);
    setEditingCalendarEvent(evt);
    setCalStartDate(evt.startDate || evt.date?.split(' - ')[0] || evt.date || '');
    setCalEndDate(evt.endDate || (evt.date?.includes(' - ') ? evt.date.split(' - ')[1] : ''));
    setCalType(
      evt.type === 'Holiday'
        ? 'Holiday'
        : evt.type === 'Exam'
        ? 'Exam'
        : 'Semester Milestones'
    );
    setCalTitle(evt.title || '');
    setCalDesc(evt.description || '');
    setCalendarModalVisible(true);
  };

  const handleSaveCalendarEvent = async () => {
    if (!calTitle.trim() || !calStartDate.trim()) {
      showNotice({
        title: 'Missing Fields',
        message: 'Please provide event title and start date (YYYY-MM-DD).',
        type: 'warning',
      });
      return;
    }

    const start = calStartDate.trim();
    const end = calEndDate.trim();
    const isMultiDay = Boolean(end && end !== start);
    const dateStr = isMultiDay ? `${start} - ${end}` : start;
    const spanStr = isMultiDay
      ? `${start.split('-').slice(1).join('/')} - ${end.split('-').slice(1).join('/')}`
      : undefined;

    const eventData: CalendarEventItem = {
      id: editingCalendarEvent?.id || `evt_cal_${Date.now()}`,
      title: calTitle.trim(),
      date: dateStr,
      startDate: start,
      endDate: isMultiDay ? end : start,
      dateSpan: spanStr,
      type: calType as any,
      description: calDesc.trim() || undefined,
      isImportant: calType === 'Exam' || calType === 'Holiday',
    };

    let updated: CalendarEventItem[];
    if (isNewCalendarEvent) {
      updated = [...calendarEvents, eventData];
    } else {
      updated = calendarEvents.map((e) => (e.id === eventData.id ? eventData : e));
    }

    const sorted = sortCalendarEvents(updated);
    setCalendarEvents(sorted);
    await updateCalendarEvents(sorted);
    await refreshAllData();
    setCalendarModalVisible(false);
    setEditingCalendarEvent(null);
    showNotice({
      title: isNewCalendarEvent ? 'Event Added! 🗓️' : 'Event Updated! ✏️',
      message: `"${eventData.title}" saved and sorted into academic calendar.`,
      type: 'success',
    });
  };

  const handleDeleteCalendarEvent = async () => {
    if (!editingCalendarEvent) return;
    const updated = calendarEvents.filter((e) => e.id !== editingCalendarEvent.id);
    const sorted = sortCalendarEvents(updated);
    setCalendarEvents(sorted);
    await updateCalendarEvents(sorted);
    await refreshAllData();
    setCalendarModalVisible(false);
    setEditingCalendarEvent(null);
    showNotice({
      title: 'Event Removed',
      message: 'Event removed from academic calendar.',
      type: 'info',
    });
  };

  const handleOpenPortalRoster = async (courseCode: string, courseTitle: string) => {
    try {
      const initMap: Record<string, boolean> = {};
      students.forEach((s) => (initMap[s.id] = true));
      setStudentRosterAttendanceMap(initMap);
      setSelectedRosterCourse({ courseCode, courseTitle });
      setRosterModalVisible(true);
    } catch (e: any) {
      console.warn('Failed to load roster in portal:', e);
    }
  };

  const handleSavePortalRoster = async () => {
    if (!selectedRosterCourse) return;
    try {
      const presentCount = Object.values(studentRosterAttendanceMap).filter(Boolean).length;
      
      // Save individual attendance records per student
      for (const [studentId, isPresent] of Object.entries(studentRosterAttendanceMap)) {
        await LocalCampusDB.markStudentAttendance(studentId, selectedRosterCourse.courseCode, isPresent);
      }

      await refreshAllData();
      setRosterModalVisible(false);
      showNotice({
        title: 'Student Attendance Updated! ✅',
        message: `Marked individual attendance for ${students.length} students (${presentCount} present) for ${selectedRosterCourse.courseCode}.`,
        type: 'success',
      });
    } catch (e: any) {
      showNotice({
        title: 'Error Saving Attendance',
        message: e.message || 'Could not update student attendance.',
        type: 'error',
      });
    }
  };

  // Open per-student attendance edit modal
  const handleOpenAttStudentModal = async (rec: AttendanceRecord) => {
    setAttModalCourse(rec);
    setAttStudentEditTarget(null);
    setAttStudentModalVisible(true);
  };

  const handleSaveAttStudentEdit = async () => {
    if (!attStudentEditTarget || !attModalCourse) return;
    const att = Number(attEditAttended) || 0;
    const tot = Number(attEditTotal) || 0;
    await updateStudentAttendanceRecord(attStudentEditTarget.studentId, attModalCourse.courseCode, att, tot);
    setAttStudentEditTarget(null);
    showNotice({ title: 'Attendance Updated ✅', message: `${attStudentEditTarget.name} — ${attModalCourse.courseCode} updated.`, type: 'success' });
  };

  // Open marks subject modal
  const handleOpenMarksSubjectModal = async (courseCode: string, courseTitle: string) => {
    setSelectedMarksCourse({ courseCode, courseTitle });
    setMarksSubjectModalVisible(true);
    setMarksStudentEditTarget(null);
    setMarksEditModal(false);
  };

  const handleOpenStudentMarksEdit = (studentId: string, studentName: string) => {
    if (!selectedMarksCourse) return;
    const existing = marks.find(m => m.studentId === studentId && m.courseCode === selectedMarksCourse.courseCode);
    const base: ExaminationMark = existing || {
      id: `mrk_${Date.now()}`,
      studentId,
      studentName,
      courseCode: selectedMarksCourse.courseCode,
      courseTitle: selectedMarksCourse.courseTitle,
      internal1: 0, internal2: 0, labInternal: 0, externalExam: 0,
      totalMarks: 0, maxMarks: 175, percentage: 0, grade: 'B', status: 'Pass',
    };
    setMarksStudentEditTarget(base);
    setMarksEdit1(String(base.internal1));
    setMarksEdit2(String(base.internal2));
    setMarksEditLab(String(base.labInternal));
    setMarksEditExt(String(base.externalExam));
    setMarksEditModal(true);
  };

  const handleSaveStudentMarksEdit = async () => {
    if (!marksStudentEditTarget) return;
    const int1 = Number(marksEdit1) || 0;
    const int2 = Number(marksEdit2) || 0;
    const lab = Number(marksEditLab) || 0;
    const ext = Number(marksEditExt) || 0;
    const total = int1 + int2 + lab + ext;
    const max = marksStudentEditTarget.maxMarks || 175;
    const pct = Math.round((total / max) * 1000) / 10;
    const grade = pct >= 90 ? 'O' : pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B+' : 'B';
    const calcItem: ExaminationMark = {
      ...marksStudentEditTarget,
      internal1: int1, internal2: int2, labInternal: lab, externalExam: ext,
      totalMarks: total, maxMarks: max, percentage: pct,
      grade: grade as any,
      status: pct >= 85 ? 'Distinction' : pct >= 60 ? 'First Class' : 'Pass',
    };
    await updateStudentExamMark(calcItem);
    // Update local marks state too
    setMarks(prev => {
      const idx = prev.findIndex(m => m.studentId === calcItem.studentId && m.courseCode === calcItem.courseCode);
      if (idx >= 0) { const next = [...prev]; next[idx] = calcItem; return next; }
      return [calcItem, ...prev];
    });
    setMarksStudentEditTarget(null);
    setMarksEditModal(false);
    showNotice({ title: 'Marks Updated ✅', message: `${calcItem.studentName} — ${calcItem.courseCode} marks saved.`, type: 'success' });
  };

  // Route Guard: Faculty and Admin only
  useEffect(() => {
    if (role === 'student') {
      showNotice({
        title: 'Faculty / Admin Portal',
        message: 'The governance portal is reserved for Faculty and Administrators. Switch role from Profile → App Settings & Security.',
        type: 'warning',
      });
      router.replace('/screens/roles');
    }
  }, [role, router, showNotice]);

  // Load data for active option
  const loadActiveData = async () => {
    setLoading(true);
    try {
      switch (activeOption) {
        case 'timetable':
          const tt = await LocalCampusDB.getTimetable();
          setTimetable(sortTimetableSlots(tt));
          break;
        case 'calendar':
          const cal = await LocalCampusDB.getCalendarEvents();
          setCalendarEvents(sortCalendarEvents(cal));
          break;
        case 'users':
          await refreshAllData();
          break;
        case 'events':
          const evts = await LocalCampusDB.getCampusEvents();
          setEvents(evts);
          break;
        case 'quests':
          const qsts = await LocalCampusDB.getQuests();
          setQuests(qsts);
          break;
        case 'notes':
          const mats = await LocalCampusDB.getStudyMaterials();
          setStudyMaterials(mats);
          break;
        case 'attendance':
          const att = await LocalCampusDB.getAttendance();
          setAttendance(att);
          break;
        case 'assignments':
          const asgs = await LocalCampusDB.getAssignments();
          setAssignments(asgs);
          break;
        case 'marks':
          const mrks = await LocalCampusDB.getExaminationMarks();
          setMarks(mrks);
          const ttForMarks = await LocalCampusDB.getTimetable();
          setTimetable(sortTimetableSlots(ttForMarks));
          break;
        case 'internships':
          const opps = await LocalCampusDB.getInternships();
          setInternships(opps);
          break;
        case 'clubs':
          const clbs = await LocalCampusDB.getClubs();
          setClubs(clbs);
          break;
      }
    } catch (e) {
      console.warn('[Portal] Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted) loadActiveData();
    }, 0);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [activeOption]);

  // Handle Document Upload (Requirement #7: PNG / JPEG / PDF)
  const handleUploadDocument = async (type: 'timetable' | 'calendar') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'],
        copyToCacheDirectory: false,
      });

      if (result.canceled) return;

      const asset = (result as any).assets?.[0] ?? result;
      const mimeType = asset.mimeType || 'image/png';
      const uri = asset.uri || '';
      const name = asset.name || (type === 'timetable' ? 'timetable.png' : 'calendar.pdf');

      // Validation: Accept PNG, JPEG/JPG, and PDF
      const lowerName = name.toLowerCase();
      const isValid =
        mimeType.includes('image/') ||
        mimeType.includes('application/pdf') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.pdf');

      if (!isValid) {
        showNotice({
          title: 'Invalid File Format',
          message: 'Please upload an image (PNG, JPG) or PDF file for schedule analysis.',
          type: 'error',
        });
        return;
      }

      setLoading(true);
      showNotice({
        title: 'Document Uploaded',
        message: `Analyzing "${name}" with AI to extract ${type === 'timetable' ? 'class slots' : 'calendar dates'}...`,
        type: 'info',
      });

      // Save locally to device storage first to ensure a stable file:// URI
      const saved = await LocalCampusDB.saveLocalDocument(uri, name);
      const targetScanUri = saved.localUri || uri;

      if (type === 'timetable') {
        const analysis = await analyzeTimetableDocument(targetScanUri, mimeType);
        setAiAnalysisResult({
          type: 'timetable',
          items: analysis.classes,
          doubts: analysis.doubts,
          summary: analysis.summary,
          answers: {},
        });
        setMissedItemsInput('');
        setClarificationModalVisible(true);
      } else {
        const analysis = await analyzeCalendarDocument(targetScanUri, mimeType);
        setAiAnalysisResult({
          type: 'calendar',
          items: analysis.events,
          doubts: analysis.doubts,
          summary: analysis.summary,
          answers: {},
        });
        setMissedItemsInput('');
        setClarificationModalVisible(true);
      }
    } catch (err: any) {
      showNotice({
        title: 'Upload Failed',
        message: err.message || 'Could not process document.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Send Clarifications and Missed Details to AI to Refine Schedule
  const handleSendClarificationsToAi = async () => {
    if (!aiAnalysisResult || refiningAi) return;

    setRefiningAi(true);
    try {
      const refined = await refineDocumentAnalysis({
        type: aiAnalysisResult.type,
        currentItems: aiAnalysisResult.items,
        currentDoubts: aiAnalysisResult.doubts,
        clarifications: aiAnalysisResult.answers,
        additionalNotes: missedItemsInput.trim() || undefined,
      });

      setAiAnalysisResult({
        ...aiAnalysisResult,
        items: refined.items,
        doubts: refined.doubts,
        summary: refined.summary,
        answers: {}, // clear answered doubts
      });
      setMissedItemsInput('');

      showNotice({
        title: refined.doubts.length === 0 ? 'All Clarified! ✨' : 'Clarifications Updated',
        message:
          refined.doubts.length === 0
            ? 'All doubts resolved. You can now review preview and click Confirm & Apply.'
            : 'AI updated the schedule. Check remaining questions below.',
        type: 'success',
      });
    } catch (err: any) {
      showNotice({
        title: 'Refinement Failed',
        message: err.message || 'Could not update with AI.',
        type: 'error',
      });
    } finally {
      setRefiningAi(false);
    }
  };

  const handleConfirmAiAnalysis = async () => {
    if (!aiAnalysisResult) return;

    try {
      if (aiAnalysisResult.type === 'timetable') {
        const sorted = sortTimetableSlots(aiAnalysisResult.items);
        await updateTimetable(sorted);
        setTimetable(sorted);
        await refreshAllData();
        showNotice({
          title: 'Timetable Updated! 📅',
          message: 'AI analysis verified and timetable updated across all student and faculty roles instantly.',
          type: 'success',
        });
      } else {
        const sorted = sortCalendarEvents(aiAnalysisResult.items);
        await updateCalendarEvents(sorted);
        setCalendarEvents(sorted);
        await refreshAllData();
        showNotice({
          title: 'Calendar of Events Updated! 🗓️',
          message: 'Holidays, exam dates, and semester schedule updated across the entire app instantly.',
          type: 'success',
        });
      }
      setClarificationModalVisible(false);
      setAiAnalysisResult(null);
    } catch (e: any) {
      showNotice({
        title: 'Save Error',
        message: e.message || 'Could not save AI analyzed schedule.',
        type: 'error',
      });
    }
  };

  // Semester End Reset (Requirement #8)
  const handleSemesterReset = async () => {
    try {
      const res = await LocalCampusDB.resetSemester();
      await refreshAllData();
      await loadActiveData();
      setResetModalVisible(false);
      showNotice({
        title: 'Semester Reset Complete! 🏁',
        message: 'Timetable, calendar of events, marks, assignments, and attendance have been cleared. Notes, PYQs, clubs and students preserved.',
        type: 'success',
      });
    } catch (e: any) {
      showNotice({
        title: 'Reset Failed',
        message: e.message || 'Could not reset semester.',
        type: 'error',
      });
    }
  };

  // Pick Document for Study Material
  const handlePickDocumentForMaterial = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'text/plain'],
        copyToCacheDirectory: false,
      });

      if (result.canceled) return;

      const asset = (result as any).assets?.[0] ?? result;
      const uri = asset.uri || '';
      const name = asset.name || 'document.pdf';
      const sizeBytes = asset.size;
      const formattedSize = sizeBytes
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
        : '2.5 MB';

      const ext = name.split('.').pop()?.toUpperCase() || 'PDF';
      const fileType = ext === 'DOC' || ext === 'DOCX' ? 'DOCX' : ext === 'ZIP' ? 'ZIP' : 'PDF';

      // Immediately save locally into persistent app storage so it never expires or corrupts
      const saved = await LocalCampusDB.saveLocalDocument(uri, name);

      setEditingItem((prev: any) => ({
        ...prev,
        title: prev?.title || name.replace(/\.[^/.]+$/, ''),
        fileName: name,
        fileUri: saved.localUri,
        fileSize: saved.fileSize || formattedSize,
        fileType: fileType,
      }));

      showNotice({
        title: 'File Selected',
        message: `Attached "${name}" (${formattedSize})`,
        type: 'success',
      });
    } catch (err: any) {
      showNotice({
        title: 'File Selection Failed',
        message: err.message || 'Unable to attach selected file.',
        type: 'error',
      });
    }
  };

  // Open Edit Form for Item
  const handleOpenEdit = (item: any, isNew = false) => {
    setIsNewItem(isNew);
    setEditingItem(JSON.parse(JSON.stringify(item)));
    setEditModalVisible(true);
  };

  // Save changes from Edit Form
  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      switch (activeOption) {
        case 'assignments': {
          let updated = [...assignments];
          if (isNewItem) {
            updated = [
              {
                ...editingItem,
                id: `asg_${Date.now()}`,
                status: 'pending',
                maxMarks: Number(editingItem.maxMarks) || 25,
              },
              ...updated,
            ];
          } else {
            updated = updated.map((a) => (a.id === editingItem.id ? editingItem : a));
          }
          await LocalCampusDB.setAssignments(updated);
          setAssignments(updated);
          scheduleAcademicPushNotifications().catch(() => {});
          break;
        }
        case 'marks': {
          let updated = [...marks];
          const int1 = Number(editingItem.internal1) || 0;
          const int2 = Number(editingItem.internal2) || 0;
          const lab = Number(editingItem.labInternal) || 0;
          const ext = Number(editingItem.externalExam) || 0;
          const total = int1 + int2 + lab + ext;
          const max = Number(editingItem.maxMarks) || 175;
          const pct = Math.round((total / max) * 1000) / 10;
          const grade = pct >= 90 ? 'O' : pct >= 80 ? 'A+' : pct >= 70 ? 'A' : pct >= 60 ? 'B+' : 'B';
          const calcItem: ExaminationMark = {
            ...editingItem,
            internal1: int1,
            internal2: int2,
            labInternal: lab,
            externalExam: ext,
            totalMarks: total,
            maxMarks: max,
            percentage: pct,
            grade: grade as any,
            status: pct >= 85 ? 'Distinction' : pct >= 60 ? 'First Class' : 'Pass',
          };
          if (isNewItem) {
            calcItem.id = `mrk_${Date.now()}`;
            updated = [calcItem, ...updated];
          } else {
            updated = updated.map((m) => (m.id === calcItem.id ? calcItem : m));
          }
          await LocalCampusDB.setExaminationMarks(updated);
          setMarks(updated);
          await refreshAllData();
          break;
        }
        case 'attendance': {
          let updated = [...attendance];
          const att = Number(editingItem.attended) || 0;
          const tot = Number(editingItem.total) || 0;
          const pct = tot > 0 ? Math.round((att / tot) * 1000) / 10 : 100;
          const calcItem: AttendanceRecord = {
            ...editingItem,
            attended: att,
            total: tot,
            percentage: pct,
            status: pct >= 75 ? 'safe' : pct >= 65 ? 'warning' : 'critical',
          };
          if (isNewItem) {
            updated = [calcItem, ...updated];
          } else {
            updated = updated.map((a) => (a.courseCode === calcItem.courseCode ? calcItem : a));
          }
          await LocalCampusDB.setAttendance(updated);
          setAttendance(updated);
          break;
        }
        case 'events': {
          let updated = [...events];
          if (isNewItem) {
            updated = [
              {
                ...editingItem,
                id: `evt_${Date.now()}`,
                registeredCount: 0,
                isRegistered: false,
              },
              ...updated,
            ];
          } else {
            updated = updated.map((e) => (e.id === editingItem.id ? editingItem : e));
          }
          await LocalCampusDB.setCampusEvents(updated);
          setEvents(updated);
          break;
        }
        case 'quests': {
          let updated = [...quests];
          if (isNewItem) {
            updated = [
              {
                ...editingItem,
                id: `qst_${Date.now()}`,
                progress: 0,
                completed: false,
                xpReward: Number(editingItem.xpReward) || 100,
                maxProgress: Number(editingItem.maxProgress) || 1,
              },
              ...updated,
            ];
          } else {
            updated = updated.map((q) => (q.id === editingItem.id ? editingItem : q));
          }
          await LocalCampusDB.setQuests(updated);
          setQuests(updated);
          break;
        }
        case 'notes': {
          let updated = [...studyMaterials];
          if (isNewItem) {
            updated = [
              {
                ...editingItem,
                id: `mat_${Date.now()}`,
                date: 'Today',
                fileSize: editingItem.fileSize || '3.5 MB',
                uploadedBy: user.fullName,
              },
              ...updated,
            ];
          } else {
            updated = updated.map((m) => (m.id === editingItem.id ? editingItem : m));
          }
          await LocalCampusDB.setStudyMaterials(updated);
          setStudyMaterials(updated);
          await refreshAllData();
          break;
        }
        case 'clubs': {
          let updated = [...clubs];
          if (isNewItem) {
            updated = [
              {
                ...editingItem,
                id: `clb_${Date.now()}`,
                members: Number(editingItem.members) || 50,
                icon: editingItem.icon || 'people',
              },
              ...updated,
            ];
          } else {
            updated = updated.map((c) => (c.id === editingItem.id ? editingItem : c));
          }
          await LocalCampusDB.setClubs(updated);
          setClubs(updated);
          break;
        }
        case 'internships': {
          let updated = [...internships];
          if (isNewItem) {
            updated = [{ ...editingItem, id: `opp_${Date.now()}` }, ...updated];
          } else {
            updated = updated.map((i) => (i.id === editingItem.id ? editingItem : i));
          }
          await LocalCampusDB.setInternships(updated);
          setInternships(updated);
          break;
        }
        case 'users': {
          if (editingItem.role === 'student') {
            let updated = [...students];
            if (isNewItem) {
              updated = [
                {
                  ...editingItem,
                  id: `usr_student_${Date.now()}`,
                  role: 'student',
                  attendancePct: 85,
                  xpPoints: 500,
                  badgeCount: 2,
                },
                ...updated,
              ];
            } else {
              updated = updated.map((s) => (s.id === editingItem.id ? editingItem : s));
            }
            await LocalCampusDB.setStudents(updated);
          } else {
            let updated = [...faculties];
            if (isNewItem) {
              updated = [
                {
                  ...editingItem,
                  id: `usr_faculty_${Date.now()}`,
                  role: 'faculty',
                },
                ...updated,
              ];
            } else {
              updated = updated.map((f) => (f.id === editingItem.id ? editingItem : f));
            }
            await LocalCampusDB.setFaculties(updated);
          }
          await refreshUsers();
          break;
        }
      }

      await refreshAllData();
      setEditModalVisible(false);
      setEditingItem(null);
      showNotice({
        title: isNewItem ? 'Created Successfully' : 'Updated Successfully',
        message: 'Changes saved to local database and synchronized across the app.',
        type: 'success',
      });
    } catch (err: any) {
      showNotice({
        title: 'Save Failed',
        message: err.message || 'Could not update item.',
        type: 'error',
      });
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string, keyField = 'id') => {
    try {
      switch (activeOption) {
        case 'assignments':
          const newAsgs = assignments.filter((a) => a.id !== id);
          await LocalCampusDB.setAssignments(newAsgs);
          setAssignments(newAsgs);
          scheduleAcademicPushNotifications().catch(() => {});
          break;
        case 'marks':
          const newMarks = marks.filter((m) => m.id !== id);
          await LocalCampusDB.setExaminationMarks(newMarks);
          setMarks(newMarks);
          await refreshAllData();
          break;
        case 'attendance':
          await deleteSubject(id);
          break;
        case 'events':
          const newEvents = events.filter((e) => e.id !== id);
          await LocalCampusDB.setCampusEvents(newEvents);
          setEvents(newEvents);
          break;
        case 'quests':
          const newQuests = quests.filter((q) => q.id !== id);
          await LocalCampusDB.setQuests(newQuests);
          setQuests(newQuests);
          break;
        case 'notes':
          const newNotes = studyMaterials.filter((m) => m.id !== id);
          await LocalCampusDB.setStudyMaterials(newNotes);
          setStudyMaterials(newNotes);
          await refreshAllData();
          break;
        case 'clubs':
          const newClubs = clubs.filter((c) => c.id !== id);
          await LocalCampusDB.setClubs(newClubs);
          setClubs(newClubs);
          break;
        case 'internships':
          const newInterns = internships.filter((i) => i.id !== id);
          await LocalCampusDB.setInternships(newInterns);
          setInternships(newInterns);
          break;
        case 'users':
          const removedStudent = students.find((s) => s.id === id);
          const newStds = students.filter((s) => s.id !== id);
          const newFacs = faculties.filter((f) => f.id !== id);
          await LocalCampusDB.setStudents(newStds);
          await LocalCampusDB.setFaculties(newFacs);
          if (removedStudent) {
            // Cascade: drop this student's attendance map, marks and progress records
            const studentAtt = await LocalCampusDB.getStudentAttendance();
            if (studentAtt[id]) {
              delete studentAtt[id];
              await LocalCampusDB.setStudentAttendance(studentAtt);
            }
            const remainingMarks = marks.filter((m) => m.studentId !== id);
            await LocalCampusDB.setExaminationMarks(remainingMarks);
            setMarks(remainingMarks);
            const progress = await LocalCampusDB.getStudentProgressRecords();
            await LocalCampusDB.setStudentProgressRecords(
              progress.filter((p) => p.studentId !== id)
            );
            const registrations = await LocalCampusDB.getEventRegistrations();
            await LocalCampusDB.setEventRegistrations(
              registrations.filter((r) => r.studentId !== id)
            );
          }
          await refreshUsers();
          break;
      }

      await refreshAllData();
      await loadActiveData();
      setEditModalVisible(false);
      setEditingItem(null);
      showNotice({
        title: 'Deleted',
        message: 'Removed from local database.',
        type: 'info',
      });
    } catch (e: any) {
      showNotice({
        title: 'Delete Failed',
        message: e.message || 'Could not delete item.',
        type: 'error',
      });
    }
  };

  // Unique subjects available for examination marks entry (timetable + attendance + marks)
  const portalMarksSubjects = (() => {
    const subjectMap = new Map<string, { courseCode: string; courseTitle: string }>();
    timetable.forEach((s) => {
      if (s.courseCode && !subjectMap.has(s.courseCode)) {
        subjectMap.set(s.courseCode, { courseCode: s.courseCode, courseTitle: s.courseTitle });
      }
    });
    attendance.forEach((a) => {
      if (a.courseCode && !subjectMap.has(a.courseCode)) {
        subjectMap.set(a.courseCode, { courseCode: a.courseCode, courseTitle: a.courseTitle });
      }
    });
    marks.forEach((m) => {
      if (m.courseCode && !subjectMap.has(m.courseCode)) {
        subjectMap.set(m.courseCode, { courseCode: m.courseCode, courseTitle: m.courseTitle });
      }
    });
    return Array.from(subjectMap.values());
  })();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header subtitle="Faculty & Admin Governance Portal" />

      {/* Top Action Bar with Semester End Reset */}
      <View
        style={[
          styles.portalTopBar,
          { backgroundColor: isDark ? '#161F30' : '#FFFFFF', borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.portalTitleWrap}>
          <Text style={[styles.portalHeading, { color: colors.text }]}>Governance Portal</Text>
          <Text style={[styles.portalSub, { color: colors.textSecondary }]}>
            Role: <Text style={{ fontWeight: '800', color: colors.primary }}>{role.toUpperCase()}</Text> • 100% Local DB
          </Text>
        </View>

        {role === 'admin' && (
          <TouchableOpacity
            style={styles.semEndBtn}
            onPress={() => setResetModalVisible(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-circle" size={16} color="#FFFFFF" />
            <Text style={styles.semEndBtnText}>Sem End</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Options Tab Scroll */}
      <View
        style={[
          styles.optionsScrollWrap,
          { backgroundColor: isDark ? '#111827' : '#F8FAFC', borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.optionsContent}
        >
          {PORTAL_OPTIONS.filter((opt) => !opt.adminOnly || role === 'admin').map((opt) => {
            const isSelected = activeOption === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                onPress={() => setActiveOption(opt.id)}
                style={[
                  styles.optionTab,
                  {
                    backgroundColor: isSelected
                      ? isDark
                        ? '#1A0F3C'
                        : '#EEF2FF'
                      : isDark
                      ? '#161F30'
                      : '#FFFFFF',
                    borderColor: isSelected ? '#7A3CFF' : colors.cardBorder,
                    borderWidth: isSelected ? 2 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={15}
                  color={isSelected ? '#7A3CFF' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    { color: isSelected ? '#7A3CFF' : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        contentContainerStyle={[styles.mainScroll, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================ */}
        {/* SECTION 1: TIMETABLE UPLOAD */}
        {/* ================================================================ */}
        {activeOption === 'timetable' && (
          <View>
            <Card
              variant="elevated"
              style={{
                backgroundColor: isDark ? '#1A0F3C' : '#F5F3FF',
                borderColor: '#7A3CFF',
                marginBottom: 16,
              }}
            >
              <Text style={[styles.cardTitle, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
                Update Timetable via Document Upload
              </Text>
              <Text style={[styles.cardDesc, { color: isDark ? '#C4B5FD' : '#5B21B6' }]}>
                Upload official timetable in <Text style={{ fontWeight: '800' }}>PNG or PDF</Text> format. Our AI model will extract lecture slots, room allocations, and faculty, ask for clarification if needed, and update the schedule across the app.
              </Text>

              <TouchableOpacity
                style={styles.uploadDocBtn}
                onPress={() => handleUploadDocument('timetable')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={20} color="#FFFFFF" />
                    <Text style={styles.uploadDocBtnText}>Upload Timetable (PNG / PDF)</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>

            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Current Active Timetable ({timetable.length} Slots)
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={handleOpenAddTimetable}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Class</Text>
              </TouchableOpacity>
            </View>

            {timetable.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  Upload a timetable first to auto-populate classes, or add classes manually.
                </Text>
              </Card>
            )}


            {timetable.map((slot) => (
              <Card
                key={slot.id}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 10,
                }}
              >
                <View style={styles.slotRow}>
                  <View style={styles.slotLeft}>
                    <Badge label={slot.day} variant="primary" />
                    <Text style={[styles.slotTime, { color: colors.text }]}>
                      {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.slotCourse, { color: colors.text }]}>
                      {slot.courseCode}: {slot.courseTitle}
                    </Text>
                    <Text style={[styles.slotRoom, { color: colors.textSecondary }]}>
                      📍 {slot.room} • Faculty: {slot.facultyName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      padding: 8,
                      borderRadius: 8,
                      backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                      borderWidth: 1,
                      borderColor: colors.border,
                      marginLeft: 8,
                    }}
                    onPress={() => handleOpenEditTimetable(slot)}
                  >
                    <Ionicons name="pencil" size={16} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 2: CALENDAR OF EVENTS UPLOAD */}
        {/* ================================================================ */}
        {activeOption === 'calendar' && (
          <View>
            <Card
              variant="elevated"
              style={{
                backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                borderColor: '#2EF2FF',
                marginBottom: 16,
              }}
            >
              <Text style={[styles.cardTitle, { color: isDark ? '#A5F3FC' : '#0369A1' }]}>
                Update Calendar of Events Plan
              </Text>
              <Text style={[styles.cardDesc, { color: isDark ? '#CFFAFE' : '#075985' }]}>
                Upload semester calendar in <Text style={{ fontWeight: '800' }}>PNG or PDF</Text>. AI will analyze holidays, internal test dates, last working day, and exam commencements.
              </Text>

              <TouchableOpacity
                style={[styles.uploadDocBtn, { backgroundColor: '#0284C7' }]}
                onPress={() => handleUploadDocument('calendar')}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="calendar" size={20} color="#FFFFFF" />
                    <Text style={styles.uploadDocBtnText}>Upload Calendar of Events (PNG / PDF)</Text>
                  </>
                )}
              </TouchableOpacity>
            </Card>


            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, styles.sectionTitleFlex, { color: colors.text }]}>
                Current Academic Calendar ({calendarEvents.length} Milestones)
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, styles.addBtnShrink, { backgroundColor: '#0284C7' }]}
                onPress={handleOpenAddCalendar}
                activeOpacity={0.8}
                >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Event</Text>
              </TouchableOpacity>
            </View>

            {calendarEvents.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="calendar-clear-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  Upload calendar of events first to auto-populate events, or add calendar events manually.
                </Text>
              </Card>
            )}

            {calendarEvents.map((evt) => (
              <Card
                key={evt.id}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 10,
                }}
              >
                <View style={styles.calCardHeader}>
                  <View
                    style={[
                      styles.calDateChip,
                      { backgroundColor: isDark ? '#0C4A6E' : '#F0F9FF', borderColor: '#0284C7' },
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={12} color="#0284C7" />
                    <Text style={styles.calDateText} numberOfLines={1}>
                      {formatCalendarDate(evt)}
                    </Text>
                  </View>
                  <View style={styles.calHeaderActions}>
                    <Badge
                      label={evt.type}
                      variant={evt.type === 'Holiday' ? 'warning' : 'info'}
                      size="small"
                    />
                    <TouchableOpacity
                      accessibilityLabel={`Edit ${evt.title}`}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={[
                        styles.calEditBtn,
                        {
                          backgroundColor: isDark ? '#1F2937' : '#F0F9FF',
                          borderColor: '#BAE6FD',
                        },
                      ]}
                      onPress={() => handleOpenEditCalendar(evt)}
                    >
                      <Ionicons name="pencil" size={15} color="#0284C7" />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={[styles.calTitle, { color: colors.text, marginTop: 8 }]}>
                  {evt.title}
                </Text>
                {evt.description && (
                  <Text style={[styles.calDesc, { color: colors.textSecondary }]}>
                    {evt.description}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 3: USERS (STUDENTS & FACULTY DETAILS - ADMIN ONLY) */}
        {/* ================================================================ */}
        {activeOption === 'users' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Students ({students.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      fullName: '',
                      email: '',
                      department: 'Computer Science & Engineering',
                      semester: 4,
                      rollNo: '',
                      cgpa: 8.5,
                      role: 'student',
                      bio: '',
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Student</Text>
              </TouchableOpacity>
            </View>

            {students.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="school-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No students yet. Add a student to build your class roster.
                </Text>
              </Card>
            )}

            {students.map((std) => (
              <TouchableOpacity
                key={std.id}
                onPress={() => handleOpenEdit(std)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={[styles.avatarBox, { backgroundColor: '#2563EB' }]}>
                  <Text style={styles.avatarText}>
                    {std.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{std.fullName}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    {std.rollNo} • Sem {std.semester} • {std.department}
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]}>{std.email}</Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}

            <View style={[styles.sectionHeaderWithBtn, { marginTop: 20 }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Faculty Members ({faculties.length})
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: '#059669' }]}
                onPress={() =>
                  handleOpenEdit(
                    {
                      fullName: '',
                      email: '',
                      department: 'Computer Science & Engineering',
                      designation: 'Associate Professor',
                      cabinLocation: '',
                      officeHours: 'Mon - Fri 2:00 PM - 4:00 PM',
                      role: 'faculty',
                      bio: '',
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Faculty</Text>
              </TouchableOpacity>
            </View>

            {faculties.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No faculty members yet. Add a faculty member to your directory.
                </Text>
              </Card>
            )}

            {faculties.map((fac) => (
              <TouchableOpacity
                key={fac.id}
                onPress={() => handleOpenEdit(fac)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={[styles.avatarBox, { backgroundColor: '#059669' }]}>
                  <Text style={styles.avatarText}>
                    {fac.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>{fac.fullName}</Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    {fac.designation} • {fac.department}
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
                    🏢 {fac.cabinLocation} • {fac.email}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color="#059669" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 4: ASSIGNMENTS CRUD */}
        {/* ================================================================ */}
        {activeOption === 'assignments' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Course Assignments ({assignments.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      courseCode: 'BCS401',
                      courseTitle: 'Analysis & Design of Algorithms',
                      facultyName: user.fullName,
                      title: '',
                      description: '',
                      dueDate: 'Nov 20, 2026',
                      maxMarks: 25,
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Create Assignment</Text>
              </TouchableOpacity>
            </View>

            {assignments.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No assignments yet. Create an assignment to get started.
                </Text>
              </Card>
            )}

            {assignments.map((asg) => (
              <TouchableOpacity
                key={asg.id}
                onPress={() => handleOpenEdit(asg)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={asg.courseCode} variant="primary" />
                    <Text style={[styles.dueText, { color: '#EF4444' }]}>Due: {asg.dueDate}</Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {asg.title}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    Course: {asg.courseTitle} • Max Marks: {asg.maxMarks}
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]} numberOfLines={2}>
                    {asg.description}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 5: EXAMINATION MARKS CRUD — Subject → Student → Edit */}
        {/* ================================================================ */}
        {activeOption === 'marks' && (() => {
          // Derive unique subjects from timetable, attendance or existing marks
          const subjectMap = new Map<string, { courseCode: string; courseTitle: string }>();
          timetable.forEach((s) => {
            if (s.courseCode && !subjectMap.has(s.courseCode)) {
              subjectMap.set(s.courseCode, { courseCode: s.courseCode, courseTitle: s.courseTitle });
            }
          });
          attendance.forEach((a) => {
            if (a.courseCode && !subjectMap.has(a.courseCode)) {
              subjectMap.set(a.courseCode, { courseCode: a.courseCode, courseTitle: a.courseTitle });
            }
          });
          marks.forEach((m) => {
            if (m.courseCode && !subjectMap.has(m.courseCode)) {
              subjectMap.set(m.courseCode, { courseCode: m.courseCode, courseTitle: m.courseTitle });
            }
          });
          const subjects = Array.from(subjectMap.values());
          return (
            <View>
              <View style={styles.sectionHeaderWithBtn}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Examination Marks — Select Subject
                </Text>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => setMarksAddModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add Exam Marks</Text>
                </TouchableOpacity>
              </View>
              {subjects.length === 0 && (
                <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    Upload a timetable first to auto-populate subjects, or add marks manually.
                  </Text>
                </Card>
              )}
              {subjects.map((sub) => (
                <TouchableOpacity
                  key={sub.courseCode}
                  style={[styles.dataItemCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  onPress={() => handleOpenMarksSubjectModal(sub.courseCode, sub.courseTitle)}
                >
                  <View style={{ flex: 1 }}>
                    <Badge label={sub.courseCode} variant="primary" />
                    <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>{sub.courseTitle}</Text>
                    <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                      {marks.filter(m => m.courseCode === sub.courseCode).length} student records
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ alignSelf: 'flex-start', paddingTop: 22, paddingRight: 15 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleOpenEditSubject(
                        sub.courseCode,
                        sub.courseTitle,
                        attendance.find((a) => a.courseCode === sub.courseCode)?.facultyName ||
                          timetable.find((s) => s.courseCode === sub.courseCode)?.facultyName
                      );
                    }}
                  >
                    <Ionicons name="pencil-outline" size={17} color={colors.primary} />
                  </TouchableOpacity>
                  <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          );
        })()}

        {/* ================================================================ */}
        {/* SECTION 6: STUDENT ATTENDANCE CRUD */}
        {/* ================================================================ */}
        {activeOption === 'attendance' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Course Attendance Tracker ({attendance.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      courseCode: 'BCS406',
                      courseTitle: 'Software Engineering',
                      attended: 28,
                      total: 32,
                      facultyName: user.fullName,
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Course</Text>
              </TouchableOpacity>
            </View>

            {attendance.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  Upload a timetable first to auto-populate subjects, or add attendance records manually.
                </Text>
              </Card>
            )}

            {attendance.map((att) => (
              <View
                key={att.courseCode}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={att.courseCode} variant="primary" />
                    <Badge
                      label={`${att.percentage}%`}
                      variant={att.percentage >= 75 ? 'success' : 'warning'}
                    />
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {att.courseTitle}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    Overall: {att.attended}/{att.total} • Faculty: {att.facultyName}
                  </Text>

                  {/* Actions */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: isDark ? '#1F2937' : '#E2E8F0' }}>
                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#ECFDF5', borderColor: '#059669', borderWidth: 1, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => handleOpenPortalRoster(att.courseCode, att.courseTitle)}
                    >
                      <Ionicons name="people" size={13} color="#059669" />
                      <Text style={{ color: '#059669', fontSize: 11, fontWeight: '800' }}>Mark Roster</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: isDark ? '#1E3A8A20' : '#EFF6FF', borderColor: '#2563EB', borderWidth: 1, paddingVertical: 6, borderRadius: 6 }}
                      onPress={() => handleOpenAttStudentModal(att)}
                    >
                      <Ionicons name="create-outline" size={13} color="#2563EB" />
                      <Text style={{ color: '#2563EB', fontSize: 11, fontWeight: '800' }}>Edit Student Attendance</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={{ alignSelf: 'flex-start', padding: 6 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => handleOpenEditSubject(att.courseCode, att.courseTitle, att.facultyName)}
                >
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 7: CAMPUS EVENTS CRUD */}
        {/* ================================================================ */}
        {activeOption === 'events' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Campus Events ({events.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      title: '',
                      description: '',
                      date: 'Nov 25, 2026',
                      time: '10:00 AM - 5:00 PM',
                      venue: 'Main Auditorium',
                      organizer: 'Student Council',
                      category: 'Technical',
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Create Event</Text>
              </TouchableOpacity>
            </View>

            {events.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No campus events yet. Create an event to announce it to students.
                </Text>
              </Card>
            )}

            {events.map((evt) => (
              <TouchableOpacity
                key={evt.id}
                onPress={() => handleOpenEdit(evt)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={evt.category} variant="primary" />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{evt.date}</Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {evt.title}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    📍 {evt.venue} • {evt.time}
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]} numberOfLines={2}>
                    {evt.description}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 8: ACTIVE QUESTS CRUD */}
        {/* ================================================================ */}
        {activeOption === 'quests' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Active Survival Quests ({quests.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      title: '',
                      description: '',
                      xpReward: 120,
                      maxProgress: 3,
                      category: 'Academic',
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Quest</Text>
              </TouchableOpacity>
            </View>

            {quests.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="trophy-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No active quests yet. Add a quest to motivate your students.
                </Text>
              </Card>
            )}

            {quests.map((q) => (
              <TouchableOpacity
                key={q.id}
                onPress={() => handleOpenEdit(q)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={q.category} variant="primary" />
                    <Text style={{ fontWeight: '800', color: '#D97706', fontSize: 12 }}>
                      +{q.xpReward} XP
                    </Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {q.title}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    Progress Goal: {q.maxProgress} steps
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
                    {q.description}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 9: NOTES & PYQS CRUD */}
        {/* ================================================================ */}
        {activeOption === 'notes' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Study Materials & PYQs ({studyMaterials.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      courseCode: 'BCS401',
                      courseTitle: 'Analysis & Design of Algorithms',
                      title: '',
                      category: 'Notes',
                      fileType: 'PDF',
                      fileSize: '3.4 MB',
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Material</Text>
              </TouchableOpacity>
            </View>

            {studyMaterials.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="folder-open-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No study materials or PYQs yet. Add notes to share with students.
                </Text>
              </Card>
            )}

            {studyMaterials.map((mat) => (
              <TouchableOpacity
                key={mat.id}
                onPress={() => handleOpenEdit(mat)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={mat.category} variant="primary" />
                    <Badge label={mat.fileType} variant="info" />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>{mat.fileSize}</Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {mat.title}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    {mat.courseCode}: {mat.courseTitle} • By {mat.uploadedBy}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 10: INTERNSHIPS*/}
        {/* ================================================================ */}
        {activeOption === 'internships' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Opportunities ({internships.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      title: '',
                      organization: '',
                      type: 'Internship',
                      stipendOrPrize: '₹25,000 / month',
                      deadline: 'Dec 10, 2026',
                      eligibility: '4th & 6th Sem B.Tech CSE/ISE/ECE',
                      description: '',
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Opportunity</Text>
              </TouchableOpacity>
            </View>

            {internships.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="briefcase-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No internships or hackathons yet. Add an opportunity for students.
                </Text>
              </Card>
            )}

            {internships.map((opp) => (
              <TouchableOpacity
                key={opp.id}
                onPress={() => handleOpenEdit(opp)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={opp.type} variant="primary" />
                    <Text style={{ color: '#059669', fontWeight: '800', fontSize: 12 }}>
                      {opp.stipendOrPrize}
                    </Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {opp.title}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    🏢 {opp.organization} • Deadline: {opp.deadline}
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
                    Eligibility: {opp.eligibility}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ================================================================ */}
        {/* SECTION 11: CLUBS & INFO */}
        {/* ================================================================ */}
        {activeOption === 'clubs' && (
          <View>
            <View style={styles.sectionHeaderWithBtn}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Campus Clubs ({clubs.length})
              </Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() =>
                  handleOpenEdit(
                    {
                      name: '',
                      category: 'Technical',
                      leads: '',
                      members: 100,
                      description: '',
                      icon: 'people',
                      welcomeMessage: '',
                      joinedMemberIds: [],
                    },
                    true
                  )
                }
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Add Club</Text>
              </TouchableOpacity>
            </View>

            {clubs.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 18, alignItems: 'center' }}>
                <Ionicons name="people-outline" size={28} color={colors.textSecondary} style={{ marginBottom: 6 }} />
                <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 13 }}>
                  No campus clubs yet. Create a club to build your communities.
                </Text>
              </Card>
            )}

            {clubs.map((clb) => (
              <TouchableOpacity
                key={clb.id}
                onPress={() => handleOpenEdit(clb)}
                style={[
                  styles.dataItemCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.cardHeaderRow}>
                    <Badge label={clb.category} variant="primary" />
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      {clb.members} Members
                    </Text>
                  </View>
                  <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                    {clb.name}
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                    Leads: {clb.leads}
                  </Text>
                  <Text style={[styles.itemDetail, { color: colors.textMuted }]}>
                    {clb.description}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ================================================================ */}
      {/* GENERIC EDIT/ADD FORM MODAL */}
      {/* ================================================================ */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isNewItem ? 'Create New Entry' : 'Edit Information'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Section: {activeOption.toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {activeOption === 'notes' && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.formLabel, { color: colors.text, marginBottom: 6 }]}>
                    ATTACH DOCUMENT / FILE
                  </Text>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isDark ? '#1E293B' : '#EEF2FF',
                      borderColor: editingItem?.fileUri ? '#10B981' : colors.primary,
                      borderWidth: 1.5,
                      borderStyle: 'dashed',
                      borderRadius: 10,
                      padding: 14,
                      gap: 8,
                    }}
                    onPress={handlePickDocumentForMaterial}
                  >
                    <Ionicons
                      name={editingItem?.fileUri ? 'checkmark-circle' : 'cloud-upload-outline'}
                      size={20}
                      color={editingItem?.fileUri ? '#10B981' : colors.primary}
                    />
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 13,
                        color: editingItem?.fileUri ? '#10B981' : colors.primary,
                      }}
                    >
                      {editingItem?.fileName
                        ? `Attached: ${editingItem.fileName}`
                        : 'Tap to Browse & Upload Document (PDF/DOCX/ZIP)'}
                    </Text>
                  </TouchableOpacity>
                  {editingItem?.fileUri && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                      File size: {editingItem.fileSize || 'Standard'} • Format: {editingItem.fileType || 'PDF'}
                    </Text>
                  )}
                </View>
              )}

              {editingItem &&
                Object.keys(editingItem)
                  .filter(
                    (key) =>
                      key !== 'id' &&
                      key !== 'role' &&
                      key !== 'status' &&
                      key !== 'fileUri' &&
                      key !== 'fileName' &&
                      key !== 'textContent' &&
                      key !== 'joinedMemberIds' &&
                      key !== 'isMember'
                  )
                  .map((key) => {
                    const isMultiline = key === 'description' || key === 'welcomeMessage';
                    return (
                    <View key={key} style={styles.formGroup}>
                      <Text style={[styles.formLabel, { color: colors.text }]}>
                        {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                      </Text>
                      <TextInput
                        multiline={isMultiline}
                        style={[
                          styles.formInput,
                          isMultiline && styles.formInputMultiline,
                          {
                            backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                            color: colors.text,
                            borderColor: colors.border,
                          },
                        ]}
                        value={String(editingItem[key] ?? '')}
                        onChangeText={(txt) => setEditingItem({ ...editingItem, [key]: txt })}
                      />
                    </View>
                    );
                  })}
            </ScrollView>

            <View style={styles.formBtnRow}>
              {!isNewItem && (
                <TouchableOpacity
                  style={styles.formDeleteBtn}
                  onPress={() => handleDeleteItem(editingItem.id || editingItem.courseCode)}
                >
                  <Ionicons name="trash" size={16} color="#FFFFFF" />
                  <Text style={styles.formDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formDoneBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.formDoneBtnText}>Done / Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* AI CLARIFICATION & CONFIRMATION MODAL (REQUIREMENT #7) */}
      {/* ================================================================ */}
      <Modal
        visible={clarificationModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setClarificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: '#7A3CFF' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sparkles" size={18} color="#7A3CFF" />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    AI Analysis & Clarification
                  </Text>
                </View>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  The AI model analyzed your document and flagged doubts before applying.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setClarificationModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {aiAnalysisResult && (
                <>
                  {/* Summary Box */}
                  <View style={styles.aiSummaryBox}>
                    <Text style={styles.aiSummaryTitle}>⚡ AI Extraction Summary:</Text>
                    <Text style={styles.aiSummaryBody}>{aiAnalysisResult.summary}</Text>
                  </View>

                  {/* Clarification Doubts */}
                  <View style={styles.doubtsContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={styles.doubtsHeader}>
                        {aiAnalysisResult.doubts.length > 0
                          ? '🤔 AI Clarifications & Adjustments:'
                          : '✨ Clarification Section:'}
                      </Text>
                      {aiAnalysisResult.doubts.length === 0 && (
                        <Badge label="Cleared" variant="success" size="small" />
                      )}
                    </View>

                    {aiAnalysisResult.doubts.length > 0 ? (
                      aiAnalysisResult.doubts.map((doubt, idx) => (
                        <View key={idx} style={styles.doubtItem}>
                          <Text style={styles.doubtText}>
                            {idx + 1}. {doubt}
                          </Text>
                          <TextInput
                            style={[
                              styles.doubtInput,
                              {
                                backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                                color: colors.text,
                                borderColor: colors.border,
                              },
                            ]}
                            placeholder="Type clarification or 'Confirmed'..."
                            placeholderTextColor={colors.textSecondary}
                            value={aiAnalysisResult.answers[idx] || ''}
                            onChangeText={(t) =>
                              setAiAnalysisResult({
                                ...aiAnalysisResult,
                                answers: { ...aiAnalysisResult.answers, [idx]: t },
                              })
                            }
                          />
                        </View>
                      ))
                    ) : (
                      <View style={{ paddingVertical: 6 }}>
                        <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                          All doubts have been cleared! If anything was missed, tell the AI in the box below.
                        </Text>
                      </View>
                    )}

                    {/* Bottom input: Tell AI if it missed anything from the timetable/calendar */}
                    <View style={{ marginTop: 10 }}>
                      <Text style={[styles.formLabel, { color: colors.text, fontSize: 11, marginBottom: 4 }]}>
                        Tell AI if it missed anything from the {aiAnalysisResult.type === 'timetable' ? 'timetable' : 'calendar'}:
                      </Text>
                      <TextInput
                        style={[
                          styles.doubtInput,
                          {
                            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                            color: colors.text,
                            borderColor: colors.border,
                            height: 60,
                            textAlignVertical: 'top',
                          },
                        ]}
                        placeholder="e.g. Include Friday 2-4 PM Tutorial for BCS401, or add Dec 25 Christmas holiday..."
                        placeholderTextColor={colors.textSecondary}
                        value={missedItemsInput}
                        onChangeText={setMissedItemsInput}
                        multiline
                      />
                    </View>

                    {/* Send Clarifications & Missed Items to AI Button */}
                    <TouchableOpacity
                      style={[
                        styles.sendClarificationBtn,
                        {
                          backgroundColor: refiningAi ? '#94A3B8' : '#FFE14D',
                        },
                      ]}
                      onPress={handleSendClarificationsToAi}
                      disabled={refiningAi}
                      activeOpacity={0.8}
                    >
                      {refiningAi ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                      )}
                      <Text style={styles.sendClarificationBtnText}>
                        {refiningAi ? 'AI is Refining Schedule...' : 'Send Clarifications to AI'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Extracted Slots Preview */}
                  <Text style={[styles.previewHeader, { color: colors.text }]}>
                    Extracted Items Preview ({aiAnalysisResult.items.length}):
                  </Text>
                  {aiAnalysisResult.items.map((item, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.previewCard,
                        {
                          backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                          borderColor: colors.cardBorder,
                        },
                      ]}
                    >
                      <Text style={{ fontWeight: '800', color: colors.primary, fontSize: 13 }}>
                        {item.courseCode || item.date}: {item.courseTitle || item.title}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                        {item.day ? `${item.day} • ${item.startTime}-${item.endTime} • ${item.room}` : item.description}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setClarificationModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formDoneBtn, { backgroundColor: '#7A3CFF' }]}
                onPress={handleConfirmAiAnalysis}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                <Text style={styles.formDoneBtnText}>Confirm & Apply Across App</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* SEMESTER END RESET MODAL (REQUIREMENT #8) */}
      {/* ================================================================ */}
      <Modal
        visible={resetModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResetModalVisible(false)}
      >
        <View style={styles.modalOverlayCenter}>
          <View
            style={[
              styles.resetCard,
              { backgroundColor: isDark ? '#1A0F3C' : '#FFFFFF', borderColor: '#FF2E88' },
            ]}
          >
            <View style={styles.resetHeader}>
              <View style={styles.resetIconBox}>
                <Ionicons name="warning" size={26} color="#FF2E88" />
              </View>
              <Text style={[styles.resetTitle, { color: colors.text }]}>Confirm Semester Reset</Text>
            </View>

            <Text style={[styles.resetDesc, { color: colors.textSecondary }]}>
              This will conclude the current academic semester and reset term-specific records:
            </Text>

            <View style={styles.resetList}>
              <Text style={styles.resetClearItem}>• ❌ Clears current Timetable</Text>
              <Text style={styles.resetClearItem}>• ❌ Clears Calendar of Events</Text>
              <Text style={styles.resetClearItem}>• ❌ Resets Attendance counts to zero</Text>
              <Text style={styles.resetClearItem}>• ❌ Clears Assignments & Submissions</Text>
              <Text style={styles.resetClearItem}>• ❌ Resets Subject Examination Marks</Text>
              <Text style={styles.resetClearItem}>• ❌ Resets Active Quest Progress</Text>
            </View>

            <View style={styles.keepBox}>
              <Text style={styles.keepHeader}>✅ WILL BE PRESERVED SAFELY:</Text>
              <Text style={styles.keepBody}>
                Notes & PYQs (study materials), Clubs, Student profiles, and Faculty directories stay intact!
              </Text>
            </View>

            <View style={styles.resetBtnRow}>
              <TouchableOpacity
                onPress={() => setResetModalVisible(false)}
                style={[styles.resetCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSemesterReset} style={styles.resetConfirmBtn}>
                <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                <Text style={styles.resetConfirmBtnText}>Reset Semester</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Attendance Roster Modal (Portal) */}
      <Modal
        visible={rosterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRosterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? '#111827' : '#FFFFFF',
                borderColor: colors.border,
                maxHeight: '85%',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Student Attendance Roster
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  {selectedRosterCourse?.courseCode}: {selectedRosterCourse?.courseTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRosterModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions Bar */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  borderWidth: 1,
                  backgroundColor: '#ECFDF5',
                  borderColor: '#059669',
                }}
                onPress={() => {
                  const allPresent: Record<string, boolean> = {};
                  students.forEach((s) => (allPresent[s.id] = true));
                  setStudentRosterAttendanceMap(allPresent);
                }}
              >
                <Ionicons name="checkmark-done" size={14} color="#059669" />
                <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700' }}>All Present</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 10,
                  paddingVertical: 5,
                  borderRadius: 6,
                  borderWidth: 1,
                  backgroundColor: '#FEF2F2',
                  borderColor: '#DC2626',
                }}
                onPress={() => {
                  const allAbsent: Record<string, boolean> = {};
                  students.forEach((s) => (allAbsent[s.id] = false));
                  setStudentRosterAttendanceMap(allAbsent);
                }}
              >
                <Ionicons name="close" size={14} color="#DC2626" />
                <Text style={{ color: '#DC2626', fontSize: 11, fontWeight: '700' }}>All Absent</Text>
              </TouchableOpacity>
            </View>

            {/* Students List */}
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {students.map((st) => {
                const isPresent = studentRosterAttendanceMap[st.id] ?? true;
                return (
                  <View
                    key={st.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 10,
                      borderRadius: 10,
                      borderWidth: 1,
                      marginBottom: 8,
                      backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                      borderColor: isPresent ? '#059669' : '#DC2626',
                    }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: isPresent ? '#10B981' : '#EF4444',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                        {st.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </Text>
                    </View>

                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.text }}>
                        {st.fullName}
                      </Text>
                      <Text style={{ fontSize: 10, marginTop: 1, color: colors.textSecondary }}>
                        Roll: {st.rollNo || st.id} • CGPA: {st.cgpa || 8.5}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                        backgroundColor: isPresent ? '#059669' : '#DC2626',
                      }}
                      onPress={() =>
                        setStudentRosterAttendanceMap((prev) => ({
                          ...prev,
                          [st.id]: !isPresent,
                        }))
                      }
                    >
                      <Ionicons name={isPresent ? 'checkmark' : 'close'} size={14} color="#FFFFFF" />
                      <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', marginLeft: 4 }}>
                        {isPresent ? 'Present' : 'Absent'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.formBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                onPress={() => setRosterModalVisible(false)}
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSavePortalRoster}
                style={[styles.formDoneBtn, { backgroundColor: '#059669' }]}
              >
                <Text style={styles.formDoneBtnText}>Save Attendance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Attendance List for Selected Subject */}
      <Modal
        visible={attStudentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttStudentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Student Attendance</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {attModalCourse?.courseCode}: {attModalCourse?.courseTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttStudentModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {students.map((st) => {
                const recs = getStudentAttendanceRecords ? getStudentAttendanceRecords(st.id, false) : [];
                const courseRec = recs.find(r => r.courseCode === attModalCourse?.courseCode);
                const att = courseRec?.attended ?? (attModalCourse?.attended ?? 0);
                const tot = courseRec?.total ?? (attModalCourse?.total ?? 0);
                const pct = tot > 0 ? Math.round((att / tot) * 1000) / 10 : 0;
                return (
                  <View
                    key={st.id}
                    style={[
                      styles.dataItemCard,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                        borderColor: colors.cardBorder,
                        justifyContent: 'space-between',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                      <View style={[styles.avatarBox, { backgroundColor: '#7A3CFF', width: 34, height: 34, borderRadius: 17 }]}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>
                          {st.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemTitle, { color: colors.text, fontSize: 13 }]}>{st.fullName}</Text>
                        <Text style={[styles.itemSub, { color: colors.textSecondary }]}>Roll: {st.rollNo || st.id}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: pct >= 75 ? '#059669' : pct >= 65 ? '#D97706' : '#DC2626', marginTop: 2 }}>
                          {att} / {tot} ({pct}%)
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isDark ? '#374151' : '#EEF2FF',
                        borderWidth: 1,
                        borderColor: colors.primary,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                      onPress={() => {
                        setAttStudentEditTarget({ studentId: st.id, name: st.fullName, attended: att, total: tot });
                        setAttEditAttended(String(att));
                        setAttEditTotal(String(tot));
                      }}
                    >
                      <Ionicons name="pencil" size={12} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.formBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                onPress={() => setAttStudentModalVisible(false)}
                style={[styles.formDoneBtn, { backgroundColor: colors.primary, flex: 1, justifyContent: 'center' }]}
              >
                <Text style={styles.formDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Single Student Attendance Modal */}
      <Modal
        visible={!!attStudentEditTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setAttStudentEditTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Student Attendance</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {attStudentEditTarget?.name} • {attModalCourse?.courseCode}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAttStudentEditTarget(null)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Classes Attended</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                value={attEditAttended}
                onChangeText={setAttEditAttended}
                keyboardType="numeric"
                placeholder="e.g. 28"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>Total Classes Conducted</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                value={attEditTotal}
                onChangeText={setAttEditTotal}
                keyboardType="numeric"
                placeholder="e.g. 32"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                onPress={() => setAttStudentEditTarget(null)}
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveAttStudentEdit}
                style={[styles.formDoneBtn, { backgroundColor: '#059669', flex: 1, justifyContent: 'center' }]}
              >
                <Text style={styles.formDoneBtnText}>Save Attendance</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Subject Modal (shared by marks + attendance) */}
      <Modal
        visible={subjectEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSubjectEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Subject</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Updates apply instantly to timetable, attendance, marks and assignments.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSubjectEditModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>SUBJECT CODE</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                value={editSubjectCode}
                onChangeText={setEditSubjectCode}
                autoCapitalize="characters"
                placeholder="e.g. BCS401"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>SUBJECT TITLE</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                value={editSubjectTitle}
                onChangeText={setEditSubjectTitle}
                placeholder="e.g. Database Management Systems"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.text }]}>FACULTY NAME</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                value={editSubjectFaculty}
                onChangeText={setEditSubjectFaculty}
                placeholder="e.g. Dr. Ananya Rao"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity style={styles.formDeleteBtn} onPress={handleConfirmDeleteSubject}>
                <Ionicons name="trash" size={16} color="#FFFFFF" />
                <Text style={styles.formDeleteBtnText}>Delete</Text>
              </TouchableOpacity>

              <View style={{ flex: 1 }} />

              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setSubjectEditModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.formDoneBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveSubjectDetails}
              >
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                <Text style={styles.formDoneBtnText}>Done / Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Exam Marks - Subject Picker Modal */}
      <Modal
        visible={marksAddModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMarksAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Exam Marks</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Select a subject to manage its student marks.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMarksAddModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {portalMarksSubjects.length === 0 ? (
                <Card style={{ backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.cardBorder, padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
                    Upload a timetable first to auto-populate subjects, or add marks manually.
                  </Text>
                </Card>
              ) : (
                portalMarksSubjects.map((sub) => (
                  <TouchableOpacity
                    key={sub.courseCode}
                    style={[styles.dataItemCard, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.cardBorder }]}
                    onPress={() => {
                      setMarksAddModalVisible(false);
                      handleOpenMarksSubjectModal(sub.courseCode, sub.courseTitle);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Badge label={sub.courseCode} variant="primary" />
                      <Text style={[styles.itemTitle, { color: colors.text, marginTop: 4 }]}>
                        {sub.courseTitle}
                      </Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>
                        {marks.filter((m) => m.courseCode === sub.courseCode).length} student records
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={[styles.formBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                onPress={() => setMarksAddModalVisible(false)}
                style={[styles.formDoneBtn, { backgroundColor: colors.primary, flex: 1, justifyContent: 'center' }]}
              >
                <Text style={styles.formDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Marks Subject - Student List Modal */}
      <Modal
        visible={marksSubjectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMarksSubjectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Subject Examination Marks</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {selectedMarksCourse?.courseCode}: {selectedMarksCourse?.courseTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMarksSubjectModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {students.length === 0 ? (
                <Card style={{ backgroundColor: isDark ? '#1F2937' : '#F8FAFC', borderColor: colors.cardBorder, padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
                    No students found. Add students from the Students &amp; Faculty section first.
                  </Text>
                </Card>
              ) : (
                students.map((st) => {
                const mark = marks.find(m => m.studentId === st.id && m.courseCode === selectedMarksCourse?.courseCode);
                return (
                  <View
                    key={st.id}
                    style={[
                      styles.dataItemCard,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                        borderColor: colors.cardBorder,
                        justifyContent: 'space-between',
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemTitle, { color: colors.text, fontSize: 13 }]}>{st.fullName}</Text>
                      <Text style={[styles.itemSub, { color: colors.textSecondary }]}>Roll: {st.rollNo || st.id}</Text>
                      {mark ? (
                        <View style={{ marginTop: 4 }}>
                          <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                            CIE-1: {mark.internal1} • CIE-2: {mark.internal2} • Lab: {mark.labInternal} • Ext: {mark.externalExam}
                          </Text>
                          <Text style={{ fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 2 }}>
                            Total: {mark.totalMarks}/{mark.maxMarks} ({mark.percentage}%) • Grade {mark.grade}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 11, fontStyle: 'italic', color: colors.textSecondary, marginTop: 2 }}>
                          No marks entered yet
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: isDark ? '#374151' : '#EEF2FF',
                        borderWidth: 1,
                        borderColor: colors.primary,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 6,
                      }}
                      onPress={() => handleOpenStudentMarksEdit(st.id, st.fullName)}
                    >
                      <Ionicons name="create-outline" size={12} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 11 }}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
              )}
            </ScrollView>

            <View style={[styles.formBtnRow, { marginTop: 14 }]}>
              <TouchableOpacity
                onPress={() => setMarksSubjectModalVisible(false)}
                style={[styles.formDoneBtn, { backgroundColor: colors.primary, flex: 1, justifyContent: 'center' }]}
              >
                <Text style={styles.formDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Student Exam Marks Modal */}
      <Modal
        visible={marksEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setMarksEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Examination Marks</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {marksStudentEditTarget?.studentName} • {marksStudentEditTarget?.courseCode}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMarksEditModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>CIE Test 1 (/25)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  value={marksEdit1}
                  onChangeText={setMarksEdit1}
                  keyboardType="numeric"
                  placeholder="22"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>CIE Test 2 (/25)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  value={marksEdit2}
                  onChangeText={setMarksEdit2}
                  keyboardType="numeric"
                  placeholder="24"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Lab Internal (/25)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  value={marksEditLab}
                  onChangeText={setMarksEditLab}
                  keyboardType="numeric"
                  placeholder="25"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Final Exam (/100)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  value={marksEditExt}
                  onChangeText={setMarksEditExt}
                  keyboardType="numeric"
                  placeholder="85"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.formBtnRow}>
              <TouchableOpacity
                onPress={() => setMarksEditModal(false)}
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveStudentMarksEdit}
                style={[styles.formDoneBtn, { backgroundColor: colors.primary, flex: 1, justifyContent: 'center' }]}
              >
                <Text style={styles.formDoneBtnText}>Save Marks</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timetable Add / Edit Modal */}
      <Modal
        visible={timetableModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimetableModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isNewTimetableSlot ? 'Add Class Slot' : 'Edit Class Slot'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Configure day, timing, and course details. Slots will be sorted automatically.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTimetableModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Day Selection */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Day of Week</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {WEEKDAYS.map((day) => {
                    const isSelected = slotDay === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isSelected ? colors.primary : isDark ? '#1F2937' : '#F1F5F9',
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => setSlotDay(day)}
                      >
                        <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 11 }}>
                          {day.slice(0, 3)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Class Timings */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Start Time</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={slotStartTime}
                    onChangeText={setSlotStartTime}
                    placeholder="09:00 AM"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>End Time</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={slotEndTime}
                    onChangeText={setSlotEndTime}
                    placeholder="10:00 AM"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Course Code & Title */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Course Code</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={slotCourseCode}
                    onChangeText={setSlotCourseCode}
                    placeholder="BCS401"
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Course Title</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={slotCourseTitle}
                    onChangeText={setSlotCourseTitle}
                    placeholder="Analysis & Design of Algorithms"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Room No & Faculty */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Room No</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={slotRoom}
                    onChangeText={setSlotRoom}
                    placeholder="LH-201"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 2 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Faculty In-Charge</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={slotFaculty}
                    onChangeText={setSlotFaculty}
                    placeholder="Dr. S. Kumar"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Class Type */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Session Type</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {(['Theory', 'Lab'] as const).map((t) => {
                    const isSelected = slotType === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isSelected ? (t === 'Lab' ? '#D97706' : colors.primary) : isDark ? '#1F2937' : '#F1F5F9',
                            borderColor: isSelected ? (t === 'Lab' ? '#D97706' : colors.primary) : colors.border,
                            paddingHorizontal: 20,
                          },
                        ]}
                        onPress={() => setSlotType(t)}
                      >
                        <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 12 }}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.formBtnRow}>
              {!isNewTimetableSlot && (
                <TouchableOpacity
                  style={styles.formDeleteBtn}
                  onPress={handleDeleteTimetableSlot}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.formDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setTimetableModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formDoneBtn, { backgroundColor: colors.primary, flex: 1, justifyContent: 'center' }]}
                onPress={handleSaveTimetableSlot}
              >
                <Text style={styles.formDoneBtnText}>Save Class</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar Add / Edit Modal */}
      <Modal
        visible={calendarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {isNewCalendarEvent ? 'Add Calendar Event' : 'Edit Calendar Event'}
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  Holidays, exam schedules, and milestones are sorted chronologically by date.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Category / Type Selector */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Event Category</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(['Semester Milestones', 'Holiday', 'Exam'] as const).map((t) => {
                    const isSelected = calType === t;
                    const badgeColor = t === 'Holiday' ? '#D97706' : t === 'Exam' ? '#DC2626' : '#0284C7';
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.filterPill,
                          {
                            backgroundColor: isSelected ? badgeColor : isDark ? '#1F2937' : '#F1F5F9',
                            borderColor: isSelected ? badgeColor : colors.border,
                            flex: 1,
                          },
                        ]}
                        onPress={() => setCalType(t)}
                      >
                        <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 11, textAlign: 'center' }}>
                          {t === 'Semester Milestones' ? 'Milestone' : t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Start Date & End Date */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Start Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={calStartDate}
                    onChangeText={setCalStartDate}
                    placeholder="2026-11-20"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>End Date (Optional)</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                    value={calEndDate}
                    onChangeText={setCalEndDate}
                    placeholder="2026-11-23"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Event Title */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Event Title</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border }]}
                  value={calTitle}
                  onChangeText={setCalTitle}
                  placeholder="e.g. CIE-2 Internal Examination"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.text }]}>Description (Optional)</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9', color: colors.text, borderColor: colors.border, minHeight: 60 }]}
                  value={calDesc}
                  onChangeText={setCalDesc}
                  placeholder="e.g. Coverage of Units 3 & 4 across all 4th Semester courses."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                />
              </View>
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.formBtnRow}>
              {!isNewCalendarEvent && (
                <TouchableOpacity
                  style={styles.formDeleteBtn}
                  onPress={handleDeleteCalendarEvent}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.formDeleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.formCancelBtn, { borderColor: colors.border }]}
                onPress={() => setCalendarModalVisible(false)}
              >
                <Text style={{ color: colors.text, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formDoneBtn, { backgroundColor: '#0284C7', flex: 1, justifyContent: 'center' }]}
                onPress={handleSaveCalendarEvent}
              >
                <Text style={styles.formDoneBtnText}>Save Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  portalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  portalTitleWrap: {},
  portalHeading: {
    fontSize: 16,
    fontWeight: '900',
  },
  portalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  semEndBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  semEndBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  optionsScrollWrap: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  optionsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  optionTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  mainScroll: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  uploadDocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7A3CFF',
    borderRadius: 10,
    paddingVertical: 12,
    shadowColor: '#7A3CFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadDocBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionHeaderWithBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  slotLeft: {
    alignItems: 'flex-start',
    gap: 4,
  },
  slotTime: {
    fontSize: 11,
    fontWeight: '700',
  },
  slotCourse: {
    fontSize: 13,
    fontWeight: '800',
  },
  slotRoom: {
    fontSize: 11,
    marginTop: 2,
  },
  calCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  calDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexShrink: 1,
  },
  calHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  calEditBtn: {
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sectionTitleFlex: {
    flex: 1,
    paddingRight: 8,
  },
  addBtnShrink: {
    flexShrink: 0,
  },
  calDateText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0284C7',
    flexShrink: 1,
  },
  calTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  calDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  dataItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  avatarBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  itemDetail: {
    fontSize: 11,
    marginTop: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 2,
    padding: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  formInputMultiline: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  formBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  formDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  formDeleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  formCancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  formDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  formDoneBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  aiSummaryBox: {
    backgroundColor: 'rgba(122, 60, 255, 0.12)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  aiSummaryTitle: {
    color: '#7A3CFF',
    fontWeight: '900',
    fontSize: 12,
    marginBottom: 4,
  },
  aiSummaryBody: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 16,
  },
  doubtsContainer: {
    backgroundColor: 'rgba(255, 225, 77, 0.1)',
    borderWidth: 1,
    borderColor: '#FFE14D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  doubtsHeader: {
    color: '#FFE14D',
    fontWeight: '800',
    fontSize: 12,
    marginBottom: 8,
  },
  doubtItem: {
    marginBottom: 8,
  },
  doubtText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  doubtInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  sendClarificationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  sendClarificationBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  previewHeader: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  previewCard: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  resetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 46, 136, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetTitle: {
    fontSize: 17,
    fontWeight: '900',
  },
  resetDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  resetList: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 12,
  },
  resetClearItem: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: '700',
  },
  keepBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  keepHeader: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  keepBody: {
    color: '#6EE7B7',
    fontSize: 11,
    lineHeight: 15,
  },
  resetBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  resetCancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  resetConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
