/**
 * PollDetailDesktopSkeleton Component
 * Скелетон для двухколоночного десктоп-лейаута деталей опроса
 * Повторяет структуру PollDesktopLayout: левая колонка (Опрос) + правая (Детали: табы)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const PollDetailDesktopSkeleton: React.FC = () => {
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';
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

  return (
    <View style={styles.container}>
      <View style={styles.columnsRow}>
        {/* LEFT COLUMN — Опрос */}
        <View style={styles.leftColumn}>
          <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
            {/* Card header */}
            <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
              <Animated.View style={[styles.headerIcon, line]} />
              <Animated.View style={[styles.headerTitle, line]} />
            </View>
            {/* Content */}
            <View style={[styles.cardBody, { backgroundColor: theme.background }]}>
              {/* Poll title */}
              <Animated.View style={[styles.pollTitle, line]} />
              {/* Badges */}
              <View style={styles.badgesRow}>
                <Animated.View style={[styles.badge, line]} />
                <Animated.View style={[styles.badge, line]} />
              </View>
              {/* Description */}
              <Animated.View style={[styles.descLine, { width: '90%' }, line]} />
              <Animated.View style={[styles.descLine, { width: '70%' }, line]} />
              {/* Meta info */}
              <View style={styles.metaRow}>
                <Animated.View style={[styles.metaIcon, line]} />
                <Animated.View style={[styles.metaText, line]} />
                <View style={{ width: 16 }} />
                <Animated.View style={[styles.metaIcon, line]} />
                <Animated.View style={[styles.metaText, line]} />
              </View>
              {/* Creator */}
              <View style={styles.creatorRow}>
                <Animated.View style={[styles.creatorAvatar, line]} />
                <View style={styles.creatorInfo}>
                  <Animated.View style={[styles.creatorName, line]} />
                  <Animated.View style={[styles.creatorDate, line]} />
                </View>
              </View>
              {/* Voting section divider */}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              {/* Option cards */}
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.optionCard, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
                  <Animated.View style={[styles.optionRadio, line]} />
                  <Animated.View style={[styles.optionText, line]} />
                </View>
              ))}
              {/* Vote button */}
              <Animated.View style={[styles.voteButton, line]} />
            </View>
          </View>
        </View>

        {/* RIGHT COLUMN — Детали */}
        <View style={styles.rightColumn}>
          <View style={[styles.card, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
            {/* Card header */}
            <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
              <Animated.View style={[styles.headerIcon, line]} />
              <Animated.View style={[styles.headerTitle, line]} />
            </View>
            {/* Tab bar (2 tabs) */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              {[1, 2].map((i) => (
                <View key={i} style={styles.tabItem}>
                  <Animated.View style={[styles.tabIcon, line]} />
                  <Animated.View style={[styles.tabLabel, line]} />
                  <Animated.View style={[styles.tabBadge, line]} />
                </View>
              ))}
            </View>
            {/* Tab content — results skeleton */}
            <View style={[styles.tabContent, { backgroundColor: theme.background }]}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <Animated.View style={[styles.resultText, line]} />
                    <Animated.View style={[styles.resultPercent, line]} />
                  </View>
                  <Animated.View style={[styles.resultBar, line]} />
                  <Animated.View style={[styles.resultCount, line]} />
                </View>
              ))}
              {/* Total votes */}
              <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
                <Animated.View style={[styles.totalIcon, line]} />
                <Animated.View style={[styles.totalText, line]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const shadowStyle = Platform.select({
  web: {
    // @ts-ignore
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },

  // Columns
  leftColumn: {
    flex: 2,
    minWidth: 360,
    maxWidth: 600,
  },
  rightColumn: {
    flex: 3,
    minWidth: 400,
  },

  // Card
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...shadowStyle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  headerTitle: {
    width: 60,
    height: 16,
    borderRadius: 8,
  },
  cardBody: {
    flex: 1,
    padding: 20,
    gap: 12,
  },

  // Left column content
  pollTitle: {
    height: 22,
    width: '65%',
    borderRadius: 11,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  descLine: {
    height: 14,
    borderRadius: 7,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  metaText: {
    height: 14,
    width: 80,
    borderRadius: 7,
    marginLeft: 6,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  creatorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  creatorInfo: {
    flex: 1,
    gap: 6,
  },
  creatorName: {
    height: 14,
    width: 120,
    borderRadius: 7,
  },
  creatorDate: {
    height: 12,
    width: 80,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    marginVertical: 4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  optionText: {
    flex: 1,
    height: 16,
    borderRadius: 8,
  },
  voteButton: {
    height: 44,
    borderRadius: 12,
    marginTop: 4,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  tabIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  tabLabel: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  tabBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  // Tab content — results
  tabContent: {
    flex: 1,
    padding: 20,
    gap: 20,
  },
  resultItem: {
    gap: 8,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultText: {
    height: 15,
    width: '60%',
    borderRadius: 8,
  },
  resultPercent: {
    height: 18,
    width: 45,
    borderRadius: 9,
  },
  resultBar: {
    height: 10,
    borderRadius: 6,
  },
  resultCount: {
    height: 13,
    width: 70,
    borderRadius: 7,
  },

  // Total votes
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    paddingTop: 20,
    borderTopWidth: 2,
  },
  totalIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  totalText: {
    height: 15,
    width: 160,
    borderRadius: 8,
  },
});
