import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventParticipantStatus } from '../../types/calendar.types';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { Avatar } from '@components/common/Avatar';

interface EventItemProps {
  event: Event;
  onPress: (event: Event) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const getEventIcon = () => {
    switch (event.type) {
      case 'meeting':
        return 'people';
      case 'deadline':
        return 'flag';
      case 'personal':
        return 'person';
      default:
        return 'calendar';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get current user's participation status
  const myParticipation = user && event.participants ? event.participants.find(p => p.user_id === user.id) : null;

  const getStatusBadge = (status: EventParticipantStatus) => {
    switch (status) {
      case 'accepted':
        return { icon: 'checkmark-circle', color: '#10B981', label: 'Принято' };
      case 'declined':
        return { icon: 'close-circle', color: '#EF4444', label: 'Отклонено' };
      case 'maybe':
        return { icon: 'help-circle', color: '#F59E0B', label: 'Возможно' };
      case 'pending':
        return { icon: 'time', color: '#6B7280', label: 'Ожидание' };
    }
  };

  const statusBadge = myParticipation ? getStatusBadge(myParticipation.status) : null;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={() => onPress(event)}
      activeOpacity={0.6}
    >
      {/* Color indicator */}
      <View style={[styles.colorIndicator, { backgroundColor: event.color }]} />

      <View style={styles.content}>
        {/* Time badge for non-all-day events */}
        {!event.all_day && (
          <View style={[styles.timeBadge, { backgroundColor: event.color + '15' }]}>
            <Text style={[styles.timeBadgeText, { color: event.color }]}>
              {formatTime(event.start_time)}
            </Text>
          </View>
        )}

        {/* Title and status */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          {statusBadge && (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '15' }]}>
              <Ionicons name={statusBadge.icon as any} size={14} color={statusBadge.color} />
            </View>
          )}
        </View>

        {/* Description */}
        {event.description && (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {event.description}
          </Text>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          {event.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location" size={12} color={theme.textTertiary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}

          {event.creator && (
            <View style={styles.metaItem}>
              <Avatar
                name={event.creator.name}
                imageUrl={event.creator.avatar}
                size={16}
              />
              <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
                {event.creator.name}
              </Text>
            </View>
          )}

          {(event.participant_count || event.participants_count || 0) > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="people" size={12} color={theme.textTertiary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {event.participant_count || event.participants_count || 0}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  colorIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  content: {
    padding: 16,
    paddingLeft: 20,
  },
  timeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    marginRight: 8,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default EventItem;
