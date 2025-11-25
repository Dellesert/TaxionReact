import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { GestureDetector, GestureHandlerRootView, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

interface ImageViewerProps {
  visible: boolean;
  imageUrls: string[]; // Массив URL изображений
  initialIndex?: number; // Начальный индекс
  onClose: () => void;
}

/**
 * Компонент для полноэкранного просмотра изображений с поддержкой галереи
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls = [],
  initialIndex = 0,
  onClose
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const screenWidth = Dimensions.get('window').width;

  // Значения для свайпа между изображениями
  const translateX = useSharedValue(0);

  // Значения для zoom и pan
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const translateXZoom = useSharedValue(0);
  const translateYZoom = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  // Сброс индекса и зума при открытии
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateX.value = 0;
      scale.value = 1;
      savedScale.value = 1;
      translateXZoom.value = 0;
      translateYZoom.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    }
  }, [visible, initialIndex]);

  // Сброс зума при смене изображения
  useEffect(() => {
    scale.value = withTiming(1, { duration: 200 });
    savedScale.value = 1;
    translateXZoom.value = withTiming(0, { duration: 200 });
    translateYZoom.value = withTiming(0, { duration: 200 });
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [currentIndex]);

  // Обработка клавиатуры для веба
  useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handleKeyPress = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
          handlePrevious();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        } else if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [visible, currentIndex, imageUrls.length]);

  const currentImageUrl = imageUrls[currentIndex];
  const hasMultipleImages = imageUrls.length > 1;

  const handleNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      translateX.value = 0;
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      translateX.value = 0;
    }
  };

  // Жест pinch для зума
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      // Ограничиваем минимальный и максимальный зум
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateXZoom.value = withSpring(0);
        translateYZoom.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Жест pan для перемещения увеличенного изображения
  const panGestureZoom = Gesture.Pan()
    .enabled(savedScale.value > 1)
    .onUpdate((event) => {
      translateXZoom.value = savedTranslateX.value + event.translationX;
      translateYZoom.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateXZoom.value;
      savedTranslateY.value = translateYZoom.value;
    });

  // Жест для переключения между изображениями (свайп)
  const panGestureSwipe = Gesture.Pan()
    .enabled(hasMultipleImages && savedScale.value <= 1)
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      const threshold = screenWidth * 0.3;
      const { translationX, velocityX } = event;

      if (translationX < -threshold || velocityX < -500) {
        // Свайп влево - следующее изображение
        if (currentIndex < imageUrls.length - 1) {
          runOnJS(handleNext)();
        } else {
          translateX.value = withSpring(0);
        }
      } else if (translationX > threshold || velocityX > 500) {
        // Свайп вправо - предыдущее изображение
        if (currentIndex > 0) {
          runOnJS(handlePrevious)();
        } else {
          translateX.value = withSpring(0);
        }
      } else {
        // Возврат в исходное положение
        translateX.value = withSpring(0);
      }
    });

  // Двойной тап для зума
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        // Если увеличено - вернуть в исходное состояние
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateXZoom.value = withSpring(0);
        translateYZoom.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Если не увеличено - увеличить
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  // Композиция жестов
  const composedGesture = Gesture.Simultaneous(
    Gesture.Race(doubleTap, Gesture.Simultaneous(pinchGesture, panGestureZoom)),
    panGestureSwipe
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateX: translateXZoom.value },
        { translateY: translateYZoom.value },
        { scale: scale.value },
      ],
    };
  });

  // Не отображаем модалку если нет изображений
  if (!visible || imageUrls.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BlurView intensity={95} style={styles.blurOverlay} tint="dark">
          <View style={styles.imageViewerOverlay}>
            {/* Заголовок с счетчиком */}
            {hasMultipleImages && (
              <View style={[styles.header, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <Text style={[styles.counterText, { color: '#FFFFFF' }]}>
                  {currentIndex + 1} из {imageUrls.length}
                </Text>
              </View>
            )}

            <Pressable style={styles.imagePressable} onPress={onClose}>
              <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.imageViewerContainer, animatedStyle]}>
                  {currentImageUrl && (
                    <Image
                      source={{
                        uri: currentImageUrl,
                        headers: sessionId ? {
                          'X-Session-ID': sessionId,
                        } : undefined,
                      }}
                      style={styles.fullscreenImage}
                      contentFit="contain"
                      transition={200}
                      cachePolicy="memory-disk"
                    />
                  )}
                </Animated.View>
              </GestureDetector>
            </Pressable>

            {/* Кнопка закрытия */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Навигационные стрелки для веба и множественных изображений */}
            {hasMultipleImages && (
              <>
                {/* Левая стрелка */}
                {currentIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonLeft, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                    onPress={handlePrevious}
                  >
                    <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {/* Правая стрелка */}
                {currentIndex < imageUrls.length - 1 && (
                  <TouchableOpacity
                    style={[styles.navButton, styles.navButtonRight, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}
                    onPress={handleNext}
                  >
                    <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                {/* Индикаторы точек */}
                {imageUrls.length <= 10 && (
                  <View style={styles.dotsContainer}>
                    {imageUrls.map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: index === currentIndex ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                            width: index === currentIndex ? 8 : 6,
                            height: index === currentIndex ? 8 : 6,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </BlurView>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurOverlay: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    zIndex: 20,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 16,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageViewerOverlay: {
    flex: 1,
  },
  imagePressable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: '90%',
    height: '90%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 5,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -28,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
  },
  dot: {
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
});
