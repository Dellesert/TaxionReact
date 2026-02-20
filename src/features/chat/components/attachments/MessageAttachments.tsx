import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle } from 'react-native-svg';
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
import { getThumbnailUrl } from '../../utils/thumbnail.utils';

interface Attachment {
  id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_type?: string;
  thumbnail_url?: string;
  thumbnail_small_url?: string;
  thumbnail_medium_url?: string;
  thumbnail_large_url?: string;
  duration?: number;
  width?: number;
  height?: number;
  local_uri?: string; // Local URI for optimistic video uploads
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
  onCancelUpload?: (messageId: number, attachmentIndex: number) => void;
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
  onCancelUpload,
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

  // Unified media array (images + videos) preserving original order
  const media = React.useMemo(
    () => attachments.filter(a => {
      const mt = a.mime_type || a.file_type || '';
      return isImageFile(mt) || isVideoFile(mt);
    }),
    [attachments]
  );
  const files = React.useMemo(
    () => attachments.filter(a => {
      const mt = a.mime_type || a.file_type || '';
      return !isImageFile(mt) && !isVideoFile(mt);
    }),
    [attachments]
  );
  const mediaCount = media.length;

  // Create stable media IDs key for caching
  const mediaIds = React.useMemo(
    () => media.map(m => m.id).join(','),
    [media]
  );

