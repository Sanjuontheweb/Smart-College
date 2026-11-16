import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  TimetableSlot,
  AttendanceRecord,
  Assignment,
  StudyMaterial,
  Announcement,
  CampusEvent,
  Opportunity,
  Quest,
  BadgeItem,
  LeaderboardUser,
  ForumPost,
  UserProfile,
  SAMPLE_BADGES,
  SAMPLE_DISCUSSIONS,
  SAMPLE_TIMETABLE,
  SAMPLE_ATTENDANCE,
  SAMPLE_ASSIGNMENTS,
  SAMPLE_STUDY_MATERIALS,
  SAMPLE_ANNOUNCEMENTS,
  SAMPLE_EVENTS,
  SAMPLE_OPPORTUNITIES,
  SAMPLE_QUESTS,
} from '@/constants/CampusData';
import {
  LocalCampusDB,
  ExaminationMark,
  ClubItem,
  CalendarEventItem,
  StudentOpportunityRecord,
  EventRegistrationRecord,
  StudentProgressRecord,
} from '@/services/localDb';
import { scheduleAcademicPushNotifications } from '@/services/notificationService';
import { normalizeDayName } from '@/utils/lectureUtils';
import { useAuth } from '@/context/AuthContext';

interface CampusDataContextType {
  timetable: TimetableSlot[];
  calendarEvents: CalendarEventItem[];
  attendance: AttendanceRecord[];
  examinationMarks: ExaminationMark[];
  assignments: Assignment[];
  studyMaterials: StudyMaterial[];
  announcements: Announcement[];
  events: CampusEvent[];
  opportunities: Opportunity[];
  studentOpportunities: StudentOpportunityRecord[];
  eventRegistrations: EventRegistrationRecord[];
  studentProgress: StudentProgressRecord[];
  quests: Quest[];
  badges: BadgeItem[];
  leaderboard: LeaderboardUser[];
  discussions: ForumPost[];
  clubs: ClubItem[];
  faculties: UserProfile[];
  students: UserProfile[];
  totalXP: number;
  studentAttendanceMap: Record<string, Record<string, { attended: number; total: number }>>;
  getStudentAttendanceRecords: (studentId: string, fallbackToCourse?: boolean) => AttendanceRecord[];
  getStudentExaminationMarks: (studentId: string) => ExaminationMark[];
  getStudentProgress: (studentId?: string) => StudentProgressRecord;

  // Actions
  refreshAllData: () => Promise<void>;
  markAttendance: (courseCode: string, isPresent: boolean) => void;
  markStudentAttendance: (studentId: string, courseCode: string, isPresent: boolean) => Promise<void>;
  updateStudentAttendanceRecord: (studentId: string, courseCode: string, attended: number, total: number) => Promise<void>;
  updateStudentExamMark: (mark: ExaminationMark) => Promise<void>;
  submitAssignment: (assignmentId: string, submissionNote: string) => void;
  gradeAssignment: (assignmentId: string, marks: number, feedback: string) => void;
  createAssignment: (newAsg: Omit<Assignment, 'id' | 'status'>) => void;
  uploadStudyMaterial: (newMat: Omit<StudyMaterial, 'id' | 'date'>) => void;
  createAnnouncement: (newAnc: Omit<Announcement, 'id' | 'date'>) => void;
  toggleRegisterEvent: (eventId: string) => void;
  updateCampusEvent: (eventId: string, updates: Partial<CampusEvent>) => Promise<void>;
  applyOpportunity: (oppId: string, studentId?: string, studentName?: string, rollNo?: string) => Promise<void>;
  updateOpportunityStatus: (studentId: string, oppId: string, status: 'applied' | 'accepted' | 'rejected') => Promise<void>;
  updateStudentSkillsAndExperience: (studentId: string, oppId: string, skills: string[], experience: string) => Promise<void>;
  joinClub: (clubId: string, userId: string) => Promise<{ isJoined: boolean; welcomeMessage?: string; clubName: string }>;
  createDiscussionPost: (title: string, body: string, tags: string[], author: string, role: string, clubId?: string) => void;
  addDiscussionReply: (postId: string, replyText: string, author: string, isVerified?: boolean) => void;
  claimQuestXP: (questId: string) => void;
  updateTimetable: (slots: TimetableSlot[]) => Promise<void>;
  updateSubjectDetails: (
    oldCode: string,
    updates: { courseCode: string; courseTitle: string; facultyName?: string }
  ) => Promise<void>;
  deleteSubject: (courseCode: string) => Promise<void>;
  updateCalendarEvents: (events: CalendarEventItem[]) => Promise<void>;
}

