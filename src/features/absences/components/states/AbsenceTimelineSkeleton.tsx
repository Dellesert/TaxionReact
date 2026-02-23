/**
 * AbsenceTimelineSkeleton Component
 * Скелетон для представления «Таймлайн» (Gantt-диаграмма: sidebar сотрудников + горизонтальные полосы)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

const SIDEBAR_WIDTH = 280;
const ROW_HEIGHT = 52;
const MONTH_HEADER_HEIGHT = 28;
const ROW_COUNT = 8;

export const AbsenceTimelineSkeleton: React.FC = () => {
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
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: cardBg }]}>
      {/* Header row: sidebar header + month headers */}
      <View style={[styles.headerRow, { borderColor: theme.border }]}>
        {/* Year picker placeholder in sidebar header */}
        <View style={[styles.sidebarHeader, { borderColor: theme.border }]}>
          <Animated.View style={[styles.yearLabel, line]} />
        </View>
        {/* Month labels */}
        <View style={styles.monthHeaders}>
          {[...Array(12)].map((_, i) => (
            <Animated.View key={i} style={[styles.monthLabel, line]} />
          ))}
        </View>
      </View>

      {/* Body rows */}
      {[...Array(ROW_COUNT)].map((_, rowIdx) => (
        <View
          key={rowIdx}
          style={[
            styles.row,
            { borderColor: theme.border },
            rowIdx % 2 === 0 && { backgroundColor: theme.background },
          ]}
        >
          {/* Sidebar: avatar + name + days */}
          <View style={[styles.sidebarCell, { borderColor: theme.border }]}>
            <Animated.View style={[styles.avatar, line]} />
            <View style={styles.nameBlock}>
              <Animated.View style={[styles.name, line, { width: rowIdx % 2 === 0 ? '70%' : '55%' }]} />
              <Animated.View style={[styles.days, line]} />
            </View>
          </View>
          {/* Timeline bars */}
          <View style={styles.timelineCell}>
            {/* 1-2 absence bars per row */}
            <Animated.View
              style={[
                styles.absenceBar,
                line,
                { left: `${10 + rowIdx * 7}%`, width: `${12 + (rowIdx % 3) * 5}%` },
              ]}
            />
            {rowIdx % 3 === 0 && (
              <Animated.View
                style={[
                  styles.absenceBar,
                  line,
                  { left: `${55 + rowIdx * 3}%`, width: `${8 + (rowIdx % 2) * 4}%` },
                ]}
              />
            )}
          </View>
        </View>
      ))}

      {/* Legend row */}
      <View style={[styles.legendRow, { borderColor: theme.border }]}>
        {[...Array(5)].map((_, i) => (
          <View key={i} style={styles.legendItem}>
            <Animated.View style={[styles.legendDot, line]} />
            <Animated.View style={[styles.legendText, line, { width: i % 2 === 0 ? 60 : 50 }]} />
          </View>
        ))}
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
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  // Header
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    minHeight: MONTH_HEADER_HEIGHT + 28,
  },
  sidebarHeader: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  yearLabel: {
    height: 16,
    width: 60,
    borderRadius: 8,
  },
  monthHeaders: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 12,
  },
  monthLabel: {
    height: 12,
    width: 28,
    borderRadius: 6,
  },
  // Rows
  row: {
    flexDirection: 'row',
    height: ROW_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sidebarCell: {
    width: SIDEBAR_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 10,
    borderRightWidth: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    height: 13,
    borderRadius: 6,
  },
  days: {
    height: 11,
    width: '40%',
    borderRadius: 5,
  },
  timelineCell: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  absenceBar: {
    position: 'absolute',
    height: 20,
    borderRadius: 4,
  },
  // Legend
  legendRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 16,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendText: {
    height: 12,
    borderRadius: 6,
  },
});