  // Load images with auth headers for web platform
  React.useEffect(() => {
    if (Platform.OS !== 'web' || media.length === 0 || !isVisible) {
      return;
    }

    const loadImageBlobs = async () => {
      const newBlobUrls: { [key: number]: string } = {};

      for (const attachment of media) {
        try {
          // Skip videos without thumbnails to avoid loading the full video file
          const mt = attachment.mime_type || attachment.file_type || '';
          if (isVideoFile(mt) && !attachment.thumbnail_url) continue;
          // Используем thumbnail подходящего размера для превью
          const thumbnailUrl = getThumbnailUrl(attachment, mediaCount === 1 ? 'large' : 'medium');
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
  }, [mediaIds, isVisible, sessionId]);

  // Количество скрытых медиа (показываем максимум 4)
  const hiddenCount = mediaCount > 4 ? mediaCount - 4 : 0;

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

  // Рендер одного медиа-элемента (фото или видео) в сетке
  const renderMediaItem = (attachment: Attachment, gridIndex: number, imageStyle?: object, showOverlay: boolean = false, showTimeOverlay: boolean = false) => {
    const mt = attachment.mime_type || attachment.file_type || '';
    const isVideo = isVideoFile(mt);
    const isLocal = !!attachment.local_uri;
    const thumbnailUri = isLocal
      ? attachment.local_uri!
      : getThumbnailUrl(attachment, mediaCount === 1 ? 'large' : 'medium');
    const imageUri = isLocal
      ? thumbnailUri
      : (Platform.OS === 'web' && blobUrls[attachment.id]
        ? blobUrls[attachment.id]
        : replaceLocalhostWithIP(thumbnailUri));
    const isPublicFile = !isLocal && imageUri.includes('/files/public/');

    return (
      <TouchableOpacity
        key={attachment.id || gridIndex}
        style={[styles.imageAttachment, imageStyle]}
        onPress={() => {
          if (isUploading) return;
          if (isVideo) {
            onVideoPress?.(
              replaceLocalhostWithIP(attachment.file_url),
              attachment.thumbnail_url ? replaceLocalhostWithIP(attachment.thumbnail_url) : undefined
            );
          } else {
            onImagePress(replaceLocalhostWithIP(attachment.file_url));
          }
        }}
        onLongPress={onLongPress}
        delayLongPress={500}
        disabled={isUploading}
      >
        <Image
          source={isLocal
            ? { uri: imageUri }
            : (Platform.OS === 'web' && blobUrls[attachment.id]
              ? { uri: blobUrls[attachment.id] }
              : {
                  uri: imageUri,
                  headers: (!isPublicFile && sessionId) ? { 'X-Session-ID': sessionId } : undefined,
                }
            )
          }
          style={styles.imagePreview}
          contentFit="cover"
          contentPosition="center"
          transition={200}
          cachePolicy={isLocal ? "none" : "disk"}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
          priority={isVisible ? "high" : "low"}
          recyclingKey={isLocal ? `media-local-${gridIndex}` : `attachment-${attachment.id}`}
          responsivePolicy="initial"
          allowDownscaling={true}
        />
        {/* Upload progress overlay */}
        {isUploading && chatMessage?.upload_progress != null && (
          renderUploadProgressOverlay(chatMessage.upload_progress, gridIndex)
        )}
        {/* Video play button overlay (only when not uploading) */}
        {isVideo && !isUploading && (
          <View style={styles.videoPlayOverlay}>
            <View style={styles.videoPlayButton}>
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </View>
          </View>
        )}
        {/* Video duration badge */}
        {isVideo && attachment.duration != null && attachment.duration > 0 && (
          <View style={styles.videoDurationBadge}>
            <Text style={styles.videoDurationText}>
              {formatDuration(attachment.duration)}
            </Text>
          </View>
        )}
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

  // Проверяем, загружается ли видео (оптимистичное сообщение с прогрессом)
  const isUploading = chatMessage?.upload_progress != null && chatMessage.upload_progress < 100 && chatMessage.sending;

  // Рендер кругового прогресса загрузки видео с кнопкой отмены
  const renderUploadProgressOverlay = (progress: number, attachmentIndex: number) => {
    const size = 56;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * Math.round(progress)) / 100;

    return (
      <View style={styles.videoUploadOverlay}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => chatMessage && onCancelUpload?.(chatMessage.id, attachmentIndex)}
          style={styles.uploadCancelButton}
        >
          <Svg width={size} height={size}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#FFFFFF"
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
          <Ionicons name="close" size={20} color="#FFFFFF" style={styles.uploadCancelIcon} />
        </TouchableOpacity>
      </View>
    );
  };

  // Рендер одного видео-превью
  const renderVideoThumbnail = (attachment: Attachment, index: number) => {
    // Для оптимистичных сообщений используем локальный URI
    const isLocalVideo = !!attachment.local_uri;
    const thumbnailUri = isLocalVideo
      ? attachment.local_uri!
      : getThumbnailUrl(attachment, 'large');
    const imageUri = isLocalVideo
      ? thumbnailUri
      : (Platform.OS === 'web' && blobUrls[attachment.id]
        ? blobUrls[attachment.id]
        : replaceLocalhostWithIP(thumbnailUri));
    const isPublicFile = !isLocalVideo && imageUri.includes('/files/public/');

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
            ...(isPortrait && { alignSelf: isOwnMessage ? 'flex-end' as const : 'flex-start' as const }),
          };
        })()]}
        onPress={() => {
          // Не открываем видео если оно ещё загружается
          if (!isUploading) {
            onVideoPress?.(
              replaceLocalhostWithIP(attachment.file_url),
              attachment.thumbnail_url ? replaceLocalhostWithIP(attachment.thumbnail_url) : undefined
            );
          }
        }}
        onLongPress={onLongPress}
        delayLongPress={500}
        disabled={isUploading}
      >
        <Image
          source={isLocalVideo
            ? { uri: imageUri }
            : (Platform.OS === 'web' && blobUrls[attachment.id]
              ? { uri: blobUrls[attachment.id] }
              : {
                  uri: imageUri,
                  headers: (!isPublicFile && sessionId) ? { 'X-Session-ID': sessionId } : undefined,
                }
            )
          }
          style={styles.imagePreview}
          contentFit="cover"
          contentPosition="center"
          transition={200}
          cachePolicy={isLocalVideo ? "none" : "disk"}
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
          placeholderContentFit="cover"
          priority={isVisible ? "high" : "low"}
          recyclingKey={isLocalVideo ? `video-local-${index}` : `video-thumb-${attachment.id}`}
        />
        {/* Upload progress overlay OR play button */}
        {isUploading && chatMessage?.upload_progress != null ? (
          renderUploadProgressOverlay(chatMessage.upload_progress, index)
        ) : (
          <View style={styles.videoPlayOverlay}>
            <View style={styles.videoPlayButton}>
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </View>
          </View>
        )}
        {/* Duration badge - top left */}
        {attachment.duration != null && attachment.duration > 0 && (
          <View style={styles.videoDurationBadge}>
            <Text style={styles.videoDurationText}>
              {formatDuration(attachment.duration)}
            </Text>
          </View>
        )}
        {/* Time + status overlay for video-only messages - bottom right */}
        {isMediaOnly && chatMessage && !isUploading && (
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

  // Рендер сетки медиа (фото + видео) в зависимости от количества
  const renderMediaGrid = () => {
    if (mediaCount === 0) return null;

    const showTimeOverlay = isMediaOnly && !!chatMessage;

    // 1 медиа
    if (mediaCount === 1) {
      const mt = media[0].mime_type || media[0].file_type || '';
      if (isVideoFile(mt)) {
        // Одиночное видео — показываем с оригинальным соотношением сторон
        return renderVideoThumbnail(media[0], 0);
      }
      // Одиночное фото — используем реальное соотношение сторон
      const w = media[0].width;
      const h = media[0].height;
      const aspectRatio = (w && h)
        ? Math.max(0.6, Math.min(1.5, w / h))
        : 1;
      return (
        <View style={styles.imagesGrid}>
          {renderMediaItem(media[0], 0, { width: '100%', aspectRatio }, false, showTimeOverlay)}
        </View>
      );
    }

    // 2 медиа — рядом
    if (mediaCount === 2) {
      return (
        <View style={[styles.imagesGrid, styles.imagesRow]}>
          {renderMediaItem(media[0], 0, styles.imageHalf)}
          {renderMediaItem(media[1], 1, styles.imageHalf, false, showTimeOverlay)}
        </View>
      );
    }

    // 3 медиа — 1 слева, 2 справа (столбец)
    if (mediaCount === 3) {
      return (
        <View style={[styles.imagesGrid, styles.imagesRow]}>
          {renderMediaItem(media[0], 0, styles.imageHalf)}
          <View style={[styles.imagesColumn, styles.imageHalf]}>
            {renderMediaItem(media[1], 1, styles.imageSmall)}
            {renderMediaItem(media[2], 2, styles.imageSmall, false, showTimeOverlay)}
          </View>
        </View>
      );
    }

    // 4+ медиа — сетка 2x2
    return (
      <View style={styles.imagesGrid}>
        <View style={styles.imagesRow}>
          {renderMediaItem(media[0], 0, styles.imageHalf)}
          {renderMediaItem(media[1], 1, styles.imageHalf)}
        </View>
        <View style={styles.imagesRow}>
          {renderMediaItem(media[2], 2, styles.imageHalf)}
          {renderMediaItem(media[3], 3, styles.imageHalf, true, showTimeOverlay)}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.attachmentsContainer, isMediaOnly && { marginTop: 0 }]}>
      {/* Render media grid (photos + videos) */}
      {renderMediaGrid()}

      {/* Render file attachments */}
      {files.map((attachment, index) => {
        const fileIcon = getFileIcon(attachment.mime_type || attachment.file_type || '', attachment.file_name);
        const decodedFileName = decodeFileName(attachment.file_name);

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
                {attachment.file_size < 1024 * 1024
                  ? `${(attachment.file_size / 1024).toFixed(1)} KB`
                  : `${(attachment.file_size / (1024 * 1024)).toFixed(1)} MB`}
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
  imageSingle: {
    width: '100%',
    aspectRatio: 1,
  },
  imageHalf: {
    flex: 1,
    aspectRatio: 1,
  },
  imageSmall: {
    flex: 1,
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
  videoUploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  uploadProgressText: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  uploadCancelButton: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCancelIcon: {
    position: 'absolute',
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
      prevProps.onLongPress !== nextProps.onLongPress ||
      prevProps.onCancelUpload !== nextProps.onCancelUpload) {
    return false;
  }

  // Сравниваем video overlay пропсы
  if (prevProps.isMediaOnly !== nextProps.isMediaOnly) {
    return false;
  }
  if (prevProps.chatMessage?.id !== nextProps.chatMessage?.id ||
      prevProps.chatMessage?.is_edited !== nextProps.chatMessage?.is_edited ||
      prevProps.chatMessage?.is_deleted !== nextProps.chatMessage?.is_deleted ||
      prevProps.chatMessage?.upload_progress !== nextProps.chatMessage?.upload_progress ||
      prevProps.chatMessage?.sending !== nextProps.chatMessage?.sending) {
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
