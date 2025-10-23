import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Poll } from '../../types/poll.types';
import { useTheme } from '@hooks/useTheme';

interface PollItemProps {
  poll: Poll;
  onPress: (poll: Poll) => void;
}

export const PollItem: React.FC<PollItemProps> = ({ poll, onPress }) => {
  const { theme } = useTheme();

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
        return 'Департамент';
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
    if (!poll.creator) {
      return poll.created_by ? `Пользователь #${poll.created_by}` : 'Неизвестно';
    }
    return poll.creator.name || poll.creator.email || `Пользователь #${poll.created_by}`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={() => onPress(poll)}
      activeOpacity={0.7}
    >
      {/* Accent Border - colored left border based on status */}
      <View style={[styles.accentBorder, { backgroundColor: getStatusColor() }]} />

      {/* Header with Title */}
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {poll.title}
            </Text>

            {poll.user_has_voted && (
              <View style={styles.votedIndicator}>
                <Ionicons name="checkmark-circle" size={16} color="#3B82F6" />
                <Text style={styles.votedText}>Проголосовал</Text>
              </View>
            )}
          </View>
        </View>

        {/* Visibility and Category in one row */}
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
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <View style={[styles.statIconCircle, { backgroundColor: '#10B981' + '15' }]}>
                <Ionicons name="people" size={16} color="#10B981" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{poll.total_voters || 0}</Text>
            </View>

            <View style={styles.statBox}>
              <View style={[styles.statIconCircle, { backgroundColor: '#3B82F6' + '15' }]}>
                <Ionicons name="checkmark-done" size={16} color="#3B82F6" />
              </View>
              <Text style={[styles.statValue, { color: theme.text }]}>{poll.total_votes || 0}</Text>
            </View>

            {poll.comments_count && poll.comments_count > 0 && (
              <View style={styles.statBox}>
                <View style={[styles.statIconCircle, { backgroundColor: '#F59E0B' + '15' }]}>
                  <Ionicons name="chatbubbles" size={16} color="#F59E0B" />
                </View>
                <Text style={[styles.statValue, { color: theme.text }]}>{poll.comments_count}</Text>
              </View>
            )}
          </View>

          <View style={styles.footerRight}>
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

            {/* Creator name in bottom right corner */}
            <Text style={[styles.creatorName, { color: theme.textTertiary }]} numberOfLines={1}>
              {getCreatorName()}
            </Text>
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  content: {
    paddingLeft: 20,
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
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: 0.3,
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#3B82F6' + '12',
    alignSelf: 'flex-start',
  },
  votedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
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
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },
  visibilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '700',
  },
  featuresPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  featurePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 14,
    borderTopWidth: 1.5,
    gap: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 20,
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  deadlineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EF4444' + '12',
    borderRadius: 6,
  },
  deadlineText: {
    fontSize: 10,
    fontWeight: '700',
  },
  creatorName: {
    fontSize: 11,
    fontWeight: '300',
    fontStyle: 'italic',
  },
});

export default PollItem;
