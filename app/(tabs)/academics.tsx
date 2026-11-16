import { Header } from '@/components/common/Header';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Assignment, AttendanceRecord, StudyMaterial } from '@/constants/CampusData';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { useAppTheme } from '@/context/ThemeContext';
import { openStudyMaterial } from '@/services/documentService';
import { isSameFacultyName } from '@/utils/lectureUtils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type TabSegment = 'timetable' | 'attendance' | 'marks' | 'assignments' | 'materials';

export default function AcademicsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: TabSegment; grade?: string }>();
  const { role, user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();
  const {
    timetable,
    attendance,
    examinationMarks,
    getStudentExaminationMarks,
    assignments,
    studyMaterials,
    markAttendance,
    markStudentAttendance,
    getStudentAttendanceRecords,
    students,
    submitAssignment,
    gradeAssignment,
    createAssignment,
    uploadStudyMaterial,
  } = useCampusData();

  const [activeSegment, setActiveSegment] = useState<TabSegment>(params.tab || 'timetable');
  const [tabKey, setTabKey] = useState(0);

  // Student-specific attendance records
  const studentAttendanceRecords = useMemo(() => {
    if (role === 'student' && user?.id) {
      return getStudentAttendanceRecords(user.id, false);
    }
    return attendance;
  }, [role, user?.id, attendance, getStudentAttendanceRecords]);

  // Student-specific examination marks
  const activeStudentMarks = useMemo(() => {
    if (role === 'student' && user?.id && getStudentExaminationMarks) {
      return getStudentExaminationMarks(user.id);
    }
    return examinationMarks;
  }, [role, user?.id, examinationMarks, getStudentExaminationMarks]);

  useEffect(() => {
    if (params.tab && params.tab !== activeSegment) {
      setActiveSegment(params.tab);
      setTabKey((k) => k + 1);
    }
  }, [params.tab]);

  // Faculty attendance marking: instant per-student Present/Absent
  const [rosterModal, setRosterModal] = useState(false);
  const [selectedCourseRoster, setSelectedCourseRoster] = useState<{ courseCode: string; courseTitle: string } | null>(null);
  const [markingStudentId, setMarkingStudentId] = useState<string | null>(null);

  // Faculty marks view state
  const [facultyMarksSubject, setFacultyMarksSubject] = useState<string>('');

  // Assignment grading modal state (Faculty)
  const [gradeModal, setGradeModal] = useState(false);
  const [gradingAsg, setGradingAsg] = useState<Assignment | null>(null);
  const [gradeScore, setGradeScore] = useState('');
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [expandedAsgSubject, setExpandedAsgSubject] = useState<string | null>(null);

  // Modal states for creating assignment or uploading notes
  const [createAsgModal, setCreateAsgModal] = useState(false);
  const [newAsgTitle, setNewAsgTitle] = useState('');
  const [newAsgCourse, setNewAsgCourse] = useState('');
  const [newAsgDesc, setNewAsgDesc] = useState('');
  const [newAsgDue, setNewAsgDue] = useState('Nov 20, 2026');

  // Submit modal
  const [submitModal, setSubmitModal] = useState(false);
  const [selectedAsgId, setSelectedAsgId] = useState<string | null>(null);
  const [submissionNote, setSubmissionNote] = useState('');

  // Attendance marking modal (Faculty)
  const [markingModal, setMarkingModal] = useState(false);
  const [markingCourse, setMarkingCourse] = useState('BCS401');

  // Open roster - instant marking UI
  const handleOpenRoster = (courseCode: string, courseTitle: string) => {
    setMarkingStudentId(null);
    setSelectedCourseRoster({ courseCode, courseTitle });
    setRosterModal(true);
  };

  const handleMarkStudent = async (studentId: string, isPresent: boolean) => {
    if (!selectedCourseRoster) return;
    await markStudentAttendance(studentId, selectedCourseRoster.courseCode, isPresent);
    setMarkingStudentId(null);
    showNotice({
      title: isPresent ? 'Marked Present ✅' : 'Marked Absent ❌',
      message: `Attendance recorded for ${students.find(s => s.id === studentId)?.fullName || studentId}.`,
      type: 'success',
    });
  };

  // Open assignment grading modal
  const handleOpenGradeModal = (asg: Assignment) => {
    setGradingAsg(asg);
    setGradeScore(asg.marksObtained != null ? String(asg.marksObtained) : '');
    setGradeFeedback(asg.feedback || '');
    setGradeModal(true);
  };

  const handleConfirmGrade = () => {
    if (!gradingAsg) return;
    const score = parseFloat(gradeScore);
    if (isNaN(score) || score < 0 || score > gradingAsg.maxMarks) {
      showNotice({
        title: 'Invalid Marks',
        message: `Please enter valid marks between 0 and ${gradingAsg.maxMarks}.`,
        type: 'warning',
      });
      return;
    }

    gradeAssignment(gradingAsg.id, score, gradeFeedback.trim() || 'Evaluated and marked.');
    setGradeModal(false);
    showNotice({
      title: 'Assignment Graded! 📝',
      message: `Allotted ${score}/${gradingAsg.maxMarks} marks for "${gradingAsg.title}".`,
      type: 'success',
    });
  };

  const handleOpenMaterial = async (mat: StudyMaterial) => {
    await openStudyMaterial(
      mat,
      () => {
        showNotice({
          title: 'Document Unavailable',
          message: `Unable to open "${mat.title}". The document file is corrupted or unreadable.`,
          type: 'error',
        });
      }
    );
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const filteredTimetable = timetable.filter((slot) => slot.day === selectedDay);

  const handleCreateAssignment = () => {
    if (!newAsgTitle.trim() || !newAsgDesc.trim()) {
      showNotice({
        title: 'Missing Fields',
        message: 'Please provide both assignment title and description.',
        type: 'warning',
      });
      return;
    }

    // Determine target course: if faculty is handling a course from timetable, use that course
    let targetCourse = newAsgCourse.trim();
    let targetTitle = 'Academic Coursework';

    if (!targetCourse) {
      const facultySlot = timetable.find((s) =>
        s.facultyName?.toLowerCase().includes(user.fullName?.toLowerCase() || '')
      );
      if (facultySlot) {
        targetCourse = facultySlot.courseCode;
        targetTitle = facultySlot.courseTitle;
      } else {
        targetCourse = 'Other';
        targetTitle = 'General Coursework';
      }
    } else {
      const match = timetable.find((s) => s.courseCode.toUpperCase() === targetCourse.toUpperCase());
      if (match) {
        targetTitle = match.courseTitle;
      }
    }

    createAssignment({
      courseCode: targetCourse,
      courseTitle: targetTitle,
      facultyName: user.fullName || 'Faculty',
      title: newAsgTitle.trim(),
      description: newAsgDesc.trim(),
      dueDate: `${newAsgDue} • 11:59 PM`,
      maxMarks: 25,
    });
    setNewAsgTitle('');
    setNewAsgDesc('');
    setNewAsgCourse('');
    setCreateAsgModal(false);
    showNotice({
      title: 'Assignment Published',
      message: `Assignment allotted under ${targetCourse} successfully.`,
      type: 'success',
    });
  };

  const handleConfirmSubmit = () => {
    if (selectedAsgId) {
      submitAssignment(selectedAsgId, submissionNote);
      setSubmitModal(false);
      setSubmissionNote('');
      showNotice({
        title: 'Assignment Submitted! 🚀',
        message: 'Your assignment submission has been logged and awarded +50 XP!',
        type: 'quest',
        xpReward: 50,
      });
    }
  };

  // Compute student examination marks stats
  const totalEarnedMarks = activeStudentMarks.reduce((sum, m) => sum + m.totalMarks, 0);
  const totalMaxMarks = activeStudentMarks.reduce((sum, m) => sum + m.maxMarks, 0);
  const overallMarksPct =
    totalMaxMarks > 0 ? Math.round((totalEarnedMarks / totalMaxMarks) * 1000) / 10 : 87.4;

  // Staff: detect subjects (faculty sees own subjects, admin sees all)
  const facultySubjects = useMemo(() => {
    if (role === 'student') return [];
    const codes = [
      ...new Set(
        timetable
          .filter((s) =>
            role === 'admin' || isSameFacultyName(s.facultyName, user.fullName)
          )
          .map((s) => s.courseCode)
      ),
    ];

    if (role === 'admin') {
      // Admin oversight includes attendance/marks-only subjects too
      attendance.forEach((a) => {
        if (!codes.includes(a.courseCode)) codes.push(a.courseCode);
      });
      examinationMarks.forEach((m) => {
        if (!codes.includes(m.courseCode)) codes.push(m.courseCode);
      });
    } else {
      // Faculty: include any assignment they own for a subject not in the timetable
      assignments.forEach((a) => {
        if (
          !codes.includes(a.courseCode) &&
          isSameFacultyName(a.facultyName, user.fullName)
        ) {
          codes.push(a.courseCode);
        }
      });
    }

    return codes;
  }, [role, timetable, attendance, examinationMarks, assignments, user.fullName]);

  // Staff: set default subject on load (and recover if the selected subject was removed)
  useEffect(() => {
    if (
      role !== 'student' &&
      facultySubjects.length > 0 &&
      !facultySubjects.includes(facultyMarksSubject)
    ) {
      setFacultyMarksSubject(facultySubjects[0]);
    }
  }, [facultySubjects, role, facultyMarksSubject]);

  // Staff attendance: every subject handled by the viewer, with the full student roster
  const staffAttendanceSubjects = useMemo(() => {
    if (role === 'student') return [];
    const allowed = new Set(facultySubjects);
    const subjects: { courseCode: string; courseTitle: string; facultyName?: string }[] = [];
    const known = new Set<string>();

    attendance.forEach((rec) => {
      if ((role === 'admin' || allowed.has(rec.courseCode)) && !known.has(rec.courseCode)) {
        known.add(rec.courseCode);
        subjects.push({
          courseCode: rec.courseCode,
          courseTitle: rec.courseTitle,
          facultyName: rec.facultyName,
        });
      }
    });
    timetable.forEach((slot) => {
      if ((role === 'admin' || allowed.has(slot.courseCode)) && !known.has(slot.courseCode)) {
        known.add(slot.courseCode);
        subjects.push({
          courseCode: slot.courseCode,
          courseTitle: slot.courseTitle,
          facultyName: slot.facultyName,
        });
      }
    });

    return subjects;
  }, [role, facultySubjects, attendance, timetable]);

  const staffAttendanceMatrix = useMemo(() => {
    if (role === 'student') return [];
    return staffAttendanceSubjects.map((sub) => ({
      ...sub,
      classPercentage: attendance.find((a) => a.courseCode === sub.courseCode)?.percentage ?? null,
      roster: students.map((student) => {
        const rec = getStudentAttendanceRecords(student.id, false).find(
          (r) => r.courseCode === sub.courseCode
        );
        const total = rec?.total ?? 0;
        return {
          student,
          attended: rec?.attended ?? 0,
          total,
          percentage: total > 0 ? rec!.percentage : null,
        };
      }),
    }));
  }, [role, staffAttendanceSubjects, students, getStudentAttendanceRecords, attendance]);

  // Staff: students with their marks for the selected subject
  const facultySubjectStudentMarks = useMemo(() => {
    if (role === 'student' || !facultyMarksSubject) return [];
    return students.map((s) => {
      const mark = examinationMarks.find(
        (m) => m.studentId === s.id && m.courseCode === facultyMarksSubject
      );
      return { student: s, mark };
    });
  }, [role, facultyMarksSubject, students, examinationMarks]);

  // Faculty: top scorer for the selected subject
  const facultyTopScorer = useMemo(() => {
    const withMarks = facultySubjectStudentMarks.filter((x) => x.mark);
    if (!withMarks.length) return null;
    return withMarks.reduce((best, cur) =>
      (cur.mark!.percentage ?? 0) > (best.mark!.percentage ?? 0) ? cur : best
    );
  }, [facultySubjectStudentMarks]);

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header subtitle="Academics & Curriculum" />

      {/* Segment Switcher */}
      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segmentScroll}
        >
          {[
            { id: 'timetable', label: 'Timetable', icon: 'calendar-outline' },
            { id: 'attendance', label: 'Attendance', icon: 'checkmark-circle-outline' },
            { id: 'marks', label: 'Exam Marks', icon: 'stats-chart-outline' },
            { id: 'assignments', label: 'Assignments', icon: 'document-text-outline' },
            { id: 'materials', label: 'All Study Materials', icon: 'book-outline' },
          ].map((tab) => {
            const isSelected = activeSegment === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.segmentBtn,
                  isSelected && {
                    backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                    borderBottomColor: '#7A3CFF',
                    borderBottomWidth: 3,
                  },
                ]}
                onPress={() => { setActiveSegment(tab.id as TabSegment); setTabKey(k => k + 1); }}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isSelected ? '#7A3CFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentText,
                    {
                      color: isSelected ? '#7A3CFF' : colors.textSecondary,
                      fontWeight: isSelected ? '800' : '600',
                    },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View key={tabKey} entering={FadeIn.duration(150)} style={{ flex: 1 }}>
        {/* ============================================================== */}
        {/* 1. TIMETABLE SEGMENT */}
        {/* ============================================================== */}
        {activeSegment === 'timetable' && (
          <View>
            {/* Day Selector Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daySelectorRow}
            >
              {days.map((day) => {
                const isSelected = selectedDay === day;
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayPill,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.card,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              </ScrollView>

            {filteredTimetable.length === 0 ? (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24 }}>
                <Text style={{ textAlign: 'center', color: colors.textSecondary }}>
                  No classes scheduled for {selectedDay}. Enjoy your study session!
                </Text>
              </Card>
            ) : (
              filteredTimetable.map((slot) => (
                <Card
                  key={slot.id}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    marginBottom: 12,
                  }}
                >
                  <View style={styles.slotRow}>
                    <View style={styles.timeColumn}>
                      <Text style={[styles.timeText, { color: colors.text }]}>{slot.startTime}</Text>
                      <Text style={[styles.timeSub, { color: colors.textSecondary }]}>
                        {slot.endTime}
                      </Text>
                      <Badge
                        label={slot.type}
                        variant={slot.type === 'Lab' ? 'warning' : 'primary'}
                        size="small"
                      />
                    </View>

                    <View style={styles.slotDivider} />

                    <View style={styles.slotDetails}>
                      <Text style={[styles.courseCode, { color: colors.primary }]}>
                        {slot.courseCode}
                      </Text>
                      <Text style={[styles.courseTitle, { color: colors.text }]}>
                        {slot.courseTitle}
                      </Text>
                      <Text style={[styles.slotMeta, { color: colors.textSecondary }]}>
                        📍 {slot.room} • Faculty: {slot.facultyName}
                      </Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* 2. ATTENDANCE SEGMENT */}
        {/* ============================================================== */}
        {activeSegment === 'attendance' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Subject-Wise Attendance</Text>
              <Badge label="75% Requirement Rule" variant="info" />
            </View>

            {role !== 'student' && (
              <View>
                {staffAttendanceMatrix.length === 0 && (
                  <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                    <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                      No Subjects Found
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                      Subjects will appear here once a timetable is uploaded.
                    </Text>
                  </Card>
                )}
                {staffAttendanceMatrix.map((sub) => (
                  <Card
                    key={sub.courseCode}
                    style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 12 }}
                  >
                    <View style={styles.attRow}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.attBadgeRow}>
                          <Badge label={sub.courseCode} variant="primary" />
                          {sub.classPercentage !== null && (
                            <Badge
                              label={`Class ${sub.classPercentage}%`}
                              variant={sub.classPercentage >= 75 ? 'success' : 'warning'}
                            />
                          )}
                        </View>
                        <Text style={[styles.courseTitle, { color: colors.text, marginTop: 4 }]}>
                          {sub.courseTitle}
                        </Text>
                        <Text style={[styles.slotMeta, { color: colors.textSecondary }]}>
                          {sub.facultyName || 'Department Faculty'} · {sub.roster.length} students
                        </Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 10, gap: 8 }}>
                      {sub.roster.length === 0 && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          No students in the roster yet.
                        </Text>
                      )}
                      {sub.roster.map(({ student, attended, total, percentage }) => (
                        <View
                          key={student.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                            paddingVertical: 6,
                            borderTopWidth: 1,
                            borderTopColor: isDark ? '#1F2937' : '#E2E8F0',
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>
                              {student.fullName}
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                              {student.rollNo || student.id}
                              {total > 0 ? ` · ${attended}/${total} classes` : ' · Not marked'}
                            </Text>
                          </View>
                          {percentage === null ? (
                            <Badge label="Not marked" variant="info" />
                          ) : (
                            <Badge
                              label={`${percentage}%`}
                              variant={percentage >= 75 ? 'success' : percentage >= 65 ? 'warning' : 'danger'}
                            />
                          )}
                        </View>
                      ))}
                    </View>

                    {role === 'faculty' && (
                      <View style={styles.facultyMarkRow}>
                        <TouchableOpacity
                          style={[styles.attBtn, { backgroundColor: '#ECFDF5', borderColor: '#059669', paddingVertical: 8 }]}
                          onPress={() => handleOpenRoster(sub.courseCode, sub.courseTitle)}
                        >
                          <Ionicons name="people" size={16} color="#059669" />
                          <Text style={{ color: '#059669', fontSize: 12, fontWeight: '800' }}>
                            Mark Student Attendance (Roster)
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </Card>
                ))}
              </View>
            )}

            {role === 'student' && studentAttendanceRecords.length === 0 && (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                <Ionicons name="calendar-outline" size={36} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                  No Attendance Records
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  Semester attendance is clean. Records will populate as lectures are conducted.
                </Text>
              </Card>
            )}

            {role === 'student' && (studentAttendanceRecords as AttendanceRecord[]).map((rec: AttendanceRecord) => (
              <Card
                key={rec.courseCode}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 12,
                }}
              >
                <View style={styles.attRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.attBadgeRow}>
                      <Badge label={rec.courseCode} variant="primary" />
                      <Badge
                        label={rec.total > 0 ? rec.status.toUpperCase() : 'NOT MARKED'}
                        variant={
                          rec.total === 0
                            ? 'info'
                            : rec.status === 'safe'
                            ? 'success'
                            : rec.status === 'warning'
                            ? 'warning'
                            : 'danger'
                        }
                      />
                    </View>
                    <Text style={[styles.courseTitle, { color: colors.text, marginTop: 4 }]}>
                      {rec.courseTitle}
                    </Text>
                    <Text style={[styles.slotMeta, { color: colors.textSecondary }]}>
                      Attended {rec.attended} of {rec.total} classes • Faculty: {rec.facultyName}
                    </Text>
                  </View>

                  <View style={styles.attMeterBox}>
                    <Text
                      style={[
                        styles.attPctText,
                        {
                          color:
                            rec.percentage >= 75
                              ? '#059669'
                              : rec.percentage >= 65
                              ? '#D97706'
                              : '#DC2626',
                        },
                      ]}
                    >
                      {rec.total > 0 ? `${rec.percentage}%` : '—'}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* ============================================================== */}
        {/* 3. EXAMINATION MARKS SEGMENT */}
        {/* ============================================================== */}
        {activeSegment === 'marks' && (
          <View>
            {role !== 'student' ? (
              /* ---- FACULTY / ADMIN VIEW: top scorer hero + student list ---- */
              <View>
                {/* Subject selector pills */}
                {facultySubjects.length > 1 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, marginBottom: 12 }}
                  >
                    {facultySubjects.map((code) => {
                      const isActive = code === facultyMarksSubject;
                      return (
                        <TouchableOpacity
                          key={code}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: isActive ? colors.primary : colors.card,
                            borderWidth: 1,
                            borderColor: isActive ? colors.primary : colors.border,
                          }}
                          onPress={() => setFacultyMarksSubject(code)}
                        >
                          <Text style={{ color: isActive ? '#FFF' : colors.text, fontWeight: '800', fontSize: 12 }}>
                            {code}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Top scorer hero card */}
                {facultyTopScorer && facultyTopScorer.mark && (
                  <Card
                    variant="elevated"
                    style={{
                      backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                      borderColor: '#7A3CFF',
                      borderWidth: 2,
                      marginBottom: 16,
                    }}
                  >
                    <View style={styles.marksHeroTop}>
                      <View>
                        <Text style={[styles.marksHeroTitle, { color: isDark ? '#DDD6FE' : '#4338CA' }]}>
                          🏆 Top Scorer — {facultyMarksSubject}
                        </Text>
                        <Text style={[styles.marksHeroSub, { color: isDark ? '#C4B5FD' : '#6366F1' }]}>
                          {facultyTopScorer.student.fullName} • {facultyTopScorer.student.rollNo}
                        </Text>
                      </View>
                      <Badge label={`Grade ${facultyTopScorer.mark.grade}`} variant="success" />
                    </View>
                    <View style={styles.marksScoreRow}>
                      <View style={styles.marksScoreItem}>
                        <Text style={[styles.marksScoreVal, { color: '#059669' }]}>
                          {facultyTopScorer.mark.totalMarks}/{facultyTopScorer.mark.maxMarks}
                        </Text>
                        <Text style={styles.marksScoreLbl}>Total Score</Text>
                      </View>
                      <View style={styles.marksDivider} />
                      <View style={styles.marksScoreItem}>
                        <Text style={[styles.marksScoreVal, { color: '#2563EB' }]}>
                          {facultyTopScorer.mark.percentage}%
                        </Text>
                        <Text style={styles.marksScoreLbl}>Percentage</Text>
                      </View>
                      <View style={styles.marksDivider} />
                      <View style={styles.marksScoreItem}>
                        <Text style={[styles.marksScoreVal, { color: '#D97706' }]}>
                          {facultyTopScorer.mark.status}
                        </Text>
                        <Text style={styles.marksScoreLbl}>Classification</Text>
                      </View>
                    </View>
                  </Card>
                )}

                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Student Marks • {facultyMarksSubject}
                  </Text>
                </View>

                {!examinationMarks.some((m) => m.courseCode === facultyMarksSubject) ? (
                  <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                    <Ionicons name="stats-chart-outline" size={36} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                      No Examination Records
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                      Exam marks will appear here once they are published by the portal.
                    </Text>
                  </Card>
                ) : facultySubjectStudentMarks.length === 0 ? (
                  <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                      No Students Found
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                      Add students from the portal to sync the examination marks record.
                    </Text>
                  </Card>
                ) : (
                  facultySubjectStudentMarks.map(({ student, mark }) => (
                    <Card
                      key={student.id}
                      style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 10 }}
                    >
                      <View style={styles.marksCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.attBadgeRow}>
                            <Badge label={student.rollNo || student.id} variant="primary" />
                            {mark && <Badge label={`Grade ${mark.grade}`} variant={mark.grade === 'O' || mark.grade === 'A+' ? 'success' : 'info'} />}
                          </View>
                          <Text style={[styles.courseTitle, { color: colors.text, marginTop: 4 }]}>
                            {student.fullName}
                          </Text>
                        </View>
                        {mark ? (
                          <View style={styles.totalBadge}>
                            <Text style={styles.totalScoreText}>{mark.totalMarks} / {mark.maxMarks}</Text>
                            <Text style={styles.totalPctText}>{mark.percentage}%</Text>
                          </View>
                        ) : (
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>No marks</Text>
                        )}
                      </View>
                      {mark && (
                        <View style={[styles.marksBreakdownStrip, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownVal, { color: colors.text }]}>{mark.internal1} / 25</Text>
                            <Text style={styles.breakdownLbl}>CIE Test 1</Text>
                          </View>
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownVal, { color: colors.text }]}>{mark.internal2} / 25</Text>
                            <Text style={styles.breakdownLbl}>CIE Test 2</Text>
                          </View>
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownVal, { color: colors.text }]}>{mark.labInternal} / 25</Text>
                            <Text style={styles.breakdownLbl}>Lab / CTA</Text>
                          </View>
                          <View style={styles.breakdownItem}>
                            <Text style={[styles.breakdownVal, { color: '#059669' }]}>{mark.externalExam} / 100</Text>
                            <Text style={styles.breakdownLbl}>Final Exam</Text>
                          </View>
                        </View>
                      )}
                    </Card>
                  ))
                )}
              </View>
            ) : (
              /* ---- STUDENT VIEW: original grade card + marks list ---- */
              <View>
            {/* Scorecard Hero Banner */}
            <Card
              variant="elevated"
              style={{
                backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                borderColor: '#7A3CFF',
                borderWidth: 2,
                marginBottom: 16,
              }}
            >
              <View style={styles.marksHeroTop}>
                <View>
                  <Text style={[styles.marksHeroTitle, { color: isDark ? '#DDD6FE' : '#4338CA' }]}>
                    Semester Examination Grade Card
                  </Text>
                  <Text style={[styles.marksHeroSub, { color: isDark ? '#C4B5FD' : '#6366F1' }]}>
                    VTU Autonomous Credit System • 4th Semester
                  </Text>
                </View>
                <Badge label="VERIFIED • COE" variant="success" />
              </View>

              <View style={styles.marksScoreRow}>
                <View style={styles.marksScoreItem}>
                  <Text style={[styles.marksScoreVal, { color: '#059669' }]}>
                    {user.cgpa || 8.84}
                  </Text>
                  <Text style={styles.marksScoreLbl}>Cumulative CGPA</Text>
                </View>
                <View style={styles.marksDivider} />
                <View style={styles.marksScoreItem}>
                  <Text style={[styles.marksScoreVal, { color: '#2563EB' }]}>
                    {overallMarksPct}%
                  </Text>
                  <Text style={styles.marksScoreLbl}>Aggregate Score</Text>
                </View>
                <View style={styles.marksDivider} />
                <View style={styles.marksScoreItem}>
                  <Text style={[styles.marksScoreVal, { color: '#D97706' }]}>Distinction</Text>
                  <Text style={styles.marksScoreLbl}>Classification</Text>
                </View>
              </View>
            </Card>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Subject-Wise Internal & External Marks
              </Text>
            </View>

            {activeStudentMarks.length === 0 ? (
              <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 24, alignItems: 'center' }}>
                <Ionicons name="stats-chart-outline" size={36} color={colors.textSecondary} style={{ marginBottom: 8 }} />
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
                  No Examination Records
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
                  Exam marks will appear here once your faculty publishes them.
                </Text>
              </Card>
            ) : (
            activeStudentMarks.map((mrk) => (
              <Card
                key={mrk.id}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 12,
                }}
              >
                <View style={styles.marksCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.attBadgeRow}>
                      <Badge label={mrk.courseCode} variant="primary" />
                      <Badge
                        label={`Grade ${mrk.grade}`}
                        variant={mrk.grade === 'O' || mrk.grade === 'A+' ? 'success' : 'info'}
                      />
                    </View>
                    <Text style={[styles.courseTitle, { color: colors.text, marginTop: 4 }]}>
                      {mrk.courseTitle}
                    </Text>
                  </View>

                  <View style={styles.totalBadge}>
                    <Text style={styles.totalScoreText}>
                      {mrk.totalMarks} / {mrk.maxMarks}
                    </Text>
                    <Text style={styles.totalPctText}>{mrk.percentage}%</Text>
                  </View>
                </View>

                {/* Score breakdown strip */}
                <View style={[styles.marksBreakdownStrip, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}>
                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownVal, { color: colors.text }]}>
                      {mrk.internal1} / 25
                    </Text>
                    <Text style={styles.breakdownLbl}>CIE Test 1</Text>
                  </View>

                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownVal, { color: colors.text }]}>
                      {mrk.internal2} / 25
                    </Text>
                    <Text style={styles.breakdownLbl}>CIE Test 2</Text>
                  </View>

                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownVal, { color: colors.text }]}>
                      {mrk.labInternal} / 25
                    </Text>
                    <Text style={styles.breakdownLbl}>Lab / CTA</Text>
                  </View>

                  <View style={styles.breakdownItem}>
                    <Text style={[styles.breakdownVal, { color: '#059669' }]}>
                      {mrk.externalExam} / 100
                    </Text>
                    <Text style={styles.breakdownLbl}>Final Exam</Text>
                  </View>
                </View>
              </Card>
            ))
            )}
          </View>
            )}
          </View>
        )}

        {/* ============================================================== */}
        {/* 4. ASSIGNMENTS SEGMENT (SUBJECT GROUPED) */}
        {/* ============================================================== */}
        {activeSegment === 'assignments' && (() => {
          // Extract unique subjects from timetable
          const subjectMap = new Map<string, { code: string; title: string }>();
          timetable.forEach((s) => {
            const code = s.courseCode?.trim().toUpperCase();
            if (code && !subjectMap.has(code)) {
              subjectMap.set(code, { code, title: s.courseTitle || code });
            }
          });
          const subjects = Array.from(subjectMap.values());

          // Faculty only see assignments for the subjects they handle
          const visibleSubjects =
            role === 'faculty'
              ? subjects.filter((s) => facultySubjects.includes(s.code))
              : subjects;
          const visibleAssignments =
            role === 'faculty'
              ? assignments.filter(
                  (a) =>
                    facultySubjects.includes(a.courseCode?.trim().toUpperCase()) ||
                    isSameFacultyName(a.facultyName, user.fullName)
                )
              : assignments;

          // Group assignments by courseCode
          const groups: { code: string; title: string; items: typeof assignments }[] = [];
          const matchedIds = new Set<string>();

          visibleSubjects.forEach((sub) => {
            const items = visibleAssignments.filter((a) => {
              const m = a.courseCode?.trim().toUpperCase() === sub.code;
              if (m) matchedIds.add(a.id);
              return m;
            });
            groups.push({ code: sub.code, title: sub.title, items });
          });

          // Others group (hidden for faculty so only their subjects show)
          const others = visibleAssignments.filter((a) => !matchedIds.has(a.id));
          if (role !== 'faculty' && (others.length > 0 || groups.length === 0)) {
            groups.push({
              code: 'Others',
              title: 'General & Extra Coursework',
              items: others,
            });
          }

          return (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Course Assignments ({visibleAssignments.length})
                </Text>
                {role === 'faculty' && (
                  <TouchableOpacity
                    style={styles.smallActionBtn}
                    onPress={() => {
                      // Pre-select faculty's own subject if available
                      const mySlot = timetable.find((s) =>
                        isSameFacultyName(s.facultyName, user.fullName)
                      );
                      setNewAsgCourse(mySlot ? mySlot.courseCode : (visibleSubjects[0]?.code || 'Others'));
                      setCreateAsgModal(true);
                    }}
                  >
                    <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.smallActionBtnText}>Add Assignment</Text>
                  </TouchableOpacity>
                )}
              </View>

              {groups.map((grp) => {
                const isExpanded = expandedAsgSubject === grp.code;
                return (
                  <View
                    key={grp.code}
                    style={[
                      styles.asgSubjectBlock,
                      {
                        backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                        borderColor: isExpanded ? colors.primary : colors.cardBorder,
                      },
                    ]}
                  >
                    {/* Collapsible Subject Block Header */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        LayoutAnimation.configureNext({
                          duration: 250,
                          create: { type: 'easeInEaseOut', property: 'opacity' },
                          update: { type: 'spring', springDamping: 0.75 },
                          delete: { type: 'easeInEaseOut', property: 'opacity' },
                        });
                        setExpandedAsgSubject(isExpanded ? null : grp.code);
                      }}
                      style={styles.asgBlockHeader}
                    >
                      <View
                        style={[
                          styles.asgIconBox,
                          {
                            backgroundColor:
                              grp.code === 'Others'
                                ? isDark ? '#3F3F46' : '#F4F4F5'
                                : isDark ? '#1E3A8A' : '#EFF6FF',
                          },
                        ]}
                      >
                        <Ionicons
                          name={grp.code === 'Others' ? 'folder-outline' : 'book-outline'}
                          size={20}
                          color={grp.code === 'Others' ? '#71717A' : '#2563EB'}
                        />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 10 }}>
                        <View style={styles.asgBlockTitleRow}>
                          <Text style={[styles.asgBlockCode, { color: colors.text }]}>
                            {grp.code}
                          </Text>
                          <Badge
                            label={`${grp.items.length} ${grp.items.length === 1 ? 'task' : 'tasks'}`}
                            variant={grp.items.length > 0 ? 'primary' : 'neutral'}
                            size="small"
                          />
                        </View>
                        <Text style={[styles.asgBlockTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                          {grp.title}
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.textSecondary}
                        style={{ marginLeft: 8 }}
                      />
                    </TouchableOpacity>

                    {/* Expanded Assignment List */}
                    {isExpanded && (
                      <Animated.View entering={FadeInDown.duration(200)} style={styles.asgSubList}>
                        {grp.items.length === 0 ? (
                          <Text style={[styles.asgEmptyText, { color: colors.textSecondary }]}>
                            No assignments posted for this subject yet.
                          </Text>
                        ) : (
                          grp.items.map((asg) => (
                            <Card
                              key={asg.id}
                              style={{
                                backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                                borderColor: colors.cardBorder,
                                marginBottom: 10,
                              }}
                            >
                              <View style={styles.asgHeader}>
                                <Badge label={asg.courseCode} variant="primary" size="small" />
                                <Badge
                                  label={asg.status.toUpperCase()}
                                  variant={
                                    asg.status === 'graded'
                                      ? 'success'
                                      : asg.status === 'submitted'
                                      ? 'info'
                                      : 'warning'
                                  }
                                  size="small"
                                />
                              </View>

                              <Text style={[styles.courseTitle, { color: colors.text, marginTop: 6 }]}>
                                {asg.title}
                              </Text>
                              <Text style={[styles.slotMeta, { color: colors.textSecondary }]}>
                                Faculty: {asg.facultyName}
                              </Text>
                              <Text style={[styles.asgDesc, { color: colors.textSecondary }]}>
                                {asg.description}
                              </Text>

                              {asg.marksObtained != null && (
                                <View style={[styles.feedbackBox, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                                  <Text style={[styles.feedbackScore, { color: colors.primary }]}>
                                    Graded: {asg.marksObtained}/{asg.maxMarks} marks
                                  </Text>
                                  {asg.feedback ? (
                                    <Text style={[styles.feedbackText, { color: colors.textSecondary }]}>
                                      &ldquo;{asg.feedback}&rdquo;
                                    </Text>
                                  ) : null}
                                </View>
                              )}

                              <View style={styles.asgFooterRow}>
                                <View style={styles.dueRow}>
                                  <Ionicons name="time-outline" size={14} color="#EF4444" />
                                  <Text style={styles.dueText}>Due: {asg.dueDate}</Text>
                                </View>

                                {role === 'student' && asg.status === 'pending' && (
                                  <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={() => {
                                      setSelectedAsgId(asg.id);
                                      setSubmitModal(true);
                                    }}
                                  >
                                    <Ionicons name="cloud-upload" size={14} color="#FFFFFF" />
                                    <Text style={styles.submitBtnText}>Submit (+50 XP)</Text>
                                  </TouchableOpacity>
                                )}

                                {role === 'faculty' && (
                                  <TouchableOpacity
                                    style={[
                                      styles.submitBtn,
                                      {
                                        backgroundColor: asg.status === 'graded' ? '#059669' : '#4F46E5',
                                      },
                                    ]}
                                    onPress={() => handleOpenGradeModal(asg)}
                                  >
                                    <Ionicons
                                      name={asg.status === 'graded' ? 'checkmark-circle' : 'create-outline'}
                                      size={14}
                                      color="#FFFFFF"
                                    />
                                    <Text style={styles.submitBtnText}>
                                      {asg.status === 'graded'
                                        ? `Graded (${asg.marksObtained}/${asg.maxMarks})`
                                        : 'Evaluate & Grade'}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </Card>
                          ))
                        )}
                      </Animated.View>
                    )}
                  </View>
                );
              })}
            </View>
          );
        })()}

        {/* ============================================================== */}
        {/* 5. STUDY MATERIALS & PYQS */}
        {/* ============================================================== */}
        {activeSegment === 'materials' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                All Study Materials & PYQs ({studyMaterials.length})
              </Text>
            </View>

            {studyMaterials.map((mat) => (
              <Card
                key={mat.id}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 12,
                }}
              >
                <View style={styles.matRow}>
                  <View style={[styles.matIconBox, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="document-text" size={24} color="#EF4444" />
                    <Text style={styles.matExt}>{mat.fileType}</Text>
                  </View>

                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <View style={styles.attBadgeRow}>
                      <Badge label={mat.category} variant="primary" size="small" />
                      <Text style={[styles.courseCode, { color: colors.primary }]}>
                        {mat.courseCode}
                      </Text>
                    </View>
                    <Text style={[styles.matTitle, { color: colors.text }]}>{mat.title}</Text>
                    <Text style={[styles.slotMeta, { color: colors.textSecondary }]}>
                      {mat.fileSize} • Uploaded by {mat.uploadedBy}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.openDocBtn}
                    onPress={() => handleOpenMaterial(mat)}
                  >
                    <Ionicons name="eye-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* Assignment Submit Modal */}
      <Modal
        visible={submitModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSubmitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Submit Assignment</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Add an optional submission note or link for the faculty.
            </Text>

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. Completed Knapsack dynamic programming implementation in C++..."
              placeholderTextColor={colors.textSecondary}
              value={submissionNote}
              onChangeText={setSubmissionNote}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setSubmitModal(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmSubmit}
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Confirm Submission</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Faculty Attendance Roster Modal — instant Present/Absent per student */}
      <Modal
        visible={rosterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRosterModal(false)}
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
                  Mark Attendance
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {selectedCourseRoster?.courseCode}: {selectedCourseRoster?.courseTitle} — tap to mark instantly
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRosterModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {students.map((st) => {
                const isExpanded = markingStudentId === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.rosterStudentRow,
                      {
                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                        borderColor: isExpanded ? colors.primary : colors.cardBorder,
                      },
                    ]}
                    onPress={() => setMarkingStudentId(isExpanded ? null : st.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.rosterAvatar, { backgroundColor: '#7A3CFF' }]}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                        {st.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, paddingHorizontal: 10 }}>
                      <Text style={[styles.rosterStudentName, { color: colors.text }]}>{st.fullName}</Text>
                      <Text style={[styles.rosterStudentMeta, { color: colors.textSecondary }]}>
                        Roll: {st.rollNo || st.id}
                      </Text>
                      {isExpanded && (
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#059669', paddingVertical: 7, borderRadius: 6 }}
                            onPress={() => handleMarkStudent(st.id, true)}
                          >
                            <Ionicons name="checkmark-circle" size={15} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Present</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#DC2626', paddingVertical: 7, borderRadius: 6 }}
                            onPress={() => handleMarkStudent(st.id, false)}
                          >
                            <Ionicons name="close-circle" size={15} color="#FFF" />
                            <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 12 }}>Absent</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setRosterModal(false)}
              style={[styles.confirmBtn, { backgroundColor: colors.primary, alignSelf: 'flex-end', marginTop: 14 }]}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assignment Evaluation / Grader Modal (Faculty) */}
      <Modal
        visible={gradeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setGradeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Grade Student Submission</Text>
              <TouchableOpacity onPress={() => setGradeModal(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {gradingAsg?.courseCode}: {gradingAsg?.title}
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>
              Score Awarded (Max: {gradingAsg?.maxMarks || 25})
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={`Enter marks (0 - ${gradingAsg?.maxMarks || 25})`}
              placeholderTextColor={colors.textSecondary}
              value={gradeScore}
              onChangeText={setGradeScore}
              keyboardType="numeric"
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Faculty Feedback / Remarks</Text>
            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. Good implementation, clean structure and logic..."
              placeholderTextColor={colors.textSecondary}
              value={gradeFeedback}
              onChangeText={setGradeFeedback}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setGradeModal(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmGrade}
                style={[styles.confirmBtn, { backgroundColor: '#4F46E5' }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Allot Grade</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Assignment Modal (Faculty) */}
      <Modal
        visible={createAsgModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateAsgModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create Assignment</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Publish a new coursework task to student academic portal.
            </Text>

            {facultySubjects.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, marginBottom: 10 }}
              >
                {facultySubjects.map((code) => {
                  const active = newAsgCourse.trim().toUpperCase() === code;
                  return (
                    <TouchableOpacity
                      key={code}
                      onPress={() => setNewAsgCourse(code)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: active ? colors.primary : isDark ? '#1F2937' : '#F1F5F9',
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                      }}
                    >
                      <Text style={{ color: active ? '#FFFFFF' : colors.text, fontWeight: '800', fontSize: 11 }}>
                        {code}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder={
                facultySubjects.length > 0
                  ? 'Pick a subject chip above'
                  : 'Course Code (e.g. BCS401 or Others)'
              }
              placeholderTextColor={colors.textSecondary}
              value={newAsgCourse}
              onChangeText={setNewAsgCourse}
              editable={facultySubjects.length === 0}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Assignment Title (e.g. Graph Algorithms Benchmark)"
              placeholderTextColor={colors.textSecondary}
              value={newAsgTitle}
              onChangeText={setNewAsgTitle}
            />

            <TextInput
              style={[
                styles.noteInput,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Description & instructions..."
              placeholderTextColor={colors.textSecondary}
              value={newAsgDesc}
              onChangeText={setNewAsgDesc}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                onPress={() => setCreateAsgModal(false)}
                style={[styles.cancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCreateAssignment}
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Publish Assignment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  segmentContainer: {
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  segmentScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  segmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  segmentText: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  daySelectorRow: {
    gap: 8,
    marginBottom: 14,
  },
  dayPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '800',
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeColumn: {
    alignItems: 'center',
    minWidth: 70,
    gap: 3,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  timeSub: {
    fontSize: 10,
  },
  slotDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 12,
  },
  slotDetails: {
    flex: 1,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: '800',
  },
  courseTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  slotMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  attRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  attMeterBox: {
    alignItems: 'center',
    paddingLeft: 12,
  },
  attPctText: {
    fontSize: 20,
    fontWeight: '900',
  },
  facultyMarkRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  attBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  marksHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  marksHeroTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  marksHeroSub: {
    fontSize: 11,
    marginTop: 1,
  },
  marksScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(122, 60, 255, 0.2)',
  },
  marksScoreItem: {
    alignItems: 'center',
  },
  marksScoreVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  marksScoreLbl: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  marksDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#CBD5E1',
  },
  marksCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalBadge: {
    alignItems: 'flex-end',
    paddingLeft: 10,
  },
  totalScoreText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#7A3CFF',
  },
  totalPctText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  marksBreakdownStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 10,
  },
  breakdownItem: {
    alignItems: 'center',
  },
  breakdownVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  breakdownLbl: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 1,
  },
  asgSubjectBlock: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  asgBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  asgIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  asgBlockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  asgBlockCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  asgBlockTitle: {
    fontSize: 12,
  },
  asgSubList: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 4,
  },
  asgEmptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 10,
    textAlign: 'center',
  },
  asgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  asgDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 6,
  },
  asgFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4F46E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  smallActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matExt: {
    fontSize: 8,
    fontWeight: '900',
    color: '#EF4444',
  },
  matTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  openDocBtn: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    maxHeight: 90,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  confirmBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  feedbackBox: {
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  feedbackScore: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2,
  },
  feedbackText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  smallQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  rosterStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rosterAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rosterStudentName: {
    fontSize: 13,
    fontWeight: '800',
  },
  rosterStudentMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  rosterToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
