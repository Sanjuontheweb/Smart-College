import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useCampusData } from '@/context/CampusDataContext';
import { useNotice } from '@/context/NoticeContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { FACULTY_DIRECTORY } from '@/constants/CampusData';

export default function FacultyDirectoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { faculties, timetable } = useCampusData();
  const { showNotice } = useNotice();
  const [search, setSearch] = useState('');

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
                onPress={() =>
                  showNotice({
                    title: 'Contact Faculty ✉️',
                    message: `Official faculty dispatch channel configured for ${fac.email}`,
                    type: 'info',
                  })
                }
              >
                <Ionicons name="mail" size={14} color={colors.primary} />
                <Text style={[styles.contactBtnText, { color: colors.primary }]}>Send Message</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.contactBtn, { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' }]}
                onPress={() =>
                  showNotice({
                    title: 'Cabin Waypoint 🧭',
                    message: `Waypoint marked: ${fac.cabin}. Take the Turing Academic Tower elevator to 3rd Floor.`,
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
      </ScrollView>
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
});
