import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { RoleBadge } from '@/components/common/RoleBadge';
import { RetroLogo } from '@/components/common/RetroLogo';
import { triggerTestPushNotification } from '@/services/notificationService';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();
  const { totalXP, examinationMarks, badges } = useCampusData();
  const { showNotice } = useNotice();

  const handleTestNotification = async () => {
    await triggerTestPushNotification();
    showNotice({
      title: 'Push Notification Fired 🔔',
      message: 'Sent test push notification to your device!',
      type: 'info',
    });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header subtitle="Campus Survivor Profile" showRoleBadge={false} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Hero Card */}
        <Card
          variant="elevated"
          style={{
            backgroundColor: isDark ? '#161F30' : '#FFFFFF',
            borderColor: colors.cardBorder,
            marginBottom: 16,
          }}
        >
          <View style={styles.profileHeader}>
            <View style={[styles.avatarBox, { backgroundColor: '#7A3CFF' }]}>
              <Text style={styles.avatarInitials}>
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </Text>
            </View>

            <View style={{ flex: 1, paddingLeft: 14 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, { color: colors.text }]}>{user.fullName}</Text>
              </View>
              <View style={{ marginVertical: 4 }}>
                <RoleBadge role={role} size="small" />
              </View>
              <Text style={[styles.deptText, { color: colors.textSecondary }]}>
                {user.department}
              </Text>
              <Text style={[styles.emailText, { color: colors.textSecondary }]}>
                {user.email}
              </Text>
            </View>
          </View>

          {/* Role-Specific Metric Strip */}
          {role === 'student' && (
            <View
              style={[
                styles.metricsStrip,
                { backgroundColor: isDark ? '#1A0F3C' : '#F8FAFC', borderColor: '#7A3CFF', borderWidth: 1 },
              ]}
            >
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#7A3CFF' }]}>
                  Sem {user.semester || 4}
                </Text>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Progress</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#059669' }]}>
                  {user.cgpa || 8.84}
                </Text>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>CGPA</Text>
              </View>
              <View style={styles.metricDivider} />
              <View style={styles.metricItem}>
                <Text style={[styles.metricVal, { color: '#D97706' }]}>
                  {totalXP} XP
                </Text>
                <Text style={[styles.metricLbl, { color: colors.textSecondary }]}>Survival XP</Text>
              </View>
            </View>
          )}

          {role === 'faculty' && (
            <View style={[styles.facultyInfoBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Text style={[styles.facultyInfoText, { color: isDark ? '#34D399' : '#059669' }]}>
                🏢 Cabin: {user.cabinLocation || 'Alan Turing Block, Room 304'}
              </Text>
              <Text
                style={[
                  styles.facultyInfoText,
                  { color: isDark ? '#34D399' : '#059669', marginTop: 3 },
                ]}
              >
                ⏰ Consultation Hours: {user.officeHours || 'Mon, Wed, Fri 2:00 PM - 4:00 PM'}
              </Text>
            </View>
          )}

          {role === 'admin' && (
            <View style={[styles.facultyInfoBox, { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' }]}>
              <Text style={[styles.facultyInfoText, { color: isDark ? '#C084FC' : '#7C3AED' }]}>
                🏛️ Administration: Central Administrative Block, Suite 101
              </Text>
              <Text
                style={[
                  styles.facultyInfoText,
                  { color: isDark ? '#C084FC' : '#7C3AED', marginTop: 3 },
                ]}
              >
                🔑 Master System Governance & Database Superuser
              </Text>
            </View>
          )}

          <Text style={[styles.bioText, { color: colors.textSecondary }]}>
            &ldquo;{user.bio || 'Navigating academic progression with Survive College.'}&rdquo;
          </Text>
        </Card>

        {/* Feature Hub Navigation */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>College Hub & Features</Text>
        <Animated.View entering={FadeInDown.duration(180).delay(0)}>
        <Card
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            marginBottom: 16,
            padding: 0,
          }}
        >
          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/screens/campus-quest')}
          >
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
              <Ionicons name="trophy" size={20} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Campus Quest & Leaderboard</Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                {role === 'student'
                  ? `${totalXP} XP Earned • ${badges.filter((b) => b.unlocked).length} Badges Unlocked`
                  : 'Department quests, leaderboard & student badges'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/screens/study-materials')}
          >
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
              <Ionicons name="book" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Study Materials & PYQs</Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                Verified lecture notes, exam papers & question banks
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/screens/discussions')}
          >
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}>
              <Ionicons name="chatbubbles" size={20} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Campus Discussions & Forum</Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                Peer queries, course tips & verified faculty answers
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/screens/faculty-directory')}
          >
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
              <Ionicons name="business" size={20} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Faculty & Cabin Directory</Text>
              <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                Room numbers, department blocks & consultation hours
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {(role === 'admin' || role === 'faculty') && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => router.push('/screens/portal')}
            >
              <View style={[styles.menuIcon, { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuTitle, { color: colors.text }]}>Academic Governance Portal</Text>
                <Text style={[styles.menuSub, { color: colors.textSecondary }]}>
                  Update timetable, calendar, attendance, marks & events
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </Card>
        </Animated.View>

        {/* Application & Environment Settings */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>App Settings & Security</Text>
        <Card
          style={{
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            marginBottom: 20,
            paddingVertical: 3,
          }}
        >
          {/* Dark Mode Toggle */}
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                  {isDark ? 'Cyberpunk dark theme enabled' : 'Clean light theme enabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#CBD5E1', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Switch Roles */}
          <TouchableOpacity
            style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}
            onPress={() => router.push('/screens/roles')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="people-outline" size={20} color="#2563EB" />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Switch Roles</Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                  Switch between student, faculty and admin personas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Test Push Notifications */}
          <TouchableOpacity
            style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}
            onPress={handleTestNotification}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color="#7A3CFF" />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Push Notifications
                </Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                  Reminds before CIE (4-5 days), SEE (10 days), Assignments (previous day)
                </Text>
              </View>
            </View>
            <Badge label="Test Alert" variant="primary" />
          </TouchableOpacity>

          {/* Local Storage Engine */}
          <View style={[styles.settingItem, { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="server-outline" size={20} color="#059669" />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>
                  Production Local Database
                </Text>
                <Text style={[styles.settingSub, { color: colors.textSecondary }]}>
                  100% on-device Android offline store & document vault
                </Text>
              </View>
            </View>
            <Badge label="Local Storage" variant="success" />
          </View>
        </Card>

        {/* Note: Sign out button was removed per Requirement #3 */}

        <View style={styles.footerWrap}>
          <RetroLogo size="small" showSubtitle={false} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Survive College • v1.0.0 (Build 2026.2) • Fully Local Android App
          </Text>
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
    paddingBottom: 90,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 18,
    fontWeight: '800',
  },
  deptText: {
    fontSize: 12,
    marginTop: 2,
  },
  emailText: {
    fontSize: 11,
    marginTop: 1,
  },
  metricsStrip: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  metricLbl: {
    fontSize: 11,
    marginTop: 2,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#CBD5E1',
  },
  facultyInfoBox: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 10,
  },
  facultyInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bioText: {
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
    marginTop: 6,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSub: {
    fontSize: 11,
    marginTop: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    fontSize: 11,
    marginTop: 1,
  },
  footerWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 11,
  },
});
