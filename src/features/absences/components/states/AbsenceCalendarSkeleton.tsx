/**
 * AbsenceCalendarSkeleton Component
 * Скелетон для представления «Календарь» (sidebar сотрудников + годовой календарь)
 * Повторяет полный лейаут calendarDesktopRow с карточками и заголовками.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const AbsenceCalendarSkeleton: React.FC = () => {
  const { theme, isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };
  const cardBg = isDark ? theme.card : '#FFFFFF';

  return (
    <View style={styles.container}>
      {/* Left Sidebar card */}
      <View style={[styles.sidebarCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
        {/* Header */}
        <View style={[styles.sidebarHeader, { borderColor: theme.border }]}>
          <Animated.View style={[styles.headerTitle, line]} />
        </View>
        {/* Employee rows */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sidebarContent}
          style={{ backgroundColor: theme.background }}
        >
          {[...Array(8)].map((_, i) => (
            <View key={i} style={styles.employeeRow}>
              <Animated.View style={[styles.employeeAvatar, line]} />
              <View style={styles.employeeInfo}>
                <Animated.View style={[styles.employeeName, line, { width: i % 2 === 0 ? '75%' : '60%' }]} />
                <Animated.View style={[styles.employeeMeta, line]} />
              </View>
            </View>
          ))}
        </ScrollView>
        {/* Legend */}
        <View style={[styles.legend, { borderColor: theme.border }]}>
          <View style={styles.legendItems}>
            {[...Array(4)].map((_, i) => (
              <View key={i} style={styles.legendItem}>
                <Animated.View style={[styles.legendBar, line]} />
                <Animated.View style={[styles.legendLabel, line, { width: i % 2 === 0 ? 60 : 50 }]} />
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Main calendar card */}
      <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor: theme.border }]}>
        {/* Header */}
        <View style={[styles.mainHeader, { borderColor: theme.border }]}>
          <Animated.View style={[styles.headerTitle, line]} />
          {/* Year picker placeholder */}
          <View style={styles.yearPicker}>
            <Animated.View style={[styles.yearArrow, line]} />
            <Animated.View style={[styles.yearText, line]} />
            <Animated.View style={[styles.yearArrow, line]} />
          </View>
        </View>
        {/* Calendar grid */}
        <ScrollView
          style={{ backgroundColor: theme.background }}
          contentContainerStyle={styles.calendarGrid}
          showsVerticalScrollIndicator={false}
        >
          {[...Array(6)].map((_, monthIdx) => (
            <View key={monthIdx} style={styles.monthRow}>
              <Animated.View style={[styles.monthLabel, line]} />
              <View style={styles.daysRow}>
                {[...Array(31)].map((_, dayIdx) => (
                  <Animated.View key={dayIdx} style={[styles.dayCell, line]} />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const cardShadow = Platform.OS === 'web' ? {
  // @ts-ignore - web only
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
} : {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  // Sidebar card (matches calendarSidebar)
  sidebarCard: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...cardShadow,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  sidebarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    marginBottom: 6,
  },
  employeeAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  employeeInfo: {
    flex: 1,
    gap: 4,
  },
  employeeName: {
    height: 13,
    borderRadius: 6,
  },
  employeeMeta: {
    height: 11,
    width: '50%',
    borderRadius: 5,
  },
  legend: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  legendLabel: {
    height: 12,
    borderRadius: 6,
  },
  // Main calendar card (matches calendarMainPanel)
  mainCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  headerTitle: {
    height: 16,
    width: 90,
    borderRadius: 8,
  },
  yearPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yearArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
  },
  yearText: {
    height: 16,
    width: 40,
    borderRadius: 8,
  },
  calendarGrid: {
    padding: 16,
    gap: 12,
  },
  monthRow: {
    gap: 6,
  },
  monthLabel: {
    height: 14,
    width: 60,
    borderRadius: 7,
    marginBottom: 4,
  },
  daysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  dayCell: {
    width: 18,
    height: 18,
    borderRadius: 4,
  },
});
