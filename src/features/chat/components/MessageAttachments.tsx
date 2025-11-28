import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { isImageFile, replaceLocalhostWithIP } from '../utils/message.utils';
import { getFileIcon, decodeFileName } from '../utils/file.utils';

interface Attachment {
  id: number;
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  file_type?: string;
}

interface MessageAttachmentsProps {
  attachments: Attachment[];
  imageUrls: { [key: number]: string };
  onImagePress: (imageUrl: string) => void;
  onLongPress?: () => void;
}

/**
 * Компонент для отображения вложений сообщения (изображения и файлы)
 */
export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  attachments,
  imageUrls,
  onImagePress,
  onLongPress,
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

  const images = attachments.filter(a => isImageFile(a.mime_type || a.file_type || ''));
  const files = attachments.filter(a => !isImageFile(a.mime_type || a.file_type || ''));
  const imageCount = images.length;

  // Load images with auth headers for web platform
  React.useEffect(() => {
    if (Platform.OS === 'web' && sessionId && images.length > 0) {
      const loadImageBlobs = async () => {
        const newBlobUrls: { [key: number]: string } = {};

        for (const attachment of images) {
          try {
            const imageUrl = replaceLocalhostWithIP(attachment.file_url);
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
        Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url));
      };
    }
  }, [Platform.OS, sessionId, images.length, attachments]);

  // Prepare image URLs with proper baseURL replacement for gallery
  const galleryImageUrls = images.map(img => replaceLocalhostWithIP(img.file_url));

  // Determine image size based on count
  const screenWidth = Dimensions.get('window').width;
  const maxBubbleWidth = screenWidth * 0.7; // 70% от ширины экрана
  const bubblePadding = 24; // 12px padding с каждой стороны
  const maxImageWidth = maxBubbleWidth - bubblePadding;

  const getImageSize = () => {
    if (imageCount === 1) {
      const size = Math.min(250, maxImageWidth);
      return { width: size, height: size };
    }
    if (imageCount === 2) {
      const size = Math.min(120, (maxImageWidth - 4) / 2); // -4 для gap между изображениями
      return { width: size, height: size };
    }
    if (imageCount === 3) {
      const size = Math.min(120, (maxImageWidth - 4) / 2);
      return { width: size, height: size };
    }
    const size = Math.min(115, (maxImageWidth - 8) / 2); // 4 or more, -8 для gaps
    return { width: size, height: size };
  };

  const imageSize = getImageSize();

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

  return (
    <View style={styles.attachmentsContainer}>
      {/* Render images in grid */}
      {images.length > 0 && (
        <View style={[
          styles.imagesGrid,
          imageCount === 1 && styles.imagesGridSingle,
          imageCount === 2 && styles.imagesGridDouble,
          imageCount >= 3 && styles.imagesGridMultiple,
        ]}>
          {images.map((attachment, index) => (
            <TouchableOpacity
              key={attachment.id || index}
              style={[
                styles.imageAttachment,
                imageCount > 1 && styles.imageAttachmentGrid,
              ]}
              onPress={() => {
                onImagePress(Platform.OS === 'web' && blobUrls[attachment.id] ? blobUrls[attachment.id] : galleryImageUrls[index]);
              }}
              onLongPress={onLongPress}
              delayLongPress={500}
            >
              {Platform.OS === 'web' && blobUrls[attachment.id] ? (
                <Image
                  source={{ uri: blobUrls[attachment.id] }}
                  style={[styles.imagePreview, { width: imageSize.width, height: imageSize.height, maxWidth: '100%' }]}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : Platform.OS === 'web' && !blobUrls[attachment.id] ? (
                <View style={[
                  styles.imagePreview,
                  { width: imageSize.width, height: imageSize.height, maxWidth: '100%', backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }
                ]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : (
                <Image
                  source={{
                    uri: replaceLocalhostWithIP(attachment.file_url),
                    headers: sessionId ? {
                      'X-Session-ID': sessionId,
                    } : undefined,
                  }}
                  style={[styles.imagePreview, { width: imageSize.width, height: imageSize.height, maxWidth: '100%' }]}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                  onError={(error) => {
                    console.error('❌ Message image load error:', replaceLocalhostWithIP(attachment.file_url), error);
                  }}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

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
            <View style={{ width: Dimensions.get('window').width * 0.7 - 70 }}>
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
    maxWidth: '100%',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 6,
  },
  imagesGridSingle: {
    // Single image - no special layout
  },
  imagesGridDouble: {
    // 2 images side by side
  },
  imagesGridMultiple: {
    // 3+ images in grid
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  imageAttachment: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  imageAttachmentGrid: {
    // Additional styles for grid images
  },
  imagePreview: {
    borderRadius: 8,
    maxWidth: '100%',
  },
});
