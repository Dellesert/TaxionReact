/**
 * SwipeBackView
 * Обёртка для экранов, добавляющая жест свайпа назад на Android.
 * На iOS не делает ничего — там уже есть нативный жест.
 */

import React from 'react';
import { Platform, Dimensions, View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const EDGE_WIDTH = 50; // Зона активации от левого края (px)
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25; // 25% ширины экрана
const VELOCITY_THRESHOLD = 500; // px/s

interface SwipeBackViewProps {
  children: React.ReactNode;
}

export const SwipeBackView: React.FC<SwipeBackViewProps> = ({ children }) => {
  const navigation = useNavigation();
  const startX = useSharedValue(0);

  // На iOS нативный жест уже работает
  if (Platform.OS !== 'android') {
    return <>{children}</>;
  }

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      startX.value = event.absoluteX;
    })
    // Активируется только при горизонтальном движении > 25px
    .activeOffsetX(25)
    // Отменяется при вертикальном движении > 15px (не мешает скроллу)
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      // Только если жест начался от левого края
      if (startX.value > EDGE_WIDTH) return;

      const passedThreshold = event.translationX > SWIPE_THRESHOLD;
      const fastSwipe = event.velocityX > VELOCITY_THRESHOLD;

      if (passedThreshold || fastSwipe) {
        runOnJS(goBack)();
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {children}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
