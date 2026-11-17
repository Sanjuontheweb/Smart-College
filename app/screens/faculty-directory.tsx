import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { FACULTY_DIRECTORY } from '@/constants/CampusData';
import { LocalCampusDB } from '@/services/localDb';
import { openStudyMaterial } from '@/services/documentService';

export default function FacultyDirectoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { role } = useAuth();
  const { faculties, timetable, createPrivateChannel, collegeLayout, setCollegeLayout, deleteCollegeLayout } = useCampusData();
  const { showNotice } = useNotice();
  const [search, setSearch] = useState('');
  const [uploadingLayout, setUploadingLayout] = useState(false);
  const [viewingLayout, setViewingLayout] = useState(false);
  const [layoutNotes, setLayoutNotes] = useState('');
  const [isLayoutKeyboardVisible, setIsLayoutKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsLayoutKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsLayoutKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);
  const [deleteLayoutModalVisible, setDeleteLayoutModalVisible] = useState(false);

  // Map portal / localDb faculties into directory format and merge with fallback catalog
  const mergedDirectory = useMemo(() => {
    if (!faculties || faculties.length === 0) {
      return FACULTY_DIRECTORY;
    }

    return faculties.map((f, idx) => {
      // Find subjects this faculty teaches from timetable if not populated
      const taughtSubjects = Array.from(
        new Set(
          timetable
            .filter((t) => t.facultyName?.toLowerCase().includes(f.fullName?.toLowerCase()))
            .map((t) => `${t.courseCode} - ${t.courseTitle}`)
        )
      );

      // Check if fallback directory has pre-assigned subjects
      const fallbackMatch = FACULTY_DIRECTORY.find(
        (fd) => fd.email?.toLowerCase() === f.email?.toLowerCase() || fd.name?.toLowerCase() === f.fullName?.toLowerCase()
      );

      const subjects = taughtSubjects.length > 0 
        ? taughtSubjects 
        : (fallbackMatch?.subjects || (f.bio ? [f.bio.slice(0, 40) + '...'] : ['General Academics']));

      return {
        id: f.id || `fac_${idx}`,
        role: f.role || 'faculty',
        name: f.fullName,
        designation: f.designation || fallbackMatch?.designation || 'Faculty Member',
        department: f.department || fallbackMatch?.department || 'Engineering',
        cabin: f.cabinLocation || fallbackMatch?.cabin || 'Alan Turing Block',
        officeHours: f.officeHours || fallbackMatch?.officeHours || 'Mon - Fri 10:00 AM - 4:00 PM',
        subjects,
        email: f.email,
        phone: f.phone || fallbackMatch?.phone || '+91 98765 43200',
      };
    });
  }, [faculties, timetable]);

  const filteredFaculty = useMemo(() => {
    return mergedDirectory.filter(
      (f) =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.department.toLowerCase().includes(search.toLowerCase()) ||
        f.cabin.toLowerCase().includes(search.toLowerCase()) ||
        f.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
    );
  }, [mergedDirectory, search]);

  const handleSendMessage = async (fac: { id: string; name: string; role?: string }) => {
    const result = await createPrivateChannel({
      id: fac.id,
      name: fac.name,
      role: 'faculty',
    });
    if (result.ok && result.channel) {
      showNotice({
        title: 'Private Channel Opened 💬',
        message: `Chat started with ${fac.name}. Only the two of you can see it.`,
        type: 'success',
      });
      router.push({
        pathname: '/screens/private-chat' as any,
        params: { channelId: result.channel.id },
      });
      return;
    }
    if (result.reason === 'self') {
      showNotice({
        title: 'Same Person',
        message: 'You cannot open a private channel with yourself.',
        type: 'warning',
      });
      return;
    }
    if (result.reason === 'limit') {
      showNotice({
        title: 'Channel Limit Reached',
        message: 'Maximum of 50 private channels allowed. Delete an existing channel first.',
        type: 'warning',
      });
      return;
    }
    showNotice({
      title: 'Could Not Open Channel',
      message: 'Please try again in a moment.',
      type: 'error',
    });
  };

  const handlePickLayout = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/png', 'image/jpeg', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const asset = result.assets[0];
      setUploadingLayout(true);
      const saved = await LocalCampusDB.saveLocalDocument(
        asset.uri,
        asset.name || 'college-layout'
      );
      await setCollegeLayout({
        localUri: saved.localUri,
        fileName: asset.name || 'college-layout',
        fileSize: saved.fileSize,
        summary: '',
        uploadedAt: new Date().toISOString(),
        notes: '',
      });
      showNotice({
        title: 'College Layout Added',
        message: 'Layout saved. Faculty and admin can add pointers below the layout.',
        type: 'success',
      });
    } catch (err: any) {
      showNotice({
        title: 'Upload Failed',
        message: err?.message || 'Could not store the college layout.',
        type: 'error',
      });
    } finally {
      setUploadingLayout(false);
    }
  };

  const handleViewLayout = () => {
    if (!collegeLayout) return;
    setLayoutNotes(collegeLayout.notes || '');
    setViewingLayout(true);
  };

  const handleSaveLayoutNotes = async () => {
    if (!collegeLayout || role === 'student') return;
    try {
      await setCollegeLayout({ ...collegeLayout, notes: layoutNotes.trim() });
      showNotice({
        title: 'Pointers Saved',
        message: 'Your layout pointers are saved and visible to everyone.',
        type: 'success',
      });
    } catch (err: any) {
      showNotice({
        title: 'Save Failed',
        message: err?.message || 'Could not save the pointers.',
        type: 'error',
      });
    }
  };

  const handleDeleteLayout = () => {
    setDeleteLayoutModalVisible(true);
  };

  const handleConfirmDeleteLayout = async () => {
    await deleteCollegeLayout();
    setDeleteLayoutModalVisible(false);
    setViewingLayout(false);
    showNotice({
      title: 'Layout Deleted',
      message: 'The uploaded college layout was removed.',
      type: 'info',
    });
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Faculty & Cabin Directory</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by professor name, cabin, subject..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.countHeader, { color: colors.textSecondary }]}>
          Found {filteredFaculty.length} Academic Faculty Members
        </Text>

        {filteredFaculty.map((fac) => (
          <Card
            key={fac.id}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              marginBottom: 14,
            }}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.facAvatar, { backgroundColor: colors.primary }]}>
                <Ionicons name="school" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, paddingLeft: 12 }}>
                <Text style={[styles.facName, { color: colors.text }]}>{fac.name}</Text>
                <Text style={[styles.facDesig, { color: colors.primary }]}>{fac.designation}</Text>
                <Text style={[styles.facDept, { color: colors.textSecondary }]}>{fac.department}</Text>
              </View>
            </View>

            <View style={[styles.cabinCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={16} color={colors.primary} />
                <Text style={[styles.detailText, { color: colors.text, fontWeight: '700' }]}>
                  {fac.cabin}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#059669" />
                <Text style={[styles.detailText, { color: colors.text }]}>
                  Office Hours: {fac.officeHours}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                  {fac.email}
                </Text>
              </View>
            </View>

            <View style={{ marginTop: 10 }}>
              <Text style={[styles.subHeading, { color: colors.textSecondary }]}>Subjects Taught:</Text>
              <View style={styles.subjectsRow}>
                {fac.subjects.map((sub, idx) => (
                  <Badge key={idx} label={sub} variant="neutral" />
                ))}
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: isDark ? '#1E293B' : '#EFF6FF' }]}
                onPress={() => handleSendMessage(fac)}
              >
                <Ionicons name="mail" size={14} color={colors.primary} />
                <Text style={[styles.contactBtnText, { color: colors.primary }]}>Send Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}
                onPress={() =>
                  showNotice({
                    title: 'Cabin Waypoint 🧭',
                    message: fac.cabin
                      ? `${fac.cabin} — Office Hours: ${fac.officeHours} — Department: ${fac.department}`
                      : 'Cabin not listed — contact the department office.',
                    type: 'success',
                  })
                }
              >
                <Ionicons name="navigate" size={14} color="#059669" />
                <Text style={[styles.contactBtnText, { color: '#059669' }]}>Locate Cabin</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* College layout upload / view */}
        <View style={styles.layoutSection}>
          {collegeLayout ? (
            <>
              <TouchableOpacity
                style={[styles.layoutBtn, { backgroundColor: colors.primary }]}
                onPress={handleViewLayout}
                accessibilityLabel="View college layout"
              >
                <Ionicons name="map-outline" size={18} color="#FFFFFF" />
                <Text style={styles.layoutBtnText}>View Layout</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.layoutBtn, styles.layoutDeleteBtn]}
                onPress={handleDeleteLayout}
                accessibilityLabel="Delete college layout"
              >
                <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.layoutBtnText}>Delete Layout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.layoutBtn, styles.layoutAddBtn, { borderColor: colors.primary }]}
              onPress={handlePickLayout}
              disabled={uploadingLayout}
              accessibilityLabel="Add college layout"
            >
              {uploadingLayout ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
              )}
              <Text style={[styles.layoutBtnText, { color: colors.primary }]}>
                {uploadingLayout ? 'Uploading…' : 'Add College Layout'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* View college layout modal */}
      <Modal
        visible={viewingLayout}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingLayout(false)}
      >
        <KeyboardAvoidingView
          style={[
            styles.layoutOverlay,
            isLayoutKeyboardVisible && { justifyContent: 'flex-end', paddingBottom: 10 },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        >
          <View style={[styles.layoutSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.layoutSheetHeader}>
              <Text style={[styles.layoutSheetTitle, { color: colors.text }]}>College Layout</Text>
              {!isLayoutKeyboardVisible && (
                <TouchableOpacity
                  onPress={() => setViewingLayout(false)}
                  accessibilityLabel="Close layout"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {collegeLayout && collegeLayout.fileName.toLowerCase().endsWith('.pdf') ? (
                <TouchableOpacity
                  onPress={() =>
                    openStudyMaterial({
                      id: 'college-layout-pdf',
                      courseCode: 'LAYOUT',
                      courseTitle: 'College Layout',
                      title: 'College Layout',
                      category: 'Notes',
                      fileType: 'PDF',
                      fileSize: collegeLayout.fileSize,
                      uploadedBy: 'Campus',
                      date: collegeLayout.uploadedAt,
                      fileUri: collegeLayout.localUri,
                      fileName: collegeLayout.fileName,
                    })
                  }
                  style={[styles.layoutPdfPlaceholder, { backgroundColor: colors.searchBarBg, borderColor: colors.border }]}
                  activeOpacity={0.8}
                  accessibilityLabel="Open PDF layout"
                >
                  <Ionicons name="document-text" size={56} color={colors.primary} />
                  <Text style={{ color: colors.text, fontWeight: '800', marginTop: 10 }}>
                    College Layout (PDF)
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                    Tap to open the PDF document
                  </Text>
                </TouchableOpacity>
              ) : collegeLayout ? (
                <Image
                  source={{ uri: collegeLayout.localUri }}
                  style={styles.layoutImage}
                  resizeMode="contain"
                />
              ) : null}

              <Text style={[styles.layoutNotesLabel, { color: colors.textSecondary }]}>
                Pointers {role === 'student' ? '(read-only)' : ''}
              </Text>
              <TextInput
                style={[
                  styles.layoutNotesInput,
                  {
                    backgroundColor: isDark ? '#1F2937' : '#F8FAFC',
                    color: colors.text,
                    borderColor: colors.border,
                    minHeight: isLayoutKeyboardVisible ? 60 : 70,
                  },
                ]}
                placeholder={
                  role === 'student'
                    ? 'Faculty and admin pointers will appear here…'
                    : 'Add pointers: blocks, gates, labs, hostels…'
                }
                placeholderTextColor={colors.textSecondary}
                value={layoutNotes}
                onChangeText={setLayoutNotes}
                editable={role !== 'student'}
                multiline
                textAlignVertical="top"
              />
              {role !== 'student' && (
                <TouchableOpacity
                  style={[styles.layoutNotesSaveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveLayoutNotes}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                  <Text style={styles.layoutBtnText}>Save Pointers</Text>
                </TouchableOpacity>
              )}

              {!isLayoutKeyboardVisible && (
                <View style={styles.layoutModalActions}>
                  <TouchableOpacity
                    style={[styles.layoutBtn, { backgroundColor: '#DC2626', flex: 1 }]}
                    onPress={handleDeleteLayout}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.layoutBtnText}>Delete Layout</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.layoutBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => setViewingLayout(false)}
                  >
                    <Text style={styles.layoutBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete layout confirmation (in-app prompt) */}
      <ConfirmModal
        visible={deleteLayoutModalVisible}
        title="Delete College Layout"
        description="Remove the uploaded college layout and its pointers? This cannot be undone."
        items={['Uploaded layout file deleted', 'Faculty/admin pointers removed']}
        confirmLabel="Delete Layout"
        cancelLabel="Cancel"
        icon="trash"
        destructive
        onConfirm={handleConfirmDeleteLayout}
        onCancel={() => setDeleteLayoutModalVisible(false)}
      />
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
  },
  backBtn: {
    padding: 4,
  },
  screenTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  countHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  facAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  facName: {
    fontSize: 15,
    fontWeight: '800',
  },
  facDesig: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  facDept: {
    fontSize: 11,
    marginTop: 1,
  },
  cabinCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
  },
  subHeading: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  subjectsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  layoutSection: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  layoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 0,
    flex: 1,
  },
  layoutAddBtn: {
    borderWidth: 1.5,
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
  },
  layoutDeleteBtn: {
    backgroundColor: '#DC2626',
  },
  layoutBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  layoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  layoutSheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  layoutSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  layoutSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  layoutImage: {
    width: '100%',
    height: 240,
    borderRadius: 12,
    backgroundColor: '#0B0F19',
    marginBottom: 10,
  },
  layoutPdfPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  layoutNotesLabel: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 4,
  },
  layoutNotesInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    fontSize: 13,
    minHeight: 70,
    maxHeight: 130,
  },
  layoutNotesSaveBtn: {
    marginTop: 20,
    marginBottom: 3,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  layoutModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
});
