import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventParticipantStatus } from '../../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';
import { useEventPrefetch } from '@shared/hooks/useEventPrefetch';

interface EventItemProps {
  event: Event;
  onPress: (event: Event) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { prefetchEventDelayed, cancelPrefetch } = useEventPrefetch();
  const [isHovered, setIsHovered] = useState(false);

  // Предзагрузка при касании (до нажатия)
  const handlePressIn = useCallback(() => {
    prefetchEventDelayed(event.id);
  }, [event.id, prefetchEventDelayed]);

  // Отмена предзагрузки при отмене касания
  const handlePressOut = useCallback(() => {
    cancelPrefetch();
  }, [cancelPrefetch]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeRange = () => {
    return `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`;
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
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        isHovered && Platform.OS === 'web' && styles.containerHovered,
      ]}
      onPress={() => onPress(event)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // @ts-ignore - web only props
      onMouseEnter={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onMouseLeave={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
      activeOpacity={0.7}
    >
      {/* Color indicator */}
      <View style={[styles.colorIndicator, { backgroundColor: event.color }]} />

      <View style={styles.content}>
        {/* Title with status badge */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          {statusBadge && (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
              <Ionicons name={statusBadge.icon as any} size={16} color={statusBadge.color} />
            </View>
          )}
        </View>

        {/* Description - limited to 100 characters */}
        {event.description && (
          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {event.description.length > 100
              ? `${event.description.substring(0, 100)}...`
              : event.description}
          </Text>
        )}

        {/* Metadata section - single row with creator avatar */}
        <View style={styles.metadataRow}>
          {/* Metadata items */}
          <View style={styles.metadataItems}>
            {/* Time */}
            {!event.all_day && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={14} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {formatTimeRange()}
                </Text>
              </View>
            )}

            {event.all_day && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  Весь день
                </Text>
              </View>
            )}

            {/* Location */}
            {event.location && (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.text }]} numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            )}

            {/* Participants count */}
            {(event.participant_count || event.participants_count || 0) > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {event.participant_count || event.participants_count || 0}
                </Text>
              </View>
            )}
          </View>

          {/* Creator Avatar - on the right (hidden for schedule events) */}
          {event.creator && event.type !== 'schedule' && (
            <Avatar
              name={event.creator.name || event.creator.email}
              imageUrl={event.creator.avatar}
              size={24}
              style={styles.creatorAvatar}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      transition: 'all 0.2s ease',
      cursor: 'pointer',
    } : {}),
  },
  containerHovered: {
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      transform: 'translateY(-2px)',
      shadowOpacity: 0.15,
      shadowRadius: 12,
    } : {}),
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginRight: 8,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  creatorAvatar: {
    marginLeft: 8,
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
});

export default EventItem;
