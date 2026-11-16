import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { Badge } from '@/components/ui/Badge';
import { StudyMaterial } from '@/constants/CampusData';

interface DocumentReaderModalProps {
  visible: boolean;
  material: StudyMaterial | null;
  onClose: () => void;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  visible,
  material,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();

  if (!material) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.readerContainer,
          {
            backgroundColor: isDark ? '#0B0F19' : '#FFFFFF',
            paddingTop: Math.max(insets.top, 10),
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Reader Top Bar */}
        <View style={[styles.readerHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.readerBackBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, paddingHorizontal: 10 }}>
            <Text style={[styles.readerTitle, { color: colors.text }]} numberOfLines={1}>
              {material.title}
            </Text>
            <Text style={[styles.readerSub, { color: colors.textSecondary }]}>
              {material.courseCode} • {material.fileType} • {material.fileSize}
            </Text>
          </View>

          <Badge label="LOCAL VAULT" variant="success" />
        </View>

        {/* Reader Document Body */}
        <ScrollView contentContainerStyle={styles.readerBody} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.docHeroCard,
              { backgroundColor: isDark ? '#1A0F3C' : '#EEF2FF', borderColor: '#7A3CFF' },
            ]}
          >
            <Text style={styles.docHeroTag}>ACADEMIC DOCUMENT READER</Text>
            <Text style={[styles.docHeroTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              {material.title}
            </Text>
            <Text style={[styles.docHeroMeta, { color: isDark ? '#C4B5FD' : '#6366F1' }]}>
              Course: {material.courseTitle} ({material.courseCode}){'\n'}
              Category: {material.category} • Uploaded by: {material.uploadedBy} • Date: {material.date}
              {material.fileName ? `\nAttached File: ${material.fileName}` : ''}
            </Text>
          </View>

          {/* Document Content Render */}
          <View
            style={[
              styles.docSheet,
              { backgroundColor: isDark ? '#161F30' : '#F8FAFC', borderColor: colors.cardBorder },
            ]}
          >
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              Document Content & Analysis
            </Text>
            {material.textContent ? (
              <Text style={[styles.docParagraph, { color: colors.text }]}>
                {material.textContent}
              </Text>
            ) : (
              <>
                <Text style={[styles.docParagraph, { color: colors.text }]}>
                  1. <Text style={{ fontWeight: '800' }}>Algorithm Classification & Recurrence Solving</Text>:
                  Master Theorem for divide-and-conquer recurrences: T(n) = aT(n/b) + f(n). When f(n) = O(n^(log_b(a) - ε)), T(n) = Θ(n^(log_b(a))).
                </Text>
                <Text style={[styles.docParagraph, { color: colors.text }]}>
                  2. <Text style={{ fontWeight: '800' }}>Dynamic Programming vs Greedy Strategy</Text>:
                  DP satisfies optimal substructure and overlapping subproblems (e.g. 0/1 Knapsack, Floyd-Warshall). Greedy makes local optimal choices (e.g. Fractional Knapsack, Dijkstra&apos;s algorithm, Kruskal&apos;s MST).
                </Text>
                <Text style={[styles.docParagraph, { color: colors.text }]}>
                  3. <Text style={{ fontWeight: '800' }}>Relational Decomposition & Normal Forms</Text>:
                  Boyce-Codd Normal Form (BCNF): for every non-trivial functional dependency X → Y, X must be a superkey. Check for lossless join decomposition using R1 ∩ R2 → (R1 or R2).
                </Text>
                <Text style={[styles.docParagraph, { color: colors.text }]}>
                  4. <Text style={{ fontWeight: '800' }}>Previous Exam Model Answers & Grading Rubric</Text>:
                  Detailed step-by-step derivation for 10-mark questions in the semester examinations. Remember to state time and space complexities explicitly in university papers for full marks.
                </Text>
              </>
            )}
          </View>

          <View style={styles.readerFooter}>
            <Text style={{ textAlign: 'center', color: colors.textMuted, fontSize: 11 }}>
              End of Document Preview • 100% Offline Local File Stored on Phone
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  readerContainer: {
    flex: 1,
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  readerBackBtn: {
    padding: 4,
  },
  readerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  readerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  readerBody: {
    padding: 16,
    paddingBottom: 40,
  },
  docHeroCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  docHeroTag: {
    color: '#7A3CFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  docHeroTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 6,
  },
  docHeroMeta: {
    fontSize: 12,
    lineHeight: 18,
  },
  docSheet: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  docParagraph: {
    fontSize: 13,
    lineHeight: 20,
  },
  readerFooter: {
    marginTop: 24,
    alignItems: 'center',
  },
});
