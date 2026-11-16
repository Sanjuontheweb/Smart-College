import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface AttendanceMeterProps {
  percentage: number;
  attendedClasses: number;
  totalClasses: number;
  label?: string;
}

export const AttendanceMeter: React.FC<AttendanceMeterProps> = ({
  percentage,
  attendedClasses,
  totalClasses,
  label = 'Overall Attendance',
}) => {
  const { colors, isDark } = useAppTheme();

  const isSafe = percentage >= 75;
  const isWarning = percentage >= 65 && percentage < 75;
  const isCritical = percentage < 65;

  const statusColor = isSafe ? '#10B981' : isWarning ? '#F59E0B' : '#EF4444';
  const statusBg = isSafe
    ? isDark ? '#064E3B' : '#ECFDF5'
    : isWarning
    ? isDark ? '#78350F' : '#FFFBEB'
    : isDark ? '#7F1D1D' : '#FEF2F2';

  const statusText = isSafe
    ? 'Eligible for Exams'
    : isWarning
    ? 'Attendance Warning (<75%)'
    : 'Critical Shortage (<65%)';

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.topRow}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
          <View style={styles.percentageRow}>
            <Text style={[styles.percentage, { color: statusColor }]}>{percentage}%</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Ionicons
                name={isSafe ? 'checkmark-circle' : isWarning ? 'warning' : 'alert-circle'}
                size={13}
                color={statusColor}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusText}</Text>
            </View>
          </View>
        </View>

        <View style={styles.fractionBox}>
          <Text style={[styles.fractionNum, { color: colors.text }]}>
            {attendedClasses} <Text style={{ color: colors.textSecondary, fontSize: 13 }}>/ {totalClasses}</Text>
          </Text>
          <Text style={[styles.fractionSub, { color: colors.textSecondary }]}>Lectures Attended</Text>
        </View>
      </View>

      {/* Progress Bar with 75% Threshold Marker */}
      <View style={styles.barContainer}>
        <View style={[styles.barBackground, { backgroundColor: isDark ? '#1F2937' : '#E2E8F0' }]}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.min(100, Math.max(0, percentage))}%`,
                backgroundColor: statusColor,
              },
            ]}
          />
          {/* 75% threshold guide marker */}
          <View style={styles.thresholdMarker} />
        </View>
      </View>

      <View style={styles.bottomInfo}>
        <Text style={[styles.thresholdLabel, { color: colors.textSecondary }]}>
          Minimum Required: 75% (Medical condonation: 65-74%)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  percentageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentage: {
    fontSize: 26,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fractionBox: {
    alignItems: 'flex-end',
  },
  fractionNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  fractionSub: {
    fontSize: 11,
  },
  barContainer: {
    marginTop: 4,
    marginBottom: 8,
  },
  barBackground: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  thresholdMarker: {
    position: 'absolute',
    left: '75%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#0F172A',
    zIndex: 2,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  thresholdLabel: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
