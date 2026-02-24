import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import { isFuture, parseISO, startOfDay } from 'date-fns';

interface UpcomingEventsCardProps {
  events: Event[];
  onEventPress?: (event: Event) => void;
}

export const UpcomingEventsCard: React.FC<UpcomingEventsCardProps> = ({
  events,
  onEventPress,
}) => {
  const { theme } = useTheme();

  // Get upcoming events (max 3)
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter(event => {
        const eventDate = parseISO(event.start_time);
        return isFuture(eventDate) && eventDate > now;
      })
      .sort((a, b) => {
        const dateA = parseISO(a.start_time);
        const dateB = parseISO(b.start_time);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 3);
  }, [events]);

  const formatEventDate = (dateString: string) => {
    const date = parseISO(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (startOfDay(date).getTime() === startOfDay(today).getTime()) {
      return 'Сегодня';
    } else if (startOfDay(date).getTime() === startOfDay(tomorrow).getTime()) {
      return 'Завтра';
    } else {
      return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  };

  const formatEventTime = (dateString: string) => {
    const date = parseISO(dateString);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="time-outline" size={18} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>Скоро</Text>
      </View>

      {/* Events List */}
      <View style={styles.eventsList}>
        {upcomingEvents.map((event) => (
          <TouchableOpacity
            key={event.id}
            style={[
              styles.eventItem,
              { borderLeftColor: event.color },
              Platform.OS === 'web' && styles.eventItemWeb,
            ]}
            onPress={() => onEventPress?.(event)}
            activeOpacity={0.7}
          >
            <View style={styles.eventContent}>
              <Text style={[styles.eventTitle, { color: theme.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <View style={styles.eventTime}>
                <Text style={[styles.eventDate, { color: theme.primary }]}>
                  {formatEventDate(event.start_time)}
                </Text>
                {!event.all_day && (
                  <>
                    <Text style={[styles.separator, { color: theme.textTertiary }]}>•</Text>
                    <Text style={[styles.timeText, { color: theme.textSecondary }]}>
                      {formatEventTime(event.start_time)}
                    </Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  eventsList: {
    gap: 8,
  },
  eventItem: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  eventItemWeb: {
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
    } : {}),
  },
  eventContent: {
    gap: 4,
  },
  eventTitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  eventTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  separator: {
    fontSize: 10,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
