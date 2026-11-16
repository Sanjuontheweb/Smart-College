import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThemeProvider as AppThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { CampusDataProvider } from '@/context/CampusDataContext';
import { NoticeProvider } from '@/context/NoticeContext';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) {
      console.warn('Font loading error, continuing with system font fallback:', error);
      SplashScreen.hideAsync();
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <AuthProvider>
          <CampusDataProvider>
            <NoticeProvider>
              <RootLayoutNav />
            </NoticeProvider>
          </CampusDataProvider>
        </AuthProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const { isDark, colors } = useAppTheme();

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.card,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            animationDuration: 90,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
          <Stack.Screen name="screens/campus-quest" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/discussions" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/faculty-directory" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/study-materials" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/admin-console" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/academics" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/assistant" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/portal" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen name="screens/roles" options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', headerShown: true, title: 'About Survive College', contentStyle: { backgroundColor: colors.background } }}
          />
        </Stack>
      </View>
    </NavigationThemeProvider>
  );
}
