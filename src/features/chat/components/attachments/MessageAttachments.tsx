import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { isImageFile, isVideoFile, formatDuration, formatTime, replaceLocalhostWithIP } from '../../utils/message.utils';
import { MessageStatus } from '../common/MessageStatus';
import { Message } from '../../types/chat.types';
import { getFileIcon, decodeFileName } from '../../utils/file.utils';

interface Attachment {
  id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_type?: string;
  thumbnail_url?: string;
  duration?: number;
  width?: number;
  height?: number;
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  imageUrls?: { [key: number]: string }; // Deprecated, not used anymore
  onImagePress: (imageUrl: string) => void;
  onVideoPress?: (videoUrl: string, thumbnailUrl?: string) => void;
  onLongPress?: () => void;
  isVisible?: boolean; // Флаг видимости для ленивой загрузки
  isMediaOnly?: boolean;
  chatMessage?: Message;
  isOwnMessage?: boolean;
  currentUserId?: number;
  onRetryMessage?: (messageId: number) => void;
}

/**
 * Компонент для отображения вложений сообщения (изображения и файлы)
 */
const MessageAttachmentsComponent: React.FC<MessageAttachmentsProps> = ({
  attachments,
  onImagePress,
  onVideoPress,
  onLongPress,
  isVisible = true,
  isMediaOnly = false,
  chatMessage,
  isOwnMessage,
  currentUserId,
  onRetryMessage,
}) => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const [sessionId, setSessionId] = React.useState<string | null>(null);
  const [blobUrls, setBlobUrls] = React.useState<{ [key: number]: string }>({});

  // Load session ID once
  React.useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  const images = React.useMemo(
    () => attachments.filter(a => isImageFile(a.mime_type || a.file_type || '')),
    [attachments]
  );
  const videos = React.useMemo(
    () => attachments.filter(a => isVideoFile(a.mime_type || a.file_type || '')),
    [attachments]
  );
  const files = React.useMemo(
    () => attachments.filter(a => {
      const mt = a.mime_type || a.file_type || '';
      return !isImageFile(mt) && !isVideoFile(mt);
    }),
    [attachments]
  );
  const imageCount = images.length;

  // Create stable image IDs key for caching
  const imageIds = React.useMemo(
    () => images.map(img => img.id).join(','),
    [images]
  );

  // Load images with auth headers for web platform
  React.useEffect(() => {
    if (Platform.OS !== 'web' || images.length === 0 || !isVisible) {
      return;
    }

    const loadImageBlobs = async () => {
      const newBlobUrls: { [key: number]: string } = {};

      for (const attachment of images) {
        try {
          // Используем thumbnail для превью в списке сообщений
          const thumbnailUrl = attachment.thumbnail_url || attachment.file_url;
          const imageUrl = replaceLocalhostWithIP(thumbnailUrl);

          // Проверяем, является ли файл публичным (не требует авторизации)
          const isPublicFile = imageUrl.includes('/files/public/');

          // Добавляем заголовки авторизации только для защищенных файлов
          const headers: HeadersInit = {};
          if (!isPublicFile && sessionId) {
            headers['X-Session-ID'] = sessionId;
          }

          const response = await fetch(imageUrl, {
            headers,
          });

          if (response.ok) {
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            newBlobUrls[attachment.id] = blobUrl;
          } else {
            console.error('❌ Failed to load image blob:', imageUrl, response.status);
          }
        } catch (error) {
          console.error('❌ Error loading image blob:', error);
        }
      }

      setBlobUrls(newBlobUrls);
    };

    loadImageBlobs();

    // Cleanup blob URLs on unmount
    return () => {
      setBlobUrls(prev => {
        Object.values(prev).forEach(url => URL.revokeObjectURL(url));
        return {};
      });
    };
  }, [imageIds, isVisible, sessionId]);

  // Prepare image URLs with proper baseURL replacement for gallery
  // Для ImageViewer используем оригинальные изображения (file_url), а не thumbnails
  const galleryImageUrls = images.map(img => replaceLocalhostWithIP(img.file_url));

  // Количество скрытых фото (показываем максимум 4)
  const hiddenCount = imageCount > 4 ? imageCount - 4 : 0;

  // Размеры изображений - используем flex для автоматического распределения
  const getImageLayout = () => {
    if (imageCount === 1) {
      return { type: 'single' as const };
    }
    if (imageCount === 2) {
      return { type: 'row' as const };
    }
    if (imageCount === 3) {
      return { type: 'left1-right2' as const };
    }
    return { type: 'grid2x2' as const };
  };

  const imageLayout = getImageLayout();

  const handleFileDownload = async (attachment: Attachment) => {
    try {
      // Replace localhost with real IP
      const fileUrl = replaceLocalhostWithIP(attachment.file_url);

      // Проверяем, является ли файл публичным
      const isPublicFile = fileUrl.includes('/files/public/');

      // Get auth session ID (only needed for protected files)
      const sessionId = !isPublicFile ? await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID) : null;

      if (!isPublicFile && !sessionId) {
        showError('Необходима авторизация для скачивания файла');
        return;
      }

      if (Platform.OS === 'web') {
        // Web: Download using blob
        const headers: HeadersInit = {};
        if (!isPublicFile && sessionId) {
          headers['X-Session-ID'] = sessionId;
        }

        const response = await fetch(fileUrl, {
          headers,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Server response:', response.status, errorText);
          throw new Error(`Failed to download file: ${response.status} - ${errorText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.file_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Mobile: Download and open with file viewer
        // Decode filename and create safe filename for iOS
        const originalFileName = decodeURIComponent(attachment.file_name);

        // Extract file extension
        const fileExtension = originalFileName.split('.').pop() || '';

        // Create safe filename using timestamp and original extension
        const safeFileName = `file_${Date.now()}.${fileExtension}`;

        // Use cache directory which is more reliable for temporary downloads
        const fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;

        // Prepare headers for mobile download
        const downloadHeaders: { [key: string]: string } = {};
        if (!isPublicFile && sessionId) {
          downloadHeaders['X-Session-ID'] = sessionId;
        }

        const downloadResult = await FileSystem.downloadAsync(
          fileUrl,
          fileUri,
          {
            headers: downloadHeaders,
          }
        );

        if (downloadResult.status !== 200) {
          throw new Error(`Download failed with status: ${downloadResult.status}`);
        }

        // Open file with native viewer
        try {
          await FileViewer.open(downloadResult.uri, {
            displayName: originalFileName,
            showOpenWithDialog: true,
            showAppsSuggestions: true,
          });
        } catch (viewerError: any) {
          // If FileViewer fails, fallback to sharing
          const isAvailable = await Sharing.isAvailableAsync();

          if (isAvailable) {
            await Sharing.shareAsync(downloadResult.uri, {
              UTI: attachment.mime_type,
              mimeType: attachment.mime_type,
            });
          } else {
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to download file:', error);
      showError('Не удалось скачать файл');
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  // Показываем время на последнем изображении (если нет видео)
  const showImageTimeOverlay = isMediaOnly && !!chatMessage && videos.length === 0;

  // Рендер одного изображения
  const renderImage = (attachment: Attachment, index: number, imageStyle?: object, showOverlay: boolean = false, showTimeOverlay: boolean = false) => {
    // Используем thumbnail для превью, оригинал для просмотра
    const thumbnailUri = attachment.thumbnail_url || attachment.file_url;
    const imageUri = Platform.OS === 'web' && blobUrls[attachment.id]
      ? blobUrls[attachment.id]
      : replaceLocalhostWithIP(thumbnailUri);

    // Проверяем, является ли файл публичным (не требует авторизации)
    const isPublicFile = imageUri.includes('/files/public/');

    return (
      <TouchableOpacity
        key={attachment.id || index}
        style={[styles.imageAttachment, imageStyle]}
        onPress={() => {
          onImagePress(Platform.OS === 'web' && blobUrls[attachment.id] ? blobUrls[attachment.id] : galleryImageUrls[index]);
        }}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <Image
          source={Platform.OS === 'web' && blobUrls[attachment.id]
            ? { uri: blobUrls[attachment.id] }
            : {
                uri: imageUri,
                // Не передаем заголовки для публичных файлов
                headers: (!isPublicFile && sessionId) ? { 'X-Session-ID': sessionId } : undefined,
              }
          }
          style={styles.imagePreview}
          contentFit="cover"
          contentPosition="center"
          transition={200}
          cachePolicy="disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
          priority={isVisible ? "high" : "low"}
          recyclingKey={`attachment-${attachment.id}`}
          responsivePolicy="initial"
          allowDownscaling={true}
          onError={(error) => {
            console.error('❌ Message image load error:', imageUri, error);
          }}
        />
        {showOverlay && hiddenCount > 0 && (
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>+{hiddenCount}</Text>
          </View>
        )}
        {/* Time + status overlay for media-only messages */}
        {showTimeOverlay && chatMessage && (
          <View style={styles.videoTimeOverlay}>
            {!!(chatMessage.is_edited && !chatMessage.is_deleted) && (
              <Text style={styles.videoTimeText}>изм.</Text>
            )}
            <Text style={styles.videoTimeText}>
              {formatTime(chatMessage.created_at)}
            </Text>
            <MessageStatus
              message={chatMessage}
              isOwnMessage={isOwnMessage || false}
              currentUserId={currentUserId}
              onRetry={onRetryMessage}
              compact
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Рендер одного видео-превью
  const renderVideoThumbnail = (attachment: Attachment, index: number) => {
    const thumbnailUri = attachment.thumbnail_url || attachment.file_url;
    const imageUri = Platform.OS === 'web' && blobUrls[attachment.id]
      ? blobUrls[attachment.id]
      : replaceLocalhostWithIP(thumbnailUri);
    const isPublicFile = imageUri.includes('/files/public/');

    return (
      <TouchableOpacity
        key={`video-${attachment.id || index}`}
        style={[styles.imageAttachment, (() => {
          const aspectRatio = (attachment.width && attachment.height)
            ? Math.max(9 / 16, Math.min(2, attachment.width / attachment.height))
            : 16 / 9;
          // Portrait videos: limit width so they don't get too tall
          const isPortrait = aspectRatio < 1;
          return {
            width: isPortrait ? '65%' as const : '100%' as const,
            aspectRatio,
          };
        })()]}
        onPress={() => {
          onVideoPress?.(
            replaceLocalhostWithIP(attachment.file_url),
            attachment.thumbnail_url ? replaceLocalhostWithIP(attachment.thumbnail_url) : undefined
          );
        }}
        onLongPress={onLongPress}
        delayLongPress={500}
      >
        <Image
          source={Platform.OS === 'web' && blobUrls[attachment.id]
            ? { uri: blobUrls[attachment.id] }
            : {
                uri: imageUri,
                headers: (!isPublicFile && sessionId) ? { 'X-Session-ID': sessionId } : undefined,
              }
          }
          style={styles.imagePreview}
          contentFit="cover"
          contentPosition="center"
          transition={200}
          cachePolicy="disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
          priority={isVisible ? "high" : "low"}
          recyclingKey={`video-thumb-${attachment.id}`}
        />
        {/* Play button overlay */}
        <View style={styles.videoPlayOverlay}>
          <View style={styles.videoPlayButton}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </View>
        </View>
        {/* Duration badge - top left */}
        {attachment.duration != null && attachment.duration > 0 && (
          <View style={styles.videoDurationBadge}>
            <Text style={styles.videoDurationText}>
              {formatDuration(attachment.duration)}
            </Text>
          </View>
        )}
        {/* Time + status overlay for video-only messages - bottom right */}
        {isMediaOnly && chatMessage && (
          <View style={styles.videoTimeOverlay}>
            {!!(chatMessage.is_edited && !chatMessage.is_deleted) && (
              <Text style={styles.videoTimeText}>изм.</Text>
            )}
            <Text style={styles.videoTimeText}>
              {formatTime(chatMessage.created_at)}
            </Text>
            <MessageStatus
              message={chatMessage}
              isOwnMessage={isOwnMessage || false}
              currentUserId={currentUserId}
              onRetry={onRetryMessage}
              compact
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Рендер сетки изображений в зависимости от количества
  const renderImagesGrid = () => {
    if (imageCount === 0) return null;

    // 1 фото
    if (imageLayout.type === 'single') {
      return (
        <View style={styles.imagesGrid}>
          {renderImage(images[0], 0, styles.imageSingle, false, showImageTimeOverlay)}
        </View>
      );
    }

    // 2 фото - рядом
    if (imageLayout.type === 'row') {
      return (
        <View style={[styles.imagesGrid, styles.imagesRow]}>
          {renderImage(images[0], 0, styles.imageHalf)}
          {renderImage(images[1], 1, styles.imageHalf, false, showImageTimeOverlay)}
        </View>
      );
    }

    // 3 фото - 1 слева, 2 справа (столбец)
    if (imageLayout.type === 'left1-right2') {
      return (
        <View style={[styles.imagesGrid, styles.imagesRow]}>
          {renderImage(images[0], 0, styles.imageHalf)}
          <View style={[styles.imagesColumn, styles.imageHalf]}>
            {renderImage(images[1], 1, styles.imageSmall)}
            {renderImage(images[2], 2, styles.imageSmall, false, showImageTimeOverlay)}
          </View>
        </View>
      );
    }

    // 4+ фото - сетка 2x2
    if (imageLayout.type === 'grid2x2') {
      return (
        <View style={styles.imagesGrid}>
          <View style={styles.imagesRow}>
            {renderImage(images[0], 0, styles.imageHalf)}
            {renderImage(images[1], 1, styles.imageHalf)}
          </View>
          <View style={styles.imagesRow}>
            {renderImage(images[2], 2, styles.imageHalf)}
            {renderImage(images[3], 3, styles.imageHalf, true, showImageTimeOverlay)}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={[styles.attachmentsContainer, isMediaOnly && { marginTop: 0 }]}>
      {/* Render images in grid */}
      {renderImagesGrid()}

      {/* Render video thumbnails */}
      {videos.map((attachment, index) => renderVideoThumbnail(attachment, index))}

      {/* Render file attachments */}
      {files.map((attachment, index) => {
        const fileIcon = getFileIcon(attachment.mime_type || attachment.file_type || '', attachment.file_name);
        const decodedFileName = decodeFileName(attachment.file_name);

        // Debug logging for iOS
        if (Platform.OS === 'ios') {
          console.log(`📄 [iOS] File attachment #${index}:`, {
            id: attachment.id,
            raw_file_name: attachment.file_name,
            decoded_file_name: decodedFileName,
            file_size: attachment.file_size,
            mime_type: attachment.mime_type,
            has_file_name: !!attachment.file_name,
            file_name_length: attachment.file_name?.length || 0,
          });
        }

        return (
          <TouchableOpacity
            key={attachment.id || index}
            style={[styles.attachmentItem, { width: '100%' }]}
            onPress={() => handleFileDownload(attachment)}
            onLongPress={onLongPress}
            delayLongPress={500}
          >
            <Ionicons name={fileIcon as any} size={24} color={theme.primary} />
            <View style={styles.fileInfo}>
              <Text
                style={[
                  styles.fileName,
                  { color: theme.text },
                  Platform.OS === 'ios' && { color: theme.text, opacity: 1 }
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
                allowFontScaling={false}
              >
                {decodedFileName || 'Файл без имени'}
              </Text>
              <Text
                style={[
                  styles.fileSize,
                  { color: theme.textSecondary },
                  Platform.OS === 'ios' && { color: theme.textSecondary, opacity: 1 }
                ]}
                allowFontScaling={false}
              >
                {(attachment.file_size / 1024).toFixed(2)} KB
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  attachmentsContainer: {
    marginTop: 8,
    gap: 6,
  },
  imagesGrid: {
    gap: 4,
    marginBottom: 6,
  },
  imagesRow: {
    flexDirection: 'row',
    gap: 4,
  },
  imagesColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  // ✅ ИСПРАВЛЕНО: Фиксированные размеры с aspectRatio для предотвращения layout shift
  imageSingle: {
    width: 180,
    aspectRatio: 1, // 1:1 квадрат
  },
  imageHalf: {
    width: 90,
    aspectRatio: 1, // 1:1 квадрат
  },
  imageSmall: {
    width: 90,
    aspectRatio: 2, // 2:1 прямоугольник (90x45)
  },
  videoSingle: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  fileInfo: {
    flex: 1,
    minWidth: 0, // Fix for text overflow on iOS
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false, // Android specific
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
    includeFontPadding: false, // Android specific
  },
  imageAttachment: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 3,
  },
  videoDurationBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoDurationText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  videoTimeOverlay: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  videoTimeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});

// Мемоизация компонента для предотвращения лишних ре-рендеров
export const MessageAttachments = React.memo(MessageAttachmentsComponent, (prevProps, nextProps) => {
  // Сравниваем флаг видимости
  if (prevProps.isVisible !== nextProps.isVisible) {
    return false;
  }

  // Сравниваем массивы вложений
  if (prevProps.attachments.length !== nextProps.attachments.length) {
    return false;
  }

  // Глубокое сравнение вложений по ID
  const prevIds = prevProps.attachments.map(a => a.id).join(',');
  const nextIds = nextProps.attachments.map(a => a.id).join(',');

  if (prevIds !== nextIds) {
    return false;
  }

  // Сравниваем функции (обычно это стабильные ссылки)
  if (prevProps.onImagePress !== nextProps.onImagePress ||
      prevProps.onVideoPress !== nextProps.onVideoPress ||
      prevProps.onLongPress !== nextProps.onLongPress) {
    return false;
  }

  // Сравниваем video overlay пропсы
  if (prevProps.isMediaOnly !== nextProps.isMediaOnly) {
    return false;
  }
  if (prevProps.chatMessage?.id !== nextProps.chatMessage?.id ||
      prevProps.chatMessage?.is_edited !== nextProps.chatMessage?.is_edited ||
      prevProps.chatMessage?.is_deleted !== nextProps.chatMessage?.is_deleted) {
    return false;
  }
  if (prevProps.isOwnMessage !== nextProps.isOwnMessage) {
    return false;
  }
  // Сравниваем статусы доставки для video overlay
  const prevReadBy = prevProps.chatMessage?.read_by || [];
  const nextReadBy = nextProps.chatMessage?.read_by || [];
  if (prevReadBy.length !== nextReadBy.length) return false;
  const prevDelivered = prevProps.chatMessage?.delivered_to || [];
  const nextDelivered = nextProps.chatMessage?.delivered_to || [];
  if (prevDelivered.length !== nextDelivered.length) return false;

  // Все проверки пройдены - не нужно обновлять
  return true;
});
