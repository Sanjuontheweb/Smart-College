import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Badge } from './Badge';
import { NextLectureInfo, getStatusLabel, getStatusVariant, getStatusIcon } from '@/utils/lectureUtils';
import { useAppTheme } from '@/context/ThemeContext';

interface NextLectureCardProps {
  lectureInfo: NextLectureInfo;
  onPress?: () => void;
  showDetails?: boolean;
  isFaculty?: boolean;
}

export function NextLectureCard({ lectureInfo, onPress, showDetails = true, isFaculty = false }: NextLectureCardProps) {
  const { colors, isDark } = useAppTheme();
  const { status, message, timeInfo, occasion, room, class: classInfo } = lectureInfo;
  
  const statusLabel = getStatusLabel(status);
  const statusVariant = getStatusVariant(status);
  const statusIcon = getStatusIcon(status);
  
  // Determine background and icon colors based on status
  const getStatusColors = () => {
    switch (status) {
      case 'holiday':
        return {
          bg: isDark ? '#064E3B' : '#ECFDF5',
          icon: '#059669',
          text: isDark ? '#34D399' : '#065F46',
        };
      case 'weekend':
        return {
          bg: isDark ? '#4C1D95' : '#F5F3FF',
          icon: '#7C3AED',
          text: isDark ? '#C084FC' : '#5B21B6',
        };
      case 'in-progress':
        return {
          bg: isDark ? '#78350F' : '#FFFBEB',
          icon: '#D97706',
          text: isDark ? '#FBBF24' : '#92400E',
        };
      case 'upcoming':
        return {
          bg: isDark ? '#1E3A8A' : '#EFF6FF',
          icon: '#2563EB',
          text: isDark ? '#60A5FA' : '#1E40AF',
        };
      case 'no-class':
        return {
          bg: isDark ? '#374151' : '#F9FAFB',
          icon: '#6B7280',
          text: isDark ? '#9CA3AF' : '#4B5563',
        };
      case 'completed':
        return {
          bg: isDark ? '#111827' : '#F3F4F6',
          icon: '#6B7280',
          text: isDark ? '#D1D5DB' : '#374151',
        };
      default:
        return {
          bg: isDark ? '#1E293B' : '#EEF2FF',
          icon: colors.primary,
          text: colors.text,
        };
    }
  };
  
  const statusColors = getStatusColors();
  
  const cardContent = (
    <Card
      variant="elevated"
      style={{
        backgroundColor: statusColors.bg,
        borderColor: statusColors.icon,
        borderWidth: 1.5,
      }}
    >
      <View style={styles.container}>
        {/* Status Header Row */}
        <View style={styles.headerRow}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.8)' }]}>
            <Ionicons name={statusIcon as any} size={16} color={statusColors.icon} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.statusLabel, { color: statusColors.text }]}>
              {statusLabel}
            </Text>
            {occasion && (
              <Text style={[styles.occasionText, { color: statusColors.text }]}>
                {occasion}
              </Text>
            )}
          </View>
        </View>
        
        {/* Main Message */}
        <Text style={[styles.message, { color: colors.text }]}>
          {message}
        </Text>
        
        {/* Details Section */}
        {showDetails && (classInfo || timeInfo || room) && (
          <View style={styles.detailsSection}>
            
            {/* Time and Room Row */}
            {(timeInfo || room) && (
              <View style={styles.metaRow}>
                {timeInfo && (
                  <View style={styles.timeContainer}>
                    <Ionicons 
                      name={timeInfo.isCountdown ? "timer-outline" : "time-outline"} 
                      size={14} 
                      color={statusColors.icon} 
                    />
                    <Text style={[styles.timeLabel, { color: statusColors.text }]}>
                      {timeInfo.label}
                    </Text>
                    <Text style={[styles.timeValue, { color: statusColors.text, fontWeight: '800' }]}>
                      {timeInfo.value}
                    </Text>
                  </View>
                )}
                
                {room && (
                  <View style={styles.roomContainer}>
                    <Ionicons name="location-outline" size={14} color={statusColors.icon} />
                    <Text style={[styles.roomText, { color: statusColors.text }]}>
                      {room}
                    </Text>
                    {classInfo?.type && (
                      <Text style={[styles.classType, { color: colors.textSecondary }]}>
                        • {classInfo.type}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
            
            {/* Additional Class Details */}
            {classInfo && (
              <View style={styles.classDetailsRow}>
                <Text style={[styles.classDetail, { color: colors.textSecondary }]}>
                  {classInfo.day} • {classInfo.startTime} - {classInfo.endTime}
                </Text>
                {!isFaculty && classInfo.facultyName && (
                  <Text style={[styles.classDetail, { color: colors.textSecondary }]}>
                    Faculty: {classInfo.facultyName}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    </Card>
  );
  
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }
  
  return cardContent;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  occasionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  message: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
  detailsSection: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  classInfoRow: {
    gap: 4,
  },
  courseCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  courseTitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 13,
  },
  roomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  roomText: {
    fontSize: 12,
    fontWeight: '600',
  },
  classType: {
    fontSize: 11,
    fontWeight: '500',
  },
  classDetailsRow: {
    gap: 4,
  },
  classDetail: {
    fontSize: 11,
    fontWeight: '500',
  },
});