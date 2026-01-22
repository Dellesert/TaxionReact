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
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';
import { Event } from '../../types/calendar.types';
import { MonthData, useInfiniteCalendarData } from '../../hooks/useInfiniteCalendarData';
import { useTheme } from '@shared/hooks/useTheme';

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

    // Group events by date
    const eventsByDate = useMemo(() => {
      const grouped: { [key: string]: Event[] } = {};

      month.events.forEach((event) => {
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
    }, [month.events]);

    // Get events for a specific date
    const getEventsForDate = (date: Date): Event[] => {
      const year = date.getFullYear();
      const monthNum = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${monthNum}-${day}`;

      return eventsByDate[dateKey] || [];
    };

    // Get event dot colors
    const getEventDotColors = (events: Event[]): string[] => {
      const colorMap: { [key: string]: string } = {};

      events.forEach((event) => {
        if (!colorMap[event.type]) {
          colorMap[event.type] = event.color;
        }
      });

      return Object.values(colorMap).slice(0, 3);
    };

    // Render single day cell
    const renderDay = (date: Date) => {
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

      const handleDayPress = () => {
        if (isCurrentMonth) {
          onDatePress(normalizedDate);
        }
      };

      return (
        <TouchableOpacity
          key={date.toISOString()}
          style={styles.dayContainer}
          onPress={handleDayPress}
          activeOpacity={isCurrentMonth ? 0.6 : 1}
          disabled={!isCurrentMonth}
        >
          <View
            style={[
              styles.dayContent,
              isTodayDate && [styles.todayContainer, { borderColor: theme.primary }],
              !isCurrentMonth && styles.dayOutOfMonth,
            ]}
          >
            <Text
              style={[
                styles.dayText,
                { color: isCurrentMonth ? theme.text : theme.textTertiary },
                isTodayDate && [styles.todayText, { color: theme.primary }],
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
      <View style={[styles.monthContainer, { backgroundColor: theme.card }]}>
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
              {week.map((day) => renderDay(day))}
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
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
    paddingVertical: 10,
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
    padding: 3,
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
    borderRadius: 12,
  },
  todayContainer: {
    borderWidth: 2,
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
