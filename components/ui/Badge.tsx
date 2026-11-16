import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'small' | 'medium';
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'primary',
  size = 'small',
}) => {
  const { colors, isDark } = useAppTheme();

  const getColors = () => {
    switch (variant) {
      case 'success':
        return {
          bg: isDark ? '#064E3B' : '#ECFDF5',
          text: isDark ? '#34D399' : '#059669',
        };
      case 'warning':
        return {
          bg: isDark ? '#78350F' : '#FFFBEB',
          text: isDark ? '#FBBF24' : '#D97706',
        };
      case 'danger':
        return {
          bg: isDark ? '#7F1D1D' : '#FEF2F2',
          text: isDark ? '#F87171' : '#EF4444',
        };
      case 'info':
        return {
          bg: isDark ? '#0C4A6E' : '#F0F9FF',
          text: isDark ? '#38BDF8' : '#0284C7',
        };
      case 'neutral':
        return {
          bg: isDark ? '#1E293B' : '#F1F5F9',
          text: isDark ? '#94A3B8' : '#64748B',
        };
      case 'primary':
      default:
        return {
          bg: isDark ? '#1E1B4B' : '#EEF2FF',
          text: isDark ? '#818CF8' : '#4F46E5',
        };
    }
  };

  const c = getColors();
  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          paddingVertical: isSmall ? 2 : 4,
          paddingHorizontal: isSmall ? 7 : 10,
        },
      ]}
    >
      <Text style={[styles.text, { color: c.text, fontSize: isSmall ? 11 : 12 }]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
