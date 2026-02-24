/**
 * ScheduleSidebarSkeleton Component
 * Скелетон для левой панели десктопного экрана графиков
 * (DayStrip + DailySummaryView)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ScheduleSidebarSkeleton: React.FC = () => {
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
    <View style={styles.container}>
      {/* DayStrip skeleton */}
      <View style={[styles.dayStripWrapper, { borderBottomColor: theme.border }]}>
        <View style={[styles.dayStripContainer, { backgroundColor: theme.card }]}>
          {/* Month label */}
          <View style={styles.monthLabelRow}>
            <Animated.View style={[styles.monthLabel, line]} />
          </View>
          {/* Day cells row */}
          <View style={styles.daysRow}>
            {[...Array(7)].map((_, i) => (
              <View key={i} style={styles.dayCell}>
                <Animated.View style={[styles.dayName, line]} />
                <Animated.View style={[styles.dayNumber, line]} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* DailySummary skeleton */}
      <View style={[styles.summaryContent, { backgroundColor: theme.background }]}>
        {/* Section title */}
        <Animated.View style={[styles.sectionTitle, line]} />

        {/* Schedule cards */}
        {[0, 1].map((i) => (
          <View key={i} style={[styles.scheduleCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            <Animated.View style={[styles.colorIndicator, line]} />
            <View style={styles.scheduleContent}>
              {/* Header */}
              <View style={styles.scheduleHeader}>
                <Animated.View style={[styles.scheduleTitle, line]} />
                <Animated.View style={[styles.scheduleType, line]} />
              </View>
              {/* User rows */}
              {[0, 1, 2].map((j) => (
                <View key={j} style={[styles.userRow, { borderBottomColor: theme.border }]}>
                  <Animated.View style={[styles.avatar, line]} />
                  <View style={styles.userInfo}>
                    <Animated.View style={[styles.userName, line]} />
                    <Animated.View style={[styles.userMeta, line]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Absences section */}
        <Animated.View style={[styles.sectionTitle, { marginTop: 8 }, line]} />
        <View style={[styles.absencesCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.absenceRow, { borderBottomColor: theme.border }]}>
              <Animated.View style={[styles.absenceIcon, line]} />
              <View style={styles.absenceInfo}>
                <Animated.View style={[styles.absenceName, line]} />
                <Animated.View style={[styles.absenceType, line]} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // DayStrip skeleton
  dayStripWrapper: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayStripContainer: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  monthLabelRow: {
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 2,
    paddingBottom: 6,
  },
  monthLabel: {
    height: 13,
    width: 100,
    borderRadius: 6,
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 28,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    flex: 1,
    gap: 4,
  },
  dayName: {
    width: 16,
    height: 10,
    borderRadius: 5,
  },
  dayNumber: {
    width: 20,
    height: 16,
    borderRadius: 8,
  },
  // DailySummary skeleton
  summaryContent: {
    flex: 1,
    padding: 14,
  },
  sectionTitle: {
    height: 17,
    width: 80,
    borderRadius: 8,
    marginBottom: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorIndicator: {
    width: 4,
  },
  scheduleContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scheduleTitle: {
    height: 15,
    width: '55%',
    borderRadius: 7,
  },
  scheduleType: {
    height: 12,
    width: 60,
    borderRadius: 6,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    height: 14,
    width: '65%',
    borderRadius: 7,
  },
  userMeta: {
    height: 12,
    width: '40%',
    borderRadius: 6,
  },
  // Absences
  absencesCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  absenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  absenceIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  absenceInfo: {
    flex: 1,
    gap: 4,
  },
  absenceName: {
    height: 14,
    width: '60%',
    borderRadius: 7,
  },
  absenceType: {
    height: 12,
    width: '45%',
    borderRadius: 6,
  },
});
