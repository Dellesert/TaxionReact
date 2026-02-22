import React, { useRef, useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { FlashList as FlashListOriginal } from '@shopify/flash-list';

// Cast to any to avoid FlashList typing issues
const FlashList = FlashListOriginal as any;
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
  isWithinInterval,
  parseISO,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { Event } from '../../types/calendar.types';
import { MonthData, useInfiniteCalendarData } from '../../hooks/useInfiniteCalendarData';
import { useTheme } from '@shared/hooks/useTheme';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';

interface InfiniteMonthCalendarProps {
  onDatePress: (date: Date) => void;
  refreshTrigger?: number;
}

const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/**
 * Single month grid item for FlashList
 */
interface MonthGridItemProps {
  month: MonthData;
  onDatePress: (date: Date) => void;
}

const MonthGridItem: React.FC<MonthGridItemProps> = React.memo(
  ({ month, onDatePress }) => {
    const { theme } = useTheme();

    // Generate calendar days for this month
    const calendarDays = useMemo(() => {
      const monthStart = startOfMonth(month.date);
      const monthEnd = endOfMonth(month.date);
      const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }, [month.date]);

    // Separate absence, substitution, and regular events
    const { absenceEvents, substitutionEvents, regularEvents } = useMemo(() => {
      const absences: Event[] = [];
      const substitutions: Event[] = [];
      const regular: Event[] = [];

      month.events.forEach((event) => {
        if (event.type === 'absence') {
          absences.push(event);
        } else if (event.type === 'substitution') {
          substitutions.push(event);
        } else {
          regular.push(event);
        }
      });

      return { absenceEvents: absences, substitutionEvents: substitutions, regularEvents: regular };
    }, [month.events]);

    // Group regular events by date
    const eventsByDate = useMemo(() => {
      const grouped: { [key: string]: Event[] } = {};

      regularEvents.forEach((event) => {
        const date = new Date(event.start_time);
        const year = date.getFullYear();
        const monthNum = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${monthNum}-${day}`;

        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      });

      return grouped;
    }, [regularEvents]);

    // Check if a date falls within any absence period
    const getAbsenceForDate = useCallback((date: Date): Event | null => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      for (const absence of absenceEvents) {
        const startDate = parseISO(absence.start_time);
        const endDate = parseISO(absence.end_time);

        // Use UTC components to avoid timezone issues
        // The dates are stored as UTC (e.g., 2025-01-02T00:00:00.000Z)
        const absenceStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
        const absenceEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

        if (isWithinInterval(checkDate, { start: absenceStart, end: absenceEnd })) {
          return absence;
        }
      }

      return null;
    }, [absenceEvents]);

    // Get position of date in absence range (for styling)
    const getAbsencePosition = useCallback((date: Date, absence: Event): 'start' | 'middle' | 'end' | 'single' => {
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
    }, []);

    // Check if a date falls within any substitution period
    const getSubstitutionForDate = useCallback((date: Date): Event | null => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

      for (const substitution of substitutionEvents) {
        const startDate = parseISO(substitution.start_time);
        const endDate = parseISO(substitution.end_time);

        // Use UTC components to avoid timezone issues
        const subStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
        const subEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

        if (isWithinInterval(checkDate, { start: subStart, end: subEnd })) {
          return substitution;
        }
      }

      return null;
    }, [substitutionEvents]);

    // Get position of date in substitution range (for styling)
    const getSubstitutionPosition = useCallback((date: Date, substitution: Event): 'start' | 'middle' | 'end' | 'single' => {
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startDate = parseISO(substitution.start_time);
      const endDate = parseISO(substitution.end_time);

      // Use UTC components to avoid timezone issues
      const subStart = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
      const subEnd = new Date(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());

      const isStart = isSameDay(checkDate, subStart);
      const isEnd = isSameDay(checkDate, subEnd);

      if (isStart && isEnd) return 'single';
      if (isStart) return 'start';
      if (isEnd) return 'end';
      return 'middle';
    }, []);

    // Get events for a specific date
    const getEventsForDate = (date: Date): Event[] => {
      const year = date.getFullYear();
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${monthNum}-${day}`;

      return eventsByDate[dateKey] || [];
    };

    // Get event dot colors (up to 3 dots for first 3 events)
    const getEventDotColors = (events: Event[]): string[] => {
      return events.slice(0, 3).map((event) => event.color);
    };

    // Render single day cell
    const renderDay = (date: Date, dayIndex: number) => {
      const isCurrentMonth = isSameMonth(date, month.date);
      const isTodayDate = isToday(date);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;

      const normalizedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        0,
        0,
        0,
        0
      );

      const dayEvents = getEventsForDate(normalizedDate);
      const hasEvents = dayEvents.length > 0;
      const dotColors = getEventDotColors(dayEvents);

      // Check for holiday on this date
      const holiday = isCurrentMonth ? getHoliday(normalizedDate) : null;
      const isHoliday = holiday !== null;

      // Check for absence on this date
      const absence = getAbsenceForDate(normalizedDate);
      const hasAbsence = absence !== null && isCurrentMonth;
      const absencePosition = hasAbsence ? getAbsencePosition(normalizedDate, absence!) : null;

      // Check for substitution on this date
      const substitution = getSubstitutionForDate(normalizedDate);
      const hasSubstitution = substitution !== null && isCurrentMonth;
      const substitutionPosition = hasSubstitution ? getSubstitutionPosition(normalizedDate, substitution!) : null;

      // Check if it's first/last day of week for proper corner rounding
      const isFirstDayOfWeek = dayIndex === 0;
      const isLastDayOfWeek = dayIndex === 6;

      const handleDayPress = () => {
        if (isCurrentMonth) {
          onDatePress(normalizedDate);
        }
      };

      // Get absence background style
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

      // Get substitution bar style (horizontal stripe at bottom)
      const getSubstitutionBarStyle = () => {
        if (!hasSubstitution) return null;

        const barColor = '#9B59B6';

        // Determine corner rounding based on position and week boundaries
        let borderTopLeftRadius = 0;
        let borderBottomLeftRadius = 0;
        let borderTopRightRadius = 0;
        let borderBottomRightRadius = 0;

        // Round left corners if start of substitution OR first day of week
        if (substitutionPosition === 'single' || substitutionPosition === 'start' || isFirstDayOfWeek) {
          borderTopLeftRadius = 3;
          borderBottomLeftRadius = 3;
        }

        // Round right corners if end of substitution OR last day of week
        if (substitutionPosition === 'single' || substitutionPosition === 'end' || isLastDayOfWeek) {
          borderTopRightRadius = 3;
          borderBottomRightRadius = 3;
        }

        return {
          position: 'absolute' as const,
          bottom: -4,
          height: 2,
          left: (substitutionPosition === 'start' || substitutionPosition === 'single' || isFirstDayOfWeek) ? 4 : 0,
          right: (substitutionPosition === 'end' || substitutionPosition === 'single' || isLastDayOfWeek) ? 4 : 0,
          backgroundColor: barColor,
          borderTopLeftRadius,
          borderBottomLeftRadius,
          borderTopRightRadius,
          borderBottomRightRadius,
        };
      };

      return (
        <TouchableOpacity
          key={date.toISOString()}
          style={styles.dayContainer}
          onPress={handleDayPress}
          activeOpacity={isCurrentMonth ? 0.6 : 1}
          disabled={!isCurrentMonth}
        >
          {/* Holiday background layer */}
          {isHoliday && !hasAbsence && (
            <View style={{
              position: 'absolute',
              top: 2,
              bottom: 0,
              left: 2,
              right: 2,
              backgroundColor: theme.error + '15',
              borderRadius: 8,
            }} />
          )}

          {/* Absence background layer */}
          {hasAbsence && <View style={getAbsenceStyle()} />}

          <View
            style={[
              styles.dayContent,
              !isCurrentMonth && styles.dayOutOfMonth,
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
                  isWeekend && isCurrentMonth && !isTodayDate && { color: theme.primary },
                  isHoliday && !isTodayDate && { color: theme.error },
                ]}
              >
                {format(date, 'd')}
              </Text>
            </View>
          </View>

          {/* Event dots indicator - positioned below the day circle */}
          {hasEvents && isCurrentMonth && (
            <View style={[
              styles.dotsContainer,
              isTodayDate && styles.dotsContainerToday,
              hasSubstitution && styles.dotsContainerWithSubstitution,
            ]}>
              {dotColors.map((color, index) => (
                <View
                  key={`${date.toISOString()}-${index}`}
                  style={[styles.eventDot, { backgroundColor: color }]}
                />
              ))}
              {dayEvents.length > 3 && (
                <Text style={[styles.moreIndicator, { color: theme.textTertiary }]}>
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

    // Split days into weeks
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    // Format month header
    const monthHeader = format(month.date, 'LLLL yyyy', { locale: ru });

    return (
      <View style={[styles.monthContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Month header */}
        <View style={[styles.monthHeader, { borderBottomColor: theme.border }]}>
          <Text style={[styles.monthHeaderText, { color: theme.text }]}>{monthHeader}</Text>
        </View>

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
        <View style={styles.weeksContainer}>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => renderDay(day, dayIndex))}
            </View>
          ))}
        </View>
      </View>
    );
  }
);

MonthGridItem.displayName = 'MonthGridItem';

/**
 * Infinite vertical scrolling calendar component
 * Renders months in a FlashList for optimal performance
 */
export const InfiniteMonthCalendar: React.FC<InfiniteMonthCalendarProps> = ({
  onDatePress,
  refreshTrigger,
}) => {
  const { theme } = useTheme();
  // @ts-ignore - FlashList ref typing
  const listRef = useRef<any>(null);

  const {
    months,
    initialScrollIndex,
    loadEventsForMonth,
    addMonthsToEnd,
    addMonthsToStart,
    refreshAllVisible,
  } = useInfiniteCalendarData();

  const [refreshing, setRefreshing] = useState(false);
  const [visibleMonthKeys, setVisibleMonthKeys] = useState<string[]>([]);
  // Ref to track visible month keys for use in useFocusEffect
  const visibleMonthKeysRef = useRef<string[]>([]);

  // Keep ref in sync with state
  useEffect(() => {
    visibleMonthKeysRef.current = visibleMonthKeys;
  }, [visibleMonthKeys]);

  // Reload visible months when screen gains focus
  // This ensures fresh data when returning from event detail or switching tabs
  useFocusEffect(
    useCallback(() => {
      // Only refresh if we have visible months tracked
      if (visibleMonthKeysRef.current.length > 0) {
        refreshAllVisible(visibleMonthKeysRef.current);
      }
    }, [refreshAllVisible])
  );

  // Load current month on initial render
  useEffect(() => {
    if (months.length > 0) {
      const currentMonth = months[initialScrollIndex];
      if (currentMonth) {
        loadEventsForMonth(currentMonth.key);
      }
    }
  }, []); // Only run once on mount

  // Track if we've done initial scroll
  const hasInitialScrolled = useRef(false);

  // Handle viewable items change - load events for visible months
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      const visibleKeys = viewableItems
        .filter((item: any) => item.isViewable && item.item)
        .map((item: any) => (item.item as MonthData).key);

      setVisibleMonthKeys(visibleKeys);

      // Load events for visible months (and adjacent for smooth scrolling)
      viewableItems.forEach((viewToken: any) => {
        if (viewToken.isViewable && viewToken.item) {
          const monthData = viewToken.item as MonthData;
          if (!monthData.isLoaded && !monthData.isLoading) {
            loadEventsForMonth(monthData.key);
          }
        }
      });
    },
    [loadEventsForMonth]
  );

  // Viewability config
  const viewabilityConfig = useMemo(
    () => ({
      itemVisiblePercentThreshold: 10,
      minimumViewTime: 100,
    }),
    []
  );

  // Handle reaching end of list - add more future months
  const handleEndReached = useCallback(() => {
    addMonthsToEnd(6);
  }, [addMonthsToEnd]);

  // Handle scroll to detect reaching start
  const handleScroll = useCallback(
    (event: any) => {
      const offsetY = event.nativeEvent.contentOffset.y;

      // If near the top (within 500px), add more past months
      if (offsetY < 500 && hasInitialScrolled.current) {
        addMonthsToStart(6);
      }
    },
    [addMonthsToStart]
  );

  // Handle pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshAllVisible(visibleMonthKeys);
    } catch (error) {
      console.error('[Calendar] Failed to refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshAllVisible, visibleMonthKeys]);

  // Handle refresh trigger from parent (after event creation)
  React.useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      handleRefresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Mark initial scroll as done after first render
  React.useEffect(() => {
    const timer = setTimeout(() => {
      hasInitialScrolled.current = true;
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Render month item
  const renderItem = useCallback(
    ({ item }: { item: MonthData }) => (
      <MonthGridItem month={item} onDatePress={onDatePress} />
    ),
    [onDatePress]
  );

  // Key extractor
  const keyExtractor = useCallback((item: MonthData) => item.key, []);

  // Estimated item size (~350px for 6 weeks + header)
  const estimatedItemSize = 380;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlashList
        ref={listRef}
        data={months}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={estimatedItemSize}
        initialScrollIndex={initialScrollIndex}
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={(info: { index: number }) => {
          // Fallback: scroll to approximate position
          const wait = new Promise((resolve) => setTimeout(resolve, 100));
          wait.then(() => {
            listRef.current?.scrollToOffset({
              offset: info.index * estimatedItemSize,
              animated: false,
            });
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  monthContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    // Shadow for Android
    elevation: 2,
  },
  monthHeader: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  monthHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekdayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
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
  weeksContainer: {
    paddingBottom: 12,
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
    ...(Platform.OS === 'web'
      ? {
          // @ts-ignore - web only
          cursor: 'pointer',
        }
      : {}),
  },
  dayContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  todayCircle: {
    // backgroundColor is set dynamically with theme.primary
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
    bottom: 4,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  dotsContainerToday: {
    bottom: 4,
  },
  dotsContainerWithSubstitution: {
    bottom: 4,
  },
  eventDot: {
    width: 8,
    height: 4,
    borderRadius: 2,
  },
  moreIndicator: {
    fontSize: 7,
    fontWeight: '600',
    marginLeft: 1,
  },
});
