/**
 * ScheduleListContentSkeleton Component
 * Скелетон для основной панели списка графиков на десктопе
 * (заголовки секций + карточки графиков)
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

  const renderCardSkeleton = (key: number) => (
    <View key={key} style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      <Animated.View style={[styles.cardColorBar, line]} />
      <View style={styles.cardContent}>
        {/* Title row */}
        <Animated.View style={[styles.cardTitle, line]} />
        {/* Date row */}
        <View style={styles.cardInfoRow}>
          <Animated.View style={[styles.cardInfoIcon, line]} />
          <Animated.View style={[styles.cardInfoText, line]} />
        </View>
        {/* Entries count */}
        <View style={styles.cardInfoRow}>
          <Animated.View style={[styles.cardInfoIcon, line]} />
          <Animated.View style={[styles.cardInfoTextShort, line]} />
        </View>
      </View>
      <Animated.View style={[styles.cardChevron, line]} />
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Section 1 */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Animated.View style={[styles.sectionTitle, line]} />
          <Animated.View style={[styles.sectionCount, { backgroundColor: theme.backgroundSecondary }, line]} />
        </View>
        <View style={styles.cardsRow}>
          {[0, 1, 2].map(renderCardSkeleton)}
        </View>
      </View>

      {/* Section 2 */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Animated.View style={[styles.sectionTitle, line]} />
          <Animated.View style={[styles.sectionCount, { backgroundColor: theme.backgroundSecondary }, line]} />
        </View>
        <View style={styles.cardsRow}>
          {[3, 4].map(renderCardSkeleton)}
        </View>
      </View>

      {/* Section 3 */}
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeader}>
          <Animated.View style={[styles.sectionTitle, line]} />
          <Animated.View style={[styles.sectionCount, { backgroundColor: theme.backgroundSecondary }, line]} />
        </View>
        <View style={styles.cardsRow}>
          {[5, 6, 7].map(renderCardSkeleton)}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    gap: 24,
  },
  sectionBlock: {},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    height: 15,
    width: 120,
    borderRadius: 7,
  },
  sectionCount: {
    height: 20,
    width: 28,
    borderRadius: 10,
  },
  cardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  // Card skeleton (matches ScheduleCard layout)
  card: {
    width: 300,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardColorBar: {
    width: 4,
    height: 60,
    borderRadius: 2,
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    height: 16,
    width: '70%',
    borderRadius: 8,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardInfoIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  cardInfoText: {
    height: 12,
    width: 140,
    borderRadius: 6,
  },
  cardInfoTextShort: {
    height: 12,
    width: 70,
    borderRadius: 6,
  },
  cardChevron: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
});
