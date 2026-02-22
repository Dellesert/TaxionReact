/**
 * CalendarSkeleton Component
 * Скелетон для календаря (infinite month view)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_SIZE = Math.floor((SCREEN_WIDTH - 32) / 7);

export const CalendarSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderWeekdayHeaders = () => (
    <View style={styles.weekdayRow}>
      {[...Array(7)].map((_, index) => (
        <Animated.View
          key={index}
          style={[
            styles.weekdayHeader,
            { backgroundColor: theme.border, opacity },
          ]}
        />
      ))}
    </View>
  );

  const renderCalendarWeek = (weekIndex: number) => (
    <View key={weekIndex} style={styles.weekRow}>
      {[...Array(7)].map((_, dayIndex) => (
        <View key={dayIndex} style={styles.dayCell}>
          <Animated.View
            style={[
              styles.dayNumber,
              { backgroundColor: theme.border, opacity },
            ]}
          />
          {/* Dot indicators for some days */}
          {(weekIndex + dayIndex) % 3 === 0 && (
            <Animated.View
              style={[
                styles.eventDot,
                { backgroundColor: theme.border, opacity },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderMonth = (monthIndex: number) => (
    <View key={monthIndex} style={styles.monthContainer}>
      {/* Month header */}
      <View style={styles.monthHeaderRow}>
        <Animated.View
          style={[
            styles.monthTitle,
            { backgroundColor: theme.border, opacity },
          ]}
        />
      </View>

      {/* Weekday headers */}
      {renderWeekdayHeaders()}

      {/* Calendar weeks (5-6 rows per month) */}
      {[...Array(5)].map((_, weekIndex) => renderCalendarWeek(weekIndex))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Render 2 months of skeleton */}
      {[0, 1].map(renderMonth)}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  monthContainer: {
    marginBottom: 24,
  },
  monthHeaderRow: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  monthTitle: {
    height: 24,
    width: 140,
    borderRadius: 12,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  weekdayHeader: {
    width: 24,
    height: 14,
    borderRadius: 8,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 12,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
});

export default CalendarSkeleton;
