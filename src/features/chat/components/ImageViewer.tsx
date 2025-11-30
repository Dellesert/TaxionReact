import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, Platform, Dimensions, FlatList } from 'react-native';
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Отдельный компонент для изображения с зумом
const ZoomableImage: React.FC<{
  uri: string;
  sessionId: string | null;
  isActive: boolean;
  onZoomChange?: (isZoomed: boolean) => void;
  onSingleTap?: () => void;
}> = ({ uri, sessionId, isActive, onZoomChange, onSingleTap }) => {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Сброс зума когда изображение становится неактивным
  useEffect(() => {
    if (!isActive) {
      scale.value = withTiming(1, { duration: 200 });
      savedScale.value = 1;
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      if (onZoomChange) onZoomChange(false);
    }
  }, [isActive]);

  // Фокальная точка для зума
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      focalX.value = event.focalX - SCREEN_WIDTH / 2;
      focalY.value = event.focalY - SCREEN_HEIGHT / 2;
    })
    .onUpdate((event) => {
      const newScale = savedScale.value * event.scale;
      scale.value = newScale;

      if (newScale > 1) {
        const scaleDiff = newScale / savedScale.value;
        translateX.value = savedTranslateX.value + focalX.value * (1 - scaleDiff);
        translateY.value = savedTranslateY.value + focalY.value * (1 - scaleDiff);
      }
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        if (onZoomChange) runOnJS(onZoomChange)(true);
      } else {
        savedScale.value = scale.value;
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
        if (onZoomChange) runOnJS(onZoomChange)(scale.value > 1);
      }
    });

  // Pan для перемещения при зуме (2 пальца)
  const panGestureZoomed = Gesture.Pan()
    .minPointers(2)
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + event.translationX;
        translateY.value = savedTranslateY.value + event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value > 1) {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // Pan для перемещения при зуме (1 палец) - только когда зумлено
  const panGestureSingleFinger = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .minDistance(5)
    .manualActivation(true)
    .onTouchesMove((_event, stateManager) => {
      // Активируем жест только если зумлено
      if (scale.value > 1) {
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Одинарный тап для скрытия/показа контролов
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (onSingleTap) {
        runOnJS(onSingleTap)();
      }
    });

  // Двойной тап для зума
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (onZoomChange) runOnJS(onZoomChange)(false);
      } else {
        const targetScale = 2.5;
        const tapX = event.x - SCREEN_WIDTH / 2;
        const tapY = event.y - SCREEN_HEIGHT * 0.4;

        scale.value = withSpring(targetScale);
        savedScale.value = targetScale;

        translateX.value = withSpring(-tapX * (targetScale - 1));
        translateY.value = withSpring(-tapY * (targetScale - 1));
        savedTranslateX.value = -tapX * (targetScale - 1);
        savedTranslateY.value = -tapY * (targetScale - 1);

        if (onZoomChange) runOnJS(onZoomChange)(true);
      }
    });

  // Комбинируем тапы - double tap имеет приоритет над single tap
  const tapGesture = Gesture.Exclusive(doubleTap, singleTap);

  // Комбинируем жесты - зум, перемещение и тапы
  const gesture = Gesture.Race(
    tapGesture,
    Gesture.Simultaneous(pinchGesture, panGestureZoomed),
    panGestureSingleFinger
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        <Image
          source={{
            uri,
            headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
          }}
          style={styles.fullscreenImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </Animated.View>
    </GestureDetector>
  );
};

