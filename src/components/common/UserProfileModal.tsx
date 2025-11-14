/**
 * User Profile Modal
 * Модальное окно с информацией о пользователе
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { User } from '../../types/user.types';
import { getUserById } from '@api/user.api';

interface UserProfileModalProps {
  visible: boolean;
  userId: number | null;
  onClose: () => void;
  onOpenChat?: (userId: number) => void;
  onAddToFavorites?: (userId: number) => void;
  onBlock?: (userId: number) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  visible,
  userId,
  onClose,
  onOpenChat,
  onAddToFavorites,
  onBlock,
}) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      loadUser();
    }
  }, [visible, userId]);

  const loadUser = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const userData = await getUserById(userId);
      setUser(userData);
    } catch (error: any) {
      console.error('Error loading user:', error);
      setError(error.message || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

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
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.safeArea, dynamicStyles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, dynamicStyles.header]}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.error} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.title, dynamicStyles.title]}>Профиль пользователя</Text>
            <View style={styles.headerRight} />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Загрузка профиля...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.loadingContainer}>
              <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
              <Text style={[styles.loadingText, { color: theme.error }]}>
                {error}
              </Text>
              <TouchableOpacity
                onPress={loadUser}
                style={[styles.retryButton, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.retryButtonText}>Попробовать снова</Text>
              </TouchableOpacity>
            </View>
          ) : user ? (
            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
              {/* Avatar and Name */}
              <View style={styles.avatarSection}>
                <Avatar
                  imageUrl={user.avatar}
                  name={user.name || user.email}
                  size={80}
                />
                <Text style={[styles.userName, { color: theme.text }]}>
                  {user.name || 'Без имени'}
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

            {/* Action Buttons */}
            <View style={styles.actionsSection}>
              {onOpenChat && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.primary }]}
                  onPress={() => {
                    onOpenChat(user.id);
                    onClose();
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Написать</Text>
                </TouchableOpacity>
              )}

              {onAddToFavorites && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => {
                    onAddToFavorites(user.id);
                  }}
                >
                  <Ionicons name="star-outline" size={20} color={theme.text} />
                  <Text style={[styles.actionButtonTextSecondary, { color: theme.text }]}>В избранное</Text>
                </TouchableOpacity>
              )}

              {onBlock && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }]}
                  onPress={() => {
                    onBlock(user.id);
                  }}
                >
                  <Ionicons name="ban-outline" size={20} color={theme.error} />
                  <Text style={[styles.actionButtonTextSecondary, { color: theme.error }]}>Заблокировать</Text>
                </TouchableOpacity>
              )}
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

              {user.position && (
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Ionicons name="briefcase-outline" size={20} color={theme.primary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.label, dynamicStyles.label]}>Должность</Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {user.position}
                    </Text>
                  </View>
                </View>
              )}

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

              {(user.department_name || user.department?.name) && (
                <View style={[styles.infoRow, dynamicStyles.infoRow]}>
                  <Ionicons name="business-outline" size={20} color={theme.primary} />
                  <View style={styles.infoContent}>
                    <Text style={[styles.label, dynamicStyles.label]}>Отдел</Text>
                    <Text style={[styles.value, dynamicStyles.value]}>
                      {user.department_name || user.department?.name}
                    </Text>
                  </View>
                </View>
              )}

              <View style={[styles.infoRow, dynamicStyles.infoRow, { borderBottomWidth: 0 }]}>
                <Ionicons name="person-outline" size={20} color={theme.primary} />
                <View style={styles.infoContent}>
                  <Text style={[styles.label, dynamicStyles.label]}>Роль</Text>
                  <Text style={[styles.value, dynamicStyles.value]}>
                    {getRoleText(user.role)}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 100,
    alignItems: 'flex-start',
  },
  headerRight: {
    width: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
  actionsSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
