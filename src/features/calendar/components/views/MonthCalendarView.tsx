import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Event } from '../../types/calendar.types';
import { useTheme } from '@shared/hooks/useTheme';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import { DayEventsSheet } from '../modals/DayEventsSheet';

interface MonthCalendarViewProps {
  selectedDate: Date;
  events: Event[];
  onDatePress: (date: Date) => void;
  onEventPress?: (event: Event) => void;
  isCompact?: boolean; // Desktop compact mode
}

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  selectedDate,
  events,
  onDatePress,
  onEventPress,
  isCompact = false,
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
    const [isDayHovered, setIsDayHovered] = useState(false);
    const isCurrentMonth = isSameMonth(date, selectedDate);
    const isTodayDate = isToday(date);

    // Check if this day is the selected day (for desktop compact mode)
    const isSelectedDay = isCompact &&
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();

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
      if (isCompact && isCurrentMonth) {
        // In compact mode, call onDatePress to navigate to that day
        onDatePress(normalizedDate);
      } else if (hasEvents && isCurrentMonth) {
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
        activeOpacity={isCompact && isCurrentMonth ? 0.6 : (hasEvents && isCurrentMonth ? 0.6 : 1)}
        disabled={isCompact ? !isCurrentMonth : (!hasEvents || !isCurrentMonth)}
        // @ts-ignore - web only props
        onMouseEnter={Platform.OS === 'web' && isCurrentMonth ? () => setIsDayHovered(true) : undefined}
        onMouseLeave={Platform.OS === 'web' && isCurrentMonth ? () => setIsDayHovered(false) : undefined}
      >
        <View
          style={[
            styles.dayContent,
            isTodayDate && [styles.todayContainer, { borderColor: theme.primary }],
            isSelectedDay && !isTodayDate && [styles.selectedDayContainer, { backgroundColor: theme.backgroundSecondary }],
            isSelectedDay && isTodayDate && [styles.selectedTodayContainer, { borderColor: theme.primary, backgroundColor: theme.backgroundSecondary }],
            !isCurrentMonth && styles.dayOutOfMonth,
            isDayHovered && isCurrentMonth && Platform.OS === 'web' && [
              styles.dayContentHovered,
              !isTodayDate && !isSelectedDay && { backgroundColor: theme.backgroundSecondary }
            ],
          ]}
        >
          <Text
            style={[
              styles.dayText,
              { color: isCurrentMonth ? theme.text : theme.textTertiary },
              isTodayDate && [styles.todayText, { color: theme.primary }],
              isSelectedDay && !isTodayDate && styles.selectedDayText,
              isWeekend && isCurrentMonth && !isTodayDate && !isSelectedDay && { color: theme.primary },
            ]}
          >
            {format(date, 'd')}
          </Text>
        </View>

        {/* Event dots indicator - always show when has events */}
        {hasEvents && isCurrentMonth && (
          <View style={styles.dotsContainer}>
            {dotColors.map((color, index) => (
              <View
                key={`${date.toISOString()}-${index}`}
                style={[
                  styles.eventDot,
                  { backgroundColor: color },
                ]}
              />
            ))}
            {dayEvents.length > 3 && (
              <Text style={[
                styles.moreIndicator,
                { color: theme.textTertiary }
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
    <View style={[
      isCompact ? styles.wrapperCompact : styles.wrapper,
      isCompact && { backgroundColor: theme.backgroundSecondary, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.border }
    ]}>
      <View style={[
        styles.container,
        { backgroundColor: theme.card },
        isCompact && styles.containerCompact
      ]}>
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
                  isCompact && styles.weekdayTextCompact,
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
        contentContainerStyle={isCompact ? styles.scrollContentCompact : styles.scrollContent}
      >
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day) => renderDay(day))}
          </View>
        ))}
      </ScrollView>

      {/* Day Events Sheet - Only for non-compact mode */}
        {!isCompact && selectedDayForSheet && selectedDayKey && (
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
  wrapperCompact: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 0,
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
  containerCompact: {
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  scrollContentCompact: {
    paddingBottom: 8,
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
  weekdayTextCompact: {
    fontSize: 10,
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
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
    } : {}),
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      transition: 'all 0.2s ease',
    } : {}),
  },
  dayContentHovered: {
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      transform: 'scale(1.05)',
    } : {}),
  },
  todayContainer: {
    borderWidth: 2,
    // borderColor set dynamically from theme
  },
  selectedDayContainer: {
    // backgroundColor set dynamically from theme
  },
  selectedTodayContainer: {
    borderWidth: 2,
    // borderColor and backgroundColor set dynamically from theme
  },
  selectedDayText: {
    fontWeight: '700',
  },
  dayOutOfMonth: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  todayText: {
    // color set dynamically from theme
    fontWeight: '700',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 6,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  moreIndicator: {
    fontSize: 7,
    fontWeight: '600',
    marginLeft: 1,
  },
});
