import { Header } from '@/components/common/Header';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { NextLectureCard } from '@/components/ui/NextLectureCard';
import { AttendanceMeter } from '@/components/ui/ProgressRing';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { useAppTheme } from '@/context/ThemeContext';
import {
  getNextLectureInfo,
  getSlotLiveStatus,
  parseTimeToDate,
  isHoliday,
  isSameFacultyName,
  normalizeDayName,
} from '@/utils/lectureUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();
  const {
    announcements,
    timetable,
    calendarEvents,
    attendance,
    getStudentAttendanceRecords,
    assignments,
    quests,
    totalXP,
    createAnnouncement,
  } = useCampusData();

  // Compute student stats
  const activeStudentAttendance = useMemo(() => {
    if (role === 'student' && user?.id && getStudentAttendanceRecords) {
      return getStudentAttendanceRecords(user.id, false);
    }
    return attendance;
  }, [role, user?.id, attendance, getStudentAttendanceRecords]);

  const totalAttended = activeStudentAttendance.reduce((sum, item) => sum + item.attended, 0);
  const totalClasses = activeStudentAttendance.reduce((sum, item) => sum + item.total, 0);
  const overallPercentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 1000) / 10 : 0;
  const pendingAssignments = assignments.filter((a) => a.status === 'pending');

  // Smart Next Lecture Analysis
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Update current time every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);
  
  const nextLectureInfo = useMemo(() => {
    return getNextLectureInfo(timetable, calendarEvents, currentTime);
  }, [timetable, calendarEvents, currentTime]);

  const facultyLectureInfo = useMemo(() => {
    return getNextLectureInfo(timetable, calendarEvents, currentTime, user.fullName);
  }, [timetable, calendarEvents, currentTime, user.fullName]);

  // Today's lectures to conduct for this specific faculty (sorted chronologically by lecture time)
  const todayFacultyLectures = useMemo(() => {
    const todayName = normalizeDayName(
      ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        currentTime.getDay()
      ]
    );
    if (!user.fullName) return [];
    if (isHoliday(currentTime, calendarEvents).isHoliday) return [];
    return timetable
      .filter((s) => normalizeDayName(s.day) === todayName && isSameFacultyName(s.facultyName, user.fullName))
      .sort((a, b) => {
        const timeA = parseTimeToDate(a.startTime, currentTime).getTime();
        const timeB = parseTimeToDate(b.startTime, currentTime).getTime();
        return timeA - timeB;
      });
  }, [timetable, user.fullName, currentTime, calendarEvents]);

  const renderStudentView = () => (
    <>
      {/* Attendance Summary Meter */}
      <Animated.View entering={FadeInDown.duration(200).delay(60)} style={styles.section}>
        <AttendanceMeter
          percentage={overallPercentage}
          attendedClasses={totalAttended}
          totalClasses={totalClasses}
          label="Your Academic Attendance"
        />
      </Animated.View>

      {/* Smart Next Lecture Card */}
      <Animated.View entering={FadeInDown.duration(200).delay(100)} style={styles.section}>
        <NextLectureCard 
          lectureInfo={nextLectureInfo}
          onPress={() => router.push('/screens/academics')}
          showDetails={nextLectureInfo.status === 'in-progress' || nextLectureInfo.status === 'upcoming'}
        />
      </Animated.View>

      {/* Quick Action Shortcuts */}
      <Animated.View entering={FadeInDown.duration(200).delay(140)} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Services</Text>
        <View style={styles.grid}>
          <View style={{ width: '48%' }}>
            <TouchableOpacity
              style={[styles.gridItem, { width: '100%', backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/screens/academics')}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIcon, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
                <Ionicons name="calendar-outline" size={22} color="#2563EB" />
              </View>
              <Text style={[styles.gridLabel, { color: colors.text }]}>Timetable</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>Mon - Fri</Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: '48%' }}>
            <TouchableOpacity
              style={[styles.gridItem, { width: '100%', backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/screens/campus-quest')}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIcon, { backgroundColor: isDark ? '#78350F' : '#FFFBEB' }]}>
                <Ionicons name="trophy-outline" size={22} color="#F59E0B" />
              </View>
              <Text style={[styles.gridLabel, { color: colors.text }]}>Campus Quest</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>
                {role === 'student' ? `${totalXP} XP • Badges` : 'Quests, badges & leaderboard'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: '48%' }}>
            <TouchableOpacity
              style={[styles.gridItem, { width: '100%', backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/screens/study-materials')}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIcon, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
                <Ionicons name="folder-open-outline" size={22} color="#10B981" />
              </View>
              <Text style={[styles.gridLabel, { color: colors.text }]}>Notes & PYQs</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>ADA, DBMS, UHV</Text>
            </TouchableOpacity>
          </View>

          <View style={{ width: '48%' }}>
            <TouchableOpacity
              style={[styles.gridItem, { width: '100%', backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => router.push('/screens/assistant')}
              activeOpacity={0.7}
            >
              <View style={[styles.gridIcon, { backgroundColor: isDark ? '#31104B' : '#FAF5FF' }]}>
                <Ionicons name="sparkles" size={22} color="#7C3AED" />
              </View>
              <Text style={[styles.gridLabel, { color: colors.text }]}>AI</Text>
              <Text style={[styles.gridSub, { color: colors.textSecondary }]}>Ask your AI companion</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Active Quest Preview */}
      <Animated.View entering={FadeInDown.duration(200).delay(180)} style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly Campus Quest</Text>
          <TouchableOpacity onPress={() => router.push('/screens/campus-quest')}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View Leaderboard →</Text>
          </TouchableOpacity>
        </View>
        {quests.length > 0 ? (
        <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
          <View style={styles.questRow}>
            <View style={[styles.questBadge, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              <Ionicons name="flame" size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.questTitleRow}>
                <Text style={[styles.questTitle, { color: colors.text }]}>{quests[0].title}</Text>
                <Badge label={`+${quests[0].xpReward} XP`} variant="warning" />
              </View>
              <Text style={[styles.questDesc, { color: colors.textSecondary }]}>
                {quests[0].description}
              </Text>
              <View style={styles.questProgressBg}>
                <View
                  style={[
                    styles.questProgressFill,
                    {
                      width: `${(quests[0].progress / quests[0].maxProgress) * 100}%`,
                      backgroundColor: '#F59E0B',
                    },
                  ]}
                />
              </View>
              <Text style={[styles.questProgressText, { color: colors.textSecondary }]}>
                Progress: {quests[0].progress} / {quests[0].maxProgress} Days Completed
              </Text>
            </View>
          </View>
        </Card>
        ) : (
        <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 16 }}>No active quests yet. Check back soon!</Text>
        </Card>
        )}
      </Animated.View>
    </>
  );

  const renderFacultyView = () => (
    <>
      {/* Smart Next Lecture Card for Faculty */}
      <Animated.View entering={FadeInDown.duration(200).delay(60)} style={styles.section}>
        <NextLectureCard 
          lectureInfo={facultyLectureInfo}
          onPress={() => router.push({ pathname: '/screens/academics', params: { tab: 'timetable' } } as any)}
          showDetails={facultyLectureInfo.status === 'in-progress' || facultyLectureInfo.status === 'upcoming'}
          isFaculty
        />
      </Animated.View>

      {/* Faculty Profile Card */}
      <Animated.View entering={FadeInDown.duration(200).delay(100)} style={styles.section}>
        <Card variant="elevated" style={{ backgroundColor: isDark ? '#064E3B' : '#ECFDF5', borderColor: '#10B981' }}>
          <View style={styles.facultyHeader}>
            <View style={[styles.facultyAvatar, { backgroundColor: '#10B981' }]}>
              <Ionicons name="school" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.facultyName, { color: colors.text }]}>{user.fullName}</Text>
              <Text style={[styles.facultyRole, { color: isDark ? '#34D399' : '#059669' }]}>
                {user.designation} • {user.department}
              </Text>
              <Text style={[styles.facultyCabin, { color: colors.textSecondary }]}>
                🏢 Cabin: {user.cabinLocation || 'Turing Block Room 304'}
              </Text>
              <Text style={[styles.facultyCabin, { color: colors.textSecondary }]}>
                ⏰ Office Hours: {user.officeHours || 'Mon, Wed, Fri 2-4 PM'}
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Faculty Action Shortcuts */}
      <Animated.View entering={FadeInDown.duration(200).delay(140)} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Faculty Actions</Text>
        <View style={styles.facultyActionGrid}>
          <Button
            title="Open Student Attendance Roster"
            icon="book-outline"
            variant="primary"
            onPress={() => router.push({ pathname: '/screens/academics', params: { tab: 'attendance' } } as any)}
            style={{ flex: 1, backgroundColor: '#059669', paddingVertical: 16 }}
          />
        </View>
      </Animated.View>

      {/* Today's Teaching Schedule */}
      <Animated.View entering={FadeInDown.duration(200).delay(180)} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Today&apos;s Lectures to Conduct</Text>
        {todayFacultyLectures.length === 0 ? (
          <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 20, alignItems: 'center' }}>
            <Ionicons name="calendar-outline" size={32} color={colors.textSecondary} style={{ marginBottom: 6 }} />
            <Text style={{ textAlign: 'center', color: colors.text, fontWeight: '700', fontSize: 14 }}>
              No lectures scheduled to conduct today
            </Text>
            <Text style={{ textAlign: 'center', color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              Enjoy your research and office hours!
            </Text>
          </Card>
        ) : (
          todayFacultyLectures.map((slot, idx) => {
            const liveStatus = getSlotLiveStatus(slot.startTime, slot.endTime, currentTime);
            return (
              <Card
                key={slot.id || `fac_slot_${idx}`}
                style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 10 }}
              >
                <View style={styles.classRow}>
                  <View
                    style={[
                      styles.timeBadge,
                      { backgroundColor: slot.type === 'Lab' ? (isDark ? '#1E3A8A' : '#EFF6FF') : (isDark ? '#064E3B' : '#ECFDF5') },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeBadgeText,
                        { color: slot.type === 'Lab' ? '#2563EB' : '#059669' },
                      ]}
                    >
                      {slot.startTime}
                    </Text>
                    <Text
                      style={[
                        styles.timeBadgeSub,
                        { color: slot.type === 'Lab' ? '#2563EB' : '#059669' },
                      ]}
                    >
                      {slot.type}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.classTitle, { color: colors.text }]}>
                      {slot.courseCode}: {slot.courseTitle}
                    </Text>
                    <Text style={[styles.classDetails, { color: colors.textSecondary }]}>
                      Room {slot.room} • {slot.startTime} - {slot.endTime}
                    </Text>
                  </View>
                  <Badge label={liveStatus.label} variant={liveStatus.variant} />
                </View>
              </Card>
            );
          })
        )}
      </Animated.View>

      {/* Submissions to Review */}
      <Animated.View entering={FadeInDown.duration(200).delay(220)} style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Student Submissions to Grade</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/screens/academics', params: { tab: 'assignments', grade: 'true' } } as any)}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>Grade All →</Text>
          </TouchableOpacity>
        </View>
        <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder }}>
          <Text style={[styles.reviewHeader, { color: colors.text }]}>
            Coursework Submissions
          </Text>
          <Text style={[styles.reviewSub, { color: colors.textSecondary }]}>
            Review student submissions, allocate marks out of maximum, and provide feedback.
          </Text>
          <View style={styles.reviewBtnRow}>
            <Button
              title="Open Assignment Grader"
              icon="create-outline"
              size="small"
              variant="primary"
              onPress={() => router.push({ pathname: '/screens/academics', params: { tab: 'assignments', grade: 'true' } } as any)}
            />
          </View>
        </Card>
      </Animated.View>
    </>
  );

  const renderAdminView = () => (
    <>
      {/* Admin Overview Banner */}
      <Animated.View entering={FadeInDown.duration(200).delay(60)} style={styles.section}>
        <Card variant="elevated" style={{ backgroundColor: isDark ? '#4C1D95' : '#F5F3FF', borderColor: '#7C3AED' }}>
          <View style={styles.facultyHeader}>
            <View style={[styles.facultyAvatar, { backgroundColor: '#7C3AED' }]}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.facultyName, { color: colors.text }]}>{user.fullName}</Text>
              <Text style={[styles.facultyRole, { color: isDark ? '#C084FC' : '#7C3AED' }]}>
                {user.designation} • Central Administration
              </Text>
              <Text style={[styles.facultyCabin, { color: colors.textSecondary }]}>
                🏢 Suite 101, Central Administrative Block
              </Text>
            </View>
          </View>
        </Card>
      </Animated.View>

      {/* Campus Telemetry Metrics */}
      <Animated.View entering={FadeInDown.duration(200).delay(100)} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Campus Live Telemetry</Text>
        <View style={styles.grid}>
          <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.telemetryNumber, { color: colors.primary }]}>2,480</Text>
            <Text style={[styles.gridLabel, { color: colors.text }]}>Enrolled Students</Text>
            <Text style={[styles.gridSub, { color: '#10B981' }]}>● 98.4% Active</Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.telemetryNumber, { color: '#059669' }]}>142</Text>
            <Text style={[styles.gridLabel, { color: colors.text }]}>Faculty on Duty</Text>
            <Text style={[styles.gridSub, { color: colors.textSecondary }]}>18 Departments</Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.telemetryNumber, { color: '#F59E0B' }]}>88.2%</Text>
            <Text style={[styles.gridLabel, { color: colors.text }]}>Avg Attendance</Text>
            <Text style={[styles.gridSub, { color: colors.textSecondary }]}>Threshold: 75%</Text>
          </View>

          <View style={[styles.gridItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.telemetryNumber, { color: '#7C3AED' }]}>Healthy</Text>
            <Text style={[styles.gridLabel, { color: colors.text }]}>Database & AI</Text>
            <Text style={[styles.gridSub, { color: '#10B981' }]}>RLS Enforced ✅</Text>
          </View>
        </View>
      </Animated.View>

      {/* Administrator Actions */}
      <Animated.View entering={FadeInDown.duration(200).delay(140)} style={styles.section}>
          <Button
            title="Dispatch Broadcast Notice"
            icon="megaphone"
            variant="primary"
            onPress={() => router.push('/screens/admin-console')}
          />
      </Animated.View>
    </>
  );

  return (
    <View style={[styles.screenWrap, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pinned Announcements Carousel */}
        {announcements.filter((a) => a.isPinned).length > 0 && (
          <Animated.View entering={FadeInDown.duration(150).springify().damping(18).stiffness(260)} style={styles.pinnedSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.announcementTag}>
                <Ionicons name="pin" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                <Text style={styles.pinnedTagText}>PINNED ANNOUNCEMENT</Text>
              </View>
              <Text style={[styles.dateSub, { color: colors.textSecondary }]}>Official Notice</Text>
            </View>

            <Card style={{ backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: colors.cardBorder }}>
              <View style={styles.announcementHeader}>
                <Badge label={announcements[0].category} variant="danger" />
                <Text style={[styles.announcementDate, { color: colors.textSecondary }]}>
                  {announcements[0].date}
                </Text>
              </View>
              <Text style={[styles.announcementTitle, { color: colors.text }]}>
                {announcements[0].title}
              </Text>
              <Text style={[styles.announcementBody, { color: colors.textSecondary }]} numberOfLines={2}>
                {announcements[0].content}
              </Text>
              <Text style={[styles.announcementAuthor, { color: colors.primary }]}>
                — {announcements[0].authorName} ({announcements[0].authorRole})
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* Dynamic Role-Based View */}
        {role === 'student' && renderStudentView()}
        {role === 'faculty' && renderFacultyView()}
        {role === 'admin' && renderAdminView()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 10,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pinnedSection: {
    marginBottom: 20,
  },
  announcementTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  dateSub: {
    fontSize: 12,
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementDate: {
    fontSize: 11,
  },
  announcementTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  announcementBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  announcementAuthor: {
    fontSize: 12,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  gridItem: {
    width: '48%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  gridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  gridSub: {
    fontSize: 12,
  },
  telemetryNumber: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  questTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  questDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  questProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 4,
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questProgressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  facultyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  facultyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  facultyName: {
    fontSize: 17,
    fontWeight: '800',
  },
  facultyRole: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  facultyCabin: {
    fontSize: 12,
    marginTop: 1,
  },
  facultyActionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBadge: {
    backgroundColor: '#ECFDF5',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  timeBadgeSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  classTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  classDetails: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewHeader: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewSub: {
    fontSize: 12,
    marginBottom: 12,
  },
  reviewBtnRow: {
    alignItems: 'flex-start',
  },
  switcherBanner: {
    marginTop: 10,
  },
  switcherBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  switcherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  switcherTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  switcherSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
