import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Modal, View, StyleSheet, Text, Platform, Alert, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { GestureDetector, GestureHandlerRootView, Gesture } from 'react-native-gesture-handler';
import * as Sharing from 'expo-sharing';
import { Paths, File as ExpoFile } from 'expo-file-system';
import { getCachedVideoUri, cacheVideo, isVideoCacheUri } from '@shared/utils/videoCache';
import { isElectron } from '@shared/utils/platform';
import { getElectronCachedVideoUri, cacheElectronVideo, isElectronCacheUri } from '@shared/utils/electronVideoCache';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  clamp,
} from 'react-native-reanimated';

const SWIPE_VELOCITY_THRESHOLD = 500;
const SLIDE_WINDOW = 2;

export interface MediaItem {
  type: 'image' | 'video';
  url: string;
  thumbnailUrl?: string;      // medium thumbnail (legacy)
  thumbnailLargeUrl?: string;  // large thumbnail (~800px) for adjacent slides
  attachmentId: number;
  duration?: number;
}

interface MediaViewerProps {
  visible: boolean;
  mediaItems: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
  onForward?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
}

// === Memoized sub-components ===

const ImageSlideContent = React.memo<{
  source: { uri: string; headers?: Record<string, string> };
}>(({ source }) => {
  const [loaded, setLoaded] = useState(false);
  const onLoadEnd = useCallback(() => setLoaded(true), []);

  return (
    <>
      {!loaded && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
      <Image
        source={source}
        style={styles.fullscreenImage}
        contentFit="contain"
        cachePolicy="disk"
        onLoadEnd={onLoadEnd}
      />
    </>
  );
});

const VideoSlideContent = React.memo<{
  item: MediaItem;
  isActive: boolean;
  sessionId: string | null;
  player: ReturnType<typeof useVideoPlayer>;
  videoLoading: boolean;
}>(({ item, isActive, sessionId, player, videoLoading }) => (
  <View style={styles.videoSlideContainer}>
    {isActive ? (
      <VideoView
        player={player}
        style={styles.fullscreenVideo}
        contentFit="contain"
        nativeControls={false}
        allowsFullscreen={false}
        pointerEvents="none"
      />
    ) : (
      <Image
        source={{
          uri: item.thumbnailLargeUrl || item.thumbnailUrl || item.url,
          headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
        }}
        style={styles.fullscreenImage}
        contentFit="contain"
        cachePolicy="disk"
      />
    )}
    {isActive && videoLoading && (
      <View style={styles.videoPlayOverlayCenter} pointerEvents="none">
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    )}
  </View>
));

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoControlsBar = React.memo<{
  player: ReturnType<typeof useVideoPlayer>;
  showControls: () => void;
  startAutoHideTimer: () => void;
  clearAutoHideTimer: () => void;
}>(({ player, showControls, startAutoHideTimer, clearAutoHideTimer }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const progressBarWidthRef = useRef(0);
  const isSeekingRef = useRef(false);

  const progress = videoDuration > 0 ? (currentTime / videoDuration) * 100 : 0;

  // Sync initial state in case player is already playing when we mount
  useEffect(() => {
    if (player.playing) setIsPlaying(true);
    if (player.duration > 0) setVideoDuration(player.duration);
  }, [player]);

  // Track time updates
  useEffect(() => {
    const sub = player.addListener('timeUpdate', ({ currentTime: ct }: { currentTime: number }) => {
      if (!isSeekingRef.current) {
        setCurrentTime(ct);
        if (player.duration > 0) {
          setVideoDuration(player.duration);
        }
      }
    });
    return () => sub.remove();
  }, [player]);

  // Track status for autoplay and duration
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      if (status === 'readyToPlay') {
        setVideoDuration(player.duration || 0);
        if (!player.playing) player.play();
        setIsPlaying(true);
        showControls();
        startAutoHideTimer();
      }
    });
    return () => sub.remove();
  }, [player, showControls, startAutoHideTimer]);

  // Handle video end
  useEffect(() => {
    const sub = player.addListener('playToEnd', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      player.currentTime = 0;
      showControls();
      clearAutoHideTimer();
    });
    return () => sub.remove();
  }, [player, showControls, clearAutoHideTimer]);

  const seekToPosition = (locationX: number) => {
    if (progressBarWidthRef.current <= 0 || videoDuration <= 0) return;
    const ratio = Math.max(0, Math.min(1, locationX / progressBarWidthRef.current));
    const seekTime = ratio * videoDuration;
    player.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const handleSeekStart = (e: any) => {
    isSeekingRef.current = true;
    clearAutoHideTimer();
    seekToPosition(e.nativeEvent.locationX);
  };

  const handleSeekMove = (e: any) => {
    seekToPosition(e.nativeEvent.locationX);
  };

  const handleSeekEnd = (e: any) => {
    seekToPosition(e.nativeEvent.locationX);
    isSeekingRef.current = false;
    if (player.playing) {
      startAutoHideTimer();
    }
  };

  const toggleVideoPlayback = () => {
    clearAutoHideTimer();
    if (player.playing) {
      player.pause();
      setIsPlaying(false);
      showControls();
    } else {
      player.play();
      setIsPlaying(true);
      showControls();
      startAutoHideTimer();
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    player.muted = newMuted;
  };

  return (
    <View style={styles.progressRow}>
      <TouchableOpacity
        onPress={toggleVideoPlayback}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.progressTimeText}>{formatTime(currentTime)}</Text>
      <View
        style={styles.progressTrack}
        onLayout={(e) => { progressBarWidthRef.current = e.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleSeekStart}
        onResponderMove={handleSeekMove}
        onResponderRelease={handleSeekEnd}
        onResponderTerminate={handleSeekEnd}
      >
        <View style={styles.progressTrackBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <View
          style={[
            styles.progressThumb,
            { left: `${progress}%`, marginLeft: -6 },
          ]}
        />
      </View>
      <Text style={styles.progressTimeText}>{formatTime(videoDuration)}</Text>
      <TouchableOpacity
        onPress={toggleMute}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
});

// === Main component ===

export const MediaViewer: React.FC<MediaViewerProps> = ({
  visible,
  mediaItems = [],
  initialIndex = 0,
  onClose,
  onForward,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const swipeThreshold = screenWidth * 0.25;
  const imageContainerHeight = screenHeight * 0.8;
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  // Refs
  const autoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webBlobUrlRef = useRef<string | null>(null);
  const webAbortControllerRef = useRef<AbortController | null>(null);

  // Shared values for gallery
  const translateX = useSharedValue(0);
  const baseTranslateX = useSharedValue(0);
  const currentIndexShared = useSharedValue(initialIndex);

  // Shared values for image zoom
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const imageTranslateX = useSharedValue(0);
  const imageTranslateY = useSharedValue(0);
  const savedImageTranslateX = useSharedValue(0);
  const savedImageTranslateY = useSharedValue(0);

  // Swipe down to close
  const swipeDownY = useSharedValue(0);
  const swipeDownOpacity = useSharedValue(1);

  const controlsOpacity = useSharedValue(1);

  // Track whether current slide is video (for worklet access)
  const isCurrentItemVideo = useSharedValue(false);

  // Focal point for zoom
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Video player
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.timeUpdateEventInterval = 0.25;
  });

  // Stable callbacks for child components
  const clearAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  }, []);

  const startAutoHideTimer = useCallback(() => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
    autoHideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      controlsOpacity.value = withTiming(0, { duration: 300 });
    }, 3000);
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });
  }, []);

  // Cleanup web blob URL to avoid memory leaks
  const cleanupWebBlobUrl = () => {
    if (webBlobUrlRef.current) {
      URL.revokeObjectURL(webBlobUrlRef.current);
      webBlobUrlRef.current = null;
    }
  };

  // Load and play video — on web, fetches with auth headers and creates blob URL
  // because HTML5 <video> element cannot send custom headers.
  // Reads session ID directly from storage to avoid race condition with state.
  const loadAndPlayVideo = async (item: MediaItem) => {
    webAbortControllerRef.current?.abort();
    cleanupWebBlobUrl();
    setVideoLoading(true);

    // Read session ID directly from storage (sessionId state may be null on first render)
    const currentSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

    if (Platform.OS === 'web') {
      const isPublicFile = item.url.includes('/files/public/');

      // Electron: check file cache first, background-cache on miss
      if (isElectron()) {
        const cachedUri = await getElectronCachedVideoUri(item.url);
        if (cachedUri) {
          player.replace({ uri: cachedUri });
          player.play();
          return;
        }

        // Cache miss — stream via blob for immediate playback, cache in background
        if (!isPublicFile && currentSessionId) {
          const controller = new AbortController();
          webAbortControllerRef.current = controller;

          try {
            const response = await fetch(item.url, {
              headers: { 'X-Session-ID': currentSessionId },
              signal: controller.signal,
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const blob = await response.blob();
            if (controller.signal.aborted) return;

            const blobUrl = URL.createObjectURL(blob);
            webBlobUrlRef.current = blobUrl;
            player.replace({ uri: blobUrl });
          } catch (error) {
            if ((error as Error).name === 'AbortError') return;
            console.error('[MediaViewer] Electron video load failed:', error);
            setVideoLoading(false);
            return;
          }
        } else {
          player.replace({ uri: item.url });
        }

        // Background cache via main process (streams to disk, no renderer memory)
        cacheElectronVideo(item.url, currentSessionId).catch((err) =>
          console.warn('[MediaViewer] Electron background video cache failed:', err),
        );
      } else if (!isPublicFile && currentSessionId) {
        // Regular web browser (non-Electron)
        const controller = new AbortController();
        webAbortControllerRef.current = controller;

        try {
          const response = await fetch(item.url, {
            headers: { 'X-Session-ID': currentSessionId },
            signal: controller.signal,
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const blob = await response.blob();
          if (controller.signal.aborted) return;

          const blobUrl = URL.createObjectURL(blob);
          webBlobUrlRef.current = blobUrl;
          player.replace({ uri: blobUrl });
        } catch (error) {
          if ((error as Error).name === 'AbortError') return;
          console.error('[MediaViewer] Web video load failed:', error);
          setVideoLoading(false);
          return;
        }
      } else {
        player.replace({ uri: item.url });
      }
    } else {
      // Native: use cache + streaming with headers
      const cachedUri = getCachedVideoUri(item.url);
      if (cachedUri) {
        player.replace({ uri: cachedUri });
      } else {
        if (currentSessionId) {
          cacheVideo(item.url, currentSessionId).catch((err) =>
            console.warn('[MediaViewer] Background video cache failed:', err),
          );
        }
        player.replace({
          uri: item.url,
          headers: currentSessionId ? { 'X-Session-ID': currentSessionId } : undefined,
        });
      }
    }

    player.play();
  };

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  // Memoize image sources to avoid re-fetches on re-render
  const imageSources = useMemo(() => {
    const headers = sessionId ? { 'X-Session-ID': sessionId } : undefined;
    return mediaItems.map(item => ({
      uri: item.url,
      headers,
    }));
  }, [mediaItems, sessionId]);

  // Reset on open
  useEffect(() => {
    if (visible) {
      const newIndex = Math.min(Math.max(initialIndex, 0), mediaItems.length - 1);
      setCurrentIndex(newIndex);
      currentIndexShared.value = newIndex;
      setControlsVisible(true);
      controlsOpacity.value = 1;

      // Reset gallery position
      translateX.value = -newIndex * screenWidth;
      baseTranslateX.value = -newIndex * screenWidth;

      // Reset zoom
      scale.value = 1;
      savedScale.value = 1;
      imageTranslateX.value = 0;
      imageTranslateY.value = 0;
      savedImageTranslateX.value = 0;
      savedImageTranslateY.value = 0;
      swipeDownY.value = 0;
      swipeDownOpacity.value = 1;

      // Video state
      const item = mediaItems[newIndex];
      isCurrentItemVideo.value = item?.type === 'video';
      clearAutoHideTimer();

      if (item?.type === 'video') {
        loadAndPlayVideo(item);
      } else {
        player.pause();
      }
    } else {
      // Cleanup on close
      player.pause();
      player.replace(null);
      setVideoLoading(false);
      clearAutoHideTimer();
      webAbortControllerRef.current?.abort();
      cleanupWebBlobUrl();
    }
  }, [visible, initialIndex, mediaItems.length]);

  // Adjust currentIndex when items are removed (e.g. after deletion)
  useEffect(() => {
    if (!visible || mediaItems.length === 0) return;
    if (currentIndex >= mediaItems.length) {
      const newIndex = mediaItems.length - 1;
      setCurrentIndex(newIndex);
      currentIndexShared.value = newIndex;
      translateX.value = -newIndex * screenWidth;
      baseTranslateX.value = -newIndex * screenWidth;
    }
  }, [mediaItems.length]);

  // Sync gallery position when window dimensions change (desktop resize)
  useEffect(() => {
    if (visible) {
      translateX.value = -currentIndex * screenWidth;
      baseTranslateX.value = -currentIndex * screenWidth;
    }
  }, [screenWidth]);

  // Keyboard handling for web
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
  }, [visible, currentIndex, mediaItems.length]);

  // Track video loading state (playback state moved to VideoControlsBar)
  useEffect(() => {
    const sub = player.addListener('statusChange', ({ status }: { status: string }) => {
      setVideoLoading(status === 'loading');
    });
    return () => sub.remove();
  }, [player]);

  const hasMultipleItems = mediaItems.length > 1;

  // Navigation functions
  const updateIndex = (newIndex: number) => {
    // Pause current video when navigating away
    const prevItem = mediaItems[currentIndex];
    if (prevItem?.type === 'video') {
      player.pause();
    }

    setCurrentIndex(newIndex);
    currentIndexShared.value = newIndex;

    const newItem = mediaItems[newIndex];
    isCurrentItemVideo.value = newItem?.type === 'video';

    // Reset zoom when switching slides
    scale.value = 1;
    savedScale.value = 1;
    imageTranslateX.value = 0;
    imageTranslateY.value = 0;
    savedImageTranslateX.value = 0;
    savedImageTranslateY.value = 0;

    clearAutoHideTimer();

    // Load video if navigating to a video slide
    if (newItem?.type === 'video') {
      loadAndPlayVideo(newItem);
    }
  };

  const goToNext = () => {
    if (currentIndex < mediaItems.length - 1) {
      const newIndex = currentIndex + 1;
      translateX.value = withSpring(-newIndex * screenWidth, { damping: 20, stiffness: 200 });
      baseTranslateX.value = -newIndex * screenWidth;
      updateIndex(newIndex);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      translateX.value = withSpring(-newIndex * screenWidth, { damping: 20, stiffness: 200 });
      baseTranslateX.value = -newIndex * screenWidth;
      updateIndex(newIndex);
    }
  };

  const snapToIndex = (index: number) => {
    'worklet';
    const clampedIndex = clamp(index, 0, mediaItems.length - 1);
    translateX.value = withSpring(-clampedIndex * screenWidth, { damping: 20, stiffness: 200 });
    baseTranslateX.value = -clampedIndex * screenWidth;
    runOnJS(updateIndex)(clampedIndex);
  };

  // Toggle controls visibility
  const toggleControls = () => {
    const newVisible = !controlsVisible;
    setControlsVisible(newVisible);
    controlsOpacity.value = withTiming(newVisible ? 1 : 0, { duration: 200 });
  };

  const handleClose = () => {
    clearAutoHideTimer();
    player.pause();
    onClose();
  };

  // === GESTURES ===

  // Pinch for zoom (images and videos)
  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      const slideStartX = currentIndexShared.value * screenWidth;
      const focalXOnSlide = event.focalX - slideStartX;

      focalX.value = focalXOnSlide - screenWidth / 2;
      focalY.value = event.focalY - screenHeight / 2;
    })
    .onUpdate((event) => {
      const newScale = clamp(savedScale.value * event.scale, 0.5, 5);
      scale.value = newScale;

      if (newScale > 1) {
        const scaleDiff = newScale / savedScale.value;
        const newX = savedImageTranslateX.value + focalX.value * (1 - scaleDiff);
        const newY = savedImageTranslateY.value + focalY.value * (1 - scaleDiff);

        const maxTranslateX = Math.max(0, (screenWidth * newScale - screenWidth) / 2);
        const maxTranslateY = Math.max(0, (imageContainerHeight * newScale - imageContainerHeight) / 2);

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
        const maxTranslateX = Math.max(0, (screenWidth * 4 - screenWidth) / 2);
        const maxTranslateY = Math.max(0, (imageContainerHeight * 4 - imageContainerHeight) / 2);
        savedImageTranslateX.value = clamp(imageTranslateX.value, -maxTranslateX, maxTranslateX);
        savedImageTranslateY.value = clamp(imageTranslateY.value, -maxTranslateY, maxTranslateY);
      } else {
        savedScale.value = scale.value;
        const maxTranslateX = Math.max(0, (screenWidth * scale.value - screenWidth) / 2);
        const maxTranslateY = Math.max(0, (imageContainerHeight * scale.value - imageContainerHeight) / 2);
        savedImageTranslateX.value = clamp(imageTranslateX.value, -maxTranslateX, maxTranslateX);
        savedImageTranslateY.value = clamp(imageTranslateY.value, -maxTranslateY, maxTranslateY);
      }
    });

  // Clamp translation when zoomed
  const clampTranslation = (translateVal: number, dimension: number, currentScale: number) => {
    'worklet';
    const maxTranslate = Math.max(0, (dimension * currentScale - dimension) / 2);
    return clamp(translateVal, -maxTranslate, maxTranslate);
  };

  // Pan for zoom panning OR gallery swipe
  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((event) => {
      if (scale.value > 1) {
        // Zoomed - pan with constraints
        const newX = savedImageTranslateX.value + event.translationX;
        const newY = savedImageTranslateY.value + event.translationY;

        imageTranslateX.value = clampTranslation(newX, screenWidth, scale.value);
        imageTranslateY.value = clampTranslation(newY, imageContainerHeight, scale.value);
      } else {
        // Not zoomed - gallery swipe or swipe-down-to-close
        const isHorizontal = Math.abs(event.translationX) > Math.abs(event.translationY);

        if (isHorizontal && hasMultipleItems) {
          translateX.value = baseTranslateX.value + event.translationX;
        } else if (event.translationY > 0) {
          swipeDownY.value = event.translationY;
          swipeDownOpacity.value = 1 - (event.translationY / (screenHeight * 0.5));
        }
      }
    })
    .onEnd((event) => {
      if (scale.value > 1) {
        savedImageTranslateX.value = clampTranslation(imageTranslateX.value, screenWidth, scale.value);
        savedImageTranslateY.value = clampTranslation(imageTranslateY.value, imageContainerHeight, scale.value);
      } else {
        const isHorizontal = Math.abs(event.translationX) > Math.abs(event.translationY);

        if (isHorizontal && hasMultipleItems) {
          const velocityTriggered = Math.abs(event.velocityX) > SWIPE_VELOCITY_THRESHOLD;
          const distanceTriggered = Math.abs(event.translationX) > swipeThreshold;

          if (velocityTriggered || distanceTriggered) {
            const direction = event.translationX > 0 ? -1 : 1;
            const newIndex = clamp(currentIndex + direction, 0, mediaItems.length - 1);

            if (newIndex !== currentIndex) {
              snapToIndex(newIndex);
            } else {
              translateX.value = withSpring(baseTranslateX.value, { damping: 20, stiffness: 200 });
            }
          } else {
            translateX.value = withSpring(baseTranslateX.value, { damping: 20, stiffness: 200 });
          }
        } else if (swipeDownY.value > 100) {
          runOnJS(handleClose)();
        } else {
          swipeDownY.value = withSpring(0);
          swipeDownOpacity.value = withTiming(1);
        }
      }
    });

  // Single tap: toggle controls visibility (both images and videos)
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(toggleControls)();
    });

  // Double tap for zoom (images and videos)
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        imageTranslateX.value = withSpring(0);
        imageTranslateY.value = withSpring(0);
        savedImageTranslateX.value = 0;
        savedImageTranslateY.value = 0;
      } else {
        const targetScale = 2.5;

        const slideStartX = currentIndexShared.value * screenWidth;
        const tapXOnSlide = event.x - slideStartX;

        const tapX = tapXOnSlide - screenWidth / 2;
        const tapY = event.y - screenHeight / 2;

        let newTranslateX = -tapX * (targetScale - 1);
        let newTranslateY = -tapY * (targetScale - 1);

        const maxTranslateX = Math.max(0, (screenWidth * targetScale - screenWidth) / 2);
        const maxTranslateY = Math.max(0, (imageContainerHeight * targetScale - imageContainerHeight) / 2);

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

  // Compose gestures
  const composedGesture = Gesture.Simultaneous(
    Gesture.Exclusive(doubleTap, singleTap),
    pinchGesture,
    panGesture
  );

  // === ANIMATED STYLES ===

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

  // === HELPER FUNCTIONS ===

  const downloadFileLocally = async (url: string, isVideo: boolean): Promise<string | null> => {
    // Reuse cached video if available (mobile)
    if (isVideo && Platform.OS !== 'web') {
      const cachedUri = getCachedVideoUri(url);
      if (cachedUri) return cachedUri;
    }

    // Reuse cached video if available (Electron)
    if (isVideo && isElectron()) {
      const cachedUri = await getElectronCachedVideoUri(url);
      if (cachedUri) return cachedUri;
    }

    try {
      const ext = isVideo ? 'mp4' : 'jpg';
      const prefix = isVideo ? 'video' : 'image';
      const filename = `${prefix}_${Date.now()}.${ext}`;
      const file = new ExpoFile(Paths.cache, filename);

      const response = await fetch(url, {
        headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ${prefix}`);
      }

      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      file.write(base64, { encoding: 'base64' });
      return file.uri;
    } catch (error) {
      console.error(`Failed to download file:`, error);
      return null;
    }
  };

  const handleShare = async () => {
    if (isSharing) return;

    const currentItem = mediaItems[currentIndex];
    if (!currentItem) return;

    const isVideo = currentItem.type === 'video';

    setIsSharing(true);
    let localUri: string | null = null;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Ошибка', 'Функция "Поделиться" недоступна на этом устройстве');
        return;
      }

      localUri = await downloadFileLocally(currentItem.url, isVideo);
      if (!localUri) {
        Alert.alert('Ошибка', `Не удалось загрузить ${isVideo ? 'видео' : 'изображение'}`);
        return;
      }

      await Sharing.shareAsync(localUri, {
        mimeType: isVideo ? 'video/mp4' : 'image/jpeg',
        dialogTitle: isVideo ? 'Поделиться видео' : 'Поделиться изображением',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Ошибка', `Не удалось поделиться ${isVideo ? 'видео' : 'изображением'}`);
    } finally {
      setIsSharing(false);
      // Don't delete cached video files — they should persist in cache
      if (localUri && !isVideoCacheUri(localUri) && !isElectronCacheUri(localUri)) {
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
    const currentItem = mediaItems[currentIndex];
    if (currentItem && onForward) {
      onForward(currentItem);
    }
  };

  const handleDelete = () => {
    const currentItem = mediaItems[currentIndex];
    if (currentItem && onDelete) {
      onDelete(currentItem);
    }
  };

  if (!visible || mediaItems.length === 0) {
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

        {/* Media gallery */}
        <GestureDetector gesture={composedGesture}>
          <Animated.View style={[styles.galleryContainer, { height: screenHeight }, galleryStyle]}>
            {mediaItems.map((item, index) => {
              const isNearby = Math.abs(index - currentIndex) <= SLIDE_WINDOW;

              return (
                <View key={`${index}-${item.url}`} style={[styles.imageSlide, { width: screenWidth, height: screenHeight }]}>
                  {isNearby ? (
                    <Animated.View
                      style={[
                        styles.imageContainer,
                        { width: screenWidth, height: imageContainerHeight },
                        imageZoomStyle,
                      ]}
                    >
                      {item.type === 'image' ? (
                        <ImageSlideContent source={imageSources[index]} />
                      ) : (
                        <VideoSlideContent
                          item={item}
                          isActive={index === currentIndex}
                          sessionId={sessionId}
                          player={player}
                          videoLoading={videoLoading}
                        />
                      )}
                    </Animated.View>
                  ) : null}
                </View>
              );
            })}
          </Animated.View>
        </GestureDetector>

        {/* Header with counter */}
        <Animated.View
          style={[styles.header, { paddingTop: 15 + insets.top }, animatedControlsStyle]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {hasMultipleItems && (
              <Text style={styles.counterText}>
                {currentIndex + 1} из {mediaItems.length}
              </Text>
            )}
          </View>
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
        </Animated.View>

        {/* Navigation arrows */}
        {hasMultipleItems && (
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

            {currentIndex < mediaItems.length - 1 && (
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

            {/* Dot indicators */}
            {mediaItems.length <= 10 && (
              <Animated.View style={[styles.dotsContainer, { bottom: 70 + insets.bottom }, animatedControlsStyle]}>
                {mediaItems.map((_, index) => (
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

        {/* Bottom bar */}
        <Animated.View
          style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }, animatedControlsStyle]}
          pointerEvents={controlsVisible ? 'auto' : 'none'}
        >
          {/* Video progress bar (self-contained — manages its own playback state) */}
          {mediaItems[currentIndex]?.type === 'video' && (
            <VideoControlsBar
              key={currentIndex}
              player={player}
              showControls={showControls}
              startAutoHideTimer={startAutoHideTimer}
              clearAutoHideTimer={clearAutoHideTimer}
            />
          )}
          <View style={styles.bottomButtonsRow}>
            {onForward && (
              <TouchableOpacity
                style={styles.bottomButton}
                onPress={handleForward}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-redo-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {onDelete && (
              <TouchableOpacity
                style={[styles.bottomButton, { marginLeft: 'auto' }]}
                onPress={handleDelete}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
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
  },
  imageSlide: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageContainer: {
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
  videoSlideContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPlayOverlayCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayButtonLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 6,
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
    paddingTop: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  bottomButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 8,
  },
  progressTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    fontVariant: ['tabular-nums'] as any,
    minWidth: 36,
    textAlign: 'center' as const,
  },
  progressTrack: {
    flex: 1,
    height: 36,
    justifyContent: 'center' as const,
  },
  progressTrackBar: {
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressFill: {
    height: '100%' as any,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
  },
  progressThumb: {
    position: 'absolute' as const,
    top: '50%' as any,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    marginTop: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
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
