import React, { useEffect, useState, useMemo } from 'react';
import { Modal, View, StyleSheet, Text, Platform, Dimensions, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { GestureDetector, GestureHandlerRootView, Gesture } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  clamp,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_VELOCITY_THRESHOLD = 500;
const IMAGE_CONTAINER_HEIGHT = SCREEN_HEIGHT * 0.8;

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
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [loadingStates, setLoadingStates] = useState<boolean[]>([]);

  // Shared values для галереи
  const translateX = useSharedValue(0);
  const baseTranslateX = useSharedValue(0);
  const currentIndexShared = useSharedValue(initialIndex);

  // Shared values для зума текущего изображения
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);
  const savedImageTranslateX = useSharedValue(0);
  const savedImageTranslateY = useSharedValue(0);

  // Для свайпа вниз
  const swipeDownY = useSharedValue(0);
  const swipeDownOpacity = useSharedValue(1);

  const controlsOpacity = useSharedValue(1);

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  // Мемоизируем sources чтобы избежать повторных запросов при ререндере
  const imageSources = useMemo(() => {
    const headers = sessionId ? { 'X-Session-ID': sessionId } : undefined;
    return imageUrls.map(uri => ({
      uri,
      headers,
    }));
  }, [imageUrls, sessionId]);

  // Сброс при открытии
  useEffect(() => {
    if (visible) {
      const newIndex = Math.min(Math.max(initialIndex, 0), imageUrls.length - 1);
      setCurrentIndex(newIndex);
      currentIndexShared.value = newIndex;
      setControlsVisible(true);
      controlsOpacity.value = 1;

      // Сброс позиции галереи
      translateX.value = -newIndex * SCREEN_WIDTH;
      baseTranslateX.value = -newIndex * SCREEN_WIDTH;

      // Сброс зума
      scale.value = 1;
      savedScale.value = 1;
      imageTranslateX.value = 0;
      imageTranslateY.value = 0;
      savedImageTranslateX.value = 0;
      savedImageTranslateY.value = 0;
      swipeDownY.value = 0;
      swipeDownOpacity.value = 1;

      // Инициализация состояний загрузки
      setLoadingStates(new Array(imageUrls.length).fill(true));
    }
  }, [visible, initialIndex, imageUrls.length]);

  // Обработка клавиатуры для веба
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) {
      return;
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [visible, currentIndex, imageUrls.length]);

  const hasMultipleImages = imageUrls.length > 1;

  // Функции навигации
  const updateIndex = (newIndex: number) => {
    setCurrentIndex(newIndex);
    currentIndexShared.value = newIndex;
    // Сброс зума при смене изображения
    scale.value = 1;
    savedScale.value = 1;
    imageTranslateX.value = 0;
    imageTranslateY.value = 0;
    savedImageTranslateX.value = 0;
    savedImageTranslateY.value = 0;
  };

  const goToNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      const newIndex = currentIndex + 1;
      translateX.value = withSpring(-newIndex * SCREEN_WIDTH, { damping: 20, stiffness: 200 });
      baseTranslateX.value = -newIndex * SCREEN_WIDTH;
      updateIndex(newIndex);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      translateX.value = withSpring(-newIndex * SCREEN_WIDTH, { damping: 20, stiffness: 200 });
      baseTranslateX.value = -newIndex * SCREEN_WIDTH;
      updateIndex(newIndex);
    }
  };

  const snapToIndex = (index: number) => {
    'worklet';
    const clampedIndex = clamp(index, 0, imageUrls.length - 1);
    translateX.value = withSpring(-clampedIndex * SCREEN_WIDTH, { damping: 20, stiffness: 200 });
    baseTranslateX.value = -clampedIndex * SCREEN_WIDTH;
    runOnJS(updateIndex)(clampedIndex);
  };

  // Переключение видимости контролов по тапу
  const toggleControls = () => {
    const newVisible = !controlsVisible;
    setControlsVisible(newVisible);
    controlsOpacity.value = withTiming(newVisible ? 1 : 0, { duration: 200 });
  };

  const handleClose = () => {
    onClose();
  };

  // === ЖЕСТЫ ===

  // Фокальная точка для зума
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Pinch для зума
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      // event.focalX — координата относительно GestureDetector (всей галереи)
      // Нужно вычислить координату относительно текущего слайда
      const slideStartX = currentIndexShared.value * SCREEN_WIDTH;
      const focalXOnSlide = event.focalX - slideStartX;

      // Координаты относительно центра слайда
      focalX.value = focalXOnSlide - SCREEN_WIDTH / 2;
      focalY.value = event.focalY - SCREEN_HEIGHT / 2;
    })
    .onUpdate((event) => {
      const newScale = clamp(savedScale.value * event.scale, 0.5, 5);
      scale.value = newScale;

      if (newScale > 1) {
        const scaleDiff = newScale / savedScale.value;
        const newX = savedImageTranslateX.value + focalX.value * (1 - scaleDiff);
        const newY = savedImageTranslateY.value + focalY.value * (1 - scaleDiff);

        // Ограничиваем перемещение
        const maxTranslateX = Math.max(0, (SCREEN_WIDTH * newScale - SCREEN_WIDTH) / 2);
        const maxTranslateY = Math.max(0, (IMAGE_CONTAINER_HEIGHT * newScale - IMAGE_CONTAINER_HEIGHT) / 2);

        imageTranslateX.value = clamp(newX, -maxTranslateX, maxTranslateX);
        imageTranslateY.value = clamp(newY, -maxTranslateY, maxTranslateY);
      }
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        imageTranslateX.value = withSpring(0);
        imageTranslateY.value = withSpring(0);
        savedImageTranslateX.value = 0;
        savedImageTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
        // Пересчитываем ограничения для финального масштаба
        const maxTranslateX = Math.max(0, (SCREEN_WIDTH * 4 - SCREEN_WIDTH) / 2);
        const maxTranslateY = Math.max(0, (IMAGE_CONTAINER_HEIGHT * 4 - IMAGE_CONTAINER_HEIGHT) / 2);
        savedImageTranslateX.value = clamp(imageTranslateX.value, -maxTranslateX, maxTranslateX);
        savedImageTranslateY.value = clamp(imageTranslateY.value, -maxTranslateY, maxTranslateY);
      } else {
        savedScale.value = scale.value;
        // Пересчитываем ограничения для текущего масштаба
        const maxTranslateX = Math.max(0, (SCREEN_WIDTH * scale.value - SCREEN_WIDTH) / 2);
        const maxTranslateY = Math.max(0, (IMAGE_CONTAINER_HEIGHT * scale.value - IMAGE_CONTAINER_HEIGHT) / 2);
        savedImageTranslateX.value = clamp(imageTranslateX.value, -maxTranslateX, maxTranslateX);
        savedImageTranslateY.value = clamp(imageTranslateY.value, -maxTranslateY, maxTranslateY);
      }
    });

  // Функция для ограничения перемещения при зуме
  const clampTranslation = (translateVal: number, dimension: number, currentScale: number) => {
    'worklet';
    // Максимальное смещение = (размер * масштаб - размер) / 2
    const maxTranslate = Math.max(0, (dimension * currentScale - dimension) / 2);
    return clamp(translateVal, -maxTranslate, maxTranslate);
  };

  // Pan для перемещения при зуме ИЛИ свайпа между фото
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((event) => {
      if (scale.value > 1) {
        // Зумлено - перемещаем изображение с ограничением
        const newX = savedImageTranslateX.value + event.translationX;
        const newY = savedImageTranslateY.value + event.translationY;

        imageTranslateX.value = clampTranslation(newX, SCREEN_WIDTH, scale.value);
        imageTranslateY.value = clampTranslation(newY, IMAGE_CONTAINER_HEIGHT, scale.value);
      } else {
        // Не зумлено - свайп между фото или вниз для закрытия
        const isHorizontal = Math.abs(event.translationX) > Math.abs(event.translationY);

        if (isHorizontal && hasMultipleImages) {
          // Горизонтальный свайп - переключение фото
          translateX.value = baseTranslateX.value + event.translationX;
        } else if (event.translationY > 0) {
          // Свайп вниз - закрытие
          swipeDownY.value = event.translationY;
          swipeDownOpacity.value = 1 - (event.translationY / (SCREEN_HEIGHT * 0.5));
        }
      }
    })
    .onEnd((event) => {
      if (scale.value > 1) {
        // Зумлено - сохраняем позицию с ограничением
        savedImageTranslateX.value = clampTranslation(imageTranslateX.value, SCREEN_WIDTH, scale.value);
        savedImageTranslateY.value = clampTranslation(imageTranslateY.value, IMAGE_CONTAINER_HEIGHT, scale.value);
      } else {
        const isHorizontal = Math.abs(event.translationX) > Math.abs(event.translationY);

        if (isHorizontal && hasMultipleImages) {
          // Горизонтальный свайп - определяем переход
          const velocityTriggered = Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;
          const distanceTriggered = Math.abs(event.translationX) > SWIPE_THRESHOLD;

          if (velocityTriggered || distanceTriggered) {
            const direction = event.translationX > 0 ? -1 : 1;
            const newIndex = clamp(currentIndex + direction, 0, imageUrls.length - 1);

            if (newIndex !== currentIndex) {
              snapToIndex(newIndex);
            } else {
              // Вернуться на текущий индекс (граница достигнута)
              translateX.value = withSpring(baseTranslateX.value, { damping: 20, stiffness: 200 });
            }
          } else {
            // Вернуться на текущий индекс
            translateX.value = withSpring(baseTranslateX.value, { damping: 20, stiffness: 200 });
          }
        } else if (swipeDownY.value > 100) {
          // Свайп вниз достаточный для закрытия
          runOnJS(handleClose)();
        } else {
          // Вернуть на место
          swipeDownY.value = withSpring(0);
          swipeDownOpacity.value = withTiming(1);
        }
      }
    });

  // Одинарный тап для скрытия/показа контролов
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(toggleControls)();
    });

  // Двойной тап для зума
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > 1) {
        // Убрать зум
        scale.value = withSpring(1);
        savedScale.value = 1;
        imageTranslateX.value = withSpring(0);
        imageTranslateY.value = withSpring(0);
        savedImageTranslateX.value = 0;
        savedImageTranslateY.value = 0;
      } else {
        // Зумить на точку тапа
        const targetScale = 2.5;

        // event.x — координата относительно GestureDetector (всей галереи)
        // Нужно вычислить координату относительно текущего слайда
        // Текущий слайд начинается на currentIndexShared.value * SCREEN_WIDTH
        const slideStartX = currentIndexShared.value * SCREEN_WIDTH;
        const tapXOnSlide = event.x - slideStartX;

        // Координаты тапа относительно центра слайда
        const tapX = tapXOnSlide - SCREEN_WIDTH / 2;
        const tapY = event.y - SCREEN_HEIGHT / 2;

        // Вычисляем желаемое смещение
        let newTranslateX = -tapX * (targetScale - 1);
        let newTranslateY = -tapY * (targetScale - 1);

        // Ограничиваем смещение, чтобы изображение не уходило за границы
        const maxTranslateX = Math.max(0, (SCREEN_WIDTH * targetScale - SCREEN_WIDTH) / 2);
        const maxTranslateY = Math.max(0, (IMAGE_CONTAINER_HEIGHT * targetScale - IMAGE_CONTAINER_HEIGHT) / 2);

        newTranslateX = clamp(newTranslateX, -maxTranslateX, maxTranslateX);
        newTranslateY = clamp(newTranslateY, -maxTranslateY, maxTranslateY);

        scale.value = withSpring(targetScale);
        savedScale.value = targetScale;

        imageTranslateX.value = withSpring(newTranslateX);
        imageTranslateY.value = withSpring(newTranslateY);
        savedImageTranslateX.value = newTranslateX;
        savedImageTranslateY.value = newTranslateY;
      }
    });

  // Комбинируем жесты
  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    pinchGesture,
    panGesture
  );

  // === АНИМИРОВАННЫЕ СТИЛИ ===

  const galleryStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
    ],
  }));

  const imageZoomStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: imageTranslateX.value },
      { translateY: imageTranslateY.value + swipeDownY.value },
      { scale: scale.value },
    ],
    opacity: swipeDownOpacity.value,
  }));

  const animatedControlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===

  const downloadImageLocally = async (imageUrl: string): Promise<string | null> => {
    try {
      const filename = `image_${Date.now()}.jpg`;
      const file = new ExpoFile(Paths.cache, filename);

      const response = await fetch(imageUrl, {
        headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
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

  const handleShare = async () => {
    if (isSharing) return;

    const currentImageUrl = imageUrls[currentIndex];
    if (!currentImageUrl) return;

    setIsSharing(true);
    let localUri: string | null = null;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Ошибка', 'Функция "Поделиться" недоступна на этом устройстве');
        return;
      }

      localUri = await downloadImageLocally(currentImageUrl);
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
      // Очищаем временный файл после share
      if (localUri) {
        try {
          const file = new ExpoFile(localUri);
          if (file.exists) {
            file.delete();
          }
        } catch {}
      }
    }
  };

  const handleSaveToGallery = async () => {
    if (isSharing) return;

    const currentImageUrl = imageUrls[currentIndex];
    if (!currentImageUrl) return;

    setIsSharing(true);
    let localUri: string | null = null;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Необходимо разрешение для сохранения в галерею');
        return;
      }

      localUri = await downloadImageLocally(currentImageUrl);
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
      // Очищаем временный файл после сохранения
      if (localUri) {
        try {
          const file = new ExpoFile(localUri);
          if (file.exists) {
            file.delete();
          }
        } catch {}
      }
    }
  };

  const handleForward = () => {
    const currentImageUrl = imageUrls[currentIndex];
    if (currentImageUrl && onForward) {
      onForward(currentImageUrl);
    }
  };

  const setImageLoaded = (index: number) => {
    setLoadingStates(prev => {
      const newStates = [...prev];
      newStates[index] = false;
      return newStates;
    });
  };

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

        {/* Галерея изображений */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.galleryContainer, galleryStyle]}>
            {imageUrls.map((uri, index) => {
              // Ленивая загрузка: рендерим только текущее изображение ±1 для предзагрузки
              const shouldRender = Math.abs(index - currentIndex) <= 1;

              return (
                <View key={`${index}-${uri}`} style={styles.imageSlide}>
                  <Animated.View
                    style={[
                      styles.imageContainer,
                      index === currentIndex ? imageZoomStyle : undefined
                    ]}
                  >
                    {shouldRender ? (
                      <>
                        {loadingStates[index] && (
                          <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                          </View>
                        )}
                        <Image
                          source={imageSources[index]}
                          style={styles.fullscreenImage}
                          contentFit="contain"
                          cachePolicy="disk"
                          onLoadEnd={() => setImageLoaded(index)}
                        />
                      </>
                    ) : (
                      <View style={styles.loaderContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </Animated.View>
                </View>
              );
            })}
          </Animated.View>
        </GestureDetector>

        {/* Заголовок с счетчиком */}
        <Animated.View
          style={[styles.header, { paddingTop: 15 + insets.top }, animatedControlsStyle]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
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
                  onPress={goToPrevious}
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
                  onPress={goToNext}
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
  galleryContainer: {
    flexDirection: 'row',
    height: SCREEN_HEIGHT,
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
