import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LocalCampusDB } from '@/services/localDb';

export default function AdminConsoleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, role, studentsList, facultiesList } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { createAnnouncement, refreshAllData } = useCampusData();
  const { showNotice } = useNotice();

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastContent, setBroadcastContent] = useState('');
  const [targetRole, setTargetRole] = useState<'All' | 'Students' | 'Faculty'>('All');
  const [resetModalVisible, setResetModalVisible] = useState(false);

  const handleDispatchBroadcast = () => {
    if (!broadcastTitle.trim() || !broadcastContent.trim()) {
      showNotice({
        title: 'Missing Fields',
        message: 'Please provide both title and notice body.',
        type: 'warning',
      });
      return;
    }
    createAnnouncement({
      title: broadcastTitle.trim(),
      content: broadcastContent.trim(),
      category: 'Urgent',
      authorName: user.fullName,
      authorRole: 'Dean of Academic Affairs',
      isPinned: true,
    });
    setBroadcastTitle('');
    setBroadcastContent('');
    showNotice({
      title: 'Broadcast Dispatched 📣',
      message: 'Campus alert broadcast dispatched to all student and faculty devices.',
      type: 'info',
    });
  };

  const handleSemesterReset = async () => {
    try {
      await LocalCampusDB.resetSemester();
      await refreshAllData();
      setResetModalVisible(false);
      showNotice({
        title: 'Semester Reset Complete! 🏁',
        message: 'Timetable, calendar of events, marks, and attendance reset. Notes, PYQs, clubs and students preserved.',
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

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: isDark ? '#111827' : '#FFFFFF',
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 8) + 6,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Admin Governance Console</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Security Definer Badge */}
        <Card
          variant="elevated"
          style={{ backgroundColor: isDark ? '#4C1D95' : '#F5F3FF', borderColor: '#7C3AED', marginBottom: 16 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="shield-checkmark" size={20} color="#7C3AED" style={{ marginRight: 8 }} />
            <Text style={[styles.securityTitle, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
              Master Governance & Local Security
            </Text>
          </View>
          <Text style={[styles.securityDesc, { color: isDark ? '#C4B5FD' : '#5B21B6' }]}>
            All database operations, user accounts, and examination registries run locally with device Keystore token isolation.
          </Text>
        </Card>

        {/* Portal Quick Access Button */}
        <TouchableOpacity
          style={styles.portalHeroBtn}
          onPress={() => router.push('/(tabs)/portal')}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.portalHeroBtnTitle}>Open Academic Governance Portal →</Text>
            <Text style={styles.portalHeroBtnSub}>
              Update Timetable, Calendar, Attendance, Exam Marks & Quests
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Semester End Reset Card (Requirement #8) */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Academic Term Lifecycle</Text>
        <Card
          style={{
            backgroundColor: isDark ? '#1A0F3C' : '#FEF2F2',
            borderColor: '#EF4444',
            marginBottom: 18,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="refresh-circle" size={22} color="#EF4444" />
            <Text style={[styles.resetCardHeading, { color: '#EF4444' }]}>
              Semester End (Reset Term)
            </Text>
          </View>
          <Text style={[styles.resetCardBody, { color: colors.textSecondary }]}>
            Concludes the current term. Resets timetable, calendar, attendance, assignments, and marks. Notes, PYQs, clubs, and student accounts stay intact!
          </Text>
          <View style={{ marginTop: 12 }}>
            <Button
              title="Execute Semester End Reset"
              variant="danger"
              icon="trash-outline"
              onPress={() => setResetModalVisible(true)}
            />
          </View>
        </Card>

        {/* Broadcast Urgent Announcement */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Dispatch Campus Broadcast</Text>
        <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, marginBottom: 18 }}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Target Group</Text>
          <View style={styles.targetRow}>
            {(['All', 'Students', 'Faculty'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.targetChip,
                  {
                    backgroundColor: targetRole === t ? colors.primary : colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setTargetRole(t)}
              >
                <Text
                  style={{
                    color: targetRole === t ? '#FFFFFF' : colors.text,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Broadcast Headline</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
                marginBottom: 10,
              },
            ]}
            placeholder="e.g. Schedule Update for 4th Sem End Exams"
            placeholderTextColor={colors.textSecondary}
            value={broadcastTitle}
            onChangeText={setBroadcastTitle}
          />

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Announcement Body</Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.background,
                color: colors.text,
                borderColor: colors.border,
                height: 80,
                textAlignVertical: 'top',
                marginBottom: 14,
              },
            ]}
            placeholder="Official details issued by the Dean office..."
            placeholderTextColor={colors.textSecondary}
            value={broadcastContent}
            onChangeText={setBroadcastContent}
            multiline
          />

          <Button
            title="Dispatch Broadcast Notice"
            icon="megaphone"
            variant="primary"
            onPress={handleDispatchBroadcast}
          />
        </Card>

        {/* User Directory Overview */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          Enrolled Students & Faculty ({studentsList.length + facultiesList.length})
        </Text>
        <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 0 }}>
          {[...studentsList, ...facultiesList].slice(0, 6).map((u, idx) => (
            <View
              key={u.id}
              style={[
                styles.userRow,
                idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.userAvatar,
                  { backgroundColor: u.role === 'faculty' ? '#059669' : '#2563EB' },
                ]}
              >
                <Ionicons
                  name={u.role === 'faculty' ? 'briefcase' : 'school'}
                  size={16}
                  color="#FFFFFF"
                />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.userName, { color: colors.text }]}>{u.fullName}</Text>
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{u.email}</Text>
                <Text style={[styles.userDept, { color: colors.textMuted }]}>
                  {u.role.toUpperCase()} • {u.department}
                </Text>
              </View>
              <Badge
                label={u.role}
                variant={u.role === 'faculty' ? 'success' : 'primary'}
                size="small"
              />
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Semester End Confirmation Modal */}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <Ionicons name="warning" size={26} color="#FF2E88" />
              <Text style={[styles.resetTitle, { color: colors.text }]}>Confirm Semester Reset</Text>
            </View>

            <Text style={[styles.resetDesc, { color: colors.textSecondary }]}>
              This will conclude the current academic semester:
            </Text>

            <View style={styles.resetList}>
              <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '700' }}>
                • ❌ Resets Timetable & Calendar of Events
              </Text>
              <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '700' }}>
                • ❌ Resets Attendance counts to zero
              </Text>
              <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '700' }}>
                • ❌ Clears Assignments & Submissions
              </Text>
              <Text style={{ color: '#F87171', fontSize: 11, fontWeight: '700' }}>
                • ❌ Resets Subject Examination Marks
              </Text>
            </View>

            <View style={styles.keepBox}>
              <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '800', marginBottom: 2 }}>
                ✅ WILL BE PRESERVED:
              </Text>
              <Text style={{ color: '#6EE7B7', fontSize: 11 }}>
                Notes, PYQs, Clubs, Student accounts, and Faculty directory stay intact!
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
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 12 }}>
                  Reset Semester
                </Text>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  securityDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  portalHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7A3CFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  portalHeroBtnTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
  portalHeroBtnSub: {
    color: '#DDD6FE',
    fontSize: 11,
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 6,
  },
  resetCardHeading: {
    fontSize: 15,
    fontWeight: '900',
  },
  resetCardBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 6,
  },
  targetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  targetChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 11,
    marginTop: 1,
  },
  userDept: {
    fontSize: 11,
    marginTop: 1,
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
  keepBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
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
});
