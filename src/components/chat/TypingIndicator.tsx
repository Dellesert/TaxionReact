import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface TypingIndicatorProps {
  userNames: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ userNames }) => {
  const { theme } = useTheme();
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animation1 = animateDot(dot1, 0);
    const animation2 = animateDot(dot2, 200);
    const animation3 = animateDot(dot3, 400);

    animation1.start();
    animation2.start();
    animation3.start();

    return () => {
      animation1.stop();
      animation2.stop();
      animation3.stop();
    };
  }, [dot1, dot2, dot3]);

  if (userNames.length === 0) return null;

  const typingText =
    userNames.length === 1
      ? `${userNames[0]} печатает`
      : userNames.length === 2
      ? `${userNames[0]} и ${userNames[1]} печатают`
      : `${userNames[0]} и ещё ${userNames.length - 1} печатают`;

  const dynamicStyles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      textAlign: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    text: {
      color: theme.textSecondary,
      fontSize: 14,
      fontStyle: 'italic',
      marginRight: 8,
    },
    dotsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.textSecondary,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <Text style={dynamicStyles.text}>{typingText}</Text>
      <View style={dynamicStyles.dotsContainer}>
        <Animated.View
          style={[
            dynamicStyles.dot,
            {
              opacity: dot1,
              transform: [
                {
                  translateY: dot1.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            dynamicStyles.dot,
            {
              opacity: dot2,
              transform: [
                {
                  translateY: dot2.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            dynamicStyles.dot,
            {
              opacity: dot3,
              transform: [
                {
                  translateY: dot3.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -4],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
    </View>
  );
};
