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
  isSameDay,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import { DayEventsSheet } from '../modals/DayEventsSheet';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';

interface MonthCalendarViewProps {
  selectedDate: Date;
  events: Event[];
  onDatePress: (date: Date) => void;
  onEventPress?: (event: Event) => void;
  isCompact?: boolean; // Desktop compact mode
  viewMode?: 'day' | 'week'; // Current view mode
}

interface CalendarDayProps {
  date: Date;
  dayIndex: number;
  selectedDate: Date;
  isCompact: boolean;
  viewMode: 'day' | 'week';
  isInSelectedWeek: boolean;
  dayEvents: Event[];
  absence: Event | null;
  absencePosition: 'start' | 'middle' | 'end' | 'single' | null;
  substitution: Event | null;
  substitutionPosition: 'start' | 'middle' | 'end' | 'single' | null;
  onDatePress: (date: Date) => void;
  onDayWithEventsPress: (date: Date, dateKey: string) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}

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

// Separate component for each day to properly use hooks
const CalendarDay: React.FC<CalendarDayProps> = ({
  date,
  dayIndex,
  selectedDate,
  isCompact,
  viewMode,
  isInSelectedWeek,
  dayEvents,
  absence,
  absencePosition,
  substitution,
  substitutionPosition,
  onDatePress,
  onDayWithEventsPress,
  theme,
}) => {
  const [isDayHovered, setIsDayHovered] = useState(false);

  const isCurrentMonth = isSameMonth(date, selectedDate);
  const isTodayDate = isToday(date);
  const isHoliday = isCurrentMonth && getHoliday(date) !== null;

  // Check if this day is the selected day (for desktop compact mode)
  const isSelectedDay = isCompact && viewMode === 'day' &&
    date.getDate() === selectedDate.getDate() &&
    date.getMonth() === selectedDate.getMonth() &&
    date.getFullYear() === selectedDate.getFullYear();

  // Check if this day is in the selected week (for week view mode)
  const isInWeek = isCompact && viewMode === 'week' && isInSelectedWeek;

  // Create a normalized date at midnight local time to avoid timezone issues
  const normalizedDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    0, 0, 0, 0
  );

  const hasEvents = dayEvents.length > 0;
  const dotColors = getEventDotColors(dayEvents);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  // Absence and Substitution bar logic
  const hasAbsence = absence !== null && isCurrentMonth;
  const hasSubstitution = substitution !== null && isCurrentMonth;
  const isFirstDayOfWeek = dayIndex === 0;
  const isLastDayOfWeek = dayIndex === 6;

  // Get absence background style (similar to InfiniteMonthCalendar)
  const getAbsenceStyle = () => {
    if (!hasAbsence) return null;

    const bgColor = absence!.color + '25'; // Light background
    const borderColor = absence!.color + '60';

    // Determine corner rounding based on position and week boundaries
    let borderTopLeftRadius = 0;
    let borderBottomLeftRadius = 0;
    let borderTopRightRadius = 0;
    let borderBottomRightRadius = 0;

    // Round left corners if start of absence OR first day of week (for wrapped absences)
    if (absencePosition === 'single' || absencePosition === 'start' || isFirstDayOfWeek) {
      borderTopLeftRadius = 8;
      borderBottomLeftRadius = 8;
    }

    // Round right corners if end of absence OR last day of week (for wrapped absences)
    if (absencePosition === 'single' || absencePosition === 'end' || isLastDayOfWeek) {
      borderTopRightRadius = 8;
      borderBottomRightRadius = 8;
    }

    return {
      position: 'absolute' as const,
      top: 0,
      bottom: -2,
      left: (absencePosition === 'start' || absencePosition === 'single' || isFirstDayOfWeek) ? 2 : 0,
      right: (absencePosition === 'end' || absencePosition === 'single' || isLastDayOfWeek) ? 2 : 0,
      backgroundColor: bgColor,
      borderTopLeftRadius,
      borderBottomLeftRadius,
      borderTopRightRadius,
      borderBottomRightRadius,
      borderWidth: 1.5,
      borderLeftWidth: (absencePosition === 'start' || absencePosition === 'single' || isFirstDayOfWeek) ? 1.5 : 0,
      borderRightWidth: (absencePosition === 'end' || absencePosition === 'single' || isLastDayOfWeek) ? 1.5 : 0,
      borderColor,
    };
  };

  const getSubstitutionBarStyle = () => {
    if (!hasSubstitution) return null;

    const barColor = '#9B59B6';
    let borderTopLeftRadius = 0;
    let borderBottomLeftRadius = 0;
    let borderTopRightRadius = 0;
    let borderBottomRightRadius = 0;

    if (substitutionPosition === 'single' || substitutionPosition === 'start' || isFirstDayOfWeek) {
      borderTopLeftRadius = 3;
      borderBottomLeftRadius = 3;
    }
    if (substitutionPosition === 'single' || substitutionPosition === 'end' || isLastDayOfWeek) {
      borderTopRightRadius = 3;
      borderBottomRightRadius = 3;
    }

    return {
      position: 'absolute' as const,
      bottom: 1,
      height: 3,
      left: (substitutionPosition === 'start' || substitutionPosition === 'single' || isFirstDayOfWeek) ? 4 : 0,
      right: (substitutionPosition === 'end' || substitutionPosition === 'single' || isLastDayOfWeek) ? 4 : 0,
      backgroundColor: barColor,
      borderTopLeftRadius,
      borderBottomLeftRadius,
      borderTopRightRadius,
      borderBottomRightRadius,
    };
  };

  const handleDayPress = () => {
    if (isCompact && isCurrentMonth) {
      // In compact mode, call onDatePress to navigate to that day
      onDatePress(normalizedDate);
    } else if (hasEvents && isCurrentMonth) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      onDayWithEventsPress(normalizedDate, dateKey);
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
      {/* Holiday background layer */}
      {isHoliday && !hasAbsence && (
        <View style={{
          position: 'absolute',
          top: 2,
          bottom: 0,
          left: 2,
          right: 2,
          backgroundColor: theme.error + '20',
          borderRadius: 8,
        }} />
      )}

      {/* Absence background layer */}
      {hasAbsence && <View style={getAbsenceStyle()} />}

      <View
        style={[
          styles.dayContent,
          isSelectedDay && !isTodayDate && [styles.selectedDayContainer, { backgroundColor: theme.backgroundSecondary }],
          isSelectedDay && isTodayDate && [styles.selectedTodayContainer, { backgroundColor: theme.backgroundSecondary }],
          !isCurrentMonth && styles.dayOutOfMonth,
          isDayHovered && isCurrentMonth && Platform.OS === 'web' && [
            styles.dayContentHovered,
            !isTodayDate && !isSelectedDay && { backgroundColor: theme.backgroundSecondary }
          ],
        ]}
      >
        <View
          style={[
            styles.dayCircle,
            isTodayDate && [styles.todayCircle, { backgroundColor: theme.primary }],
          ]}
        >
          <Text
            style={[
              styles.dayText,
              { color: isCurrentMonth ? theme.text : theme.textTertiary },
              isTodayDate && styles.todayText,
              isSelectedDay && !isTodayDate && styles.selectedDayText,
              isInWeek && !isTodayDate && styles.weekSelectedText,
              isWeekend && isCurrentMonth && !isTodayDate && !isSelectedDay && !isInWeek && { color: theme.primary },
              isHoliday && !isTodayDate && { color: theme.error },
            ]}
          >
            {format(date, 'd')}
          </Text>
        </View>
      </View>

      {/* Event dots indicator - always show when has events */}
      {hasEvents && isCurrentMonth && (
        <View style={[
          styles.dotsContainer,
          hasSubstitution && { bottom: 10 },
        ]}>
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

      {/* Substitution bar - horizontal stripe at bottom */}
      {hasSubstitution && <View style={getSubstitutionBarStyle()} />}
    </TouchableOpacity>
  );
};

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const MonthCalendarView: React.FC<MonthCalendarViewProps> = ({
  selectedDate,
  events,
  onDatePress,
  onEventPress,
  isCompact = false,
  viewMode = 'day',
}) => {
  const { theme } = useTheme();
  const [selectedDayForSheet, setSelectedDayForSheet] = useState<Date | null>(null);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Calculate selected week range when in week view mode
  const selectedWeekRange = useMemo(() => {
    if (viewMode !== 'week') return null;

    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });

    return { start: weekStart, end: weekEnd };
  }, [selectedDate, viewMode]);

  // Check if a date is in the selected week
  const isInSelectedWeek = (date: Date): boolean => {
    if (!selectedWeekRange) return false;

    const time = date.getTime();
    return time >= selectedWeekRange.start.getTime() && time <= selectedWeekRange.end.getTime();
  };

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

  // Get events for a specific date (excluding substitutions and absences)
  const getEventsForDate = (date: Date): Event[] => {
    // Use the same logic as grouping to ensure consistency
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    return (eventsByDate[dateKey] || []).filter(e => e.type !== 'substitution' && e.type !== 'absence');
  };

  // Get absence events (vacations, sick leaves, etc.)
  const absenceEvents = useMemo(() => {
    return events.filter(e => e.type === 'absence');
  }, [events]);

  // Get substitution events
  const substitutionEvents = useMemo(() => {
    return events.filter(e => e.type === 'substitution');
  }, [events]);

  // Get absence for a specific date
  const getAbsenceForDate = (date: Date): Event | null => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    for (const absence of absenceEvents) {
      const startDate = parseISO(absence.start_time);
      const endDate = parseISO(absence.end_time);

      // Use UTC components to avoid timezone issues
      const absenceStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
      const absenceEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

      if (isWithinInterval(checkDate, { start: absenceStart, end: absenceEnd })) {
        return absence;
      }
    }
    return null;
  };

  // Get position of date in absence range (for styling)
  const getAbsencePosition = (date: Date, absence: Event): 'start' | 'middle' | 'end' | 'single' => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDate = parseISO(absence.start_time);
    const endDate = parseISO(absence.end_time);

    // Use UTC components to avoid timezone issues
    const absenceStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const absenceEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    const isStart = isSameDay(checkDate, absenceStart);
    const isEnd = isSameDay(checkDate, absenceEnd);

    if (isStart && isEnd) return 'single';
    if (isStart) return 'start';
    if (isEnd) return 'end';
    return 'middle';
  };

  // Get substitution for a specific date
  const getSubstitutionForDate = (date: Date): Event | null => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    for (const substitution of substitutionEvents) {
      const startDate = parseISO(substitution.start_time);
      const endDate = parseISO(substitution.end_time);

      const subStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
      const subEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

      if (isWithinInterval(checkDate, { start: subStart, end: subEnd })) {
        return substitution;
      }
    }
    return null;
  };

  // Get position of date in substitution range
  const getSubstitutionPosition = (date: Date, substitution: Event): 'start' | 'middle' | 'end' | 'single' => {
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const startDate = parseISO(substitution.start_time);
    const endDate = parseISO(substitution.end_time);

    const subStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
    const subEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

    const isStart = isSameDay(checkDate, subStart);
    const isEnd = isSameDay(checkDate, subEnd);

    if (isStart && isEnd) return 'single';
    if (isStart) return 'start';
    if (isEnd) return 'end';
    return 'middle';
  };

  // Handler for when a day with events is pressed (for sheet)
  const handleDayWithEventsPress = (date: Date, dateKey: string) => {
    setSelectedDayForSheet(date);
    setSelectedDayKey(dateKey);
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
        {weeks.map((week, weekIndex) => {
          // Check if any day in this week is in the selected week
          const isWeekSelected = isCompact && viewMode === 'week' && week.some(day => isInSelectedWeek(day));

          return (
            <View key={weekIndex} style={styles.weekRow}>
              {/* Week indicator - single vertical bar for the entire row */}
              {isWeekSelected && (
                <View
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 4,
                    bottom: 4,
                    width: 3,
                    backgroundColor: theme.primary,
                    borderRadius: 1.5,
                  }}
                />
              )}
              {week.map((day, dayIndex) => {
                const absence = getAbsenceForDate(day);
                const absencePos = absence ? getAbsencePosition(day, absence) : null;
                const substitution = getSubstitutionForDate(day);
                const substitutionPos = substitution ? getSubstitutionPosition(day, substitution) : null;
                return (
                  <CalendarDay
                    key={day.toISOString()}
                    date={day}
                    dayIndex={dayIndex}
                    selectedDate={selectedDate}
                    isCompact={isCompact}
                    viewMode={viewMode}
                    isInSelectedWeek={isInSelectedWeek(day)}
                    dayEvents={getEventsForDate(day)}
                    absence={absence}
                    absencePosition={absencePos}
                    substitution={substitution}
                    substitutionPosition={substitutionPos}
                    onDatePress={onDatePress}
                    onDayWithEventsPress={handleDayWithEventsPress}
                    theme={theme}
                  />
                );
              })}
            </View>
          );
        })}
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
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  containerCompact: {
    borderRadius: 12,
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
    padding: 4,
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
  dayCircle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  todayCircle: {
    // backgroundColor is set dynamically with theme.primary
  },
  selectedDayContainer: {
    // backgroundColor set dynamically from theme
  },
  selectedTodayContainer: {
    // backgroundColor set dynamically from theme
  },
  selectedDayText: {
    fontWeight: '700',
  },
  weekSelectedText: {
    fontWeight: '600',
  },
  dayOutOfMonth: {
    opacity: 0.25,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
  },
  todayText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  eventDot: {
    width: 8,
    height: 4,
    borderRadius: 2,
  },
  moreIndicator: {
    fontSize: 7,
    fontWeight: '600',
    marginLeft: 0,
  },
});
