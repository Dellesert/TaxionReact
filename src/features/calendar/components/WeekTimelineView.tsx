import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Event } from '../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import {
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
  parseISO,
  getHours,
  getMinutes,
} from 'date-fns';

interface WeekTimelineViewProps {
  selectedDate: Date;
  events: Event[];
  onEventPress: (event: Event) => void;
  onTimeSlotPress?: (date: Date, hour: number) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60;
const TIMELINE_WIDTH = 60;

export const WeekTimelineView: React.FC<WeekTimelineViewProps> = ({
  selectedDate,
  events,
  onEventPress,
  onTimeSlotPress,
}) => {
  const { theme } = useTheme();

  // Get week days (Monday to Sunday)
  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Start from Monday
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); // End on Sunday
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [selectedDate]);

  // Group events by day and calculate positions
  const eventsByDay = useMemo(() => {
    const grouped: { [key: string]: Array<Event & { top: number; height: number }> } = {};

    weekDays.forEach((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = [];

      events.forEach((event) => {
        const eventStart = parseISO(event.start_time);
        const eventEnd = parseISO(event.end_time);

        if (isSameDay(eventStart, day)) {
          // Calculate position and height
          const startHour = getHours(eventStart);
          const startMinute = getMinutes(eventStart);
          const endHour = getHours(eventEnd);
          const endMinute = getMinutes(eventEnd);

          const top = (startHour + startMinute / 60) * HOUR_HEIGHT;
          const bottom = (endHour + endMinute / 60) * HOUR_HEIGHT;
          const height = Math.max(bottom - top, HOUR_HEIGHT * 0.75); // Minimum 45 minutes for better text visibility

          grouped[dateKey].push({
            ...event,
            top,
            height,
          });
        }
      });

      // Sort events by start time
      grouped[dateKey].sort((a, b) => a.top - b.top);
    });

    return grouped;
  }, [weekDays, events]);

  const renderTimeLabels = () => (
    <View style={[styles.timeColumn, { backgroundColor: theme.card, borderRightColor: theme.border }]}>
      <View style={styles.timeColumnHeader} />
      {HOURS.map((hour) => (
        <View key={hour} style={[styles.timeSlot, { height: HOUR_HEIGHT, borderBottomColor: theme.border }]}>
          <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
            {hour.toString().padStart(2, '0')}:00
          </Text>
        </View>
      ))}
    </View>
  );

  const renderDayColumn = (day: Date) => {
    const dateKey = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDay[dateKey] || [];
    const isTodayDate = isToday(day);
    const isWeekend = day.getDay() === 0 || day.getDay() === 6; // Saturday or Sunday

    // Get 2-letter day name
    const getDayName = (date: Date) => {
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      return dayNames[date.getDay()];
    };

    return (
      <View key={dateKey} style={styles.dayColumn}>
        {/* Day Header */}
        <View style={[styles.dayHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.dayName, { color: isWeekend ? theme.primary : theme.textSecondary }]}>
            {getDayName(day)}
          </Text>
          <View
            style={[
              styles.dayNumber,
              isTodayDate && [styles.dayNumberToday, { backgroundColor: theme.primary }],
            ]}
          >
            <Text
              style={[
                styles.dayNumberText,
                { color: theme.text },
                isTodayDate && styles.dayNumberTextToday,
                isWeekend && !isTodayDate && { color: theme.primary },
              ]}
            >
              {format(day, 'd')}
            </Text>
          </View>
        </View>

        {/* Time Grid */}
        <View style={styles.dayGrid}>
          {HOURS.map((hour) => (
            <TouchableOpacity
              key={hour}
              style={[
                styles.timeSlot,
                { height: HOUR_HEIGHT, borderBottomColor: theme.border },
              ]}
              onPress={() => onTimeSlotPress?.(day, hour)}
              activeOpacity={0.8}
            >
              {/* Half-hour line */}
              <View style={[styles.halfHourLine, { borderBottomColor: theme.border }]} />
            </TouchableOpacity>
          ))}

          {/* Events */}
          {dayEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={[
                styles.eventBlock,
                {
                  top: event.top,
                  height: event.height,
                  backgroundColor: event.color,
                  borderColor: event.color,
                },
              ]}
              onPress={() => onEventPress(event)}
              activeOpacity={0.9}
            >
              <View style={styles.eventContent}>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {event.title}
                </Text>
                <Text style={styles.eventTime} numberOfLines={1}>
                  {format(parseISO(event.start_time), 'HH:mm')} -{' '}
                  {format(parseISO(event.end_time), 'HH:mm')}
                </Text>
                {event.location && (
                  <Text style={styles.eventLocation} numberOfLines={1}>
                    📍 {event.location}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {/* Current time indicator */}
          {isTodayDate && <CurrentTimeIndicator theme={theme} />}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        style={styles.verticalScroll}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        <View style={styles.horizontalContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScrollContent}
            nestedScrollEnabled={true}
          >
            {renderTimeLabels()}
            <View style={styles.weekGrid}>
              {weekDays.map((day) => renderDayColumn(day))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
};

// Current time indicator component
const CurrentTimeIndicator: React.FC<{ theme: any }> = ({ theme }) => {
  const now = new Date();
  const currentMinutes = getHours(now) * 60 + getMinutes(now);
  const topPosition = (currentMinutes / 60) * HOUR_HEIGHT;

  return (
    <View style={[styles.currentTimeLine, { top: topPosition, backgroundColor: theme.primary }]}>
      <View style={[styles.currentTimeDot, { backgroundColor: theme.primary }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  verticalScroll: {
    flex: 1,
  },
  horizontalContainer: {
    flexGrow: 1,
  },
  horizontalScrollContent: {
    flexDirection: 'row',
    flexGrow: 1,
  },
  timeColumn: {
    width: TIMELINE_WIDTH,
    borderRightWidth: 1,
  },
  timeColumnHeader: {
    height: 60,
  },
  weekGrid: {
    flexDirection: 'row',
    flex: 1,
    minHeight: HOUR_HEIGHT * 24 + 60, // 24 hours + header
  },
  dayColumn: {
    flex: 1,
    minWidth: 100,
    minHeight: HOUR_HEIGHT * 24 + 60,
  },
  dayHeader: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    paddingVertical: 8,
    gap: 4,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberToday: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dayNumberTextToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayGrid: {
    position: 'relative',
    flex: 1,
    minHeight: HOUR_HEIGHT * 24,
  },
  timeSlot: {
    borderBottomWidth: 1,
    position: 'relative',
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    paddingRight: 8,
    textAlign: 'right',
    marginTop: -8,
  },
  halfHourLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    opacity: 0.3,
  },
  eventBlock: {
    position: 'absolute',
    left: 4,
    right: 4,
    borderRadius: 6,
    borderLeftWidth: 3,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  eventContent: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 16,
  },
  eventTime: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 14,
  },
  eventLocation: {
    fontSize: 10,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 14,
  },
  currentTimeLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    zIndex: 10,
  },
  currentTimeDot: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
