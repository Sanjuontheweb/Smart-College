import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  icon?: any;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const { colors, isDark } = useAppTheme();

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          bg: isDark ? '#1E293B' : '#EEF2FF',
          text: colors.primary,
          border: 'transparent',
        };
      case 'outline':
        return {
          bg: 'transparent',
          text: colors.text,
          border: colors.border,
        };
      case 'ghost':
        return {
          bg: 'transparent',
          text: colors.primary,
          border: 'transparent',
        };
      case 'danger':
        return {
          bg: isDark ? '#7F1D1D' : '#FEE2E2',
          text: '#EF4444',
          border: 'transparent',
        };
      case 'primary':
      default:
        return {
          bg: colors.primary,
          text: '#FFFFFF',
          border: 'transparent',
        };
    }
  };

  const currentVariant = getVariantStyles();

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return { paddingV: 6, paddingH: 12, fontSize: 13, iconSize: 14 };
      case 'large':
        return { paddingV: 14, paddingH: 22, fontSize: 16, iconSize: 20 };
      case 'medium':
      default:
        return { paddingV: 10, paddingH: 16, fontSize: 14, iconSize: 17 };
    }
  };

  const currentSize = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: currentVariant.bg,
          borderColor: currentVariant.border,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          paddingVertical: currentSize.paddingV,
          paddingHorizontal: currentSize.paddingH,
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.text} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={currentSize.iconSize}
              color={currentVariant.text}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: currentVariant.text,
                fontSize: currentSize.fontSize,
              },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
