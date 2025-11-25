import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Event } from '../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { DayEventsSheet } from './DayEventsSheet';

interface MonthCalendarViewProps {
  selectedDate: Date;
  events: Event[];
  onDatePress: (date: Date) => void;
  onEventPress?: (event: Event) => void;
}

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  selectedDate,
  events,
  onDatePress,
  onEventPress,
}) => {
  const { theme } = useTheme();
  const [selectedDayForSheet, setSelectedDayForSheet] = useState<Date | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [selectedDate]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: Event[] } = {};

    events.forEach((event) => {
      // Parse the ISO date string
      const date = new Date(event.start_time);

      // Get the local date components to create the date key
      // This ensures we're using the local date, not UTC
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): Event[] => {
    // Use the same logic as grouping to ensure consistency
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    return eventsByDate[dateKey] || [];
  };

  // Get event type colors for dots
  const getEventDotColors = (events: Event[]): string[] => {
    const colorMap: { [key: string]: string } = {};

    events.forEach((event) => {
      if (!colorMap[event.type]) {
        colorMap[event.type] = event.color;
      }
    });

    return Object.values(colorMap).slice(0, 3); // Max 3 dots
  };

  const renderDay = (date: Date) => {
    const isCurrentMonth = isSameMonth(date, selectedDate);
    const isTodayDate = isToday(date);

    // Create a normalized date at midnight local time to avoid timezone issues
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0, 0, 0, 0
    );

    const dayEvents = getEventsForDate(normalizedDate);
    const hasEvents = dayEvents.length > 0;
    const dotColors = getEventDotColors(dayEvents);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const handleDayPress = () => {
      if (hasEvents && isCurrentMonth) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        setSelectedDayForSheet(normalizedDate);
        setSelectedDayKey(dateKey);
      }
    };

    return (
      <TouchableOpacity
        key={date.toISOString()}
        style={styles.dayContainer}
        onPress={handleDayPress}
        activeOpacity={hasEvents && isCurrentMonth ? 0.6 : 1}
        disabled={!hasEvents || !isCurrentMonth}
      >
        <View
          style={[
            styles.dayContent,
            isTodayDate && [styles.todayContainer, { backgroundColor: theme.primary }],
            !isCurrentMonth && styles.dayOutOfMonth,
          ]}
        >
          <Text
            style={[
              styles.dayText,
              { color: isCurrentMonth ? theme.text : theme.textTertiary },
              isTodayDate && styles.todayText,
              isWeekend && isCurrentMonth && !isTodayDate && { color: theme.primary },
            ]}
          >
            {format(date, 'd')}
          </Text>
        </View>

        {/* Event dots indicator */}
        {hasEvents && isCurrentMonth && (
          <View style={styles.dotsContainer}>
            {dotColors.map((color, index) => (
              <View
                key={`${date.toISOString()}-${index}`}
                style={[
                  styles.eventDot,
                  { backgroundColor: color },
                  isTodayDate && styles.eventDotToday,
                ]}
              />
            ))}
            {dayEvents.length > 3 && (
              <Text style={[
                styles.moreIndicator,
                { color: isTodayDate ? '#FFFFFF' : theme.textTertiary }
              ]}>
                +{dayEvents.length - 3}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Split days into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7));
  }

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.card }]}>
        {/* Weekday headers */}
        <View style={[styles.weekdayRow, { borderBottomColor: theme.border }]}>
        {WEEKDAY_NAMES.map((day, index) => {
          const isWeekend = index >= 5;
          return (
            <View key={day} style={styles.weekdayContainer}>
              <Text
                style={[
                  styles.weekdayText,
                  { color: isWeekend ? theme.primary : theme.textSecondary },
                ]}
              >
                {day}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Calendar grid */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day) => renderDay(day))}
          </View>
        ))}
      </ScrollView>

      {/* Day Events Sheet */}
        {selectedDayForSheet && selectedDayKey && (
          <DayEventsSheet
            visible={!!selectedDayForSheet}
            date={selectedDayForSheet}
            events={eventsByDate[selectedDayKey] || []}
            onEventPress={(event) => {
              setSelectedDayForSheet(null);
              setSelectedDayKey(null);
              onEventPress?.(event);
            }}
            onClose={() => {
              setSelectedDayForSheet(null);
              setSelectedDayKey(null);
            }}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  container: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: 16,
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  weekdayContainer: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weekRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  dayContainer: {
    flex: 1,
    aspectRatio: 1,
    padding: 3,
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  todayContainer: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  dayOutOfMonth: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  todayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventDotToday: {
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  moreIndicator: {
    fontSize: 8,
    fontWeight: '600',
    marginLeft: 2,
  },
});
