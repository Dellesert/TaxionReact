import React, { useEffect, useState, useRef } from 'react';
import { Modal, View, StyleSheet, Text, Platform, Dimensions, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { GestureDetector, GestureHandlerRootView, Gesture, FlatList } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Отдельный компонент для изображения с зумом и свайпом вниз
const ZoomableImage: React.FC<{
  uri: string;
  sessionId: string | null;
  isActive: boolean;
  onZoomChange?: (isZoomed: boolean) => void;
  onSingleTap?: () => void;
  onClose?: () => void;
}> = ({ uri, sessionId, isActive, onZoomChange, onSingleTap, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Для свайпа вниз
  const swipeTranslateY = useSharedValue(0);
  const imageOpacity = useSharedValue(1);

  // Сброс зума когда изображение становится неактивным
  useEffect(() => {
    if (!isActive) {
      scale.value = withTiming(1, { duration: 200 });
      savedScale.value = 1;
      translateX.value = withTiming(0, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      swipeTranslateY.value = 0;
      imageOpacity.value = 1;
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
    .minDistance(10)
    .manualActivation(true)
    .onTouchesMove((_event, stateManager) => {
      // Активируем жест только если зумлено
      if (scale.value > 1.05) {
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

  // Свайп вниз для закрытия (только когда не зумлено)
  const swipeDownGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetY([20, 300])
    .failOffsetY(-15)
    .failOffsetX([-20, 20])
    .manualActivation(true)
    .onTouchesMove((_event, stateManager) => {
      // Активируем только если не зумлено и свайп вниз
      if (scale.value <= 1.05) {
        stateManager.activate();
      } else {
        stateManager.fail();
      }
    })
    .onUpdate((event) => {
      if (event.translationY > 0) {
        swipeTranslateY.value = event.translationY;
        imageOpacity.value = 1 - (event.translationY / 400);
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 && onClose) {
        runOnJS(onClose)();
      } else {
        swipeTranslateY.value = withSpring(0);
        imageOpacity.value = withSpring(1);
      }
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

  // Комбинируем жесты
  const gesture = Gesture.Race(
    tapGesture,
    Gesture.Simultaneous(pinchGesture, panGestureZoomed),
    panGestureSingleFinger,
    swipeDownGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value + swipeTranslateY.value },
      { scale: scale.value },
    ],
    opacity: imageOpacity.value,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.imageContainer, animatedStyle]}>
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
        <Image
          source={{
            uri,
            headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
          }}
          style={styles.fullscreenImage}
          contentFit="contain"
          cachePolicy="memory-disk"
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
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
  onForward?: (imageUrl: string) => void;
}

/**
 * Компонент для полноэкранного просмотра изображений с поддержкой галереи
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  imageUrls = [],
  initialIndex = 0,
  onClose,
  onForward,
}) => {
  const insets = useSafeAreaInsets();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const flatListRef = useRef<FlatList<string>>(null);

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

  // Скачать изображение локально для шаринга
  const downloadImageLocally = async (imageUrl: string): Promise<string | null> => {
    try {
      const filename = `image_${Date.now()}.jpg`;
      const file = new ExpoFile(Paths.cache, filename);

      // Fetch image with session headers
      const response = await fetch(imageUrl, {
        headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      // React Native compatible way to convert blob to base64
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data:image/...;base64, prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      file.write(base64, { encoding: 'base64' });

      return file.uri;
    } catch (error) {
      console.error('Failed to download image:', error);
      return null;
    }
  };

  // Поделиться изображением
  const handleShare = async () => {
    if (isSharing) return;

    const currentImageUrl = imageUrls[currentIndex];
    if (!currentImageUrl) return;

    setIsSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Ошибка', 'Функция "Поделиться" недоступна на этом устройстве');
        return;
      }

      const localUri = await downloadImageLocally(currentImageUrl);
      if (!localUri) {
        Alert.alert('Ошибка', 'Не удалось загрузить изображение');
        return;
      }

      await Sharing.shareAsync(localUri, {
        mimeType: 'image/jpeg',
        dialogTitle: 'Поделиться изображением',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Ошибка', 'Не удалось поделиться изображением');
    } finally {
      setIsSharing(false);
    }
  };

  // Сохранить в галерею
  const handleSaveToGallery = async () => {
    if (isSharing) return;

    const currentImageUrl = imageUrls[currentIndex];
    if (!currentImageUrl) return;

    setIsSharing(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Необходимо разрешение для сохранения в галерею');
        return;
      }

      const localUri = await downloadImageLocally(currentImageUrl);
      if (!localUri) {
        Alert.alert('Ошибка', 'Не удалось загрузить изображение');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Успешно', 'Изображение сохранено в галерею');
    } catch (error) {
      console.error('Save to gallery error:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить изображение');
    } finally {
      setIsSharing(false);
    }
  };

  // Переслать изображение
  const handleForward = () => {
    const currentImageUrl = imageUrls[currentIndex];
    if (currentImageUrl && onForward) {
      onForward(currentImageUrl);
    }
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

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50
  }).current;

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageSlide}>
      <ZoomableImage
        uri={item}
        sessionId={sessionId}
        isActive={index === currentIndex}
        onZoomChange={setIsZoomed}
        onSingleTap={toggleControls}
        onClose={onClose}
      />
    </View>
  );

  const getItemLayout = (_: unknown, index: number) => ({
    length: SCREEN_WIDTH,
    offset: SCREEN_WIDTH * index,
    index,
  });

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
      statusBarTranslucent
    >
      <GestureHandlerRootView style={styles.container}>
        <BlurView intensity={95} style={styles.blurOverlay} tint="dark" />

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

        {/* Заголовок с счетчиком - вне FlatList для корректной работы кнопок */}
        <Animated.View
          style={[styles.header, { paddingTop: 15 + insets.top }, animatedControlsStyle]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          {/* Кнопка Поделиться */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={isSharing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="share-outline" size={26} color="#FFFFFF" />
            )}
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {hasMultipleImages && (
              <Text style={styles.counterText}>
                {currentIndex + 1} из {imageUrls.length}
              </Text>
            )}
          </View>
          {/* Кнопка закрытия */}
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Навигационные стрелки */}
        {hasMultipleImages && (
          <>
            {currentIndex > 0 && (
              <Animated.View
                style={[styles.navButton, styles.navButtonLeft, animatedControlsStyle]}
                pointerEvents={controlsVisible ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  onPress={handlePrevious}
                  style={styles.navButtonTouchable}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {currentIndex < imageUrls.length - 1 && (
              <Animated.View
                style={[styles.navButton, styles.navButtonRight, animatedControlsStyle]}
                pointerEvents={controlsVisible ? 'auto' : 'none'}
              >
                <TouchableOpacity
                  onPress={handleNext}
                  style={styles.navButtonTouchable}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Индикаторы точек */}
            {imageUrls.length <= 10 && (
              <Animated.View style={[styles.dotsContainer, { bottom: 70 + insets.bottom }, animatedControlsStyle]}>
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

        {/* Нижняя панель с кнопками */}
        <Animated.View
          style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }, animatedControlsStyle]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          {/* Кнопка Сохранить */}
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={handleSaveToGallery}
            activeOpacity={0.7}
            disabled={isSharing}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="download-outline" size={24} color="#FFFFFF" />
            <Text style={styles.bottomButtonText}>Сохранить</Text>
          </TouchableOpacity>

          {/* Кнопка Переслать */}
          {onForward && (
            <TouchableOpacity
              style={styles.bottomButton}
              onPress={handleForward}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-redo-outline" size={24} color="#FFFFFF" />
              <Text style={styles.bottomButtonText}>Переслать</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 15,
    paddingHorizontal: 16,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
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
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  bottomButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
