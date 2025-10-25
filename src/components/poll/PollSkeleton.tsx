import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@hooks/useTheme';

export const PollSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Пульсирующая анимация
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

  const dynamicStyles = {
    container: {
      backgroundColor: theme.card,
      opacity,
    },
    line: {
      backgroundColor: theme.border,
    },
  };

  return (
    <Animated.View style={[styles.container, dynamicStyles.container]}>
      {/* Заголовок опроса */}
      <View style={[styles.titleLine, dynamicStyles.line]} />

      {/* Вопрос */}
      <View style={[styles.questionLine, styles.questionLineLong, dynamicStyles.line]} />
      <View style={[styles.questionLine, styles.questionLineMedium, dynamicStyles.line]} />

      {/* Варианты ответов */}
      <View style={styles.optionsContainer}>
        <View style={[styles.optionLine, dynamicStyles.line]} />
        <View style={[styles.optionLine, dynamicStyles.line]} />
        <View style={[styles.optionLine, dynamicStyles.line]} />
      </View>

      {/* Footer с метаданными */}
      <View style={styles.footer}>
        <View style={[styles.badge, dynamicStyles.line]} />
        <View style={[styles.badge, dynamicStyles.line]} />
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  titleLine: {
    height: 18,
    borderRadius: 9,
    width: '50%',
    marginBottom: 16,
  },
  questionLine: {
    height: 14,
    borderRadius: 7,
    marginBottom: 8,
  },
  questionLineLong: {
    width: '85%',
  },
  questionLineMedium: {
    width: '65%',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionLine: {
    height: 36,
    borderRadius: 8,
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  badge: {
    height: 20,
    width: 70,
    borderRadius: 10,
  },
});

export default PollSkeleton;
