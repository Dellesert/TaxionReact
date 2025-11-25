import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@hooks/useTheme';

export const TaskSkeleton: React.FC = () => {
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
      {/* Заголовок */}
      <View style={[styles.titleLine, dynamicStyles.line]} />

      {/* Описание */}
      <View style={[styles.descLine, styles.descLineLong, dynamicStyles.line]} />
      <View style={[styles.descLine, styles.descLineMedium, dynamicStyles.line]} />

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
    height: 16,
    borderRadius: 8,
    width: '60%',
    marginBottom: 12,
  },
  descLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  descLineLong: {
    width: '90%',
  },
  descLineMedium: {
    width: '70%',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  badge: {
    height: 20,
    width: 60,
    borderRadius: 10,
  },
});

export default TaskSkeleton;
