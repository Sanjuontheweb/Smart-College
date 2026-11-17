import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

export default function CampusQuestScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { quests, badges, leaderboard, totalXP, claimQuestXP, studentProgress } = useCampusData();
  const { showNotice } = useNotice();
  const isStaff = user.role !== 'student';

  const orangeBg = isDark ? '#78350F' : '#FEF3C7';
  const orangeText = isDark ? '#FDE68A' : '#78350F';
  const orangeSub = isDark ? '#FCD34D' : '#B45309';
  const myRank = leaderboard.find((item) => item.name.includes('You'));

  const leaderboardCard = (
    <Card style={{ backgroundColor: orangeBg, borderColor: '#F59E0B', marginTop: 16, padding: 0, overflow: 'hidden' }}>
      <View style={{ paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 }}>
        <Text style={[styles.sectionHeading, { color: orangeText, marginBottom: 2, marginTop: 0 }]}>
          Department Leaderboard (CSE Sem 4)
        </Text>
        {!isStaff && myRank && (
          <Text style={{ color: orangeSub, fontSize: 11, fontWeight: '700' }}>
            You are ranked #{myRank.rank} with {myRank.xp} XP
          </Text>
        )}
      </View>
      {leaderboard.map((item, index) => {
        const isUser = item.name.includes('You');
        return (
          <View
            key={item.rollNo + item.rank}
            style={[
              styles.leaderRow,
              {
                borderBottomColor: isDark ? '#B45309' : '#FDE68A',
                borderBottomWidth: index === leaderboard.length - 1 ? 0 : 1,
                backgroundColor: isUser ? (isDark ? '#92400E' : '#FDE68A') : 'transparent',
              },
            ]}
          >
            <View style={styles.rankBox}>
              {item.rank === 1 ? (
                <Ionicons name="trophy" size={20} color="#F59E0B" />
              ) : item.rank === 2 ? (
                <Ionicons name="medal" size={20} color="#94A3B8" />
              ) : item.rank === 3 ? (
                <Ionicons name="medal" size={20} color="#B45309" />
              ) : (
                <Text style={[styles.rankText, { color: orangeSub }]}>#{item.rank}</Text>
              )}
            </View>

            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Text style={[styles.leaderName, { color: orangeText, fontWeight: isUser ? '800' : '600' }]}>
                {item.name}
              </Text>
              <Text style={[styles.leaderRoll, { color: orangeSub }]}>
                {item.rollNo} • {item.badgeName}
              </Text>
            </View>

            <View style={styles.leaderXpBox}>
              <Text style={[styles.leaderXpVal, { color: orangeText }]}>{item.xp} XP</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      {/* Custom Navigation Header */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
            paddingTop: Math.max(insets.top, 8) + 6,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Campus Quest & Badges</Text>
        <View style={styles.xpPill}>
          <Ionicons name={isStaff ? 'people' : 'sparkles'} size={14} color="#D97706" style={{ marginRight: 4 }} />
          <Text style={styles.xpPillText}>
            {isStaff ? `${studentProgress.length} Students` : `${totalXP} XP`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Leaderboard: top for staff, bottom for students */}
        {isStaff && leaderboardCard}

        {/* Hero XP Banner (students only) */}
        {!isStaff && (
          <Card variant="elevated" style={{ backgroundColor: isDark ? '#78350F' : '#FEF3C7', borderColor: '#F59E0B', marginBottom: 16 }}>
            <View style={styles.heroRow}>
              <View style={styles.heroLeft}>
                <Text style={[styles.heroLevel, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                  Level {Math.max(1, Math.floor(totalXP / 250) + 1)} Scholar
                </Text>
                <Text style={[styles.heroXPTitle, { color: isDark ? '#FFFFFF' : '#78350F' }]}>{totalXP} Total XP</Text>
                <Text style={[styles.heroSub, { color: isDark ? '#FDE68A' : '#B45309' }]}>
                  {myRank ? `Rank #${myRank.rank} in 4th Sem CSE` : '4th Sem CSE'} • {badges.filter((b) => b.unlocked).length} badges earned
                </Text>
              </View>
              <View style={styles.trophyIconBox}>
                <Ionicons name="trophy" size={38} color="#D97706" />
              </View>
            </View>
          </Card>
        )}

        {/* Weekly Quests */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Active Quests</Text>
        {quests.map((q) => (
          <Card
            key={q.id}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              marginBottom: 12,
            }}
          >
            <View style={styles.questHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.questTitle, { color: colors.text }]}>{q.title}</Text>
                <Text style={[styles.questDesc, { color: colors.textSecondary }]}>{q.description}</Text>
              </View>
              <Badge label={`+${q.xpReward} XP`} variant="warning" />
            </View>

            {!isStaff && (
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(100, (q.progress / q.maxProgress) * 100)}%`,
                      backgroundColor: q.completed ? '#10B981' : '#F59E0B',
                    },
                  ]}
                />
              </View>
            )}

            {!isStaff && (
            <View style={styles.questFooter}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Progress: {q.progress} / {q.maxProgress}
              </Text>
              {q.completed ? (
                <Badge label="Completed ✅" variant="success" />
              ) : q.progress >= q.maxProgress ? (
                <Button
                  title="Claim XP"
                  size="small"
                  variant="primary"
                  onPress={() => {
                    claimQuestXP(q.id);
                    showNotice({
                      title: 'Quest Completed! 🏆',
                      message: `+${q.xpReward} XP awarded to your profile! Keep surviving and thriving!`,
                      type: 'quest',
                      xpReward: q.xpReward,
                    });
                  }}
                />
              ) : (
                <Text style={[styles.inProgressText, { color: colors.primary }]}>In Progress</Text>
              )}
            </View>
            )}
          </Card>
        ))}

        {/* Badges Cabinet (students see their own earned badges) */}
        {!isStaff && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 10 }]}>
              My Earned Badges ({badges.filter((b) => b.unlocked).length} / {badges.length})
            </Text>
            <View style={styles.badgeGrid}>
              {badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    styles.badgeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: b.unlocked ? colors.primary : colors.border,
                      opacity: b.unlocked ? 1 : 0.45,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIconBox,
                      {
                        backgroundColor: b.unlocked
                          ? isDark ? '#1E3A8A' : '#EFF6FF'
                          : isDark ? '#1F2937' : '#F1F5F9',
                      },
                    ]}
                  >
                    <Ionicons
                      name={b.iconName as any}
                      size={26}
                      color={b.unlocked ? colors.primary : colors.textSecondary}
                    />
                  </View>
                  <Text style={[styles.badgeName, { color: colors.text }]} numberOfLines={1}>
                    {b.name}
                  </Text>
                  <Text style={[styles.badgeTier, { color: colors.primary }]}>{b.tier} Tier</Text>
                  <Text style={[styles.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                    {b.description}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Staff: every student with their earned badges */}
        {isStaff && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 16 }]}>
              Students & Earned Badges ({studentProgress.length})
            </Text>
            {studentProgress.map((rec) => {
              const earned = rec.badges.filter((b) => b.unlocked);
              return (
                <Card
                  key={rec.id}
                  style={{
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    marginBottom: 12,
                  }}
                >
                  <View style={styles.studentRow}>
                    <View
                      style={[
                        styles.studentAvatar,
                        { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF' },
                      ]}
                    >
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 10 }}>
                      <Text style={[styles.studentName, { color: colors.text }]}>
                        {rec.studentName}
                        {rec.studentId === user.id ? ' (You)' : ''}
                      </Text>
                      <Text style={[styles.studentMeta, { color: colors.textSecondary }]}>
                        {rec.studentRollNo || 'Student'} • {rec.department || 'CSE'}
                      </Text>
                    </View>
                    <View style={[styles.xpTag, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
                      <Ionicons name="sparkles" size={11} color="#D97706" />
                      <Text style={[styles.xpTagText, { color: isDark ? '#FDE68A' : '#92400E' }]}>
                        {rec.xp} XP
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.earnedLabel, { color: colors.textSecondary }]}>
                    Earned Badges ({earned.length})
                  </Text>
                  {earned.length === 0 ? (
                    <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                      No badges unlocked yet.
                    </Text>
                  ) : (
                    <View style={styles.badgeChipWrap}>
                      {earned.map((b) => (
                        <View
                          key={b.id}
                          style={[
                            styles.badgeChip,
                            { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF', borderColor: colors.primary },
                          ]}
                        >
                          <Ionicons name={b.iconName as any} size={13} color={colors.primary} />
                          <Text style={[styles.badgeChipText, { color: colors.text }]}>{b.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </Card>
              );
            })}
          </>
        )}

        {!isStaff && leaderboardCard}
      </ScrollView>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  xpPillText: {
    color: '#92400E',
    fontWeight: '800',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroLeft: {
    flex: 1,
  },
  heroLevel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroXPTitle: {
    fontSize: 26,
    fontWeight: '900',
    marginVertical: 2,
  },
  heroSub: {
    fontSize: 12,
  },
  trophyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 25,
  },
  questHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  questDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginVertical: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
  },
  inProgressText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    textAlign: 'center',
  },
  badgeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  badgeTier: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeDesc: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  leaderName: {
    fontSize: 14,
  },
  leaderRoll: {
    fontSize: 11,
    marginTop: 1,
  },
  leaderXpBox: {
    alignItems: 'flex-end',
  },
  leaderXpVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
  },
  studentMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  xpTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  earnedLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  badgeChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  badgeChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
