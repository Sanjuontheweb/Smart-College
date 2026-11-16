import React, { useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const CAMPUS_FORUM_ID = '__campus__';

export default function DiscussionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ clubId?: string }>();
  const { user, role } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { discussions, clubs, createDiscussionPost, addDiscussionReply } = useCampusData();
  const { showNotice } = useNotice();

  // null = community list, CAMPUS_FORUM_ID = campus-wide, otherwise a club id
  const [viewId] = useState<string | null>(
    params.clubId ? String(params.clubId) : null
  );

  const openCommunity = (communityId: string) => {
    router.push({
      pathname: '/screens/discussions',
      params: { clubId: communityId },
    });
  };

  const [newPostModal, setNewPostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postBody, setPostBody] = useState('');
  const [postTag, setPostTag] = useState('Algorithms');

  const [replyModal, setReplyModal] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const visibleClubs = useMemo(() => {
    if (role === 'admin') return clubs;
    return clubs.filter(
      (club) =>
        (club.joinedMemberIds || []).includes(user.id) ||
        (Boolean(club.isMember) && !club.joinedMemberIds)
    );
  }, [clubs, role, user.id]);

  const activeClub = clubs.find((c) => c.id === viewId);
  const isCampusForum = viewId === CAMPUS_FORUM_ID;
  const isForumView = viewId !== null;

  const clubPosts = useMemo(() => {
    if (activeClub) return discussions.filter((p) => p.tags?.includes(activeClub.id));
    if (isCampusForum) {
      return discussions.filter(
        (p) => !clubs.some((c) => p.tags?.includes(c.id))
      );
    }
    return [];
  }, [discussions, clubs, activeClub, isCampusForum]);

  const uniqueTagCount = (p: { tags: string[] }) =>
    p.tags.filter((t) => !clubs.some((c) => c.id === t));

  const handleCreatePost = () => {
    if (!postTitle.trim() || !postBody.trim()) {
      showNotice({
        title: 'Missing Fields',
        message: 'Please provide a question title and body.',
        type: 'warning',
      });
      return;
    }
    const tags = activeClub ? [postTag] : [postTag, 'CSE'];
    createDiscussionPost(
      postTitle.trim(),
      postBody.trim(),
      tags,
      user.fullName,
      role === 'student' ? 'Student' : role === 'faculty' ? 'Faculty' : 'Administrator',
      activeClub?.id
    );
    setPostTitle('');
    setPostBody('');
    setNewPostModal(false);
    showNotice({
      title: 'Question Posted!',
      message: activeClub
        ? `Your question is live in ${activeClub.name}.`
        : 'Your question has been published to the campus forum.',
      type: 'quest',
      xpReward: 25,
    });
  };

  const handleAddReply = () => {
    if (!selectedPostId || !replyText.trim()) return;
    const isFaculty = role === 'faculty' || role === 'admin';
    addDiscussionReply(selectedPostId, replyText.trim(), user.fullName, isFaculty);
    setReplyText('');
    setReplyModal(false);
    showNotice({
      title: 'Reply Added!',
      message: isFaculty
        ? 'Your verified faculty answer has been highlighted.'
        : 'Reply posted to the discussion thread.',
      type: 'quest',
      xpReward: isFaculty ? undefined : 20,
    });
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/screens/discussions');
  };

  const screenTitle = activeClub
    ? activeClub.name
    : isCampusForum
    ? 'Campus-wide Forum'
    : 'Campus Discussions & Forum';

  const renderPost = (post: (typeof discussions)[number]) => (
    <Card
      key={post.id}
      style={{
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        marginBottom: 14,
      }}
    >
      <View style={styles.postHeader}>
        <View style={styles.tagRow}>
          {uniqueTagCount(post).map((t, idx) => (
            <Badge key={idx} label={t} variant="primary" />
          ))}
        </View>
        <Text style={[styles.timeAgo, { color: colors.textSecondary }]}>{post.timeAgo}</Text>
      </View>

      <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
      <Text style={[styles.postBody, { color: colors.textSecondary }]}>{post.body}</Text>

      <View style={styles.authorRow}>
        <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
        <Text style={[styles.authorName, { color: colors.text }]}>{post.authorName}</Text>
        <Text style={[styles.authorRole, { color: colors.textSecondary }]}>
          | {post.authorRole}
        </Text>
      </View>

      {post.verifiedAnswer && (
        <View style={[styles.verifiedBox, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}>
          <View style={styles.verifiedHeader}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" style={{ marginRight: 4 }} />
            <Text style={[styles.verifiedLabel, { color: '#059669' }]}>
              Verified Faculty Answer
            </Text>
          </View>
          <Text style={[styles.verifiedText, { color: colors.text }]}>{post.verifiedAnswer}</Text>
        </View>
      )}

      {post.replies && post.replies.length > 0 && (
        <View
          style={{
            marginTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 8,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: colors.textSecondary,
              marginBottom: 6,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Replies ({post.replies.length})
          </Text>
          {post.replies.map((reply) => (
            <View
              key={reply.id}
              style={{
                flexDirection: 'row',
                marginBottom: 8,
                paddingLeft: 10,
                borderLeftWidth: 2,
                borderLeftColor: reply.isVerified ? '#059669' : colors.border,
              }}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: reply.isVerified ? '#059669' : colors.text,
                      marginRight: 4,
                    }}
                  >
                    {reply.authorName}
                  </Text>
                  {reply.isVerified && (
                    <Ionicons name="checkmark-circle" size={12} color="#059669" />
                  )}
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginLeft: 4 }}>
                    {reply.timeAgo}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.text, lineHeight: 17 }}>
                  {reply.text}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() =>
            showNotice({
              title: 'Upvoted!',
              message: 'You upvoted this discussion topic.',
              type: 'success',
            })
          }
        >
          <Ionicons name="thumbs-up-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>
            {post.likes} Upvotes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => {
            setSelectedPostId(post.id);
            setReplyModal(true);
          }}
        >
          <Ionicons name="chatbubble-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionBtnText, { color: colors.primary }]}>
            {post.repliesCount} Replies | Add Reply
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  return (
    <View
      style={[
        styles.safeArea,
        { backgroundColor: colors.background, paddingBottom: insets.bottom },
      ]}
    >
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
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={isForumView ? 'Back to communities' : 'Go back'}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]} numberOfLines={1}>
          {screenTitle}
        </Text>
        <TouchableOpacity
          style={[styles.newBtn, { backgroundColor: colors.primary }]}
          onPress={() => setNewPostModal(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newBtnText}>Ask</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!isForumView && (
          <>
            {role === 'admin' && (
              <View
                style={[
                  styles.adminBanner,
                  { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF', borderColor: '#7A3CFF' },
                ]}
              >
                <Ionicons name="shield-checkmark" size={16} color="#7A3CFF" />
                <Text style={[styles.adminBannerText, { color: colors.text }]}>
                  Admin view | all communities, discussions and replies
                </Text>
              </View>
            )}

            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              {role === 'admin' ? 'All Communities' : 'My Communities'} ({visibleClubs.length})
            </Text>

            {visibleClubs.length === 0 && (
              <Card
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 16,
                }}
              >
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    You have not joined a club yet
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Join a club from the Events tab to unlock its private discussion forum.
                  </Text>
                  <Button
                    title="Browse Clubs"
                    icon="people-outline"
                    size="small"
                    onPress={() => router.push('/(tabs)/events')}
                    style={{ marginTop: 12 }}
                  />
                </View>
              </Card>
            )}

            {visibleClubs.map((club) => {
              const postCount = discussions.filter((p) => p.tags?.includes(club.id)).length;
              return (
                <TouchableOpacity
                  key={club.id}
                  activeOpacity={0.8}
                  onPress={() => openCommunity(club.id)}
                  style={[
                    styles.clubCard,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <View style={styles.clubHeader}>
                    <View
                      style={[
                        styles.clubIconBox,
                        { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF' },
                      ]}
                    >
                      <Ionicons
                        name={(club.icon as any) || 'people'}
                        size={24}
                        color="#7A3CFF"
                      />
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
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </View>

                  <Text style={[styles.clubDesc, { color: colors.textSecondary }]}>
                    {club.description}
                  </Text>

                  <View style={styles.clubFooter}>
                    <View style={styles.clubFooterItem}>
                      <Ionicons name="chatbubbles-outline" size={13} color={colors.primary} />
                      <Text style={[styles.clubFooterText, { color: colors.primary }]}>
                        {postCount} Discussion{postCount === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <View style={styles.clubFooterItem}>
                      <Ionicons name="checkmark-circle" size={13} color="#059669" />
                      <Text style={[styles.clubFooterText, { color: '#059669' }]}>
                        {role === 'admin' ? 'Manage Forum' : 'Joined'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openCommunity(CAMPUS_FORUM_ID)}
              style={[
                styles.clubCard,
                {
                  backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                  borderColor: colors.cardBorder,
                  borderStyle: 'dashed',
                },
              ]}
            >
              <View style={styles.clubHeader}>
                <View
                  style={[styles.clubIconBox, { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' }]}
                >
                  <Ionicons name="globe-outline" size={24} color="#2563EB" />
                </View>
                <View style={{ flex: 1, paddingLeft: 12 }}>
                  <Badge label="Open to All" variant="info" size="small" />
                  <Text style={[styles.clubName, { color: colors.text, marginTop: 3 }]}>
                    Campus-wide Forum
                  </Text>
                  <Text style={[styles.clubSub, { color: colors.textSecondary }]}>
                    General academic queries, course tips and verified faculty answers
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {isForumView && (
          <>
            {activeClub && (
              <Card
                style={{
                  backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
                  borderColor: '#7A3CFF',
                  marginBottom: 16,
                }}
              >
                <View style={styles.clubHeader}>
                  <View
                    style={[
                      styles.clubIconBox,
                      { backgroundColor: isDark ? '#111827' : '#FFFFFF' },
                    ]}
                  >
                    <Ionicons
                      name={(activeClub.icon as any) || 'people'}
                      size={22}
                      color="#7A3CFF"
                    />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 12 }}>
                    <Text style={[styles.clubName, { color: colors.text }]}>
                      {activeClub.name}
                    </Text>
                    <Text style={[styles.clubSub, { color: colors.textSecondary }]}>
                      {activeClub.members} Members | Leads: {activeClub.leads}
                    </Text>
                  </View>
                  <Badge label="Community" variant="primary" size="small" />
                </View>
                <Text style={[styles.clubDesc, { color: colors.textSecondary, marginTop: 8 }]}>
                  {activeClub.description}
                </Text>
              </Card>
            )}

            {isCampusForum && (
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Campus-wide Discussions ({clubPosts.length})
              </Text>
            )}

            {clubPosts.length === 0 ? (
              <Card
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  marginBottom: 16,
                }}
              >
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={32} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    No discussions yet
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Be the first to ask a question in this community using the Ask button.
                  </Text>
                </View>
              </Card>
            ) : (
              clubPosts.map(renderPost)
            )}
          </>
        )}
      </ScrollView>

      {/* MODAL: NEW QUESTION */}
      <Modal
        visible={newPostModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNewPostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {activeClub ? `Ask ${activeClub.name}` : 'Ask Campus Question'}
              </Text>
              <TouchableOpacity onPress={() => setNewPostModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Category Tag</Text>
            <View style={styles.tagSelectRow}>
              {['Algorithms', 'DBMS', 'Exams', 'Placements', 'Hostel'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tagChoice,
                    {
                      backgroundColor: postTag === t ? colors.primary : colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setPostTag(t)}
                >
                  <Text
                    style={{
                      color: postTag === t ? '#FFFFFF' : colors.text,
                      fontWeight: '700',
                      fontSize: 12,
                    }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Question Title</Text>
            <TextInput
              style={[
                styles.textInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              placeholder="e.g. Best reference for BCS401 Dynamic Programming?"
              placeholderTextColor={colors.textSecondary}
              value={postTitle}
              onChangeText={setPostTitle}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Details</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  height: 90,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="Provide context so peers and professors can help..."
              placeholderTextColor={colors.textSecondary}
              multiline
              value={postBody}
              onChangeText={setPostBody}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setNewPostModal(false)}
                style={{ flex: 1 }}
              />
              <Button title="Post Question" onPress={handleCreatePost} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD REPLY */}
      <Modal
        visible={replyModal}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {role === 'faculty' ? 'Post Verified Faculty Answer' : 'Add Discussion Reply'}
              </Text>
              <TouchableOpacity onPress={() => setReplyModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  height: 100,
                  textAlignVertical: 'top',
                },
              ]}
              placeholder="Write your answer or guidance..."
              placeholderTextColor={colors.textSecondary}
              multiline
              value={replyText}
              onChangeText={setReplyText}
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setReplyModal(false)}
                style={{ flex: 1 }}
              />
              <Button title="Submit Reply" onPress={handleAddReply} style={{ flex: 1 }} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: {
    padding: 4,
  },
  screenTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  newBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 4,
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
  clubCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  clubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 10,
  },
  clubFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  clubFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clubFooterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    textAlign: 'center',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    flex: 1,
  },
  timeAgo: {
    fontSize: 11,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  postBody: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '700',
  },
  authorRole: {
    fontSize: 11,
  },
  verifiedBox: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  verifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  verifiedLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  verifiedText: {
    fontSize: 12,
    lineHeight: 16,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 8,
  },
  tagSelectRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagChoice: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
});
