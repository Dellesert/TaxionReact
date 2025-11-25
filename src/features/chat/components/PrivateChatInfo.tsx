/**
 * Private Chat Info Component
 * Информация о личном чате
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { User } from '@/types/user.types';
import { getSystemRoleLabel, getLastSeenText } from '../utils/chatSettingsFormatters';
import { QuickActions, QuickAction } from './QuickActions';

interface PrivateChatInfoProps {
  user: User;
  departmentName: string;
  quickActions: QuickAction[];
}

export const PrivateChatInfo: React.FC<PrivateChatInfoProps> = ({
  user,
  departmentName,
  quickActions,
}) => {
  const { theme } = useTheme();

  const dynamicStyles = StyleSheet.create({
    section: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
  });

  return (
    <View style={[styles.section, dynamicStyles.section]}>
      <View style={styles.avatarContainer}>
        <Avatar
          imageUrl={user.avatar}
          name={user.name || user.email}
          size={100}
        />
      </View>
      <Text style={[styles.userFullName, { color: theme.text }]}>
        {user.name || 'Пользователь'}
      </Text>
      {user.position && (
        <Text style={[styles.userPosition, { color: theme.textSecondary }]}>
          {user.position}
        </Text>
      )}
      {departmentName && (
        <Text style={[styles.userDepartment, { color: theme.textSecondary }]}>
          {departmentName}
        </Text>
      )}
      {user.role && (
        <View style={[styles.userRoleBadge, { backgroundColor: theme.primary + '20' }]}>
          <Text style={[styles.userRole, { color: theme.primary }]}>
            {getSystemRoleLabel(user.role)}
          </Text>
        </View>
      )}
      <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
        {user.email}
      </Text>
      <Text
        style={[
          styles.userLastSeen,
          { color: user.status === 'online' ? theme.success || '#34C759' : theme.textTertiary },
        ]}
      >
        {getLastSeenText(user.status, user.last_active_at)}
      </Text>

      <QuickActions actions={quickActions} />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  userFullName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  userPosition: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  userDepartment: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  userRoleBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
  },
  userRole: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  userEmail: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    opacity: 0.8,
  },
  userLastSeen: {
    fontSize: 13,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
});
