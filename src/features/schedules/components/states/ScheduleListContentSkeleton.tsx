/**
 * ScheduleListContentSkeleton Component
 * Скелетон для таблицы списка графиков на десктопе
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ScheduleListContentSkeleton: React.FC = () => {
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

  const renderRowSkeleton = (key: number) => (
    <View
      key={key}
      style={[
        styles.row,
        key % 4 < 3 && { borderBottomWidth: 1, borderBottomColor: theme.border + '60' },
      ]}
    >
      {/* Color bar */}
      <Animated.View style={[styles.colorBar, line]} />

      {/* Name col */}
      <View style={styles.colName}>
        <Animated.View style={[styles.titleBlock, { width: key % 2 === 0 ? '70%' : '55%' }, line]} />
        <View style={styles.metaRow}>
          <Animated.View style={[styles.badgeBlock, line]} />
        </View>
      </View>

      {/* Period col */}
      <View style={styles.colPeriod}>
        <View style={styles.periodRow}>
          <Animated.View style={[styles.iconBlock, line]} />
          <Animated.View style={[styles.periodText, line]} />
        </View>
      </View>

      {/* Mode col */}
      <View style={styles.colMode}>
        <Animated.View style={[styles.modeBadgeBlock, line]} />
      </View>

      {/* Status col */}
      <View style={styles.colStatus}>
        <Animated.View style={[styles.statusBadgeBlock, line]} />
      </View>

      {/* Entries col */}
      <View style={styles.colEntries}>
        <View style={styles.entriesRow}>
          <Animated.View style={[styles.iconBlock, line]} />
          <Animated.View style={[styles.entriesNum, line]} />
        </View>
      </View>

      {/* Arrow col */}
      <View style={styles.colArrow}>
        <Animated.View style={[styles.chevronBlock, line]} />
      </View>
    </View>
  );

  const renderSection = (startKey: number, count: number) => (
    <>
      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Animated.View style={[styles.sectionAccent, line]} />
        <Animated.View style={[styles.sectionTitle, line]} />
        <Animated.View style={[styles.sectionCount, line]} />
      </View>

      {/* Column headers */}
      <View style={[styles.colHeaders, { borderBottomColor: theme.border }]}>
        {[60, 42, 42, 42, 50].map((w, i) => (
          <View key={i} style={[i === 0 ? styles.colName : i === 1 ? styles.colPeriod : i === 2 ? styles.colMode : i === 3 ? styles.colStatus : styles.colEntries]}>
            <Animated.View style={[styles.headerBlock, { width: w }, line]} />
          </View>
        ))}
        <View style={styles.colArrow} />
      </View>

      {/* Rows */}
      {Array.from({ length: count }, (_, i) => renderRowSkeleton(startKey + i))}
    </>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {renderSection(0, 4)}
      <View style={{ height: 20 }} />
      {renderSection(4, 3)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    height: 16,
    width: 110,
    borderRadius: 8,
  },
  sectionCount: {
    height: 20,
    width: 28,
    borderRadius: 10,
  },
  // Column headers
  colHeaders: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingLeft: 22,
    borderBottomWidth: 1,
  },
  headerBlock: {
    height: 10,
    borderRadius: 5,
  },
  // Column widths (matches main table)
  colName: {
    flex: 3,
    paddingRight: 12,
  },
  colPeriod: {
    flex: 2,
    paddingRight: 12,
  },
  colMode: {
    flex: 1.2,
    paddingRight: 12,
  },
  colStatus: {
    flex: 1.2,
    paddingRight: 12,
  },
  colEntries: {
    width: 80,
    alignItems: 'center',
  },
  colArrow: {
    width: 28,
    alignItems: 'center',
  },
  // Data row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 0,
  },
  colorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
    marginLeft: 6,
  },
  // Cell blocks
  titleBlock: {
    height: 15,
    borderRadius: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  badgeBlock: {
    height: 18,
    width: 80,
    borderRadius: 6,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBlock: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  periodText: {
    height: 13,
    width: 140,
    borderRadius: 6,
  },
  modeBadgeBlock: {
    height: 24,
    width: 90,
    borderRadius: 6,
  },
  statusBadgeBlock: {
    height: 24,
    width: 95,
    borderRadius: 8,
  },
  entriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  entriesNum: {
    height: 13,
    width: 20,
    borderRadius: 6,
  },
  chevronBlock: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
