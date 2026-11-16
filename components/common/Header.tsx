import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { RoleBadge } from './RoleBadge';
import { RetroLogo } from './RetroLogo';

interface HeaderProps {
  subtitle?: string;
  showRoleBadge?: boolean;
  showBackButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ subtitle, showRoleBadge = true, showBackButton }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, role } = useAuth();
  const { colors, isDark, toggleTheme } = useAppTheme();

  // Avoid router.canGoBack() during render which triggers warning: navigation.isFocused() was called while rendering
  const shouldShowBack = showBackButton ?? pathname?.startsWith('/screens/');

  const badgeScale = useSharedValue(0.7);

  React.useEffect(() => {
    badgeScale.value = 0.95;
    badgeScale.value = withSpring(1, { damping: 15, stiffness: 250 });
  }, [role]);

  const badgeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#111827' : '#FFFFFF',
          borderBottomColor: isDark ? '#1F2937' : '#E2E8F0',
          paddingTop: Math.max(insets.top, 8) + (Platform.OS === 'android' ? 6 : 4),
        },
      ]}
    >
      <View style={styles.leftSection}>
        {shouldShowBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginRight: 2, padding: 2 }}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <RetroLogo size="small" />
        <View style={{ flexShrink: 1 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.appName, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              Survive College
            </Text>
          </View>
          <Text style={[styles.userGreeting, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle || `Survivor: ${user.fullName.replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, '').split(' ')[0]}`}
          </Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {showRoleBadge && (
          <Animated.View style={badgeAnimStyle}>
            <TouchableOpacity
              onPress={() => router.push('/screens/roles')}
              activeOpacity={0.7}
              accessibilityLabel="Switch Role Tab"
            >
              <RoleBadge role={role} size="small" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Roles Tab Shortcut Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          onPress={() => router.push('/screens/roles')}
          activeOpacity={0.7}
          accessibilityLabel="Switch Active Persona"
        >
          <Ionicons name="people-outline" size={17} color={colors.primary} />
        </TouchableOpacity>

        {/* Theme Toggle Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}
          onPress={toggleTheme}
          activeOpacity={0.7}
          accessibilityLabel="Toggle Theme"
        >
          <Ionicons
            name={isDark ? 'sunny' : 'moon'}
            size={16}
            color={isDark ? '#FBBF24' : '#475569'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    zIndex: 10,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  gameBadge: {
    backgroundColor: '#FFE14D',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  gameBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.5,
  },
  userGreeting: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Header;
