import React from 'react';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Platform, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useAppTheme();
  const { role } = useAuth();

  const getRoleTint = () => {
    switch (role) {
      case 'faculty':
        return '#059669';
      case 'admin':
        return '#7C3AED';
      case 'student':
      default:
        return '#2563EB';
    }
  };

  const activeTint = getRoleTint();
  const isFacultyOrAdmin = role === 'admin' || role === 'faculty';

  const pathname = usePathname();
  const isAssistant = pathname?.includes('assistant');
  const tabBg = isDark ? '#111827' : '#FFFFFF';

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: isAssistant ? tabBg : 'transparent',
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          position: isAssistant ? 'relative' : 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: (Platform.OS === 'android' ? 52 : 56) + insets.bottom,
          paddingBottom: insets.bottom + (Platform.OS === 'android' ? 2 : 4),
          paddingTop: 6,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => {
          if (isAssistant) {
            return <View style={{ flex: 1, backgroundColor: tabBg }} />;
          }
          return (
            <View style={{ flex: 1, overflow: 'hidden' }}>
              <BlurView
                intensity={90}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: isDark ? 'rgba(17, 24, 39, 0.75)' : 'rgba(255, 255, 255, 0.75)' },
                ]}
              />
            </View>
          );
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="academics"
        options={{
          title: 'Academics',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'book' : 'book-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI Companion',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'sparkles' : 'sparkles-outline'}
              size={21}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="portal"
        options={{
          title: 'Portal',
          href: isFacultyOrAdmin ? '/(tabs)/portal' : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="roles"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={20}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="admin-console"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