interface ImageViewerProps {
  visible: boolean;
  imageUrls: string[];
  initialIndex?: number;
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
  const [isZoomed, setIsZoomed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // Значения для свайпа вниз (закрытие)
  const swipeY = useSharedValue(0);
  const backgroundOpacity = useSharedValue(1);
  const controlsOpacity = useSharedValue(1);

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  // Сброс при открытии
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setIsZoomed(false);
      setControlsVisible(true);
      swipeY.value = 0;
      backgroundOpacity.value = 1;
      controlsOpacity.value = 1;
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      }, 50);
    }
  }, [visible, initialIndex]);

  // Обработка клавиатуры для веба
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) {
      return;
    }

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
  }, [visible, currentIndex, imageUrls.length]);

  const hasMultipleImages = imageUrls.length > 1;

  // Переключение видимости контролов по тапу
  const toggleControls = () => {
    const newVisible = !controlsVisible;
    setControlsVisible(newVisible);
    controlsOpacity.value = withTiming(newVisible ? 1 : 0, { duration: 200 });
  };

  const handleNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  // Значение для скрытия заголовка при свайпе
  const headerOpacity = useSharedValue(1);

  // Свайп вниз для закрытия - на уровне всего контейнера
  const swipeDownGesture = Gesture.Pan()
    .activeOffsetY([15, 300])
    .failOffsetX([-10, 10])
    .failOffsetY(-10)
    .enabled(!isZoomed)
    .onStart(() => {
      // Сразу скрываем заголовок при начале свайпа
      headerOpacity.value = withTiming(0, { duration: 150 });
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        swipeY.value = event.translationY;
        backgroundOpacity.value = 1 - (event.translationY / 400);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 120) {
        runOnJS(onClose)();
      } else {
        swipeY.value = withSpring(0);
        backgroundOpacity.value = withSpring(1);
        headerOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageSlide}>
      <ZoomableImage
        uri={item}
        sessionId={sessionId}
        isActive={index === currentIndex}
        onZoomChange={setIsZoomed}
        onSingleTap={toggleControls}
      />
    </View>
  );

  const getItemLayout = (_: any, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeY.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const animatedHeaderStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value * controlsOpacity.value,
  }));

  const animatedControlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

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
        <View style={styles.container}>
          <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
            <BlurView intensity={95} style={styles.blurOverlay} tint="dark" />
          </Animated.View>

          <GestureDetector gesture={swipeDownGesture}>
            <Animated.View style={[styles.imageViewerOverlay, animatedContainerStyle]}>
              {/* Заголовок с счетчиком */}
              <Animated.View style={[styles.header, animatedHeaderStyle]}>
                <View style={{ width: 44 }} />
                <View style={styles.headerContent}>
                  {hasMultipleImages && (
                    <Text style={styles.counterText}>
                      {currentIndex + 1} из {imageUrls.length}
                    </Text>
                  )}
                </View>
                {/* Кнопка закрытия */}
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>

              {/* Галерея изображений с горизонтальным скроллом */}
              <FlatList
                ref={flatListRef}
                data={imageUrls}
                renderItem={renderImageItem}
                keyExtractor={(item, index) => `${index}-${item}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={getItemLayout}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                style={styles.flatList}
                bounces={false}
                decelerationRate="fast"
                scrollEnabled={!isZoomed}
              />

              {/* Навигационные стрелки */}
              {hasMultipleImages && (
                <>
                  {currentIndex > 0 && (
                    <Animated.View style={[styles.navButton, styles.navButtonLeft, animatedControlsStyle]}>
                      <TouchableOpacity onPress={handlePrevious} style={styles.navButtonTouchable}>
                        <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
                      </TouchableOpacity>
                    </Animated.View>
                  )}

                  {currentIndex < imageUrls.length - 1 && (
                    <Animated.View style={[styles.navButton, styles.navButtonRight, animatedControlsStyle]}>
                      <TouchableOpacity onPress={handleNext} style={styles.navButtonTouchable}>
                        <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
                      </TouchableOpacity>
                    </Animated.View>
                  )}

                  {/* Индикаторы точек */}
                  {imageUrls.length <= 10 && (
                    <Animated.View style={[styles.dotsContainer, animatedControlsStyle]}>
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
                    </Animated.View>
                  )}
                </>
              )}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blurOverlay: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 55 : 35,
    paddingBottom: 15,
    paddingHorizontal: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  counterText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  imageViewerOverlay: {
    flex: 1,
  },
  flatList: {
    flex: 1,
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  navButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
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
