import React, { useEffect, useState } from 'react';
import { Modal, View, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import * as Sharing from 'expo-sharing';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

interface VideoPlayerProps {
  visible: boolean;
  videoUrl: string;
  thumbnailUrl?: string;
  onClose: () => void;
  onForward?: () => void;
}

/**
 * Полноэкранный видеоплеер (по образцу ImageViewer)
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  visible,
  videoUrl,
  thumbnailUrl,
  onClose,
  onForward,
}) => {
  const insets = useSafeAreaInsets();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (visible && player) {
      player.play();
    } else if (!visible && player) {
      player.pause();
      player.currentTime = 0;
    }
  }, [visible, player]);

  const downloadVideoLocally = async (): Promise<string | null> => {
    try {
      const filename = `video_${Date.now()}.mp4`;
      const file = new ExpoFile(Paths.cache, filename);

      const response = await fetch(videoUrl, {
        headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch video');
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
      console.error('Failed to download video:', error);
      return null;
    }
  };

  const handleShare = async () => {
    if (isSharing) return;

    setIsSharing(true);
    let localUri: string | null = null;
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Ошибка', 'Функция "Поделиться" недоступна на этом устройстве');
        return;
      }

      localUri = await downloadVideoLocally();
      if (!localUri) {
        Alert.alert('Ошибка', 'Не удалось загрузить видео');
        return;
      }

      await Sharing.shareAsync(localUri, {
        mimeType: 'video/mp4',
        dialogTitle: 'Поделиться видео',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Ошибка', 'Не удалось поделиться видео');
    } finally {
      setIsSharing(false);
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

    setIsSharing(true);
    let localUri: string | null = null;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Необходимо разрешение для сохранения в галерею');
        return;
      }

      localUri = await downloadVideoLocally();
      if (!localUri) {
        Alert.alert('Ошибка', 'Не удалось загрузить видео');
        return;
      }

      await MediaLibrary.saveToLibraryAsync(localUri);
      Alert.alert('Успешно', 'Видео сохранено в галерею');
    } catch (error) {
      console.error('Save to gallery error:', error);
      Alert.alert('Ошибка', 'Не удалось сохранить видео');
    } finally {
      setIsSharing(false);
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <BlurView intensity={95} style={StyleSheet.absoluteFillObject} tint="dark" />

        {/* Video player */}
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          allowsFullscreen
          allowsPictureInPicture={Platform.OS === 'ios'}
          nativeControls
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: 15 + insets.top }]}>
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
          <View style={styles.headerContent} />
          <TouchableOpacity
            style={styles.headerButton}
            onPress={onClose}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: 16 + insets.bottom }]}>
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
              onPress={onForward}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-redo-outline" size={24} color="#FFFFFF" />
              <Text style={styles.bottomButtonText}>Переслать</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '70%',
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
