/**
 * ScheduleDetailInfoSkeleton Component
 * Скелетон для левой информационной панели десктопного ScheduleDetailScreen
 * (Описание, Тип, Период, Видимость, Создатель)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const ScheduleDetailInfoSkeleton: React.FC = () => {
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
      {/* Header — "Описание" */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <Animated.View style={[styles.headerIcon, line]} />
        <Animated.View style={[styles.headerTitle, line]} />
      </View>

      {/* Info fields card */}
      <View style={[styles.fieldsCard, { backgroundColor: theme.card }]}>
        {/* Тип */}
        <View style={styles.fieldRow}>
          <Animated.View style={[styles.fieldLabel, line]} />
          <Animated.View style={[styles.fieldValue, line]} />
        </View>

        {/* Период */}
        <View style={styles.fieldRow}>
          <Animated.View style={[styles.fieldLabel, line]} />
          <Animated.View style={[styles.fieldValueWide, line]} />
        </View>

        {/* Видимость */}
        <View style={[styles.fieldRow, { marginBottom: 0 }]}>
          <Animated.View style={[styles.fieldLabel, line]} />
          <Animated.View style={[styles.fieldValue, line]} />
        </View>
      </View>

      {/* Description area */}
      <View style={[styles.descriptionArea, { backgroundColor: theme.background }]}>
        <Animated.View style={[styles.descriptionLine1, line]} />
        <Animated.View style={[styles.descriptionLine2, line]} />

        {/* Creator row */}
        <View style={[styles.creatorRow, { borderTopColor: theme.border }]}>
          <Animated.View style={[styles.creatorAvatar, line]} />
          <View style={styles.creatorInfo}>
            <Animated.View style={[styles.creatorLabel, line]} />
            <Animated.View style={[styles.creatorName, line]} />
          </View>
          <Animated.View style={[styles.creatorChevron, line]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    height: 56,
  },
  headerIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  headerTitle: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  // Info fields
  fieldsCard: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  fieldRow: {
    marginBottom: 14,
    gap: 6,
  },
  fieldLabel: {
    width: 60,
    height: 10,
    borderRadius: 5,
  },
  fieldValue: {
    width: 120,
    height: 15,
    borderRadius: 7,
  },
  fieldValueWide: {
    width: 200,
    height: 15,
    borderRadius: 7,
  },
  // Description area
  descriptionArea: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
  descriptionLine1: {
    width: '90%',
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
  },
  descriptionLine2: {
    width: '60%',
    height: 14,
    borderRadius: 7,
  },
  // Creator
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  creatorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  creatorInfo: {
    flex: 1,
    gap: 4,
  },
  creatorLabel: {
    width: 60,
    height: 10,
    borderRadius: 5,
  },
  creatorName: {
    width: 120,
    height: 14,
    borderRadius: 7,
  },
  creatorChevron: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});
