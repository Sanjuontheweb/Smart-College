import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '@/constants/Colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: typeof Colors.light;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  mode: 'system',
  setMode: () => {},
  colors: Colors.light,
  isDark: false,
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem('@app_theme_mode').then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await AsyncStorage.setItem('@app_theme_mode', newMode);
  };

  const activeTheme: 'light' | 'dark' =
    mode === 'system' ? (deviceColorScheme === 'dark' ? 'dark' : 'light') : mode;

  const toggleTheme = () => {
    setMode(activeTheme === 'light' ? 'dark' : 'light');
  };

  const colors = activeTheme === 'dark' ? Colors.dark : Colors.light;
  const isDark = activeTheme === 'dark';

  return (
    <ThemeContext.Provider
      value={{
        theme: activeTheme,
        mode,
        setMode,
        colors,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
