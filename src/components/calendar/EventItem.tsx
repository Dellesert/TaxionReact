import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types/calendar.types';

interface EventItemProps {
  event: Event;
  onPress: (event: Event) => void;
}

export const EventItem: React.FC<EventItemProps> = ({ event, onPress }) => {
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

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: event.color }]}
      onPress={() => onPress(event)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: event.color + '20' }]}>
        <Ionicons name={getEventIcon() as any} size={20} color={event.color} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        {event.description && (
          <Text style={styles.description} numberOfLines={1}>
            {event.description}
          </Text>
        )}

        <View style={styles.footer}>
          {!event.all_day && (
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={styles.time}>
                {formatTime(event.start_time)} - {formatTime(event.end_time)}
              </Text>
            </View>
          )}

          {event.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color="#6B7280" />
              <Text style={styles.location} numberOfLines={1}>
                {event.location}
              </Text>
            </View>
          )}

          {event.participants_count > 0 && (
            <View style={styles.participantsRow}>
              <Ionicons name="people-outline" size={14} color="#6B7280" />
              <Text style={styles.participants}>{event.participants_count}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  location: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    flex: 1,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participants: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
});

export default EventItem;
