import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { Poll } from '../types/poll.types';
import { getPollStatusConfig, getPollTypeConfig, formatPollDate } from '../utils/pollHelpers';

interface PollInfoProps {
  poll: Poll;
  onUserPress: (userId: number) => void;
}

export const PollInfo: React.FC<PollInfoProps> = ({ poll, onUserPress }) => {
  const { theme } = useTheme();

  const statusConfig = getPollStatusConfig(poll.status);
  const typeConfig = getPollTypeConfig(poll.type);

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
      <View style={[styles.infoRow, { marginBottom: 16 }]}>
        <TouchableOpacity
          style={styles.creatorInfo}
          onPress={() => poll.created_by && onUserPress(poll.created_by)}
          activeOpacity={0.7}
        >
          <Avatar
            name={poll.creator?.name || 'Unknown'}
            imageUrl={poll.creator?.avatar}
            size={20}
          />
          <Text
            style={[styles.creatorText, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {poll.creator?.name || 'Unknown'}
          </Text>
        </TouchableOpacity>
        {poll.end_time && poll.status === 'active' && (
          <View style={styles.deadlineInfo}>
            <Ionicons name="calendar-outline" size={16} color={theme.textSecondary} />
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
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>
            Создан {new Date(poll.created_at).toLocaleDateString('ru-RU')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="people-outline" size={16} color="#6B7280" />
          <Text style={styles.statText}>
            Проголосовало: {poll.total_voters || 0}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pollTitle: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  creatorText: {
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  deadlineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  descriptionSection: {
    marginBottom: 16,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
