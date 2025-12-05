/**
 * Group Chat Info Component
 * Информация о групповом чате
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { formatMembersCount } from '../../utils/chatSettingsFormatters';
import { QuickActions, QuickAction } from '../common/QuickActions';

interface GroupChatInfoProps {
  chatName: string;
  chatAvatar?: string;
  membersCount: number;
  quickActions: QuickAction[];
}

export const GroupChatInfo: React.FC<GroupChatInfoProps> = ({
  chatName,
  chatAvatar,
  membersCount,
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
        <Avatar imageUrl={chatAvatar} name={chatName || 'Группа'} size={100} />
      </View>
      <Text style={[styles.chatName, { color: theme.text }]}>
        {chatName || 'Группа'}
      </Text>
      <Text style={[styles.membersCount, { color: theme.textSecondary }]}>
        {formatMembersCount(membersCount)}
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
  chatName: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  membersCount: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
