/**
 * TaskBoardSkeleton Component
 * Скелетон для канбан-доски задач на десктопе (4 колонки с карточками)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

const COLUMN_CARDS = [3, 2, 2, 1]; // количество карточек-скелетонов в каждой колонке

const TaskCardSkeleton: React.FC<{ line: { backgroundColor: string; opacity: Animated.AnimatedInterpolation<number> } }> = ({ line }) => {
  const { theme } = useTheme();

  return (
    <View style={[cardStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Animated.View style={[cardStyles.title, line]} />
      <Animated.View style={[cardStyles.descLong, line]} />
      <Animated.View style={[cardStyles.descMedium, line]} />
      <View style={cardStyles.footer}>
        <Animated.View style={[cardStyles.badge, line]} />
        <Animated.View style={[cardStyles.badge, line]} />
      </View>
    </View>
  );
};

export const TaskBoardSkeleton: React.FC = () => {
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

  return (
    <View style={styles.container}>
      <View style={styles.columnsContainer}>
        {COLUMN_CARDS.map((cardCount, colIdx) => (
          <View key={colIdx} style={styles.column}>
            <View style={[styles.columnContainer, { backgroundColor: theme.card }]}>
              {/* Column header */}
              <View style={[styles.columnHeader, { borderBottomColor: theme.border }]}>
                <Animated.View style={[styles.columnTitle, line]} />
                <Animated.View style={[styles.countBadge, line]} />
              </View>
              {/* Task cards */}
              <View style={styles.taskList}>
                {Array.from({ length: cardCount }).map((_, cardIdx) => (
                  <TaskCardSkeleton key={cardIdx} line={line} />
                ))}
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    gap: 8,
  },
  title: {
    height: 16,
    width: '65%',
    borderRadius: 8,
  },
  descLong: {
    height: 12,
    width: '90%',
    borderRadius: 6,
  },
  descMedium: {
    height: 12,
    width: '70%',
    borderRadius: 6,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  badge: {
    height: 22,
    width: 56,
    borderRadius: 11,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  columnsContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  column: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 8,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  columnContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  columnTitle: {
    height: 14,
    width: 80,
    borderRadius: 7,
  },
  countBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  taskList: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
  },
});
