import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useNotice } from '@/context/NoticeContext';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DEMO_USERS, UserProfile } from '@/constants/CampusData';

export default function RolesScreen() {
  const insets = useSafeAreaInsets();
  const { user, role, switchUser, switchRole, studentsList, facultiesList } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();

  const [expandedSection, setExpandedSection] = useState<'admin' | 'faculty' | 'student' | null>(
    role === 'student' ? 'student' : role === 'faculty' ? 'faculty' : 'admin'
  );

  const handleSelectAdmin = async () => {
    await switchRole('admin');
    showNotice({
      title: 'Switched to Admin',
      message: `Active persona: ${DEMO_USERS.admin.fullName} (Dean of Academic Affairs). Full portal privileges unlocked!`,
      type: 'info',
    });
  };

  const handleSelectFaculty = async (faculty: UserProfile) => {
    await switchUser(faculty);
    showNotice({
      title: 'Switched to Faculty',
      message: `Active persona: ${faculty.fullName} (${faculty.designation || 'Faculty'}).`,
      type: 'success',
    });
  };

  const handleSelectStudent = async (student: UserProfile) => {
    await switchUser(student);
    showNotice({
      title: 'Switched to Student',
      message: `Active persona: ${student.fullName} (${student.rollNo || 'Sem 4'}).`,
      type: 'quest',
      xpReward: 10,
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header subtitle="Role Switching Console" showRoleBadge={false} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Persona Spotlight Card */}
        <Card
          variant="elevated"
          style={{
            backgroundColor: isDark ? '#1A0F3C' : '#F5F3FF',
            borderColor: '#7A3CFF',
            borderWidth: 2,
            marginBottom: 16,
          }}
        >
          <View style={styles.activeBanner}>
            <View style={styles.neonDotRow}>
              <View style={[styles.neonDot, { backgroundColor: '#2EF2FF' }]} />
              <View style={[styles.neonDot, { backgroundColor: '#FF2E88' }]} />
              <View style={[styles.neonDot, { backgroundColor: '#FFE14D' }]} />
            </View>
            <Badge label="CURRENT ACTIVE PERSONA" variant="warning" />
          </View>

          <View style={styles.activeUserRow}>
            <View style={[styles.avatarCircle, { backgroundColor: '#7A3CFF' }]}>
              <Text style={styles.avatarInitials}>
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </Text>
            </View>

            <View style={{ flex: 1, paddingLeft: 12 }}>
              <View style={styles.nameBadgeRow}>
                <Text style={[styles.userName, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                  {user.fullName}
                </Text>
                <View
                  style={[
                    styles.rolePill,
                    {
                      backgroundColor:
                        role === 'admin' ? '#7C3AED' : role === 'faculty' ? '#059669' : '#2563EB',
                    },
                  ]}
                >
                  <Text style={styles.rolePillText}>{role.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={[styles.userDept, { color: colors.textSecondary }]}>
                {user.department}
              </Text>
              <Text style={[styles.userSub, { color: isDark ? '#CBD5E1' : '#475569' }]}>
                {role === 'student'
                  ? `Roll: ${user.rollNo || '1MS24CS042'} • CGPA: ${user.cgpa || 8.84} • ${user.xpPoints || 720} XP`
                  : role === 'faculty'
                  ? `${user.designation || 'Associate Professor'} • ${user.cabinLocation || 'Turing 304'}`
                  : 'Dean of Academic Affairs • Master Administrator'}
              </Text>
            </View>
          </View>
        </Card>

        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          Select Persona to Switch
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          Zero passwords required. Instant local profile switching for administrator testing.
        </Text>

        {/* ============================================================== */}
        {/* BLOCK 1: ADMINISTRATOR */}
        {/* ============================================================== */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSelectAdmin}
          style={[
            styles.roleBlock,
            {
              backgroundColor: isDark ? '#161F30' : '#FFFFFF',
              borderColor: role === 'admin' ? '#C084FC' : colors.cardBorder,
              borderWidth: role === 'admin' ? 2 : 1,
            },
          ]}
        >
          <View style={styles.blockHeader}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' }]}>
              <Ionicons name="shield-checkmark" size={26} color="#7C3AED" />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <View style={styles.blockTitleRow}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>Administrator</Text>
                {role === 'admin' && <Badge label="ACTIVE" variant="primary" />}
              </View>
              <Text style={[styles.blockDesc, { color: colors.textSecondary }]}>
                Dr. Rajesh Verma • Full System Governance, Database Control & Semester End Reset
              </Text>
            </View>
          </View>

          <View style={styles.blockFooter}>
            <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700' }}>
              Tap to switch directly to Admin persona
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#7C3AED" />
          </View>
        </TouchableOpacity>

        {/* ============================================================== */}
        {/* BLOCK 2: FACULTY */}
        {/* ============================================================== */}
        <View
          style={[
            styles.roleBlock,
            {
              backgroundColor: isDark ? '#161F30' : '#FFFFFF',
              borderColor: role === 'faculty' ? '#34D399' : colors.cardBorder,
              borderWidth: role === 'faculty' ? 2 : 1,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              setExpandedSection((prev) => (prev === 'faculty' ? null : 'faculty'))
            }
            style={styles.blockHeader}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="briefcase" size={24} color="#059669" />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <View style={styles.blockTitleRow}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>Faculty Members</Text>
                <Badge
                  label={`${facultiesList.length || 3} Faculty`}
                  variant="success"
                />
              </View>
              <Text style={[styles.blockDesc, { color: colors.textSecondary }]}>
                Course Curriculum, Internal Mark Entry, Attendance & Document Portal
              </Text>
            </View>
            <Ionicons
              name={expandedSection === 'faculty' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {expandedSection === 'faculty' && (
            <View style={styles.subList}>
              <Text style={[styles.subListHeader, { color: colors.textSecondary }]}>
                TAP A FACULTY TO LOG IN AS THEM:
              </Text>
              {(facultiesList.length > 0 ? facultiesList : [DEMO_USERS.faculty]).map((fac) => {
                const isActive = user.id === fac.id;
                return (
                  <TouchableOpacity
                    key={fac.id}
                    onPress={() => handleSelectFaculty(fac)}
                    style={[
                      styles.personItem,
                      {
                        backgroundColor: isActive
                          ? isDark
                            ? '#064E3B'
                            : '#ECFDF5'
                          : isDark
                          ? '#0B0F19'
                          : '#F8FAFC',
                        borderColor: isActive ? '#059669' : colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={[styles.miniAvatar, { backgroundColor: '#059669' }]}>
                      <Text style={styles.miniInitials}>
                        {fac.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.personRow}>
                        <Text style={[styles.personName, { color: colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                          {fac.fullName}
                        </Text>
                        {isActive && <Badge label="LOGGED IN" variant="success" size="small" />}
                      </View>
                      <Text style={[styles.personDept, { color: colors.textSecondary }]}>
                        {fac.designation || 'Associate Professor'} • {fac.department}
                      </Text>
                      <Text style={[styles.personDetail, { color: colors.textMuted }]}>
                        🏢 {fac.cabinLocation || 'Alan Turing Block, Room 304'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ============================================================== */}
        {/* BLOCK 3: STUDENT */}
        {/* ============================================================== */}
        <View
          style={[
            styles.roleBlock,
            {
              backgroundColor: isDark ? '#161F30' : '#FFFFFF',
              borderColor: role === 'student' ? '#60A5FA' : colors.cardBorder,
              borderWidth: role === 'student' ? 2 : 1,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              setExpandedSection((prev) => (prev === 'student' ? null : 'student'))
            }
            style={styles.blockHeader}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
              <Ionicons name="school" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <View style={styles.blockTitleRow}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>Students</Text>
                <Badge
                  label={`${studentsList.length || 5} Students`}
                  variant="info"
                />
              </View>
              <Text style={[styles.blockDesc, { color: colors.textSecondary }]}>
                Attendance Tracker, Subject Marks, Quest XP & Academic Materials
              </Text>
            </View>
            <Ionicons
              name={expandedSection === 'student' ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {expandedSection === 'student' && (
            <View style={styles.subList}>
              <Text style={[styles.subListHeader, { color: colors.textSecondary }]}>
                TAP A STUDENT TO LOG IN AS THEM:
              </Text>
              {(studentsList.length > 0 ? studentsList : [DEMO_USERS.student]).map((std) => {
                const isActive = user.id === std.id;
                return (
                  <TouchableOpacity
                    key={std.id}
                    onPress={() => handleSelectStudent(std)}
                    style={[
                      styles.personItem,
                      {
                        backgroundColor: isActive
                          ? isDark
                            ? '#1E293B'
                            : '#EEF2FF'
                          : isDark
                          ? '#0B0F19'
                          : '#F8FAFC',
                        borderColor: isActive ? '#2563EB' : colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={[styles.miniAvatar, { backgroundColor: '#2563EB' }]}>
                      <Text style={styles.miniInitials}>
                        {std.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.personRow}>
                        <Text style={[styles.personName, { color: colors.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                          {std.fullName}
                        </Text>
                        {isActive && <Badge label="LOGGED IN" variant="primary" size="small" />}
                      </View>
                      <Text style={[styles.personDept, { color: colors.textSecondary }]}>
                        {std.rollNo || '1MS24CS042'} • Sem {std.semester || 4} • CGPA: {std.cgpa || 8.84}
                      </Text>
                      <Text style={[styles.personDetail, { color: '#D97706', fontWeight: '700' }]}>
                        ⚡ {std.xpPoints || 720} XP • {std.attendancePct || 86.2}% Attendance
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  activeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  neonDotRow: {
    flexDirection: 'row',
    gap: 4,
  },
  neonDot: {
    width: 6,
    height: 4,
    borderRadius: 1,
  },
  activeUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
  },
  rolePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rolePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  userDept: {
    fontSize: 12,
    marginTop: 2,
  },
  userSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 6,
  },
  sectionSub: {
    fontSize: 12,
    marginBottom: 14,
    marginTop: 2,
  },
  roleBlock: {
    borderRadius: 14,
    marginBottom: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  blockDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  blockFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  subList: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  subListHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  personItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  miniAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  personName: {
    fontSize: 13,
    fontWeight: '700',
  },
  personDept: {
    fontSize: 11,
    marginTop: 1,
  },
  personDetail: {
    fontSize: 10,
    marginTop: 2,
  },
});
