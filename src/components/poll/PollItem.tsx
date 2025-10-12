import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Poll } from '@types/poll.types';

interface PollItemProps {
  poll: Poll;
  onPress: (poll: Poll) => void;
}

export const PollItem: React.FC<PollItemProps> = ({ poll, onPress }) => {
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

  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(poll)} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {poll.title}
          </Text>
          {poll.user_has_voted && (
            <View style={styles.votedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            </View>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>

      {poll.description && (
        <Text style={styles.description} numberOfLines={2}>
          {poll.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.typeRow}>
          <Ionicons name={getTypeIcon() as any} size={16} color="#6B7280" />
          <Text style={styles.typeText}>{getTypeText()}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={16} color="#6B7280" />
            <Text style={styles.statText}>{poll.total_votes}</Text>
          </View>

          {poll.allow_comments && poll.comments_count > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-outline" size={16} color="#6B7280" />
              <Text style={styles.statText}>{poll.comments_count}</Text>
            </View>
          )}

          {poll.is_anonymous && (
            <View style={styles.statItem}>
              <Ionicons name="eye-off-outline" size={16} color="#6B7280" />
              <Text style={styles.statText}>Анонимно</Text>
            </View>
          )}
        </View>
      </View>

      {poll.end_time && poll.status === 'active' && (
        <View style={styles.timeRemaining}>
          <Ionicons name="time-outline" size={14} color="#F59E0B" />
          <Text style={styles.timeRemainingText}>
            Завершится {new Date(poll.end_time).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
            })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  votedBadge: {
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  timeRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  timeRemainingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 6,
  },
});

export default PollItem;
