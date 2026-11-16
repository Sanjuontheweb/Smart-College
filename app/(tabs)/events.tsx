import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
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
import { Button } from '@/components/ui/Button';
import { ClubItem, StudentOpportunityRecord } from '@/services/localDb';
import { CampusEvent } from '@/constants/CampusData';

type EventSegment = 'events' | 'opportunities' | 'clubs';
type OppStatus = 'applied' | 'accepted' | 'rejected';

const isDeadlineOver = (deadline?: string) => {
  if (!deadline) return false;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return false;
  parsed.setHours(23, 59, 59, 999);
  return parsed.getTime() < Date.now();
};

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { role, user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();
  const {
    events,
    opportunities,
    clubs,
    studentOpportunities,
    eventRegistrations,
    toggleRegisterEvent,
    updateCampusEvent,
    applyOpportunity,
    updateOpportunityStatus,
    updateStudentSkillsAndExperience,
    joinClub,
  } = useCampusData();

  const [activeTab, setActiveTab] = useState<EventSegment>('events');

  // Club welcome pop-up
  const [welcomeClub, setWelcomeClub] = useState<{ id: string; name: string; message: string } | null>(
    null
  );

  // Skills & experience modal
  const [skillsOppId, setSkillsOppId] = useState<string | null>(null);
  const [skillInput, setSkillInput] = useState('');
  const [skillBlocks, setSkillBlocks] = useState<string[]>([]);
  const [exposure, setExposure] = useState('');

  // Staff event editing modal
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    organizer: '',
    registeredCount: '',
  });

  const isStaff = role !== 'student';

  const getMyRegistration = (eventId: string) =>
    eventRegistrations.find((r) => r.studentId === user.id && r.eventId === eventId);

  const getEventRegistrations = (eventId: string) =>
    eventRegistrations.filter((r) => r.eventId === eventId);

  const openEventEditor = (evt: CampusEvent) => {
    setEditingEventId(evt.id);
    setEventForm({
      title: evt.title,
      description: evt.description,
      date: evt.date,
      time: evt.time,
      venue: evt.venue,
      organizer: evt.organizer,
      registeredCount: String(evt.registeredCount),
    });
  };

  const handleSaveEvent = async () => {
    if (!editingEventId) return;
    const parsedCount = parseInt(eventForm.registeredCount, 10);
    await updateCampusEvent(editingEventId, {
      title: eventForm.title.trim() || 'Untitled Event',
      description: eventForm.description.trim(),
      date: eventForm.date.trim(),
      time: eventForm.time.trim(),
      venue: eventForm.venue.trim(),
      organizer: eventForm.organizer.trim(),
      registeredCount: Number.isNaN(parsedCount)
        ? getEventRegistrations(editingEventId).length
        : Math.max(0, parsedCount),
    });
    setEditingEventId(null);
    showNotice({
      title: 'Event Updated',
      message: 'The event details were saved and are now live across the app.',
      type: 'success',
    });
  };

  const pendingApplications = useMemo(
    () => studentOpportunities.filter((r) => r.status === 'applied').length,
    [studentOpportunities]
  );

  const isClubMember = (club: ClubItem) =>
    (club.joinedMemberIds || []).includes(user.id) ||
    (Boolean(club.isMember) && !club.joinedMemberIds);

  const getMyRecord = (oppId: string) =>
    studentOpportunities.find((r) => r.studentId === user.id && r.oppId === oppId);

  const handleJoinClub = async (club: ClubItem) => {
    if (isClubMember(club)) {
      showNotice({
        title: 'Already a Member',
        message: `You are already an active member of ${club.name}.`,
        type: 'info',
      });
      return;
    }
    try {
      const res = await joinClub(club.id, user.id);
      setWelcomeClub({
        id: club.id,
        name: res.clubName || club.name,
        message:
          res.welcomeMessage ||
          `Welcome to ${club.name}! We are thrilled to have you in our campus community.`,
      });
    } catch {
      showNotice({
        title: 'Could Not Join Club',
        message: 'Something went wrong. Please try again.',
        type: 'error',
      });
    }
  };

  const handleApply = async (oppId: string, title: string, organization: string) => {
    const existing = getMyRecord(oppId);
    if (!existing && isDeadlineOver(opportunities.find((o) => o.id === oppId)?.deadline)) {
      showNotice({
        title: 'Deadline Over',
        message: `Applications for "${title}" are closed. You can no longer register.`,
        type: 'warning',
      });
      return;
    }
    if (!existing) {
      await applyOpportunity(oppId, user.id, user.fullName, user.rollNo);
      showNotice({
        title: 'Application Dispatched!',
        message: `Resume and profile sent to ${organization} for "${title}".`,
        type: 'quest',
        xpReward: 40,
      });
      return;
    }
    if (existing.status === 'accepted') {
      setSkillBlocks(existing.skillsDeveloped ? [...existing.skillsDeveloped] : []);
      setExposure(existing.exposureExperience || '');
      setSkillInput('');
      setSkillsOppId(oppId);
    }
  };

  const handleAddSkillBlock = () => {
    const value = skillInput.trim();
    if (!value) return;
    if (skillBlocks.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setSkillInput('');
      return;
    }
    setSkillBlocks((prev) => [...prev, value]);
    setSkillInput('');
  };

  const handleRemoveSkillBlock = (index: number) => {
    setSkillBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSkills = async () => {
    if (!skillsOppId) return;
    const pending = skillInput.trim();
    const finalSkills =
      pending && !skillBlocks.some((s) => s.toLowerCase() === pending.toLowerCase())
        ? [...skillBlocks, pending]
        : skillBlocks;
    await updateStudentSkillsAndExperience(user.id, skillsOppId, finalSkills, exposure.trim());
    setSkillsOppId(null);
    setSkillBlocks([]);
    setSkillInput('');
    setExposure('');
    showNotice({
      title: 'Record Saved!',
      message: 'Your skills and exposure record has been stored for this opportunity.',
      type: 'quest',
    });
  };

  const handleApplicationStatus = async (rec: StudentOpportunityRecord, status: OppStatus) => {
    await updateOpportunityStatus(rec.studentId, rec.oppId, status);
    showNotice({
      title: status === 'accepted' ? 'Application Accepted' : 'Application Rejected',
      message:
        status === 'accepted'
          ? `${rec.studentName} has been marked as accepted.`
          : `${rec.studentName} has been marked as not selected.`,
      type: status === 'accepted' ? 'success' : 'warning',
    });
  };

  const getStatusVariant = (status: OppStatus) =>
    status === 'accepted' ? 'success' : status === 'rejected' ? 'danger' : 'warning';

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Header subtitle="Events, Clubs & Careers" />

      {/* Segment Selector */}
      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.segmentInner}>
          {(
            [
              { id: 'events', label: 'Events', icon: 'calendar-outline' },
              { id: 'opportunities', label: 'Internships', icon: 'briefcase-outline' },
              { id: 'clubs', label: 'Clubs', icon: 'people-outline' },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabBtn,
                  isSelected && {
                    backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                    borderBottomColor: '#7A3CFF',
                    borderBottomWidth: 3,
                  },
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isSelected ? '#7A3CFF' : colors.textSecondary}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.tabBtnText,
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
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ================================================================= */}
        {/* EVENTS VIEW */}
        {/* ================================================================= */}
        {activeTab === 'events' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Campus Events & Fests ({events.length})
              </Text>
              <Badge label="Verified by Student Council" variant="success" />
            </View>

            {events.map((evt) => {
              const myReg = getMyRegistration(evt.id);
              const registrations = getEventRegistrations(evt.id);
              return (
                <Card
                  key={evt.id}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    marginBottom: 14,
                  }}
                >
                  <View style={styles.cardHeader}>
                    <Badge label={evt.category} variant="primary" />
                    <Text style={[styles.regCount, { color: colors.textSecondary }]}>
                      {evt.registeredCount} Registered
                    </Text>
                  </View>

                  <Text style={[styles.eventTitle, { color: colors.text }]}>{evt.title}</Text>
                  <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>{evt.description}</Text>

                  <View style={[styles.eventInfoBox, { borderTopColor: colors.border }]}>
                    <View style={styles.infoRow}>
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                      <Text style={[styles.infoText, { color: colors.text }]}>
                        {evt.date} | {evt.time}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={14} color={colors.primary} />
                      <Text style={[styles.infoText, { color: colors.text }]}>{evt.venue}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
                      <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                        Organized by: {evt.organizer}
                      </Text>
                    </View>
                  </View>

                  {isStaff ? (
                    <View>
                      <Button
                        title="Edit Event Details"
                        icon="create-outline"
                        variant="secondary"
                        onPress={() => openEventEditor(evt)}
                      />
                      <View style={[styles.applicantBox, { borderTopColor: colors.border }]}>
                        <Text style={[styles.applicantHeading, { color: colors.text }]}>
                          Registered Students ({registrations.length})
                        </Text>
                        {registrations.length === 0 ? (
                          <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                            No student has registered for this event yet.
                          </Text>
                        ) : (
                          registrations.map((rec) => (
                            <View
                              key={rec.id}
                              style={[
                                styles.applicantRow,
                                { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' },
                              ]}
                            >
                              <View style={{ flex: 1, paddingRight: 8 }}>
                                <Text style={[styles.applicantName, { color: colors.text }]}>
                                  {rec.studentName}
                                </Text>
                                <Text style={[styles.applicantMeta, { color: colors.textSecondary }]}>
                                  {rec.studentRollNo || 'Student'} | Registered {rec.registeredAt}
                                </Text>
                              </View>
                              <Badge label="REGISTERED" variant="success" size="small" />
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <Button
                        title={myReg ? 'Registered (Cancel Pass)' : 'Register for Event (+30 XP)'}
                        icon={myReg ? 'checkmark-circle' : 'ticket-outline'}
                        variant={myReg ? 'secondary' : 'primary'}
                        onPress={() => {
                          toggleRegisterEvent(evt.id);
                          if (myReg) {
                            showNotice({
                              title: 'Registration Cancelled',
                              message: `You have unsubscribed from "${evt.title}".`,
                              type: 'warning',
                            });
                          } else {
                            showNotice({
                              title: 'Registration Confirmed!',
                              message: `Digital pass issued for "${evt.title}". Saved to your profile.`,
                              type: 'quest',
                              xpReward: 30,
                            });
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* ================================================================= */}
        {/* OPPORTUNITIES VIEW (INTERNSHIPS & HACKATHONS) */}
        {/* ================================================================= */}
        {activeTab === 'opportunities' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Verified Opportunities ({opportunities.length})
              </Text>
              <Badge label="TPO Approved" variant="success" />
            </View>

            {isStaff && (
              <View
                style={[
                  styles.adminBanner,
                  {
                    backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                    borderColor: '#7A3CFF',
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={16} color="#7A3CFF" />
                <Text style={[styles.adminBannerText, { color: colors.text }]}>
                  Faculty review mode | {pendingApplications} pending application
                  {pendingApplications === 1 ? '' : 's'}
                </Text>
              </View>
            )}

            {opportunities.map((opp) => {
              const myRecord = getMyRecord(opp.id);
              const applicants = studentOpportunities.filter((r) => r.oppId === opp.id);
              const appliedCount = applicants.length;
              const deadlineOver = isDeadlineOver(opp.deadline);

              const buttonTitle =
                role !== 'student'
                  ? `${appliedCount} Student Application${appliedCount === 1 ? '' : 's'}`
                  : !myRecord
                  ? deadlineOver
                    ? 'Deadline Over'
                    : 'Apply via Campus Portal (+40 XP)'
                  : myRecord.status === 'accepted'
                  ? 'Skills Developed'
                  : myRecord.status === 'rejected'
                  ? 'Not Selected'
                  : 'Application Submitted';

              return (
                <Card
                  key={opp.id}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    marginBottom: 14,
                  }}
                >
                  <View style={styles.cardHeader}>
                    <Badge
                      label={opp.type}
                      variant={opp.type === 'Hackathon' ? 'warning' : 'info'}
                    />
                    <Text style={[styles.stipendText, { color: '#059669' }]}>
                      {opp.stipendOrPrize}
                    </Text>
                  </View>

                  <Text style={[styles.oppTitle, { color: colors.text }]}>{opp.title}</Text>
                  <Text style={[styles.oppOrg, { color: colors.primary }]}>{opp.organization}</Text>
                  <Text style={[styles.eventDesc, { color: colors.textSecondary }]}>
                    {opp.description}
                  </Text>

                  <View
                    style={[styles.eligibilityBox, { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' }]}
                  >
                    <Text style={[styles.eligibilityLabel, { color: colors.textSecondary }]}>
                      Eligibility:
                    </Text>
                    <Text style={[styles.eligibilityText, { color: colors.text }]}>
                      {opp.eligibility}
                    </Text>
                  </View>

                  <View style={styles.deadlineRow}>
                    <Ionicons name="hourglass-outline" size={13} color="#EF4444" />
                    <Text style={styles.deadlineText}>Deadline: {opp.deadline}</Text>
                    {deadlineOver && (
                      <View style={{ marginLeft: 6 }}>
                        <Badge label="Deadline Over" variant="danger" size="small" />
                      </View>
                    )}
                  </View>

                  {role === 'student' && (
                    <View style={{ marginTop: 12 }}>
                      <Button
                        title={buttonTitle}
                        icon={
                          myRecord?.status === 'accepted'
                            ? 'ribbon-outline'
                            : myRecord?.status === 'rejected'
                            ? 'close-circle-outline'
                            : myRecord
                            ? 'checkmark-circle-outline'
                            : 'send-outline'
                        }
                        variant={
                          myRecord?.status === 'accepted'
                            ? 'primary'
                            : myRecord
                            ? 'secondary'
                            : 'primary'
                        }
                        disabled={
                          (!myRecord && deadlineOver) ||
                          (Boolean(myRecord) && myRecord?.status !== 'accepted')
                        }
                        onPress={() => handleApply(opp.id, opp.title, opp.organization)}
                      />
                      {myRecord?.status === 'accepted' && (
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                          Accepted! Add the skills you developed and record your experience.
                        </Text>
                      )}
                    </View>
                  )}

                  {/* STAFF: per-student applications with accept / reject */}
                  {isStaff && (
                    <View style={[styles.applicantBox, { borderTopColor: colors.border }]}>
                      <Text style={[styles.applicantHeading, { color: colors.text }]}>
                        Student Applications ({appliedCount})
                      </Text>
                      {applicants.length === 0 ? (
                        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                          No applications submitted yet.
                        </Text>
                      ) : (
                        applicants.map((rec) => (
                          <View
                            key={rec.id}
                            style={[
                              styles.applicantRow,
                              { backgroundColor: isDark ? '#1F2937' : '#F8FAFC' },
                            ]}
                          >
                            <View style={{ flex: 1, paddingRight: 8 }}>
                              <Text style={[styles.applicantName, { color: colors.text }]}>
                                {rec.studentName}
                              </Text>
                              <Text style={[styles.applicantMeta, { color: colors.textSecondary }]}>
                                {rec.studentRollNo || 'Student'} | Applied {rec.appliedAt}
                              </Text>
                              <View style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                                <Badge
                                  label={rec.status.toUpperCase()}
                                  variant={getStatusVariant(rec.status) as any}
                                  size="small"
                                />
                              </View>
                            </View>
                            <View style={styles.applicantActions}>
                              <TouchableOpacity
                                accessibilityLabel={`Accept ${rec.studentName}`}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                style={[
                                  styles.statusBtn,
                                  {
                                    backgroundColor:
                                      rec.status === 'accepted' ? '#059669' : isDark ? '#064E3B' : '#ECFDF5',
                                    borderColor: '#059669',
                                  },
                                ]}
                                onPress={() => handleApplicationStatus(rec, 'accepted')}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color={rec.status === 'accepted' ? '#FFFFFF' : '#059669'}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                accessibilityLabel={`Reject ${rec.studentName}`}
                                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                style={[
                                  styles.statusBtn,
                                  {
                                    backgroundColor:
                                      rec.status === 'rejected' ? '#EF4444' : isDark ? '#7F1D1D' : '#FEE2E2',
                                    borderColor: '#EF4444',
                                  },
                                ]}
                                onPress={() => handleApplicationStatus(rec, 'rejected')}
                              >
                                <Ionicons
                                  name="close"
                                  size={16}
                                  color={rec.status === 'rejected' ? '#FFFFFF' : '#EF4444'}
                                />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        {/* ================================================================= */}
        {/* CLUBS VIEW */}
        {/* ================================================================= */}
        {activeTab === 'clubs' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Campus Clubs & Societies ({clubs.length})
              </Text>
              <Badge label="Active Chapters" variant="info" />
            </View>

            {clubs.map((club) => {
              const joined = role === 'admin' ? true : isClubMember(club);
              return (
                <Card
                  key={club.id}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    marginBottom: 14,
                  }}
                >
                  <View style={styles.clubHeader}>
                    <View
                      style={[
                        styles.clubIconBox,
                        { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF' },
                      ]}
                    >
                      <Ionicons name={(club.icon as any) || 'people'} size={24} color="#7A3CFF" />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 12 }}>
                      <Badge label={club.category} variant="primary" size="small" />
                      <Text style={[styles.clubName, { color: colors.text, marginTop: 3 }]}>
                        {club.name}
                      </Text>
                      <Text style={[styles.clubSub, { color: colors.textSecondary }]}>
                        {club.members} Members | Leads: {club.leads}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.clubDesc, { color: colors.textSecondary }]}>
                    {club.description}
                  </Text>

                  <View style={{ marginTop: 12 }}>
                    {role === 'admin' ? (
                      <Button
                        title="Open Community Forum"
                        icon="chatbubbles-outline"
                        onPress={() =>
                          router.push({
                            pathname: '/screens/discussions',
                            params: { clubId: club.id },
                          })
                        }
                      />
                    ) : (
                      <Button
                        title={joined ? 'Active Member (Joined)' : 'Join Club & Community (+25 XP)'}
                        icon={joined ? 'checkmark-circle' : 'people-outline'}
                        variant={joined ? 'secondary' : 'primary'}
                        onPress={() => handleJoinClub(club)}
                      />
                    )}
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ================================================================= */}
      {/* MODAL: CLUB WELCOME */}
      {/* ================================================================= */}
      <Modal
        visible={Boolean(welcomeClub)}
        transparent
        animationType="slide"
        onRequestClose={() => setWelcomeClub(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.welcomeIcon, { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF' }]}>
              <Ionicons name="sparkles" size={28} color="#7A3CFF" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text, textAlign: 'center' }]}>
              Welcome Aboard!
            </Text>
            <Text style={[styles.welcomeClubName, { color: colors.primary }]}>
              {welcomeClub?.name}
            </Text>
            <Text style={[styles.welcomeMessage, { color: colors.textSecondary }]}>
              {welcomeClub?.message}
            </Text>
            <View style={styles.welcomeXpRow}>
              <Ionicons name="flash" size={14} color="#D97706" />
              <Text style={[styles.welcomeXp, { color: '#D97706' }]}>+25 XP Membership Reward</Text>
            </View>
            <Button
              title="Enter Community"
              icon="arrow-forward"
              onPress={() => {
                const clubId = welcomeClub?.id;
                setWelcomeClub(null);
                if (clubId) {
                  router.push({ pathname: '/screens/discussions', params: { clubId } });
                }
              }}
              style={{ marginTop: 14 }}
            />
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: SKILLS & EXPOSURE (ACCEPTED STUDENTS) */}
      {/* ================================================================= */}
      <Modal
        visible={Boolean(skillsOppId)}
        transparent
        animationType="slide"
        onRequestClose={() => setSkillsOppId(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '88%' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Skills Developed</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  {opportunities.find((o) => o.id === skillsOppId)?.title || 'Opportunity'}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close skills modal"
                onPress={() => setSkillsOppId(null)}
              >
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              <Text style={[styles.inputLabel, { color: colors.text }]}>SKILLS DEVELOPED</Text>
              <View style={styles.skillInputRow}>
                <TextInput
                  style={[
                    styles.skillInput,
                    {
                      color: colors.text,
                      backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                      borderColor: colors.border,
                    },
                  ]}
                  placeholder="e.g. React Native, System Design..."
                  placeholderTextColor={colors.textSecondary}
                  value={skillInput}
                  onChangeText={setSkillInput}
                  onSubmitEditing={handleAddSkillBlock}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  accessibilityLabel="Add skill"
                  style={[styles.addSkillBtn, { backgroundColor: colors.primary }]}
                  onPress={handleAddSkillBlock}
                >
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {skillBlocks.length === 0 ? (
                <Text style={[styles.helperText, { color: colors.textSecondary }]}>
                  Type a skill and tap + to add it as a block.
                </Text>
              ) : (
                <View style={styles.skillBlockWrap}>
                  {skillBlocks.map((skill, index) => (
                    <View
                      key={`${skill}-${index}`}
                      style={[
                        styles.skillBlock,
                        { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF', borderColor: '#7A3CFF' },
                      ]}
                    >
                      <Text style={[styles.skillBlockText, { color: colors.text }]}>{skill}</Text>
                      <TouchableOpacity
                        accessibilityLabel={`Remove ${skill}`}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => handleRemoveSkillBlock(index)}
                      >
                        <Ionicons name="close" size={14} color="#7A3CFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>
                EXPOSURE & EXPERIENCE
              </Text>
              <TextInput
                style={[
                  styles.experienceInput,
                  {
                    color: colors.text,
                    backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                    borderColor: colors.border,
                  },
                ]}
                placeholder="Keep a notebook of what you worked on, problems solved, people you met and what you learned..."
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                value={exposure}
                onChangeText={setExposure}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setSkillsOppId(null)}
                style={{ flex: 1 }}
              />
              <Button title="Save Record" onPress={handleSaveSkills} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ================================================================= */}
      {/* MODAL: STAFF EVENT EDITOR */}
      {/* ================================================================= */}
      <Modal
        visible={Boolean(editingEventId)}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingEventId(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '90%' },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Event Details</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Changes go live instantly for every student.
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close event editor"
                onPress={() => setEditingEventId(null)}
              >
                <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {(
                [
                  { key: 'title', label: 'EVENT TITLE' },
                  { key: 'description', label: 'DESCRIPTION', multiline: true },
                  { key: 'date', label: 'DATE' },
                  { key: 'time', label: 'TIME' },
                  { key: 'venue', label: 'VENUE' },
                  { key: 'organizer', label: 'ORGANIZER' },
                  { key: 'registeredCount', label: 'REGISTERED COUNT', numeric: true },
                ] as {
                  key: keyof typeof eventForm;
                  label: string;
                  multiline?: boolean;
                  numeric?: boolean;
                }[]
              ).map((field) => (
                <View key={field.key} style={{ marginBottom: 12 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>{field.label}</Text>
                  <TextInput
                    style={[
                      styles.formInput,
                      field.multiline && { minHeight: 84, textAlignVertical: 'top' },
                      {
                        color: colors.text,
                        backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                        borderColor: colors.border,
                      },
                    ]}
                    value={eventForm[field.key]}
                    onChangeText={(value) =>
                      setEventForm((prev) => ({ ...prev, [field.key]: value }))
                    }
                    placeholder={field.label}
                    placeholderTextColor={colors.textSecondary}
                    multiline={field.multiline}
                    keyboardType={field.numeric ? 'number-pad' : 'default'}
                  />
                </View>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setEditingEventId(null)}
                style={{ flex: 1 }}
              />
              <Button title="Save Changes" onPress={handleSaveEvent} style={{ flex: 1 }} />
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
    paddingVertical: 4,
  },
  segmentInner: {
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnText: {
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  regCount: {
    fontSize: 11,
    fontWeight: '700',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  eventDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  eventInfoBox: {
    gap: 6,
    marginBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    flexShrink: 1,
  },
  btnRow: {
    flexDirection: 'row',
  },
  oppTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  oppOrg: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
  },
  stipendText: {
    fontSize: 12,
    fontWeight: '800',
  },
  eligibilityBox: {
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  eligibilityLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  eligibilityText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  helperText: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 8,
  },
  adminBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  adminBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  applicantBox: {
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  applicantHeading: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  applicantName: {
    fontSize: 13,
    fontWeight: '800',
  },
  applicantMeta: {
    fontSize: 10,
    marginTop: 1,
  },
  applicantActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  clubIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clubName: {
    fontSize: 14,
    fontWeight: '800',
  },
  clubSub: {
    fontSize: 11,
    marginTop: 1,
  },
  clubDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  welcomeIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  welcomeClubName: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  welcomeMessage: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 10,
  },
  welcomeXpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 12,
  },
  welcomeXp: {
    fontSize: 11,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  skillInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  addSkillBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillBlockWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  skillBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  skillBlockText: {
    fontSize: 12,
    fontWeight: '700',
  },
  experienceInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 150,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
});