const CampusDataContext = createContext<CampusDataContextType>({} as CampusDataContextType);

export const CampusDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableSlot[]>(SAMPLE_TIMETABLE);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(SAMPLE_ATTENDANCE);
  const [studentAttendanceData, setStudentAttendanceData] = useState<Record<string, Record<string, { attended: number; total: number }>>>({});
  const [examinationMarks, setExaminationMarks] = useState<ExaminationMark[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>(SAMPLE_ASSIGNMENTS);
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(SAMPLE_STUDY_MATERIALS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(SAMPLE_ANNOUNCEMENTS);
  const [events, setEvents] = useState<CampusEvent[]>(SAMPLE_EVENTS);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(SAMPLE_OPPORTUNITIES);
  const [studentOpportunities, setStudentOpportunities] = useState<StudentOpportunityRecord[]>([]);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistrationRecord[]>([]);
  const [studentProgress, setStudentProgress] = useState<StudentProgressRecord[]>([]);
  const [questTemplates, setQuestTemplates] = useState<Quest[]>(SAMPLE_QUESTS);
  const [clubs, setClubs] = useState<ClubItem[]>([]);
  const [faculties, setFaculties] = useState<UserProfile[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [discussions, setDiscussions] = useState<ForumPost[]>(SAMPLE_DISCUSSIONS);

  const refreshAllData = async () => {
    try {
      await LocalCampusDB.init();
      const [
        tt,
        cal,
        att,
        mrks,
        asgs,
        mats,
        ancs,
        evts,
        opps,
        qsts,
        clbs,
        facs,
        stdAtt,
        stdOpps,
        regs,
        prog,
        stds,
      ] = await Promise.all([
        LocalCampusDB.getTimetable(),
        LocalCampusDB.getCalendarEvents(),
        LocalCampusDB.getAttendance(),
        LocalCampusDB.getExaminationMarks(),
        LocalCampusDB.getAssignments(),
        LocalCampusDB.getStudyMaterials(),
        LocalCampusDB.getAnnouncements(),
        LocalCampusDB.getCampusEvents(),
        LocalCampusDB.getInternships(),
        LocalCampusDB.getQuests(),
        LocalCampusDB.getClubs(),
        LocalCampusDB.getFaculties(),
        LocalCampusDB.getStudentAttendance(),
        LocalCampusDB.getStudentOpportunities(),
        LocalCampusDB.getEventRegistrations(),
        LocalCampusDB.getStudentProgressRecords(),
        LocalCampusDB.getStudents(),
      ]);

      setTimetable(tt);
      setCalendarEvents(cal);
      setAttendance(att);
      setExaminationMarks(mrks);
      setAssignments(asgs);
      setStudyMaterials(mats);
      setAnnouncements(ancs);
      setEvents(evts);
      setOpportunities(opps);
      setQuestTemplates(qsts);
      setClubs(clbs);
      setFaculties(facs);
      setStudentAttendanceData(stdAtt || {});
      setStudentOpportunities(stdOpps || []);
      setEventRegistrations(regs || []);
      setStudentProgress(prog || []);
      setStudents(stds || []);

      // Auto-schedule push notifications for internals, externals, assignments
      scheduleAcademicPushNotifications().catch(() => {});
    } catch (e) {
      console.warn('[CampusDataContext] Load error:', e);
    }
  };

  useEffect(() => {
    refreshAllData();
  }, []);

  const getStudentProgress = (studentId?: string): StudentProgressRecord => {
    const id = studentId || user.id;
    const found = studentProgress.find((r) => r.studentId === id);
    if (found) return found;
    const profile = id === user.id ? user : students.find((s) => s.id === id);
    const badgeCount = profile?.badgeCount ?? 0;
    return {
      id: `prog_${id}`,
      studentId: id,
      studentName: profile?.fullName || 'Student',
      studentRollNo: profile?.rollNo,
      department: profile?.department,
      xp: profile?.xpPoints ?? 0,
      quests: SAMPLE_QUESTS.map((q) => ({ ...q })),
      badges: SAMPLE_BADGES.map((b, bi) => ({ ...b, unlocked: bi < badgeCount })),
    };
  };

  // Single source of truth for students is the same collection the Portal edits
  const studentProgressList = useMemo<StudentProgressRecord[]>(() => {
    const list = students
      .filter((s) => s.role === 'student')
      .map((s) => {
        const rec = getStudentProgress(s.id);
        return {
          ...rec,
          studentName: s.fullName,
          studentRollNo: s.rollNo,
          department: s.department,
        } as StudentProgressRecord;
      });
    if (user.role === 'student' && !list.some((r) => r.studentId === user.id)) {
      list.push(getStudentProgress(user.id));
    }
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, studentProgress, user]);

  const activeProgress = useMemo(
    () => getStudentProgress(user.id),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentProgress, user, students]
  );

  const isStudentRole = user.role === 'student';
  const quests = useMemo<Quest[]>(() => {
    if (!isStudentRole) return questTemplates;
    return questTemplates.map((template) => {
      const rec = activeProgress.quests.find((q) => q.id === template.id);
      return {
        ...template,
        progress: rec?.progress ?? 0,
        completed: rec?.completed ?? false,
      };
    });
  }, [isStudentRole, questTemplates, activeProgress]);
  const badges = isStudentRole ? activeProgress.badges : SAMPLE_BADGES;
  const totalXP = isStudentRole ? activeProgress.xp : 0;

  const leaderboard = useMemo<LeaderboardUser[]>(
    () =>
      [...studentProgressList]
        .sort((a, b) => b.xp - a.xp)
        .map((r, idx) => ({
          rank: idx + 1,
          name: r.studentId === user.id ? `${r.studentName} (You)` : r.studentName,
          rollNo: r.studentRollNo || '—',
          department: r.department || 'CSE',
          xp: r.xp,
          badgeName: r.badges.find((b) => b.unlocked)?.name || 'No badges yet',
        })),
    [studentProgressList, user.id]
  );

  const saveProgressRecords = (next: StudentProgressRecord[]) => {
    setStudentProgress(next);
    LocalCampusDB.setStudentProgressRecords(next).catch(() => {});
  };

  const addXP = (amount: number) => {
    const current = getStudentProgress(user.id);
    const exists = studentProgress.some((r) => r.studentId === user.id);
    const next = exists
      ? studentProgress.map((r) => (r.studentId === user.id ? { ...r, xp: r.xp + amount } : r))
      : [...studentProgress, { ...current, xp: current.xp + amount }];
    saveProgressRecords(next);
  };

  const markAttendance = (courseCode: string, isPresent: boolean) => {
    setAttendance((prev) => {
      const updated = prev.map((rec) => {
        if (rec.courseCode === courseCode) {
          const newAttended = isPresent ? rec.attended + 1 : rec.attended;
          const newTotal = rec.total + 1;
          const pct = Math.round((newAttended / newTotal) * 1000) / 10;
          return {
            ...rec,
            attended: newAttended,
            total: newTotal,
            percentage: pct,
            status: (pct >= 75 ? 'safe' : pct >= 65 ? 'warning' : 'critical') as any,
          };
        }
        return rec;
      });
      LocalCampusDB.setAttendance(updated);
      return updated;
    });
  };

  const markStudentAttendance = async (studentId: string, courseCode: string, isPresent: boolean) => {
    await LocalCampusDB.markStudentAttendance(studentId, courseCode, isPresent);
    setStudentAttendanceData((prev) => {
      const studentMap = prev[studentId] || {};
      const prevCourse = studentMap[courseCode] ?? { attended: 0, total: 0 };
      return {
        ...prev,
        [studentId]: {
          ...studentMap,
          [courseCode]: {
            attended: prevCourse.attended + (isPresent ? 1 : 0),
            total: prevCourse.total + 1,
          },
        },
      };
    });
  };

  const updateStudentAttendanceRecord = async (
    studentId: string,
    courseCode: string,
    attended: number,
    total: number
  ) => {
    await LocalCampusDB.setStudentCourseAttendance(studentId, courseCode, attended, total);
    setStudentAttendanceData((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [courseCode]: { attended, total },
      },
    }));
  };

  const updateStudentExamMark = async (updatedMark: ExaminationMark) => {
    setExaminationMarks((prev) => {
      const exists = prev.some(
        (m) =>
          m.id === updatedMark.id ||
          (m.studentId === updatedMark.studentId && m.courseCode === updatedMark.courseCode)
      );
      let next: ExaminationMark[];
      if (exists) {
        next = prev.map((m) =>
          m.id === updatedMark.id ||
          (m.studentId === updatedMark.studentId && m.courseCode === updatedMark.courseCode)
            ? updatedMark
            : m
        );
      } else {
        next = [updatedMark, ...prev];
      }
      LocalCampusDB.setExaminationMarks(next).catch(() => {});
      return next;
    });
  };

  const getStudentAttendanceRecords = (
    studentId: string,
    fallbackToCourse = true
  ): AttendanceRecord[] => {
    const studentMap = studentAttendanceData[studentId] || {};
    return attendance.map((rec) => {
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
      if (!fallbackToCourse) {
        return {
          ...rec,
          studentId,
          attended: 0,
          total: 0,
          percentage: 0,
          status: 'warning' as any,
        };
      }
      return { ...rec, studentId };
    });
  };

  const getStudentExaminationMarks = (studentId: string): ExaminationMark[] =>
    examinationMarks.filter((m) => m.studentId === studentId);

  const submitAssignment = (assignmentId: string, submissionNote: string) => {
    setAssignments((prev) => {
      const updated = prev.map((a) => {
        if (a.id === assignmentId) {
          return {
            ...a,
            status: 'submitted' as const,
            submittedDate: 'Just now',
          };
        }
        return a;
      });
      LocalCampusDB.setAssignments(updated)
        .then(() => scheduleAcademicPushNotifications())
        .catch(() => {});
      return updated;
    });
    addXP(50);
  };

  const gradeAssignment = (assignmentId: string, marks: number, feedback: string) => {
    setAssignments((prev) => {
      const updated = prev.map((a) => {
        if (a.id === assignmentId) {
          return {
            ...a,
            status: 'graded' as const,
            marksObtained: marks,
            feedback,
          };
        }
        return a;
      });
      LocalCampusDB.setAssignments(updated)
        .then(() => scheduleAcademicPushNotifications())
        .catch(() => {});
      return updated;
    });
  };

  const createAssignment = (newAsg: Omit<Assignment, 'id' | 'status'>) => {
    const created: Assignment = {
      ...newAsg,
      id: `asg_${Date.now()}`,
      status: 'pending',
    };
    setAssignments((prev) => {
      const next = [created, ...prev];
      LocalCampusDB.setAssignments(next)
        .then(() => scheduleAcademicPushNotifications())
        .catch(() => {});
      return next;
    });
  };

  const uploadStudyMaterial = (newMat: Omit<StudyMaterial, 'id' | 'date'>) => {
    const created: StudyMaterial = {
      ...newMat,
      id: `mat_${Date.now()}`,
      date: 'Just now',
    };
    setStudyMaterials((prev) => {
      const next = [created, ...prev];
      LocalCampusDB.setStudyMaterials(next);
      return next;
    });
  };

  const createAnnouncement = (newAnc: Omit<Announcement, 'id' | 'date'>) => {
    const created: Announcement = {
      ...newAnc,
      id: `anc_${Date.now()}`,
      date: 'Just now',
    };
    setAnnouncements((prev) => {
      const next = [created, ...prev];
      LocalCampusDB.setAnnouncements(next);
      return next;
    });
  };

  const toggleRegisterEvent = (eventId: string) => {
    const existing = eventRegistrations.find(
      (r) => r.studentId === user.id && r.eventId === eventId
    );

    if (existing) {
      const next = eventRegistrations.filter(
        (r) => !(r.studentId === user.id && r.eventId === eventId)
      );
      setEventRegistrations(next);
      LocalCampusDB.setEventRegistrations(next).catch(() => {});
      setEvents((prev) => {
        const updated = prev.map((evt) =>
          evt.id === eventId
            ? { ...evt, registeredCount: Math.max(0, evt.registeredCount - 1) }
            : evt
        );
        LocalCampusDB.setCampusEvents(updated);
        return updated;
      });
      return;
    }

    const record: EventRegistrationRecord = {
      id: `${user.id}_${eventId}`,
      eventId,
      studentId: user.id,
      studentName: user.fullName,
      studentRollNo: user.rollNo,
      registeredAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    };
    const next = [record, ...eventRegistrations];
    setEventRegistrations(next);
    LocalCampusDB.setEventRegistrations(next).catch(() => {});
    setEvents((prev) => {
      const updated = prev.map((evt) =>
        evt.id === eventId ? { ...evt, registeredCount: evt.registeredCount + 1 } : evt
      );
      LocalCampusDB.setCampusEvents(updated);
      return updated;
    });
    addXP(30);
  };

  const updateCampusEvent = async (eventId: string, updates: Partial<CampusEvent>) => {
    const updated = events.map((evt) => (evt.id === eventId ? { ...evt, ...updates } : evt));
    setEvents(updated);
    await LocalCampusDB.setCampusEvents(updated);
  };


  const applyOpportunity = async (
    oppId: string,
    studentId?: string,
    studentName?: string,
    rollNo?: string
  ) => {
    const sId = studentId || 'usr_student_01';
    const sName = studentName || 'Aarav Sharma';
    const rec = await LocalCampusDB.applyOpportunity(sId, sName, oppId, rollNo);
    setStudentOpportunities((prev) => {
      const exists = prev.some((r) => r.studentId === sId && r.oppId === oppId);
      if (exists) return prev;
      return [rec, ...prev];
    });
    setOpportunities((prev) => {
      const updated = prev.map((opp) => (opp.id === oppId ? { ...opp, isApplied: true } : opp));
      LocalCampusDB.setInternships(updated);
      return updated;
    });
    addXP(40);
  };

  const updateOpportunityStatus = async (
    studentId: string,
    oppId: string,
    status: 'applied' | 'accepted' | 'rejected'
  ) => {
    await LocalCampusDB.updateOpportunityStatus(studentId, oppId, status);
    setStudentOpportunities((prev) =>
      prev.map((r) => (r.studentId === studentId && r.oppId === oppId ? { ...r, status } : r))
    );
  };

  const updateStudentSkillsAndExperience = async (
    studentId: string,
    oppId: string,
    skills: string[],
    experience: string
  ) => {
    await LocalCampusDB.updateStudentSkillsAndExperience(studentId, oppId, skills, experience);
    setStudentOpportunities((prev) =>
      prev.map((r) =>
        r.studentId === studentId && r.oppId === oppId
          ? { ...r, skillsDeveloped: skills, exposureExperience: experience }
          : r
      )
    );
  };

  const joinClub = async (
    clubId: string,
    userId: string
  ): Promise<{ isJoined: boolean; welcomeMessage?: string; clubName: string }> => {
    const res = await LocalCampusDB.joinClub(userId, clubId);
    setClubs((prev) =>
      prev.map((c) => {
        if (c.id === clubId) {
          const members = c.joinedMemberIds || [];
          const nextMembers = members.includes(userId) ? members : [...members, userId];
          return {
            ...c,
            isMember: true,
            members: members.includes(userId) ? c.members : (c.members || 0) + 1,
            joinedMemberIds: nextMembers,
          };
        }
        return c;
      })
    );
    addXP(25);
    return res;
  };

  const createDiscussionPost = (
    title: string,
    body: string,
    tags: string[],
    author: string,
    role: string,
    clubId?: string
  ) => {
    const newPost: ForumPost = {
      id: `disc_${Date.now()}`,
      title,
      body,
      tags: clubId ? [...tags, clubId] : tags,
      authorName: author,
      authorRole: role,
      likes: 0,
      repliesCount: 0,
      timeAgo: 'Just now',
      replies: [],
    };
    setDiscussions((prev) => [newPost, ...prev]);
    addXP(25);
  };

  const addDiscussionReply = (
    postId: string,
    replyText: string,
    author: string,
    isVerified?: boolean
  ) => {
    setDiscussions((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const newReply = {
            id: `rep_${Date.now()}`,
            authorName: author,
            authorRole: isVerified ? 'Faculty' : 'Student',
            text: replyText,
            timeAgo: 'Just now',
            isVerified,
          };
          const existingReplies = p.replies || [];
          return {
            ...p,
            repliesCount: p.repliesCount + 1,
            verifiedAnswer: isVerified ? `${author}: "${replyText}"` : p.verifiedAnswer,
            replies: [...existingReplies, newReply],
          };
        }
        return p;
      })
    );
    addXP(20);
  };

  const claimQuestXP = (questId: string) => {
    const current = getStudentProgress(user.id);
    const exists = studentProgress.some((r) => r.studentId === user.id);
    const base = exists ? studentProgress : [...studentProgress, current];
    const next = base.map((rec) => {
      if (rec.studentId !== user.id) return rec;
      const recQuest = rec.quests.find((q) => q.id === questId);
      const template = questTemplates.find((q) => q.id === questId);
      if (recQuest?.completed || (!recQuest && template?.completed)) return rec;
      const xpReward = recQuest?.xpReward ?? template?.xpReward;
      const maxProgress = recQuest?.maxProgress ?? template?.maxProgress ?? 1;
      if (!xpReward) return rec;
      const updatedQuest: Quest = {
        ...(recQuest || template)!,
        completed: true,
        progress: maxProgress,
      };
      const nextQuests = recQuest
        ? rec.quests.map((q) => (q.id === questId ? updatedQuest : q))
        : [...rec.quests, updatedQuest];
      return { ...rec, xp: rec.xp + xpReward, quests: nextQuests };
    });
    saveProgressRecords(next);
  };

  const updateTimetable = async (slots: TimetableSlot[]) => {
    const normalizedSlots = slots.map((slot) => ({
      ...slot,
      courseCode: (slot.courseCode || '').trim().toUpperCase(),
      courseTitle: (slot.courseTitle || '').trim(),
      day: normalizeDayName(slot.day) as TimetableSlot['day'],
    }));

    const previousCodes = new Set(
      timetable.map((s) => (s.courseCode || '').trim().toUpperCase()).filter(Boolean)
    );

    setTimetable(normalizedSlots);
    await LocalCampusDB.setTimetable(normalizedSlots);

    // Extract unique subjects from slots (courseCode + courseTitle + facultyName)
    const subjectMap = new Map<string, { courseCode: string; courseTitle: string; facultyName?: string }>();
    normalizedSlots.forEach((s) => {
      const code = s.courseCode;
      if (code && !subjectMap.has(code)) {
        subjectMap.set(code, {
          courseCode: code,
          courseTitle: s.courseTitle || code,
          facultyName: s.facultyName,
        });
      }
    });

    const uniqueSubjects = Array.from(subjectMap.values());
    const validCodes = new Set(uniqueSubjects.map((s) => s.courseCode));
    const removedCodes = new Set(Array.from(previousCodes).filter((code) => !validCodes.has(code)));

    if (uniqueSubjects.length > 0) {
      // Read fresh values from DB to avoid stale closure bugs
      const [currentAttendance, currentMarks, currentAssignments] = await Promise.all([
        LocalCampusDB.getAttendance(),
        LocalCampusDB.getExaminationMarks(),
        LocalCampusDB.getAssignments(),
      ]);

      // 1. Sync attendance subject rows (preserve stats, prune removed subjects)
      const nextAttendance: AttendanceRecord[] = uniqueSubjects.map((sub) => {
        const existing = currentAttendance.find(
          (a) => a.courseCode.toUpperCase() === sub.courseCode
        );
        if (existing) {
          return {
            ...existing,
            courseCode: sub.courseCode,
            courseTitle: sub.courseTitle || existing.courseTitle,
            facultyName: sub.facultyName || existing.facultyName,
          };
        }
        return {
          courseCode: sub.courseCode,
          courseTitle: sub.courseTitle,
          attended: 0,
          total: 0,
          percentage: 100,
          facultyName: sub.facultyName || 'Department Faculty',
          status: 'safe',
        };
      });
      setAttendance(nextAttendance);
      await LocalCampusDB.setAttendance(nextAttendance);

      // 2. Preserve existing exam marks, refresh metadata, prune only removed subjects
      const nextMarks: ExaminationMark[] = currentMarks
        .filter((m) => !removedCodes.has(m.courseCode.toUpperCase()))
        .map((m) => {
          const sub = subjectMap.get(m.courseCode.toUpperCase());
          if (!sub) return m;
          return { ...m, courseCode: sub.courseCode, courseTitle: sub.courseTitle || m.courseTitle };
        });
      setExaminationMarks(nextMarks);
      await LocalCampusDB.setExaminationMarks(nextMarks);

      // 2b. Prune assignments belonging to removed subjects
      if (removedCodes.size > 0) {
        const nextAssignments = currentAssignments.filter(
          (a) => !removedCodes.has(a.courseCode.toUpperCase())
        );
        setAssignments(nextAssignments);
        await LocalCampusDB.setAssignments(nextAssignments);
      }

      // 2c. Drop per-student attendance for removed subjects
      if (removedCodes.size > 0) {
        setStudentAttendanceData((prev) => {
          const next: Record<string, Record<string, { attended: number; total: number }>> = {};
          Object.entries(prev).forEach(([studentId, courses]) => {
            const cleaned: Record<string, { attended: number; total: number }> = {};
            Object.entries(courses).forEach(([code, stat]) => {
              if (!removedCodes.has(code.toUpperCase())) cleaned[code] = stat;
            });
            next[studentId] = cleaned;
          });
          LocalCampusDB.setStudentAttendance(next).catch(() => {});
          return next;
        });
      }

      // 3. Update Faculty Directory with faculties handling extracted subjects
      try {
        const existingFaculties = await LocalCampusDB.getFaculties();
        const facultyList = [...existingFaculties];

        normalizedSlots.forEach((s) => {
          const facultyName = s.facultyName?.trim();
          if (
            facultyName &&
            facultyName.toLowerCase() !== 'department faculty' &&
            facultyName.toLowerCase() !== 'faculty' &&
            facultyName.toLowerCase() !== 'faculty name'
          ) {
            const foundIdx = facultyList.findIndex(
              (f) => f.fullName.toLowerCase() === facultyName.toLowerCase()
            );
            if (foundIdx >= 0) {
              const fac = facultyList[foundIdx];
              const desc = fac.bio || '';
              if (!desc.includes(s.courseCode)) {
                facultyList[foundIdx] = {
                  ...fac,
                  bio: `${desc ? desc + ' • ' : ''}Handling ${s.courseCode} (${s.courseTitle})`,
                };
              }
            } else {
              const newFacId = `usr_fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              const safeName = facultyName.replace(/[^a-zA-Z]/g, '').toLowerCase();
              facultyList.push({
                id: newFacId,
                fullName: facultyName,
                email: `${safeName || 'faculty'}@smartcampus.edu`,
                role: 'faculty',
                department: 'Academic Faculty',
                designation: 'Assistant Professor',
                cabinLocation: s.room ? `Room ${s.room}` : 'Main Faculty Block',
                officeHours: 'Mon-Fri 2:00 PM - 4:00 PM',
                bio: `Handling ${s.courseCode} (${s.courseTitle})`,
              });
            }
          }
        });
        await LocalCampusDB.setFaculties(facultyList);
      } catch (fErr) {
        console.warn('[CampusData] Error updating faculties from timetable:', fErr);
      }
    }
  };

  /**
   * Rename / re-code a subject and cascade metadata everywhere instantly.
   */
  const updateSubjectDetails = async (
    oldCode: string,
    updates: { courseCode: string; courseTitle: string; facultyName?: string }
  ) => {
    const from = oldCode.trim().toUpperCase();
    const to = (updates.courseCode || oldCode).trim().toUpperCase();
    const title = (updates.courseTitle || '').trim() || to;
    const faculty = updates.facultyName?.trim();
    const codeChanged = from !== to;

    const nextTimetable = timetable.map((slot) =>
      (slot.courseCode || '').trim().toUpperCase() === from
        ? {
            ...slot,
            courseCode: to,
            courseTitle: title,
            ...(faculty ? { facultyName: faculty } : {}),
          }
        : slot
    );
    setTimetable(nextTimetable);
    await LocalCampusDB.setTimetable(nextTimetable);

    const nextAttendance = attendance.map((rec) =>
      rec.courseCode.trim().toUpperCase() === from
        ? {
            ...rec,
            courseCode: to,
            courseTitle: title,
            ...(faculty ? { facultyName: faculty } : {}),
          }
        : rec
    );
    setAttendance(nextAttendance);
    await LocalCampusDB.setAttendance(nextAttendance);

    const nextMarks = examinationMarks.map((mark) =>
      mark.courseCode.trim().toUpperCase() === from
        ? { ...mark, courseCode: to, courseTitle: title }
        : mark
    );
    setExaminationMarks(nextMarks);
    await LocalCampusDB.setExaminationMarks(nextMarks);

    const nextAssignments = assignments.map((asg) =>
      asg.courseCode.trim().toUpperCase() === from
        ? {
            ...asg,
            courseCode: to,
            courseTitle: title,
            ...(faculty ? { facultyName: faculty } : {}),
          }
        : asg
    );
    setAssignments(nextAssignments);
    await LocalCampusDB.setAssignments(nextAssignments);

    if (codeChanged) {
      setStudentAttendanceData((prev) => {
        const next: Record<string, Record<string, { attended: number; total: number }>> = {};
        Object.entries(prev).forEach(([studentId, courses]) => {
          const updated: Record<string, { attended: number; total: number }> = {};
          Object.entries(courses).forEach(([code, stat]) => {
            if (code.trim().toUpperCase() === from) {
              const existing = updated[to] || { attended: 0, total: 0 };
              updated[to] = {
                attended: existing.attended + stat.attended,
                total: existing.total + stat.total,
              };
            } else {
              updated[code] = stat;
            }
          });
          next[studentId] = updated;
        });
        LocalCampusDB.setStudentAttendance(next).catch(() => {});
        return next;
      });
    }
    scheduleAcademicPushNotifications().catch(() => {});
  };

  /**
   * Delete a subject with full cascade (timetable, attendance, marks, assignments).
   */
  const deleteSubject = async (courseCode: string) => {
    const code = courseCode.trim().toUpperCase();

    const nextTimetable = timetable.filter(
      (s) => (s.courseCode || '').trim().toUpperCase() !== code
    );
    setTimetable(nextTimetable);
    await LocalCampusDB.setTimetable(nextTimetable);

    const nextAttendance = attendance.filter((a) => a.courseCode.trim().toUpperCase() !== code);
    setAttendance(nextAttendance);
    await LocalCampusDB.setAttendance(nextAttendance);

    const nextMarks = examinationMarks.filter((m) => m.courseCode.trim().toUpperCase() !== code);
    setExaminationMarks(nextMarks);
    await LocalCampusDB.setExaminationMarks(nextMarks);

    const nextAssignments = assignments.filter((a) => a.courseCode.trim().toUpperCase() !== code);
    setAssignments(nextAssignments);
    await LocalCampusDB.setAssignments(nextAssignments);

    setStudentAttendanceData((prev) => {
      const next: Record<string, Record<string, { attended: number; total: number }>> = {};
      Object.entries(prev).forEach(([studentId, courses]) => {
        const cleaned: Record<string, { attended: number; total: number }> = {};
        Object.entries(courses).forEach(([c, stat]) => {
          if (c.trim().toUpperCase() !== code) cleaned[c] = stat;
        });
        next[studentId] = cleaned;
      });
      LocalCampusDB.setStudentAttendance(next).catch(() => {});
      return next;
    });
    scheduleAcademicPushNotifications().catch(() => {});
  };

  const updateCalendarEvents = async (eventsList: CalendarEventItem[]) => {
    setCalendarEvents(eventsList);
    await LocalCampusDB.setCalendarEvents(eventsList);
    scheduleAcademicPushNotifications().catch(() => {});
  };

  return (
    <CampusDataContext.Provider
      value={{
        timetable,
        calendarEvents,
        attendance,
        examinationMarks,
        assignments,
        studyMaterials,
        announcements,
        events,
        opportunities,
        studentOpportunities,
        eventRegistrations,
        studentProgress: studentProgressList,
        quests,
        badges,
        leaderboard,
        discussions,
        clubs,
        faculties,
        students,
        totalXP,
        studentAttendanceMap: studentAttendanceData,
        getStudentAttendanceRecords,
        getStudentExaminationMarks,
        getStudentProgress,
        refreshAllData,
        markAttendance,
        markStudentAttendance,
        updateStudentAttendanceRecord,
        updateStudentExamMark,
        submitAssignment,
        gradeAssignment,
        createAssignment,
        uploadStudyMaterial,
        createAnnouncement,
        toggleRegisterEvent,
        updateCampusEvent,
        applyOpportunity,
        updateOpportunityStatus,
        updateStudentSkillsAndExperience,
        joinClub,
        createDiscussionPost,
        addDiscussionReply,
        claimQuestXP,
        updateTimetable,
        updateSubjectDetails,
        deleteSubject,
        updateCalendarEvents,
      }}
    >
      {children}
    </CampusDataContext.Provider>
  );
};

export const useCampusData = () => useContext(CampusDataContext);
