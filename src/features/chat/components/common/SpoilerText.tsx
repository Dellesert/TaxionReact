import React, { useState, useCallback } from 'react';
import { Text, View, StyleSheet, StyleProp, TextStyle, Platform, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@shared/hooks/useTheme';
import { useAnimationStore } from '@shared/store/animationStore';
import { SpoilerParticles } from './SpoilerParticles';

interface SpoilerTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * Спойлер — скрытый текст, который открывается по нажатию.
 * Telegram-style: анимированные частицы мерцают поверх скрытого текста.
 * По нажатию — частицы рассеиваются, текст плавно появляется.
 */
export const SpoilerText: React.FC<SpoilerTextProps> = ({ children, style }) => {
  const [revealed, setRevealed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const { theme, isDark } = useTheme();
  const reduceAnimations = useAnimationStore((s) => s.reduceAnimations);
  const revealProgress = useSharedValue(0);

  const handlePress = useCallback(() => {
    const next = !revealed;
    setRevealed(next);
    if (!reduceAnimations) {
      revealProgress.value = withTiming(next ? 1 : 0, { duration: 350 });
    }
  }, [revealed, reduceAnimations, revealProgress]);

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width !== dimensions.width || height !== dimensions.height) {
      setDimensions({ width, height });
    }
  }, [dimensions.width, dimensions.height]);

  const textOpacityStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: revealProgress.value };
  });

  const backgroundStyle = useAnimatedStyle(() => {
    'worklet';
    return { opacity: 1 - revealProgress.value };
  });

  const hiddenBg = isDark ? `${theme.primary}35` : `${theme.primary}20`;
  const revealedBg = isDark ? `${theme.primary}15` : `${theme.primary}0A`;
  const particleColor = isDark ? '#FFFFFF' : '#9E9E9E';
  const solidOverlayBg = isDark ? 'rgba(30, 30, 30, 0.95)' : 'rgba(200, 200, 200, 0.95)';
  const particleBgColor = isDark ? 'rgba(30, 30, 30, 0.7)' : 'rgba(200, 200, 200, 0.7)';

  const containerStyle = {
    borderRadius: 6,
    overflow: 'hidden' as const,
    marginHorizontal: 2,
    backgroundColor: revealed ? revealedBg : hiddenBg,
    flexShrink: 1,
    maxWidth: '100%' as const,
    alignSelf: 'flex-start' as const,
    ...(Platform.OS === 'web'
      ? { display: 'inline-flex' as any, verticalAlign: 'baseline' as any }
      : {}),
  };

  // reduceAnimations — простая версия без частиц
  if (reduceAnimations) {
    return (
      <View style={containerStyle} onLayout={handleLayout}>
        <Text
          onPress={handlePress}
          style={[
            style,
            styles.base,
            styles.textPadding,
            { color: revealed ? theme.text : 'transparent' },
          ]}
        >
          {children}
        </Text>
        {!revealed && (
          <View
            style={[styles.overlay, { backgroundColor: solidOverlayBg }]}
            pointerEvents="none"
          />
        )}
      </View>
    );
  }

  // Анимированная версия с частицами
  return (
    <View style={containerStyle} onLayout={handleLayout}>
      {/* Текст — onPress обрабатывает нажатие */}
      <Text
        onPress={handlePress}
        style={[style, styles.base, styles.textPadding, { color: 'transparent' }]}
      >
        {children}
      </Text>

      {/* Видимый текст с анимированной прозрачностью */}
      <Animated.View style={[styles.overlay, textOpacityStyle]} pointerEvents="none">
        <Text style={[style, styles.base, styles.textPadding, { color: theme.text }]}>
          {children}
        </Text>
      </Animated.View>

      {/* Фон под частицами */}
      <Animated.View
        style={[styles.overlay, backgroundStyle, { backgroundColor: particleBgColor }]}
        pointerEvents="none"
      />

      {/* Частицы */}
      {dimensions.width > 0 && dimensions.height > 0 && (
        <SpoilerParticles
          revealProgress={revealProgress}
          particleColor={particleColor}
          containerWidth={dimensions.width}
          containerHeight={dimensions.height}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {},
  textPadding: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
