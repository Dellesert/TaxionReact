/**
 * LeftSidebarSkeleton Component
 * Скелетон для левой панели десктопного календаря
 * (UpcomingEventsCard + MiniCalendar + StatsPanel)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const LeftSidebarSkeleton: React.FC = () => {
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

  const line = {
    backgroundColor: theme.border,
    opacity,
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={{ backgroundColor: theme.background }}
    >
      {/* Upcoming Events Card skeleton */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Card header */}
        <View style={styles.cardHeader}>
          <Animated.View style={[styles.cardTitle, line]} />
          <Animated.View style={[styles.cardBadge, line]} />
        </View>
        {/* Event rows */}
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.upcomingRow}>
            <Animated.View style={[styles.upcomingDot, line]} />
            <View style={styles.upcomingTexts}>
              <Animated.View style={[styles.upcomingTitle, line]} />
              <Animated.View style={[styles.upcomingTime, line]} />
            </View>
          </View>
        ))}
      </View>

      {/* Mini Calendar skeleton */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        {/* Month title */}
        <View style={styles.calendarHeader}>
          <Animated.View style={[styles.monthLabel, line]} />
        </View>
        {/* Weekday headers */}
        <View style={styles.weekdayRow}>
          {[...Array(7)].map((_, i) => (
            <Animated.View key={i} style={[styles.weekdayItem, line]} />
          ))}
        </View>
        {/* Calendar grid - 5 weeks */}
        {[...Array(5)].map((_, week) => (
          <View key={week} style={styles.weekRow}>
            {[...Array(7)].map((_, day) => (
              <View key={day} style={styles.dayCell}>
                <Animated.View style={[styles.dayCircle, line]} />
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Stats Panel skeleton */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <Animated.View style={[styles.cardTitle, line]} />
        </View>
        {/* Stat rows */}
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.statRow}>
            <Animated.View style={[styles.statIcon, line]} />
            <Animated.View style={[styles.statLabel, line]} />
            <Animated.View style={[styles.statValue, line]} />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: {
    height: 16,
    width: 120,
    borderRadius: 8,
  },
  cardBadge: {
    height: 22,
    width: 28,
    borderRadius: 11,
  },
  // Upcoming events
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingTexts: {
    flex: 1,
    gap: 4,
  },
  upcomingTitle: {
    height: 14,
    width: '75%',
    borderRadius: 7,
  },
  upcomingTime: {
    height: 12,
    width: '45%',
    borderRadius: 6,
  },
  // Mini calendar
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  monthLabel: {
    height: 18,
    width: 100,
    borderRadius: 9,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
  },
  weekdayItem: {
    width: 20,
    height: 12,
    borderRadius: 6,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  dayCell: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  // Stats
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  statIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  statLabel: {
    height: 14,
    flex: 1,
    borderRadius: 7,
  },
  statValue: {
    height: 14,
    width: 32,
    borderRadius: 7,
  },
});
