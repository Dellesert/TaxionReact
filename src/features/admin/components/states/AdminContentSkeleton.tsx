/**
 * AdminContentSkeleton Component
 * Скелетон для контент-области администрирования
 * Повторяет структуру AdminContentArea (header) + сетку карточек (аналитика по умолчанию)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const AdminContentSkeleton: React.FC = () => {
  const { theme } = useTheme();
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

  const renderCard = (key: number) => (
    <View key={key} style={styles.cardWrapper}>
      <View style={[styles.card, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          {/* Icon placeholder */}
          <Animated.View style={[styles.cardIcon, line]} />
          <View style={styles.cardTexts}>
            <Animated.View style={[styles.cardTitle, line]} />
            <Animated.View style={[styles.cardSubtitle, line]} />
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header skeleton (mimics AdminContentArea header) */}
      <View style={[styles.header, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}>
        <Animated.View style={[styles.headerTitle, line]} />
        <Animated.View style={[styles.headerDescription, line]} />
      </View>

      {/* Content grid skeleton (mimics AnalyticsDesktopContent 2x2 grid) */}
      <View style={styles.content}>
        <View style={styles.grid}>
          {[0, 1, 2, 3].map(renderCard)}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 32,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    height: 22,
    width: 140,
    borderRadius: 8,
    marginBottom: 10,
  },
  headerDescription: {
    height: 14,
    width: 280,
    borderRadius: 7,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -12,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  cardTexts: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    height: 18,
    width: '70%',
    borderRadius: 8,
  },
  cardSubtitle: {
    height: 14,
    width: '90%',
    borderRadius: 7,
  },
});
