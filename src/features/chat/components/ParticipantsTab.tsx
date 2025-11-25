/**
 * Participants Tab
 * Вкладка участников чата
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { ChatMember } from '../types/chat.types';

interface ParticipantsTabProps {
  members: ChatMember[];
  isLoading: boolean;
  currentUserId?: number;
  creatorId?: number;
  currentUserRole?: 'owner' | 'admin' | 'member';
  onAddMembers?: () => void;
  onMemberPress?: (userId: number, userName: string, role: string) => void;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  members,
  isLoading,
  currentUserId,
  creatorId,
  currentUserRole,
  onAddMembers,
  onMemberPress,
}) => {
  const { theme } = useTheme();

  const canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  const getChatRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Владелец';
      case 'admin':
        return 'Администратор';
      default:
        return '';
    }
  };

  const getChatRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return '#E94444';
      case 'admin':
        return theme.primary;
      default:
        return theme.textSecondary;
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
    },
    addButton: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
    },
    addButtonText: {
      color: theme.primary,
    },
    memberItem: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    memberName: {
      color: theme.text,
    },
    menuButton: {
      // Dynamic styling if needed
    },
  });

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, dynamicStyles.container]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Загрузка участников...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, dynamicStyles.container]}>
      {/* Кнопка добавления участников */}
      {canManageMembers && onAddMembers && (
        <TouchableOpacity
          style={[styles.addButton, dynamicStyles.addButton]}
          onPress={onAddMembers}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={24} color={theme.primary} />
          <Text style={[styles.addButtonText, dynamicStyles.addButtonText]}>
            Добавить участников
          </Text>
        </TouchableOpacity>
      )}

      {/* Заголовок секции */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {members.length} {members.length === 1 ? 'участник' : members.length < 5 ? 'участника' : 'участников'}
        </Text>
      </View>

      {/* Список участников */}
      {members.map((item) => {
        const user = item.user;
        if (!user) return null;

        const canInteract = canManageMembers &&
          item.user_id !== creatorId &&
          currentUserId &&
          item.user_id !== currentUserId &&
          !(currentUserRole === 'admin' && item.role === 'admin');

        return (
          <View key={item.id} style={[styles.memberItem, dynamicStyles.memberItem]}>
            <View style={styles.memberInfo}>
              <Avatar
                name={user.name}
                imageUrl={user.avatar}
                size={48}
                status={user.status}
                showStatus={true}
              />
              <View style={styles.memberDetails}>
                <View style={styles.memberNameRow}>
                  <Text style={[styles.memberName, dynamicStyles.memberName]} numberOfLines={1}>
                    {user.name}
                  </Text>
                  {user.role === 'department_head' && (
                    <Ionicons name="shield-checkmark" size={16} color="#F59E0B" style={{ marginLeft: 6 }} />
                  )}
                </View>
                {item.role !== 'member' && (
                  <Text style={[styles.memberRole, { color: getChatRoleColor(item.role) }]}>
                    {getChatRoleLabel(item.role)}
                  </Text>
                )}
              </View>
            </View>
            {canInteract && onMemberPress && (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => onMemberPress(item.user_id, user.name, item.role)}
                style={styles.menuButton}
              >
                <Ionicons name="ellipsis-horizontal" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {/* Пустое состояние */}
      {members.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Нет участников
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: '500',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
});
