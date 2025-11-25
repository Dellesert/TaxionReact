import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';

interface Use2FAAnimationReturn {
  formOpacity: Animated.Value;
  formTranslateY: Animated.Value;
}

/**
 * Hook for managing entrance animation
 * Animates form appearance with fade-in and slide-up effects
 */
export const use2FAAnimation = (): Use2FAAnimationReturn => {
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(formTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [formOpacity, formTranslateY]);

  return {
    formOpacity,
    formTranslateY,
  };
};
