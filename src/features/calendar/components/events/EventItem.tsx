import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventParticipantStatus } from '../../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { Avatar } from '@shared/components/common/Avatar';
import { useEventPrefetch } from '@shared/hooks/useEventPrefetch';
import { FormattedText } from '@features/chat/components/common/FormattedText';

interface EventItemProps {
  event: Event;
  onPress: (event: Event) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { prefetchEventDelayed, cancelPrefetch } = useEventPrefetch();
  const [isHovered, setIsHovered] = useState(false);

  const isBirthday = event.type === 'birthday';
  const isPast = new Date(event.end_time) < new Date();

  // Предзагрузка при касании (до нажатия) — не для birthday
  const handlePressIn = useCallback(() => {
    if (!isBirthday) prefetchEventDelayed(event.id);
  }, [event.id, isBirthday, prefetchEventDelayed]);

  // Отмена предзагрузки при отмене касания
  const handlePressOut = useCallback(() => {
    if (!isBirthday) cancelPrefetch();
  }, [isBirthday, cancelPrefetch]);

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
        return { icon: 'checkmark-circle', color: theme.success, label: 'Принято' };
      case 'declined':
        return { icon: 'close-circle', color: theme.error, label: 'Отклонено' };
      case 'maybe':
        return { icon: 'help-circle', color: theme.warning, label: 'Возможно' };
      case 'pending':
        return { icon: 'time', color: theme.textSecondary, label: 'Ожидание' };
    }
  };

  const statusBadge = myParticipation ? getStatusBadge(myParticipation.status) : null;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        isHovered && Platform.OS === 'web' && styles.containerHovered,
        isPast && { opacity: 0.45 },
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
        {/* Title with status badge or birthday icon */}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          {isBirthday ? (
            <View style={[styles.statusBadge, { backgroundColor: '#E91E6320' }]}>
              <Ionicons name="gift-outline" size={14} color="#E91E63" />
            </View>
          ) : statusBadge ? (
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '20' }]}>
              <Ionicons name={statusBadge.icon as any} size={14} color={statusBadge.color} />
            </View>
          ) : null}
        </View>

        {/* Description - limited to 100 characters (hidden for birthday events) */}
        {!isBirthday && event.description && (
          <FormattedText
            text={event.description.length > 100
              ? `${event.description.substring(0, 100)}...`
              : event.description}
            style={[styles.description, { color: theme.textSecondary }]}
            numberOfLines={2}
          />
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

            {/* Participants count (hidden for birthday events) */}
            {!isBirthday && (event.participant_count || event.participants_count || 0) > 0 && (
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={14} color={theme.primary} />
                <Text style={[styles.metaText, { color: theme.text }]}>
                  {event.participant_count || event.participants_count || 0}
                </Text>
              </View>
            )}
          </View>

          {/* Creator Avatar - on the right (hidden for schedule and birthday events) */}
          {event.creator && event.type !== 'schedule' && event.type !== 'birthday' && (
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
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    padding: 12,
    paddingLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
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
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
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
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
});

export default EventItem;
