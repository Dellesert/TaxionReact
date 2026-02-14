import React, { useState, useRef, useEffect } from 'react';
import { Text, View, StyleSheet, StyleProp, TextStyle, Animated, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

interface SpoilerTextProps {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}

/**
 * Спойлер — скрытый текст, который открывается по нажатию.
 * В скрытом состоянии: текст прозрачный, фон с акцентным цветом и иконкой глаза.
 * По нажатию — плавно раскрывается с анимацией.
 */
export const SpoilerText: React.FC<SpoilerTextProps> = ({ children, style }) => {
  const [revealed, setRevealed] = useState(false);
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: revealed ? 1 : 0,
      duration: 250,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [revealed]);

  const hiddenBg = isDark ? `${theme.primary}35` : `${theme.primary}20`;
  const revealedBg = isDark ? `${theme.primary}15` : `${theme.primary}0A`;

  return (
    <View
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        marginHorizontal: 1,
        ...(Platform.OS === 'web'
          ? { display: 'inline-flex' as any, verticalAlign: 'baseline' as any }
          : {}),
      }}
    >
      <Text
        onPress={() => setRevealed(prev => !prev)}
        style={[
          style,
          styles.base,
          !revealed && {
            color: 'transparent',
            backgroundColor: hiddenBg,
          },
          revealed && {
            backgroundColor: revealedBg,
          },
        ]}
      >
        {children}
      </Text>
      {!revealed && (
        <View style={styles.hiddenOverlay} pointerEvents="none">
          <Text style={[styles.eyeIcon, { color: isDark ? `${theme.primary}99` : `${theme.primary}77` }]}>
            {'\u25CF\u25CF\u25CF'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    fontSize: 8,
    letterSpacing: 3,
  },
});
