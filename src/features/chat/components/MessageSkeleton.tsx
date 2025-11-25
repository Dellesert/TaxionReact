import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface MessageSkeletonProps {
  isOwn?: boolean;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ isOwn = false }) => {
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
      alignSelf: isOwn ? 'flex-end' : 'flex-start',
      backgroundColor: isOwn ? theme.primary : theme.card,
      opacity,
    },
  };

  return (
    <Animated.View style={[styles.container, dynamicStyles.container]}>
      <View style={[styles.line, styles.lineShort]} />
      <View style={[styles.line, styles.lineLong]} />
      <View style={[styles.line, styles.lineMedium]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    minWidth: '60%',
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
  },
  line: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    marginVertical: 4,
  },
  lineShort: {
    width: 100,
  },
  lineMedium: {
    width: 160,
  },
  lineLong: {
    width: 200,
  },
});

export default MessageSkeleton;
