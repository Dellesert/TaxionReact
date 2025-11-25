import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Poll } from '../types/poll.types';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { Avatar } from '@components/common/Avatar';

interface PollItemProps {
  poll: Poll;
  onPress: (poll: Poll) => void;
}

export const PollItem: React.FC<PollItemProps> = ({ poll, onPress }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const getStatusColor = () => {
    switch (poll.status) {
      case 'active':
        return '#10B981';
      case 'closed':
        return '#6B7280';
      case 'draft':
        return '#F59E0B';
      default:
        return '#9CA3AF';
    }
  };

  const getStatusText = () => {
    switch (poll.status) {
      case 'active':
        return 'Активен';
      case 'closed':
        return 'Завершен';
      case 'draft':
        return 'Черновик';
      case 'cancelled':
        return 'Отменен';
      default:
        return poll.status;
    }
  };

  const getTypeIcon = () => {
    switch (poll.type) {
      case 'single_choice':
        return 'radio-button-on';
      case 'multiple_choice':
        return 'checkbox';
      case 'rating':
        return 'star';
      case 'ranking':
        return 'list';
      case 'open_text':
        return 'text';
      default:
        return 'help-circle';
    }
  };

  const getTypeText = () => {
    switch (poll.type) {
      case 'single_choice':
        return 'Один выбор';
      case 'multiple_choice':
        return 'Множественный';
      case 'rating':
        return 'Оценка';
      case 'ranking':
        return 'Ранжирование';
      case 'open_text':
        return 'Текст';
      default:
        return poll.type;
    }
  };

  const getVisibilityIcon = () => {
    switch (poll.visibility) {
      case 'public':
        return 'globe-outline';
      case 'department':
        return 'business-outline';
      case 'invite_only':
        return 'mail-outline';
      case 'private':
        return 'lock-closed-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getVisibilityText = () => {
    switch (poll.visibility) {
      case 'public':
        return 'Публичный';
      case 'department':
        return poll.department_name || 'Департамент';
      case 'invite_only':
        return 'Приглашенные';
      case 'private':
        return 'Приватный';
      default:
        return poll.visibility;
    }
  };

  const getVisibilityColor = () => {
    switch (poll.visibility) {
      case 'public':
        return '#3B82F6'; // Blue
      case 'department':
        return '#8B5CF6'; // Purple
      case 'invite_only':
        return '#F59E0B'; // Amber
      case 'private':
        return '#6B7280'; // Gray
      default:
        return '#9CA3AF';
    }
  };

  const getCreatorName = () => {
    // Check if creator is current user
    if (user && poll.created_by === user.id) {
      return 'Я';
    }

    if (!poll.creator) {
      return poll.created_by ? `Пользователь #${poll.created_by}` : 'Неизвестно';
    }
    return poll.creator.name || poll.creator.email || `Пользователь #${poll.created_by}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress(poll)}
      activeOpacity={0.7}
    >
      {/* Header with Title */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {poll.title}
            </Text>

            {poll.user_has_voted && (
              <View style={styles.votedIndicator}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* Visibility, Category and Deadline in one row */}
        <View style={styles.metaBadgesRow}>
          <View style={[styles.visibilityBadge, { backgroundColor: getVisibilityColor() + '12' }]}>
            <Ionicons name={getVisibilityIcon() as any} size={14} color={getVisibilityColor()} />
            <Text style={[styles.visibilityText, { color: getVisibilityColor() }]}>
              {getVisibilityText()}
            </Text>
          </View>

          {poll.category && (
            <View style={[styles.categoryTag, { backgroundColor: '#EC4899' + '10', borderColor: '#EC4899' + '40' }]}>
              <Ionicons name="pricetag" size={12} color="#EC4899" />
              <Text style={[styles.categoryTagText, { color: '#EC4899' }]}>{poll.category}</Text>
            </View>
          )}

          {poll.end_time && poll.status === 'active' && (
            <View style={styles.deadlineChip}>
              <Ionicons name="time" size={11} color="#EF4444" />
              <Text style={[styles.deadlineText, { color: '#EF4444' }]}>
                до {new Date(poll.end_time).toLocaleDateString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            </View>
          )}
        </View>

        {/* Features Pills */}
        {(poll.allow_anonymous || poll.require_comment) && (
          <View style={styles.featuresPills}>
            {poll.allow_anonymous && (
              <View style={[styles.featurePill, { backgroundColor: '#8B5CF6' + '12' }]}>
                <Ionicons name="eye-off" size={11} color="#8B5CF6" />
                <Text style={[styles.featurePillText, { color: '#8B5CF6' }]}>Анонимно</Text>
              </View>
            )}

            {poll.require_comment && (
              <View style={[styles.featurePill, { backgroundColor: '#F59E0B' + '12' }]}>
                <Ionicons name="chatbubble" size={11} color="#F59E0B" />
                <Text style={[styles.featurePillText, { color: '#F59E0B' }]}>Комментарии</Text>
              </View>
            )}
          </View>
        )}

        {/* Stats Footer */}
        <View style={[styles.metadataRow, { borderTopColor: theme.border }]}>
          {/* Metadata items */}
          <View style={styles.metadataItems}>
            {/* Voters count */}
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={14} color={theme.primary} />
              <Text style={[styles.metaText, { color: theme.text }]}>
                {poll.total_voters || 0}
              </Text>
            </View>

            {/* Comments count */}
            {poll.comments_count && poll.comments_count > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="chatbubbles-outline" size={14} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {poll.comments_count}
                </Text>
              </View>
            )}
          </View>

          {/* Creator with avatar and name */}
          <View style={styles.creatorContainer}>
            <Text style={[styles.creatorName, { color: theme.textSecondary }]} numberOfLines={1}>
              {getCreatorName()}
            </Text>
            <Avatar
              name={getCreatorName()}
              imageUrl={poll.creator?.avatar}
              size={24}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    position: 'relative',
    borderWidth: 1,
  },
  content: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  header: {
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  votedIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10B981' + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuresPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  metadataItems: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flex: 1,
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EF4444' + '12',
    borderRadius: 8,
  },
  deadlineText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorName: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default PollItem;
