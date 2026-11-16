import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useNotice } from '@/context/NoticeContext';
import { Header } from '@/components/common/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  askSmartCampusAI,
  ChatMessage,
  ChatAttachment,
  FREE_AI_MODELS,
  AIModelOption,
  AIRateLimitError,
  AIOfflineError,
  getHuggingFaceToken,
  saveHuggingFaceToken,
} from '@/services/aiService';
import { openStudyMaterial } from '@/services/documentService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Image, Alert } from 'react-native';
import { FormattedMarkdownText } from '@/components/common/FormattedMarkdownText';

export default function AssistantScreen() {
  const pathname = usePathname();
  const isStackScreen = pathname?.startsWith('/screens/');
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { showNotice } = useNotice();
  const scrollViewRef = useRef<any>(null);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AIModelOption>(FREE_AI_MODELS[0]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [modelModalVisible, setModelModalVisible] = useState(false);

  // HF Token Settings Modal
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [hfTokenInput, setHfTokenInput] = useState('');
  const [hasTokenConfigured, setHasTokenConfigured] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Update welcome message when user changes (e.g. after role switch)
  useEffect(() => {
    setMessages([
      {
        id: 'welcome_1',
        sender: 'assistant',
        text: `Hello ${user.fullName.replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, '').split(' ')[0]}! 👋 I'm your official **Survive College AI Companion** powered by ultra-fast **Groq Cloud models** (OpenAI GPT-OSS, Qwen & DeepSeek).\n\nI can answer **anything**:\n• Campus faculty cabins & office hours\n• Exam preparation, coding & syllabus notes\n• Shuttle bus timings & study techniques\n\nHow can I help you survive college today?`,
        timestamp: 'Just now',
        modelUsed: selectedModel.name,
      },
    ]);
  }, [user.fullName]);

  const suggestedQuestions = [
    "Where is Dr. Guru Prasad's cabin?",
    "Tips for BCS503 Theory Of Computation exam?",
    "What are Central Library extended hours?",
    "Where is the campus emergency health clinic?",
  ];

  useEffect(() => {
    getHuggingFaceToken().then((tok) => {
      if (tok && tok.length > 0) {
        setHasTokenConfigured(true);
        setHfTokenInput(tok);
      }
    });
  }, []);

  const handleSaveToken = async () => {
    const clean = hfTokenInput
      .trim()
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/^["'`]|["'`]$/g, '')
      .replace(/[\r\n\t]/g, '')
      .trim();
    if (!clean) {
      showNotice({
        title: 'Empty Key',
        message: 'Please paste your Groq API key before saving.',
        type: 'warning',
      });
      return;
    }
    await saveHuggingFaceToken(clean);
    setHfTokenInput(clean);
    setHasTokenConfigured(true);
    setTokenModalVisible(false);
    showNotice({
      title: 'Groq Key Verified & Saved',
      message: 'Your Groq API key is stored securely in device hardware keystore.',
      type: 'success',
    });
  };

  const handleSelectModel = (model: AIModelOption) => {
    setSelectedModel(model);
    setIsRateLimited(false);
    setRateLimitMessage('');
    setModelModalVisible(false);
    showNotice({
      title: 'Model Switched',
      message: `Active model: ${model.name} (${model.provider})`,
      type: 'info',
    });
  };

  const handlePickAttachment = async () => {
    if (loading) return;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        // Auto-switch to vision model
        const visionModel = FREE_AI_MODELS.find((m) => m.id === 'qwen/qwen3.8-27b') || FREE_AI_MODELS[2];
        if (selectedModel.id !== visionModel.id) {
          setSelectedModel(visionModel);
          showNotice({
            title: 'Multimodal AI Activated',
            message: `Switched to ${visionModel.name} to process attachments.`,
            type: 'info',
          });
        }

        const newItems: ChatAttachment[] = await Promise.all(
          res.assets.map(async (file) => {
            const isImg = file.mimeType?.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/i.test(file.name);
            let safeUri = file.uri;
            try {
              const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'file.bin';
              const dest = `${FileSystem.cacheDirectory}chat_file_${Date.now()}_${safeName}`;
              await FileSystem.copyAsync({ from: file.uri, to: dest });
              safeUri = dest;
            } catch (copyErr) {
              console.warn('[Assistant] Could not copy picked file to cache:', copyErr);
            }
            return {
              uri: safeUri,
              name: file.name,
              type: isImg ? 'image' : 'document',
              mimeType: file.mimeType || (isImg ? 'image/jpeg' : 'application/pdf'),
              size: file.size,
            };
          })
        );

        setPendingAttachments((prev) => [...prev, ...newItems]);
      }
    } catch (err: any) {
      console.warn('[Assistant] Error selecting attachment:', err);
      showNotice({
        title: 'Selection Failed',
        message: 'Could not select the file. Please try again.',
        type: 'warning',
      });
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText || input).trim();
    if ((!textToSend && pendingAttachments.length === 0) || loading || isRateLimited) return;

    const attachmentsToSend = [...pendingAttachments];
    setPendingAttachments([]);

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: textToSend || (attachmentsToSend.length > 0 ? `Analyze attached file(s) (${attachmentsToSend.length})` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askSmartCampusAI({
        message: textToSend || (attachmentsToSend.length > 0 ? `Analyze attached file(s) (${attachmentsToSend.length})` : ''),
        history: messages,
        userName: user.fullName,
        userRole: role,
        modelId: selectedModel.id,
        attachments: attachmentsToSend.length > 0 ? attachmentsToSend : undefined,
      });

      setMessages((prev) => [...prev, response]);
      setIsRateLimited(false);
    } catch (err: any) {
      if (err instanceof AIRateLimitError || err.isRateLimited) {
        setIsRateLimited(true);
        setRateLimitMessage(
          err.message ||
            'Free-tier rate limit reached on this model. Please switch to another free model above.'
        );
        showNotice({
          title: 'Rate Limit Reached',
          message: 'Free-tier token limit hit. Switch models via the header to continue chatting!',
          type: 'warning',
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_rate_${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ **Rate Limit Reached on ${selectedModel.name}**\n\nGroq free-tier limits reset every minute. In the meantime, you can **switch to another free model** (such as *${
              FREE_AI_MODELS.find((m) => m.id !== selectedModel.id)?.name || 'Llama 3.1'
            }*) using the model switcher at the top of this screen.`,
            timestamp: 'Just now',
            isRateLimited: true,
          },
        ]);
      } else if (err instanceof AIOfflineError || err.isOffline) {
        showNotice({
          title: 'You Are Offline',
          message: 'Device has no internet. The AI assistant requires internet to connect to Groq Cloud.',
          type: 'error',
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_off_${Date.now()}`,
            sender: 'assistant',
            text: '📡 **Offline Notice**: Device is offline or unable to reach AI servers. Please connect to Wi-Fi or mobile data to chat with online models.',
            timestamp: 'Just now',
          },
        ]);
      } else if (err.message && err.message.includes('AUTH_REQUIRED')) {
        setTokenModalVisible(true);
        const detail = err.message.replace(/^.*AUTH_REQUIRED:\s*/, '');
        showNotice({
          title: 'Groq Key Issue',
          message:
            detail && detail !== 'HF_AUTH_REQUIRED' && detail !== 'GROQ_AUTH_REQUIRED'
              ? detail
              : 'Please enter your free Groq API key from console.groq.com (starts with gsk_).',
          type: 'warning',
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_err_${Date.now()}`,
            sender: 'assistant',
            text: `⚠️ **Error connecting to ${selectedModel.name}**: ${err.message || 'Please check your connection and try again.'}`,
            timestamp: 'Just now',
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, [messages, loading]);

  const clearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        sender: 'assistant',
        text: `Chat cleared. Ready for your college survival queries, ${user.fullName.split(' ')[0]}!`,
        timestamp: 'Just now',
        modelUsed: selectedModel.name,
      },
    ]);
    setIsRateLimited(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      <Header subtitle="Online AI Academic Companion" />

      {/* Model Selector & Status Bar */}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: isDark ? '#161F30' : '#FFFFFF',
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => setModelModalVisible(true)}
          style={[styles.modelPickerBtn, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF', borderColor: colors.primary }]}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={14} color={colors.primary} />
          <Text style={[styles.modelPickerText, { color: colors.text }]} numberOfLines={1}>
            {selectedModel.name}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.statusRight}>
          <TouchableOpacity
            onPress={() => setTokenModalVisible(true)}
            style={[
              styles.tokenPill,
              {
                backgroundColor: hasTokenConfigured
                  ? isDark
                    ? '#064E3B'
                    : '#ECFDF5'
                  : isDark
                  ? '#78350F'
                  : '#FEF3C7',
                borderColor: hasTokenConfigured ? '#059669' : '#D97706',
              },
            ]}
          >
            <Ionicons
              name={hasTokenConfigured ? 'key' : 'key-outline'}
              size={12}
              color={hasTokenConfigured ? '#059669' : '#D97706'}
            />
            <Text
              style={[
                styles.tokenText,
                { color: hasTokenConfigured ? '#059669' : '#D97706' },
              ]}
            >
              {hasTokenConfigured ? 'Free Key Active' : 'Add Free Key'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={clearChat} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Rate Limit Warning Banner */}
      {isRateLimited && (
        <View style={styles.rateLimitBanner}>
          <Ionicons name="warning" size={16} color="#FF2E88" />
          <Text style={styles.rateLimitText}>
            Token limit reached on {selectedModel.name}. Tap to switch model:
          </Text>
          <TouchableOpacity
            onPress={() => setModelModalVisible(true)}
            style={styles.switchModelBtn}
          >
            <Text style={styles.switchModelBtnText}>Switch Model</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={styles.chatScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Messages */}
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            if (isUser) {
              return (
                <View key={msg.id} style={[styles.msgWrapper, styles.msgWrapperUser]}>
                  <View style={[styles.msgBubble, styles.userBubble, { backgroundColor: colors.primary }]}>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <View style={{ gap: 6, marginBottom: 8 }}>
                        {msg.attachments.map((att, idx) => (
                          <TouchableOpacity
                            key={idx}
                            activeOpacity={0.8}
                            onPress={() => {
                              if (att.uri) {
                                openStudyMaterial({
                                  id: `att_${Date.now()}_${idx}`,
                                  courseCode: 'CHAT',
                                  courseTitle: 'Attachment',
                                  title: att.name,
                                  category: 'Notes',
                                  fileType: 'PDF',
                                  fileSize: `${Math.round((att.size || 1024) / 1024)} KB`,
                                  uploadedBy: 'User',
                                  date: 'Today',
                                  fileUri: att.uri,
                                });
                              }
                            }}
                            style={styles.attachmentPreviewBubble}
                          >
                            {att.type === 'image' ? (
                              <Image
                                source={{ uri: att.uri }}
                                style={styles.attachmentImageThumb}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.attachmentDocThumb}>
                                <Ionicons name="document-text" size={24} color="#FFFFFF" />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.attachmentName} numberOfLines={1}>
                                {att.name}
                              </Text>
                              <Text style={styles.attachmentMeta}>
                                Tap to view • {att.type.toUpperCase()}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                    <Text style={[styles.msgText, styles.userMsgText]}>
                      {msg.text}
                    </Text>
                  </View>
                </View>
              );
            }

            return (
              <View key={msg.id} style={styles.aiFullWidthContainer}>
                <View style={styles.aiHeaderRow}>
                  <View style={[styles.aiAvatar, { backgroundColor: '#7A3CFF' }]}>
                    <Ionicons name="sparkles" size={13} color="#2EF2FF" />
                  </View>
                  <Text style={[styles.modelTag, { color: colors.primary }]}>
                    {msg.modelUsed || selectedModel.name}
                  </Text>
                  <Text style={[styles.timestampText, { color: colors.textMuted }]}>
                    {msg.timestamp}
                  </Text>
                </View>

                <View style={styles.aiContentFullWidth}>
                  <FormattedMarkdownText
                    content={msg.text}
                    color={colors.text}
                    style={styles.aiMsgText}
                  />

                  {msg.attachments && msg.attachments.length > 0 && (
                    <View style={{ gap: 6, marginTop: 10 }}>
                      {msg.attachments.map((att, idx) => (
                        <TouchableOpacity
                          key={idx}
                          activeOpacity={0.8}
                          onPress={() => {
                            if (att.uri) {
                              openStudyMaterial({
                                id: `att_res_${Date.now()}_${idx}`,
                                courseCode: 'AI_RES',
                                courseTitle: 'Generated File',
                                title: att.name,
                                category: 'Notes',
                                fileType: 'PDF',
                                fileSize: `${Math.round((att.size || 1024) / 1024)} KB`,
                                uploadedBy: 'AI Companion',
                                date: 'Today',
                                fileUri: att.uri,
                              });
                            }
                          }}
                          style={[
                            styles.attachmentPreviewBubble,
                            { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' },
                          ]}
                        >
                          <Ionicons
                            name={att.type === 'image' ? 'image-outline' : 'download-outline'}
                            size={20}
                            color={colors.primary}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                              {att.name}
                            </Text>
                            <Text style={[styles.attachmentMeta, { color: colors.textSecondary }]}>
                              Tap to download / view file
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {loading && (
            <View style={styles.aiFullWidthContainer}>
              <View style={styles.aiHeaderRow}>
                <View style={[styles.aiAvatar, { backgroundColor: '#7A3CFF' }]}>
                  <Ionicons name="sparkles" size={13} color="#2EF2FF" />
                </View>
                <Text style={[styles.modelTag, { color: colors.primary }]}>
                  {selectedModel.name}
                </Text>
              </View>
              <View style={styles.loadingFullWidth}>
                <ActivityIndicator size="small" color="#7A3CFF" />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}

          {/* Quick Prompts */}
          {messages.length < 4 && !loading && (
            <View style={styles.promptContainer}>
              <Text style={[styles.promptHeader, { color: colors.textSecondary }]}>
                COLLEGE SURVIVAL PROMPTS:
              </Text>
              <View style={styles.promptGrid}>
                {suggestedQuestions.map((q, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      styles.promptChip,
                      {
                        backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                        borderColor: colors.cardBorder,
                      },
                    ]}
                    onPress={() => handleSend(q)}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.primary} />
                    <Text style={[styles.promptText, { color: colors.text }]}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Input Area */}
        {pendingAttachments.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[
              styles.pendingAttachmentScroll,
              {
                backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                borderTopColor: colors.border,
              },
            ]}
            contentContainerStyle={styles.pendingAttachmentContainer}
          >
            {pendingAttachments.map((item, idx) => (
              <View
                key={idx}
                style={[
                  styles.pendingAttachmentChip,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name={item.type === 'image' ? 'image' : 'document-text'}
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.pendingAttachmentName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <TouchableOpacity
                  onPress={() => setPendingAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  style={styles.pendingAttachmentClose}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: isDark ? '#111827' : '#FFFFFF',
              borderTopColor: colors.border,
              paddingBottom: isStackScreen
                ? isKeyboardVisible
                  ? (Platform.OS === 'android' ? 12 : 12)
                  : Math.max(insets.bottom, 12)
                : 9,
            },
          ]}
        >
          {/* Plus icon on left side to attach photos and documents */}
          <TouchableOpacity
            style={[
              styles.attachBtn,
              {
                backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                borderColor: pendingAttachments.length > 0 ? colors.primary : colors.border,
              },
            ]}
            onPress={handlePickAttachment}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Ionicons
              name={pendingAttachments.length > 0 ? 'checkmark-circle' : 'add'}
              size={22}
              color={pendingAttachments.length > 0 ? colors.primary : colors.textSecondary}
            />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.inputField,
              {
                backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                color: colors.text,
                borderColor: isRateLimited ? '#FF2E88' : colors.border,
              },
            ]}
            placeholder={
              isRateLimited
                ? 'Rate limited. Switch model to continue...'
                : pendingAttachments.length > 0
                ? `Prompt (${pendingAttachments.length} file(s) attached)...`
                : 'Ask anything about academics... Shoot'
            }
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={600}
            editable={!loading && !isRateLimited}
            onSubmitEditing={() => handleSend()}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  (!input.trim() && pendingAttachments.length === 0) || loading || isRateLimited
                    ? '#94A3B8'
                    : colors.primary,
              },
            ]}
            onPress={() => handleSend()}
            disabled={(!input.trim() && pendingAttachments.length === 0) || loading || isRateLimited}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ================================================================ */}
      {/* MODEL SWITCHER MODAL */}
      {/* ================================================================ */}
      <Modal
        visible={modelModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Switch AI Model</Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  All models are 100% free via Hugging Face Inference
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModelModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

        <ScrollView style={{ maxHeight: 380 }}>
              {FREE_AI_MODELS.map((item) => {
                const isSelected = selectedModel.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectModel(item)}
                    style={[
                      styles.modelCard,
                      {
                        backgroundColor: isSelected
                          ? isDark
                            ? '#1A0F3C'
                            : '#EEF2FF'
                          : isDark
                          ? '#161F30'
                          : '#F8FAFC',
                        borderColor: isSelected ? '#7A3CFF' : colors.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={styles.modelCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.modelCardName, { color: colors.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.modelCardProvider, { color: colors.textSecondary }]}>
                          {item.provider} • {item.contextLength} ctx
                        </Text>
                      </View>
                      {isSelected ? (
                        <Badge label="ACTIVE" variant="primary" />
                      ) : (
                        <Badge label="FREE" variant="success" />
                      )}
                    </View>
                    <Text style={[styles.modelCardDesc, { color: colors.textMuted }]}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ================================================================ */}
      {/* FREE GROQ API KEY MODAL */}
      {/* ================================================================ */}
      <Modal
        visible={tokenModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTokenModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: isDark ? '#111827' : '#FFFFFF', borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Groq Cloud Free API Key
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  100% Free • Ultra-Fast Inference • No Credit Card
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTokenModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.tokenInstructions}>
              <Text style={[styles.stepText, { color: colors.text }]}>
                1. Go to <Text style={{ fontWeight: '800', color: colors.primary }}>console.groq.com</Text> and sign in for free.
              </Text>
              <Text style={[styles.stepText, { color: colors.text }]}>
                2. In the left menu, click <Text style={{ fontWeight: '800' }}>API Keys</Text> → <Text style={{ fontWeight: '800', color: '#059669' }}>Create API Key</Text>.
              </Text>
              <Text style={[styles.stepText, { color: colors.text }]}>
                3. Copy your key (starts with <Text style={{ fontWeight: '800', color: '#059669' }}>gsk_</Text>).
              </Text>
              <Text style={[styles.stepText, { color: colors.text }]}>
                4. Paste your key below and tap Save:
              </Text>
            </View>

            <TextInput
              style={[
                styles.tokenInputField,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              placeholderTextColor={colors.textSecondary}
              value={hfTokenInput}
              onChangeText={setHfTokenInput}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />

            <View style={styles.tokenModalBtnRow}>
              <TouchableOpacity
                onPress={() => setTokenModalVisible(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSaveToken}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>Save Free Key</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modelPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '55%',
  },
  modelPickerText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tokenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tokenText: {
    fontSize: 10,
    fontWeight: '800',
  },
  clearBtn: {
    padding: 4,
  },
  rateLimitBanner: {
    backgroundColor: '#1A0F3C',
    borderColor: '#FF2E88',
    borderBottomWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateLimitText: {
    color: '#FCA5A5',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  switchModelBtn: {
    backgroundColor: '#FF2E88',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  switchModelBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  chatScroll: {
    padding: 16,
    paddingBottom: 20,
  },
  msgWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  msgWrapperUser: {
    justifyContent: 'flex-end',
    width: '100%',
  },
  msgWrapperAssistant: {
    justifyContent: 'flex-start',
    width: '100%',
  },
  aiFullWidthContainer: {
    width: '100%',
    marginBottom: 20,
    paddingVertical: 2,
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiContentFullWidth: {
    width: '100%',
    paddingLeft: 4,
    paddingRight: 4,
  },
  loadingFullWidth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 4,
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBubble: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  modelTag: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  timestampText: {
    fontSize: 10,
    marginLeft: 'auto',
  },
  msgText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMsgText: {
    color: '#FFFFFF',
  },
  aiMsgText: {
    fontSize: 14,
    lineHeight: 22,
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  promptContainer: {
    marginTop: 16,
  },
  promptHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  promptGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    width: '48%',
  },
  promptText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  pendingAttachmentScroll: {
    borderTopWidth: 1,
    maxHeight: 52,
  },
  pendingAttachmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  pendingAttachmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pendingAttachmentName: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 140,
  },
  pendingAttachmentClose: {
    padding: 2,
    marginLeft: 2,
  },
  attachmentPreviewBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  attachmentImageThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  attachmentDocThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  attachmentMeta: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 10,
  },
  inputField: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 90,
    fontSize: 13,
    borderWidth: 1,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modelCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  modelCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modelCardName: {
    fontSize: 14,
    fontWeight: '800',
  },
  modelCardProvider: {
    fontSize: 11,
    marginTop: 1,
  },
  modelCardDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  tokenInstructions: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  stepText: {
    fontSize: 12,
    lineHeight: 17,
  },
  tokenInputField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 14,
  },
  tokenModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalCancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  modalSaveBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
