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
import { isImageFile, replaceLocalhostWithIP } from '../../utils/message.utils';
import { getFileIcon, decodeFileName } from '../../utils/file.utils';

interface Attachment {
  id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_type?: string;
  thumbnail_url?: string;
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  imageUrls?: { [key: number]: string }; // Deprecated, not used anymore
  onImagePress: (imageUrl: string) => void;
  onLongPress?: () => void;
  isVisible?: boolean; // Флаг видимости для ленивой загрузки
}

/**
 * Компонент для отображения вложений сообщения (изображения и файлы)
 */
const MessageAttachmentsComponent: React.FC<MessageAttachmentsProps> = ({
  attachments,
  onImagePress,
  onLongPress,
  isVisible = true,
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
  const files = React.useMemo(
    () => attachments.filter(a => !isImageFile(a.mime_type || a.file_type || '')),
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
    if (Platform.OS !== 'web' || !sessionId || images.length === 0 || !isVisible) {
      return;
    }

    const loadImageBlobs = async () => {
      const newBlobUrls: { [key: number]: string } = {};

      for (const attachment of images) {
        try {
          // Используем thumbnail для превью в списке сообщений
          const thumbnailUrl = attachment.thumbnail_url || attachment.file_url;
          const imageUrl = replaceLocalhostWithIP(thumbnailUrl);
          const response = await fetch(imageUrl, {
            headers: {
              'X-Session-ID': sessionId,
            },
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
  }, [Platform.OS, sessionId, imageIds, isVisible]);

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
      // Get auth session ID
      const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      if (!sessionId) {
        showError('Необходима авторизация для скачивания файла');
        return;
      }

      // Replace localhost with real IP
      const fileUrl = replaceLocalhostWithIP(attachment.file_url);

      if (Platform.OS === 'web') {
        // Web: Download using blob
        const response = await fetch(fileUrl, {
          headers: {
            'X-Session-ID': sessionId,
          },
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

        const downloadResult = await FileSystem.downloadAsync(
          fileUrl,
          fileUri,
          {
            headers: {
              'X-Session-ID': sessionId,
            },
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

  // Рендер одного изображения
  const renderImage = (attachment: Attachment, index: number, imageStyle?: object, showOverlay: boolean = false) => {
    // Используем thumbnail для превью, оригинал для просмотра
    const thumbnailUri = attachment.thumbnail_url || attachment.file_url;
    const imageUri = Platform.OS === 'web' && blobUrls[attachment.id]
      ? blobUrls[attachment.id]
      : replaceLocalhostWithIP(thumbnailUri);

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
        {Platform.OS === 'web' && blobUrls[attachment.id] ? (
          <Image
            source={{ uri: blobUrls[attachment.id] }}
            style={styles.imagePreview}
            contentFit="cover"
            contentPosition="center"
            transition={0}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
            recyclingKey={`attachment-${attachment.id}`}
            responsivePolicy="initial"
            allowDownscaling={true}
            decodeFormat="rgb565"
          />
        ) : Platform.OS === 'web' && !blobUrls[attachment.id] ? (
          <View style={[styles.imagePreview, { backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={theme.primary} />
          </View>
        ) : (
          <Image
            source={{
              uri: imageUri,
              headers: sessionId ? { 'X-Session-ID': sessionId } : undefined,
            }}
            style={styles.imagePreview}
            contentFit="cover"
            contentPosition="center"
            transition={0}
            cachePolicy="memory-disk"
            placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            placeholderContentFit="cover"
            priority={isVisible ? "high" : "low"}
            recyclingKey={`attachment-${attachment.id}`}
            responsivePolicy="initial"
            allowDownscaling={true}
            decodeFormat="rgb565"
            onError={(error) => {
              console.error('❌ Message image load error:', imageUri, error);
            }}
          />
        )}
        {showOverlay && hiddenCount > 0 && (
          <View style={styles.imageOverlay}>
            <Text style={styles.imageOverlayText}>+{hiddenCount}</Text>
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
          {renderImage(images[0], 0, styles.imageSingle)}
        </View>
      );
    }

    // 2 фото - рядом
    if (imageLayout.type === 'row') {
      return (
        <View style={[styles.imagesGrid, styles.imagesRow]}>
          {renderImage(images[0], 0, styles.imageHalf)}
          {renderImage(images[1], 1, styles.imageHalf)}
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
            {renderImage(images[2], 2, styles.imageSmall)}
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
            {renderImage(images[3], 3, styles.imageHalf, true)}
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.attachmentsContainer}>
      {/* Render images in grid */}
      {renderImagesGrid()}

      {/* Render file attachments */}
      {files.map((attachment, index) => {
        const fileIcon = getFileIcon(attachment.mime_type || attachment.file_type || '', attachment.file_name);

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
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: theme.text,
                }}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {decodeFileName(attachment.file_name)}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
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
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  fileInfo: {
    flex: 1,
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
      prevProps.onLongPress !== nextProps.onLongPress) {
    return false;
  }

  // Все проверки пройдены - не нужно обновлять
  return true;
});
