import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { UserRole } from '@/context/AuthContext';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'small' | 'medium';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, size = 'small' }) => {
  const { colors, isDark } = useAppTheme();

  const getRoleConfig = () => {
    switch (role) {
      case 'faculty':
        return {
          label: 'Faculty',
          icon: 'school-outline' as const,
          bg: isDark ? '#064E3B' : '#ECFDF5',
          text: isDark ? '#34D399' : '#059669',
          border: isDark ? '#047857' : '#A7F3D0',
        };
      case 'admin':
        return {
          label: 'Admin',
          icon: 'shield-checkmark-outline' as const,
          bg: isDark ? '#4C1D95' : '#F5F3FF',
          text: isDark ? '#C084FC' : '#7C3AED',
          border: isDark ? '#6D28D9' : '#DDD6FE',
        };
      case 'student':
      default:
        return {
          label: 'Student',
          icon: 'person-outline' as const,
          bg: isDark ? '#1E3A8A' : '#EFF6FF',
          text: isDark ? '#60A5FA' : '#2563EB',
          border: isDark ? '#1D4ED8' : '#BFDBFE',
        };
    }
  };

  const config = getRoleConfig();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingVertical: isSmall ? 3 : 5,
          paddingHorizontal: isSmall ? 8 : 12,
        },
      ]}
    >
      <Ionicons name={config.icon} size={isSmall ? 13 : 16} color={config.text} style={styles.icon} />
      <Text style={[styles.text, { color: config.text, fontSize: isSmall ? 11 : 13 }]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
