import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomNoticeProps {
  message: string;
  title?: string;
  type?: 'success' | 'info' | 'warning' | 'error';
  onDismiss: () => void;
}

export const CustomNotice: React.FC<CustomNoticeProps> = ({
  message,
  title = 'Survive College Notice',
  type = 'info',
  onDismiss,
}) => {
  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return '#2EF2FF';
      case 'warning':
      case 'error':
        return '#FF2E88';
      case 'info':
      default:
        return '#7A3CFF';
    }
  };

  return (
    <View style={[styles.card, { borderColor: getBorderColor() }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="sparkles" size={16} color={getBorderColor()} />
          <Text style={styles.titleText}>{title}</Text>
        </View>
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close-circle" size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>
      <Text style={styles.messageText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A0F3C',
    borderWidth: 2,
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  messageText: {
    color: '#E2E8F0',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default CustomNotice;
