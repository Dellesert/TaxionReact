import React, { useState, useRef, useEffect } from 'react';
import { Text, View, StyleSheet, StyleProp, TextStyle, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
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
        borderRadius: 6,
        overflow: 'hidden',
        marginHorizontal: 2,
        backgroundColor: revealed ? revealedBg : hiddenBg,
        flexShrink: 1,
        maxWidth: '100%',
        alignSelf: 'flex-start',
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
          {
            paddingHorizontal: 16,
            paddingVertical: 4,
          },
          !revealed && {
            color: 'transparent',
          },
          revealed && {
            color: theme.text,
          },
        ]}
      >
        {children}
      </Text>
      {!revealed && (
        <BlurView
          intensity={isDark ? 30 : 25}
          tint={isDark ? 'light' : 'dark'}
          style={styles.hiddenOverlay}
          pointerEvents="none"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
  },
  hiddenOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
