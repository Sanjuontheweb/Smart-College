import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { StudyMaterial } from '@/constants/CampusData';
import { useAuth } from '@/context/AuthContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { useAppTheme } from '@/context/ThemeContext';
import { openStudyMaterial } from '@/services/documentService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SubjectGroup {
  courseCode: string;
  courseTitle: string;
  materials: StudyMaterial[];
  isExpanded: boolean;
}

export default function StudyMaterialsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { role, user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const { studyMaterials, timetable } = useCampusData();
  const { showNotice } = useNotice();

  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  // Get all unique course codes from timetable
  const timetableCourses = useMemo(() => {
    const courses = new Map<string, string>();
    timetable.forEach(slot => {
      if (!courses.has(slot.courseCode)) {
        courses.set(slot.courseCode, slot.courseTitle);
      }
    });
    return courses;
  }, [timetable]);

  // Filter materials based on search and category
  const filteredMaterials = useMemo(() => {
    return studyMaterials.filter((m) => {
      const matchesSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        m.courseCode.toLowerCase().includes(search.toLowerCase()) ||
        m.courseTitle.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = filterCategory === 'All' || m.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [studyMaterials, search, filterCategory]);

  // Group materials by subject (course code)
  const subjectGroups = useMemo(() => {
    const groups: SubjectGroup[] = [];
    
    // First, organize by timetable courses
    timetableCourses.forEach((courseTitle, courseCode) => {
      const subjectMaterials = filteredMaterials.filter(m => m.courseCode === courseCode);
      if (subjectMaterials.length > 0) {
        groups.push({
          courseCode,
          courseTitle,
          materials: subjectMaterials,
          isExpanded: expandedSubjects[courseCode] || false,
        });
      }
    });

    // Find materials that don't belong to any timetable course
    const otherMaterials = filteredMaterials.filter(m => !timetableCourses.has(m.courseCode));
    if (otherMaterials.length > 0) {
      groups.push({
        courseCode: 'Other',
        courseTitle: 'Other Study Materials',
        materials: otherMaterials,
        isExpanded: expandedSubjects['Other'] || false,
      });
    }

    return groups;
  }, [filteredMaterials, timetableCourses, expandedSubjects]);

  const handleOpenDocument = async (mat: StudyMaterial) => {
    await openStudyMaterial(
      mat,
      () => {
        showNotice({
          title: 'Document Unavailable',
          message: `Unable to open "${mat.title}". The document file is corrupted or unreadable.`,
          type: 'error',
        });
      }
    );
  };

  const toggleSubject = (courseCode: string) => {
    LayoutAnimation.configureNext({
      duration: 250,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'spring', springDamping: 0.7 },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setExpandedSubjects(prev => ({
      ...prev,
      [courseCode]: !prev[courseCode]
    }));
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      {/* Top Bar with Inset Padding */}
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
        <Text style={[styles.screenTitle, { color: colors.text }]}>Study Materials & PYQs</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: isDark ? '#161F30' : '#FFFFFF', borderBottomColor: colors.border },
        ]}
      >
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search BCS401, DBMS, Notes, PYQs..."
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

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {['All', 'Notes', 'PYQ', 'QB', 'Syllabus', 'Lab Manual'].map((cat) => {
            const isSelected = filterCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.background,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text style={{ color: isSelected ? '#FFFFFF' : colors.text, fontWeight: '700', fontSize: 12 }}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Real Syllabus Attribution Notice */}
        <Card
          style={{
            backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF',
            borderColor: '#7A3CFF',
            marginBottom: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Ionicons name="phone-portrait-outline" size={18} color="#7A3CFF" />
            <Text style={[styles.syllabusTitle, { color: isDark ? '#DDD6FE' : '#4338CA' }]}>
              Mobile Offline Document Vault
            </Text>
          </View>
          <Text style={[styles.syllabusBody, { color: isDark ? '#C4B5FD' : '#6366F1' }]}>
            All documents and past solved question papers are stored inside your device&apos;s local filesystem. Tap any item to open and review it offline on your phone!
          </Text>
        </Card>

        {/* Subjects Organized by Course */}
        {subjectGroups.length === 0 ? (
          <Card style={{ backgroundColor: colors.background, borderColor: colors.background, padding: 20 }}>
            <Text style={[styles.noMaterialsText, { color: colors.textSecondary, textAlign: 'center' }]}>
            </Text>
          </Card>
        ) : (
          subjectGroups.map((group) => (
            <View key={group.courseCode} style={styles.subjectBlock}>
              {/* Subject Header (Tap to expand/collapse) */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => toggleSubject(group.courseCode)}
                style={[
                  styles.subjectHeader,
                  {
                    backgroundColor: isDark ? '#161F30' : '#FFFFFF',
                    borderColor: colors.cardBorder,
                  },
                ]}
              >
                <View style={styles.subjectHeaderContent}>
                  <View style={styles.subjectTitleRow}>
                    <View style={[
                      styles.subjectIconBox,
                      { backgroundColor: group.courseCode === 'Other' ? 
                        (isDark ? '#3F3F46' : '#F4F4F5') : 
                        (isDark ? '#1E3A8A' : '#EFF6FF') }
                    ]}
                    >
                      <Ionicons
                        name={group.courseCode === 'Other' ? 'folder-outline' : 'book-outline'}
                        size={22}
                        color={group.courseCode === 'Other' ? '#71717A' : '#2563EB'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.subjectNameRow}>
                        <Text style={[styles.subjectCode, { color: colors.text }]}>
                          {group.courseCode}
                        </Text>
                        <Badge
                          label={`${group.materials.length} items`}
                          variant={group.courseCode === 'Other' ? 'neutral' : 'primary'}
                          size="small"
                        />
                      </View>
                      <Text style={[styles.subjectTitle, { color: colors.textSecondary }]}>
                        {group.courseTitle}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={group.isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </View>
              </TouchableOpacity>

              {/* Subject Materials (Expanded content) */}
              {group.isExpanded && (
                <Animated.View entering={FadeInDown.duration(200)}>
                  <View style={styles.subjectMaterials}>
                    {group.materials.map((mat) => (
                      <TouchableOpacity
                        key={mat.id}
                        activeOpacity={0.8}
                        onPress={() => handleOpenDocument(mat)}
                        style={[
                          styles.materialItem,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.cardBorder,
                          },
                        ]}
                      >
                        <View style={styles.matRow}>
                          <View style={[
                            styles.fileIconBox,
                            { 
                              backgroundColor: mat.category === 'PYQ' ? 
                                (isDark ? '#78350F' : '#FEF3C7') :
                                (isDark ? '#7F1D1D' : '#FEE2E2')
                            }
                          ]}>
                            <Ionicons
                              name="document-text"
                              size={22}
                              color={mat.category === 'PYQ' ? '#D97706' : '#EF4444'}
                            />
                            <Text style={[
                              styles.fileExtText,
                              { color: mat.category === 'PYQ' ? '#D97706' : '#EF4444' }
                            ]}>
                              {mat.fileType}
                            </Text>
                          </View>

                          <View style={{ flex: 1, paddingHorizontal: 12 }}>
                            <View style={styles.matBadgeRow}>
                              <Badge 
                                label={mat.category} 
                                variant={mat.category === 'PYQ' ? 'warning' : 'primary'} 
                                size="small"
                              />
                            </View>
                            <Text style={[styles.matTitle, { color: colors.text }]} numberOfLines={2}>
                              {mat.title}
                            </Text>
                          </View>

                          <View style={[styles.openBtn, { backgroundColor: isDark ? '#1E293B' : '#EEF2FF' }]}>
                            <Ionicons name="open-outline" size={16} color={colors.primary} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>
          ))
        )}

        {/* Empty state for no subjects found */}
        {subjectGroups.length === 0 && (
          <Card style={{ backgroundColor: colors.card, borderColor: colors.cardBorder, padding: 20, marginTop: 20 }}>
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="document-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.noMaterialsText, { color: colors.textSecondary, marginTop: 8 }]}>
                No study materials found
              </Text>
              <Text style={[styles.noMaterialsSub, { color: colors.textMuted }]}>
                Try a different search or category filter
              </Text>
            </View>
          </Card>
        )}
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
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  categoryRow: {
    gap: 8,
  },
  catChip: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  syllabusTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  syllabusBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  subjectBlock: {
    marginBottom: 19,
  },
  subjectHeader: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  subjectHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  subjectIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subjectNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  subjectCode: {
    fontSize: 15,
    fontWeight: '800',
  },
  subjectTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  subjectMaterials: {
    marginTop: 20,
    paddingLeft: 8,
    paddingRight: 8,
    gap: 10,
  },
  materialItem: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  matRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileIconBox: {
    width: 42,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileExtText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  matBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  matSize: {
    fontSize: 10,
    fontWeight: '600',
  },
  matTitle: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  matUploader: {
    fontSize: 10,
    marginTop: 3,
  },
  openBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noMaterialsText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noMaterialsSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
