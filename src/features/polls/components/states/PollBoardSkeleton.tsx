/**
 * PollBoardSkeleton Component
 * Скелетон для сетки опросов на десктопе (4 колонки с карточками)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

const GRID_COLUMNS = 4;
const GRID_ROWS = 2;

const PollCardSkeleton: React.FC<{ line: { backgroundColor: string; opacity: Animated.AnimatedInterpolation<number> } }> = ({ line }) => {
  const { theme } = useTheme();

  return (
    <View style={[cardStyles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Title */}
      <Animated.View style={[cardStyles.title, line]} />
      {/* Question lines */}
      <Animated.View style={[cardStyles.questionLong, line]} />
      <Animated.View style={[cardStyles.questionMedium, line]} />
      {/* Options */}
      <View style={cardStyles.options}>
        <Animated.View style={[cardStyles.option, line]} />
        <Animated.View style={[cardStyles.option, line]} />
        <Animated.View style={[cardStyles.option, line]} />
      </View>
      {/* Footer badges */}
      <View style={cardStyles.footer}>
        <Animated.View style={[cardStyles.badge, line]} />
        <Animated.View style={[cardStyles.badge, line]} />
      </View>
    </View>
  );
};

export const PollBoardSkeleton: React.FC = () => {
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
      {Array.from({ length: GRID_ROWS }).map((_, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {Array.from({ length: GRID_COLUMNS }).map((_, colIdx) => (
            <View key={colIdx} style={styles.cell}>
              <PollCardSkeleton line={line} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  title: {
    height: 18,
    width: '50%',
    borderRadius: 9,
  },
  questionLong: {
    height: 14,
    width: '85%',
    borderRadius: 7,
  },
  questionMedium: {
    height: 14,
    width: '65%',
    borderRadius: 7,
  },
  options: {
    gap: 10,
    marginTop: 4,
  },
  option: {
    height: 36,
    borderRadius: 8,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 8,
  },
  badge: {
    height: 20,
    width: 70,
    borderRadius: 10,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    padding: 8,
  },
});
