import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';
import { Poll } from '../../types/poll.types';
import { getPollStatusConfig, getPollTypeConfig, formatPollDate } from '../../utils/pollHelpers';
import { spacing, hitSlop } from '@shared/constants/design-system.constants';

interface PollInfoProps {
  poll: Poll;
  onUserPress: (userId: number) => void;
}

export const PollInfo: React.FC<PollInfoProps> = ({ poll, onUserPress }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const statusConfig = getPollStatusConfig(poll.status);
  const typeConfig = getPollTypeConfig(poll.type);

  const isCurrentUser = user && poll.created_by === user.id;
  const creatorName = isCurrentUser ? 'Я' : (poll.creator?.name || 'Unknown');

  return (
    <View>
      {/* Poll Title */}
      <Text style={[styles.pollTitle, { color: theme.text }]}>{poll.title}</Text>

      {/* Status and Type Row */}
      <View style={styles.badgesRow}>
        <View style={[styles.badge, { backgroundColor: statusConfig.color }]}>
          <Text style={styles.badgeText}>{statusConfig.label}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: typeConfig.color }]}>
          <Ionicons name={typeConfig.icon as any} size={12} color="#FFFFFF" />
          <Text style={styles.badgeText}>{typeConfig.label}</Text>
        </View>
      </View>

      {/* Info Row: Creator and Deadline */}
      <View style={styles.infoRow}>
        <TouchableOpacity
          style={styles.creatorInfo}
          onPress={() => poll.created_by && onUserPress(poll.created_by)}
          activeOpacity={0.7}
          hitSlop={hitSlop.sm}
        >
          <Avatar
            name={creatorName}
            imageUrl={poll.creator?.avatar}
            size={32}
          />
          <Text
            style={[styles.creatorText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {creatorName}
          </Text>
        </TouchableOpacity>
        {poll.end_time && poll.status === 'active' && (
          <View style={styles.deadlineInfo}>
            <Ionicons name="calendar-outline" size={18} color={theme.iconSecondary} />
            <Text style={[styles.deadlineText, { color: theme.textSecondary }]}>
              до {formatPollDate(poll.end_time)}
            </Text>
          </View>
        )}
      </View>

      {/* Description Section */}
      {poll.description && (
        <View style={styles.descriptionSection}>
          <Text style={[styles.descriptionLabel, { color: theme.text }]}>Описание</Text>
          <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
            {poll.description}
          </Text>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="calendar-outline" size={18} color={theme.iconSecondary} />
          <Text style={[styles.statText, { color: theme.textSecondary }]}>
            Создан {new Date(poll.created_at).toLocaleDateString('ru-RU')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={18} color={theme.iconSecondary} />
          <Text style={[styles.statText, { color: theme.textSecondary }]}>
            Проголосовало: {poll.total_voters || 0}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pollTitle: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
    marginBottom: spacing.lg,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.md,
  },
  creatorText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    flexShrink: 1,
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  descriptionSection: {
    marginBottom: spacing.xl,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  statText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
