/**
 * User Profile Modal
 * Модальное окно с информацией о пользователе
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { User } from '../../types/user.types';

interface UserProfileModalProps {
  visible: boolean;
  user: User | null;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  user,
  onClose,
}) => {
  const { theme } = useTheme();

  if (!user) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'online':
        return '#4CAF50';
      case 'offline':
        return '#9E9E9E';
      case 'busy':
        return '#FF9800';
      case 'away':
        return '#FFC107';
      default:
        return theme.textTertiary;
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'online':
        return 'В сети';
      case 'offline':
        return 'Не в сети';
      case 'busy':
        return 'Занят';
      case 'away':
        return 'Отошёл';
      default:
        return 'Неизвестно';
    }
  };

  const getRoleText = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'super_admin':
        return 'Супер Администратор';
      case 'department_head':
        return 'Руководитель отдела';
      case 'employee':
        return 'Сотрудник';
      default:
        return role || 'Пользователь';
    }
  };

  const dynamicStyles = StyleSheet.create({
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
      backgroundColor: theme.backgroundSecondary,
    },
    header: {
      borderBottomColor: theme.border,
    },
    title: {
      color: theme.text,
    },
    section: {
      borderBottomColor: theme.border,
    },
    sectionTitle: {
      color: theme.textSecondary,
    },
    infoRow: {
      borderBottomColor: theme.border,
    },
    label: {
      color: theme.textSecondary,
    },
    value: {
      color: theme.text,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, dynamicStyles.overlay]}>
        <View style={[styles.container, dynamicStyles.container]}>
          {/* Header */}
          <View style={[styles.header, dynamicStyles.header]}>
            <Text style={[styles.title, dynamicStyles.title]}>Профиль пользователя</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Avatar and Name */}
            <View style={styles.avatarSection}>
              <Avatar
                imageUrl={user.avatar}
                name={user.full_name || user.name || user.email}
                size={80}
              />
              <Text style={[styles.userName, { color: theme.text }]}>
                {user.full_name || user.name || 'Без имени'}
              </Text>
              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(user.status) },
                  ]}
                />
                <Text style={[styles.statusText, { color: theme.textSecondary }]}>
                  {getStatusText(user.status)}
                </Text>
              </View>
            </View>

            {/* Main Info */}
            <View style={[styles.section, dynamicStyles.section]}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>
                Основная информация
              </Text>

              <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                <Ionicons name="mail-outline" size={20} color={theme.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.label, dynamicStyles.label]}>Email</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {user.email}
                  </Text>
                </View>
              </View>

              {user.phone && (
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Ionicons name="call-outline" size={20} color={theme.primary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.label, dynamicStyles.label]}>Телефон</Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {user.phone}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                <Ionicons name="briefcase-outline" size={20} color={theme.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.label, dynamicStyles.label]}>Роль</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {getRoleText(user.role)}
                  </Text>
                </View>
              </View>

              {user.department_name && (
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Ionicons name="business-outline" size={20} color={theme.primary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.label, dynamicStyles.label]}>Отдел</Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {user.department_name}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.infoRow, dynamicStyles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.label, dynamicStyles.label]}>Дата регистрации</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {formatDate(user.created_at)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
  },
});
