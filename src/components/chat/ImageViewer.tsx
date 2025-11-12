import React, { useEffect, useState, useRef } from 'react';
import { Modal, Pressable, View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
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
  const { theme } = useTheme();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const screenWidth = Dimensions.get('window').width;
  const translateX = useSharedValue(0);

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  // Сброс индекса при открытии
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateX.value = 0;
    }
  }, [visible, initialIndex]);

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

  const onGestureEvent = (event: any) => {
    translateX.value = event.nativeEvent.translationX;
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, velocityX } = event.nativeEvent;
      const threshold = screenWidth * 0.3;

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
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const currentImageUrl = imageUrls[currentIndex];
  const hasMultipleImages = imageUrls.length > 1;

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
              <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={onHandlerStateChange}
                enabled={hasMultipleImages}
              >
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
              </PanGestureHandler>
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
