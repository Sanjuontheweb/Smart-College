import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, UserRole } from '@/context/AuthContext';
import { useAppTheme } from '@/context/ThemeContext';
import { DEMO_USERS } from '@/constants/CampusData';

interface RoleSwitcherSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const RoleSwitcherSheet: React.FC<RoleSwitcherSheetProps> = ({ visible, onClose }) => {
  const { role, switchRole } = useAuth();
  const { colors, isDark } = useAppTheme();

  const roles: { id: UserRole; title: string; subtitle: string; icon: any; color: string }[] = [
    {
      id: 'student',
      title: 'Student Experience',
      subtitle: `${DEMO_USERS.student.fullName} • 4th Sem CSE • Roll: 1MS24CS042`,
      icon: 'school',
      color: '#2563EB',
    },
    {
      id: 'faculty',
      title: 'Faculty Experience',
      subtitle: `${DEMO_USERS.faculty.fullName} • Cabin Turing 304 • Assoc. Professor`,
      icon: 'briefcase',
      color: '#059669',
    },
    {
      id: 'admin',
      title: 'Administrator Experience',
      subtitle: `${DEMO_USERS.admin.fullName} • Dean Academic Affairs • Suite 101`,
      icon: 'shield-checkmark',
      color: '#7C3AED',
    },
  ];

  const handleSelectRole = async (selectedRole: UserRole) => {
    await switchRole(selectedRole);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.handleBar} />
              
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Ionicons name="swap-horizontal" size={22} color={colors.primary} />
                  <Text style={[styles.title, { color: colors.text }]}>Switch Active Persona</Text>
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.description, { color: colors.textSecondary }]}>
                Experience how Smart Campus AI adapts navigation, permissions, and dashboards for each academic role.
              </Text>

              <View style={styles.rolesList}>
                {roles.map((item) => {
                  const isSelected = role === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.roleCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#1E293B'
                              : '#EEF2FF'
                            : isDark
                            ? '#0F172A'
                            : '#F8FAFC',
                          borderColor: isSelected ? item.color : colors.border,
                        },
                      ]}
                      onPress={() => handleSelectRole(item.id)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: isSelected ? item.color : isDark ? '#1E293B' : '#E2E8F0' },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={isSelected ? '#FFFFFF' : item.color}
                        />
                      </View>

                      <View style={styles.roleTextContainer}>
                        <View style={styles.roleTitleRow}>
                          <Text style={[styles.roleTitle, { color: colors.text }]}>
                            {item.title}
                          </Text>
                          {isSelected && (
                            <View style={[styles.activePill, { backgroundColor: item.color }]}>
                              <Text style={styles.activePillText}>Active</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.roleSubtitle, { color: colors.textSecondary }]}>
                          {item.subtitle}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[styles.securityNote, { backgroundColor: isDark ? '#1E1B4B' : '#F5F3FF' }]}>
                <Ionicons name="lock-closed" size={15} color="#7C3AED" style={{ marginRight: 6 }} />
                <Text style={[styles.securityNoteText, { color: isDark ? '#DDD6FE' : '#6D28D9' }]}>
                  Enforced by Row Level Security: In production, users cannot elevate their own role.
                </Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  rolesList: {
    gap: 12,
    marginBottom: 16,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  roleTextContainer: {
    flex: 1,
  },
  roleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  activePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  roleSubtitle: {
    fontSize: 12,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  securityNoteText: {
    fontSize: 11,
    flex: 1,
    fontWeight: '500',
  },
});
