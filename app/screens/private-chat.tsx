import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/common/Header';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useNotice } from '@/context/NoticeContext';
import { PrivateChannel, PrivateMessage } from '@/services/localDb';

const getOtherParticipant = (channel: PrivateChannel, myId: string) => {
  const idx = channel.participantIds.findIndex((id) => id !== myId);
  const index = idx === -1 ? 0 : idx;
  return {
    id: channel.participantIds[index],
    name: channel.participantNames[index] || 'Unknown',
    role: channel.participantRoles[index] || 'faculty',
  };
};

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export default function PrivateChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ channelId?: string }>();
  const channelId = params.channelId ? String(params.channelId) : '';
  const { user, role } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();
  const {
    privateChannels,
    privateMessages,
    sendPrivateMessage,
    deletePrivateChannel,
    reportPrivateChannel,
  } = useCampusData();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const channel = privateChannels.find((c) => c.id === channelId);
  const isParticipant = Boolean(
    channel?.participantIds?.includes(user.id)
  );
  const isAdminViewer =
    role === 'admin' && channel?.reported === true && !isParticipant;

  useEffect(() => {
    if (!channelId) return;
    const myChannel = privateChannels.find((c) => c.id === channelId);
    if (!myChannel) {
      showNotice({
        title: 'Channel Not Found',
        message: 'This private channel no longer exists.',
        type: 'warning',
      });
      router.back();
    }
  }, [channelId, privateChannels, router, showNotice]);

  const other = channel ? getOtherParticipant(channel, user.id) : null;

  const orderedMessages = useMemo(
    () =>
      privateMessages
        .filter((m) => m.channelId === channelId)
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [privateMessages, channelId]
  );

  const handleSend = async () => {
    const trimmed = messageText.trim();
    if (!trimmed || !channel || !isParticipant || sending) return;
    setSending(true);
    const sent = await sendPrivateMessage(channel.id, trimmed);
    setSending(false);
    if (sent) {
      setMessageText('');
    } else {
      showNotice({
        title: 'Message Failed',
        message: 'Could not send the message. Please try again.',
        type: 'error',
      });
    }
  };

  const handleDeleteRequest = () => setDeleteModalVisible(true);

  const handleDeleteConfirm = async () => {
    if (!channel) return;
    await deletePrivateChannel(channel.id, { notifyParticipants: isAdminViewer });
    setDeleteModalVisible(false);
    showNotice({
      title: 'Channel Deleted',
      message: 'The private channel and its messages were removed.',
      type: 'info',
    });
    router.back();
  };

  const handleReport = async () => {
    if (!channel || role === 'admin') return;
    if (channel.reported) {
      showNotice({
        title: 'Already Reported',
        message: 'This channel has already been reported to the admin.',
        type: 'info',
      });
      return;
    }

    const result = await reportPrivateChannel(channel.id);
    if (result.deleted) {
      showNotice({
        title: 'Channel Removed',
        message: 'Reported channel and messages were deleted as per policy.',
        type: 'info',
      });
      router.back();
      return;
    }
    showNotice({
      title: 'Reported to Admin',
      message: 'The admin has been notified and can now review this channel.',
      type: 'warning',
    });
  };

  if (!channel || !other) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
        <Header subtitle="Private Channel" showBackButton />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading channel…</Text>
        </View>
      </View>
    );
  }

  const title = isAdminViewer
    ? channel.participantNames.join(' ↔ ')
    : other.name;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.screen}>
        <Header subtitle="Private Channel" showBackButton />

        {/* Channel header */}
        <View
          style={[
            styles.channelBar,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Ionicons name={other.role === 'faculty' ? 'school' : 'person'} size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={[styles.otherName, { color: colors.text }]} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
              {isAdminViewer ? 'Admin review • read-only' : `${other.role.charAt(0).toUpperCase() + other.role.slice(1)} • Private channel`}
            </Text>
          </View>
          <View style={styles.actionRow}>
            {role !== 'admin' && !channel.reported && !isAdminViewer && (
              <TouchableOpacity
                onPress={handleReport}
                style={[styles.iconBtn, { backgroundColor: isDark ? '#3F1D1D' : '#FEF2F2' }]}
                accessibilityLabel="Report channel to admin"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="flag-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleDeleteRequest}
              style={[styles.iconBtn, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}
              accessibilityLabel="Delete private channel"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Message list */}
        <FlatList
          data={orderedMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="chatbubble-ellipses-outline" size={40} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Start the conversation
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                Messages here are private between the two of you.
              </Text>
            </View>
          }
          renderItem={({ item }: { item: PrivateMessage }) => {
            const mine = item.senderId === user.id;
            return (
              <View
                style={[
                  styles.bubbleRow,
                  mine ? styles.bubbleRowMine : styles.bubbleRowOther,
                ]}
              >
                {!mine && !isAdminViewer && (
                  <View style={[styles.msgAvatar, { backgroundColor: colors.searchBarBg }]}>
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '800' }}>
                      {item.senderName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    mine
                      ? { backgroundColor: colors.primary, borderBottomRightRadius: 4 }
                      : { backgroundColor: colors.card, borderBottomLeftRadius: 4 },
                  ]}
                >
                  {!mine && (
                    <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: '700', marginBottom: 2 }}>
                      {item.senderName}
                    </Text>
                  )}
                  <Text style={{ color: mine ? '#FFFFFF' : colors.text, fontSize: 14, lineHeight: 19 }}>
                    {item.text}
                  </Text>
                  <Text
                    style={{
                      color: mine ? 'rgba(255,255,255,0.75)' : colors.textMuted,
                      fontSize: 9,
                      marginTop: 4,
                      alignSelf: mine ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Admin read-only marker */}
        {isAdminViewer && (
          <View style={[styles.readOnlyBar, { borderTopColor: colors.border }]}>
            <Badge label="Read-only • Admin cannot send messages" variant="warning" />
          </View>
        )}

        {/* Composer */}
        {isParticipant && (
          <View
            style={[
              styles.composer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                paddingBottom: isKeyboardVisible ? 11 : Math.max(insets.bottom, 12),
              },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.searchBarBg,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="Type a private message…"
              placeholderTextColor={colors.textSecondary}
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={600}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!messageText.trim() || sending}
              style={[
                styles.sendBtn,
                { backgroundColor: messageText.trim() ? colors.primary : colors.border },
              ]}
              accessibilityLabel="Send message"
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        )}

        <ConfirmModal
          visible={deleteModalVisible}
          title="Delete Private Channel"
          description="This permanently deletes the channel and all its messages for both participants. This cannot be undone."
          items={['Private channel removed', 'All messages removed', 'Participant access revoked']}
          cancelLabel="Cancel"
          confirmLabel="Delete Channel"
          icon="trash"
          destructive
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteModalVisible(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otherName: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    flexGrow: 1,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 8,
    maxWidth: '85%',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
  },
  bubbleRowOther: {
    alignSelf: 'flex-start',
    alignItems: 'flex-end',
    gap: 6,
  },
  msgAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 0,
  },
  readOnlyBar: {
    paddingTop: 17,
    paddingBottom: 10,
    paddingLeft: 90,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
