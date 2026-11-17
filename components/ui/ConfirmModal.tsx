import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  description?: string;
  items?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * In-app confirmation prompt styled to match the sem-end reset card.
 * Replaces default OS Alert.alert boxes for destructive actions.
 */
export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  title,
  description,
  items,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon = 'warning',
  destructive = true,
  onConfirm,
  onCancel,
}) => {
  const { colors, isDark } = useAppTheme();
  const accent = destructive ? '#EF4444' : colors.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlayCenter}>
        <View
          style={[
            styles.resetCard,
            {
              backgroundColor: isDark ? '#1A0F3C' : '#FFFFFF',
              borderColor: accent,
            },
          ]}
        >
          <View style={styles.resetHeader}>
            <View style={[styles.iconBox, { backgroundColor: `${accent}22` }]}>
              <Ionicons name={icon} size={24} color={accent} />
            </View>
            <Text style={[styles.resetTitle, { color: colors.text }]}>{title}</Text>
          </View>

          {description ? (
            <Text style={[styles.desc, { color: colors.textSecondary }]}>{description}</Text>
          ) : null}

          {items && items.length > 0 ? (
            <View style={styles.listBox}>
              {items.map((item, index) => (
                <Text
                  key={index}
                  style={[
                    styles.listItem,
                    { color: destructive ? '#F87171' : colors.textSecondary },
                  ]}
                >
                  • {item}
                </Text>
              ))}
            </View>
          ) : null}

          <View style={styles.btnRow}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors.text, fontWeight: '700' }}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.confirmBtn, { backgroundColor: accent }]}
              activeOpacity={0.8}
            >
              <Ionicons
                name={destructive ? 'trash-outline' : 'checkmark'}
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.confirmBtnText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resetCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 2,
    padding: 18,
  },
  resetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '900',
  },
  desc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  listBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 14,
  },
  listItem: {
    fontSize: 11,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
