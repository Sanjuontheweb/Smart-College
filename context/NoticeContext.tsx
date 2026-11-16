import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type NoticeType = 'success' | 'info' | 'warning' | 'error' | 'quest';

export interface NoticeOptions {
  title: string;
  message: string;
  type?: NoticeType;
  xpReward?: number;
  duration?: number;
}

interface NoticeContextType {
  showNotice: (options: NoticeOptions) => void;
  hideNotice: () => void;
}

const NoticeContext = createContext<NoticeContextType>({
  showNotice: () => {},
  hideNotice: () => {},
});

export const NoticeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<NoticeOptions | null>(null);
  const translateY = useRef(new Animated.Value(-150)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<any>(null);

  const hideNotice = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -150,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setNotice(null));
  }, [opacity, translateY]);

  const showNotice = useCallback(
    (options: NoticeOptions) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setNotice(options);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = options.duration || 3500;
      timerRef.current = setTimeout(() => {
        hideNotice();
      }, duration);
    },
    [hideNotice, opacity, translateY]
  );

  const getTypeStyles = (type: NoticeType = 'info') => {
    switch (type) {
      case 'success':
        return {
          border: '#2EF2FF',
          bg: '#1A0F3C',
          icon: 'checkmark-circle' as const,
          iconColor: '#2EF2FF',
          pillBg: '#083344',
          pillText: '#2EF2FF',
        };
      case 'quest':
        return {
          border: '#FFE14D',
          bg: '#1A0F3C',
          icon: 'trophy' as const,
          iconColor: '#FFE14D',
          pillBg: '#422006',
          pillText: '#FDE047',
        };
      case 'warning':
        return {
          border: '#FF2E88',
          bg: '#1A0F3C',
          icon: 'alert-circle' as const,
          iconColor: '#FF2E88',
          pillBg: '#450A0A',
          pillText: '#FCA5A5',
        };
      case 'error':
        return {
          border: '#EF4444',
          bg: '#1A0F3C',
          icon: 'close-circle' as const,
          iconColor: '#EF4444',
          pillBg: '#450A0A',
          pillText: '#FCA5A5',
        };
      case 'info':
      default:
        return {
          border: '#7A3CFF',
          bg: '#1A0F3C',
          icon: 'sparkles' as const,
          iconColor: '#A78BFA',
          pillBg: '#2E1065',
          pillText: '#C4B5FD',
        };
    }
  };

  const currentTheme = notice ? getTypeStyles(notice.type) : null;

  return (
    <NoticeContext.Provider value={{ showNotice, hideNotice }}>
      {children}
      {notice && currentTheme && (
        <Animated.View
          style={[
            styles.bannerContainer,
            {
              top: Math.max(insets.top, 12) + 8,
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={hideNotice}
            style={[
              styles.noticeCard,
              {
                backgroundColor: currentTheme.bg,
                borderColor: currentTheme.border,
                shadowColor: currentTheme.border,
              },
            ]}
          >
            {/* Retro Pixel Glow Accents */}
            <View style={styles.neonAccentRow}>
              <View style={[styles.glowDot, { backgroundColor: currentTheme.border }]} />
              <View style={[styles.glowDot, { backgroundColor: '#FFE14D' }]} />
              <View style={[styles.glowDot, { backgroundColor: '#FF2E88' }]} />
            </View>

            <View style={styles.contentRow}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: currentTheme.pillBg, borderColor: currentTheme.border },
                ]}
              >
                <Ionicons name={currentTheme.icon} size={22} color={currentTheme.iconColor} />
              </View>

              <View style={styles.textWrap}>
                <View style={styles.titleRow}>
                  <Text style={[styles.title, { color: '#FFFFFF' }]}>{notice.title}</Text>
                  {notice.xpReward !== undefined && (
                    <View style={[styles.xpBadge, { borderColor: '#FFE14D' }]}>
                      <Ionicons name="flash" size={11} color="#FFE14D" />
                      <Text style={styles.xpText}>+{notice.xpReward} XP</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.message} numberOfLines={3}>
                  {notice.message}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </NoticeContext.Provider>
  );
};

export const useNotice = () => useContext(NoticeContext);

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 14,
    right: 14,
    zIndex: 99999,
    elevation: 24,
  },
  noticeCard: {
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 12,
  },
  neonAccentRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 6,
  },
  glowDot: {
    width: 6,
    height: 4,
    borderRadius: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 12,
    color: '#CBD5E1',
    lineHeight: 16,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#422006',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  xpText: {
    color: '#FFE14D',
    fontSize: 10,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
});
