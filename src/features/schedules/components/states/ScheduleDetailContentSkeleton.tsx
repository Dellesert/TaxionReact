/**
 * ScheduleDetailContentSkeleton Component
 * Скелетон для правой панели (список записей) десктопного ScheduleDetailScreen
 * Повторяет структуру: section header + ScheduleEntriesList (дата-секции с entry rows)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface ScheduleDetailContentSkeletonProps {
  /** Show the section header (info toggle + title + filter). Default: true. Set to false when rendered inside a card that already has its own header. */
  showHeader?: boolean;
}

export const ScheduleDetailContentSkeleton: React.FC<ScheduleDetailContentSkeletonProps> = ({ showHeader = true }) => {
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

  const renderEntryRow = (key: number) => (
    <View key={key} style={[styles.entryRow, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      {/* Avatar */}
      <Animated.View style={[styles.entryAvatar, line]} />
      {/* User name + shift info */}
      <View style={styles.entryInfo}>
        <Animated.View style={[styles.entryName, line]} />
        <Animated.View style={[styles.entryMeta, line]} />
      </View>
      {/* Shift badge */}
      <Animated.View style={[styles.entryBadge, line]} />
    </View>
  );

  const renderDateSection = (key: number, entryCount: number) => (
    <View key={key} style={[styles.dateSection, { borderColor: theme.border }]}>
      {/* Date header */}
      <View style={[styles.dateHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <Animated.View style={[styles.dateTitle, line]} />
      </View>
      {/* Entry rows */}
      <View style={styles.dateSectionItems}>
        {[...Array(entryCount)].map((_, i) => renderEntryRow(i))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Section header (matches desktopCard sectionHeader) */}
      {showHeader && (
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
          <View style={styles.sectionHeaderLeft}>
            <Animated.View style={[styles.infoToggle, line]} />
            <Animated.View style={[styles.sectionTitle, line]} />
          </View>
          <Animated.View style={[styles.filterChip, line]} />
        </View>
      )}

      {/* Entries list */}
      <View style={styles.entriesContent}>
        {renderDateSection(0, 3)}
        {renderDateSection(1, 2)}
        {renderDateSection(2, 2)}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Section header (matches sectionHeaderFullWidth style)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoToggle: {
    width: 28,
    height: 28,
    borderRadius: 10,
  },
  sectionTitle: {
    width: 100,
    height: 14,
    borderRadius: 7,
  },
  filterChip: {
    width: 140,
    height: 34,
    borderRadius: 17,
  },
  // Entries
  entriesContent: {
    padding: 20,
    paddingTop: 12,
    gap: 10,
  },
  dateSection: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  dateTitle: {
    width: 160,
    height: 14,
    borderRadius: 7,
  },
  dateSectionItems: {
    padding: 10,
    gap: 8,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  entryAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  entryInfo: {
    flex: 1,
    gap: 4,
  },
  entryName: {
    width: '60%',
    height: 14,
    borderRadius: 7,
  },
  entryMeta: {
    width: '40%',
    height: 12,
    borderRadius: 6,
  },
  entryBadge: {
    width: 60,
    height: 24,
    borderRadius: 12,
  },
});
