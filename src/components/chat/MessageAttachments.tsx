import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import { isImageFile, replaceLocalhostWithIP } from '@utils/message.utils';
import { getFileIcon, decodeFileName } from '@utils/file.utils';

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
  const [token, setToken] = React.useState<string | null>(null);

  // Load token once
  React.useEffect(() => {
    const loadToken = async () => {
      const authToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      setToken(authToken);
    };
    loadToken();
  }, []);

  const images = attachments.filter(a => isImageFile(a.mime_type || a.file_type || ''));
  const files = attachments.filter(a => !isImageFile(a.mime_type || a.file_type || ''));
  const imageCount = images.length;

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
      // Get auth token
      const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        Alert.alert('Ошибка', 'Необходима авторизация для скачивания файла');
        return;
      }

      // Replace localhost with real IP
      const fileUrl = replaceLocalhostWithIP(attachment.file_url);

      if (Platform.OS === 'web') {
        // Web: Download using blob
        const response = await fetch(fileUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
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
              'Authorization': `Bearer ${token}`,
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
          console.log('FileViewer failed, falling back to sharing:', viewerError);
          const isAvailable = await Sharing.isAvailableAsync();

          if (isAvailable) {
            await Sharing.shareAsync(downloadResult.uri, {
              UTI: attachment.mime_type,
              mimeType: attachment.mime_type,
            });
          } else {
            Alert.alert('Успех', `Файл скачан:\n${originalFileName}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to download file:', error);
      Alert.alert('Ошибка', 'Не удалось скачать файл');
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
                const imageUrl = imageUrls[attachment.id];
                if (imageUrl) {
                  onImagePress(imageUrl);
                } else {
                  Alert.alert('Ошибка', 'Изображение еще загружается');
                }
              }}
              onLongPress={onLongPress}
              delayLongPress={500}
            >
              {imageUrls[attachment.id] ? (
                <Image
                  source={{
                    uri: imageUrls[attachment.id],
                    headers: token ? {
                      'Authorization': `Bearer ${token}`,
                    } : undefined,
                  }}
                  style={[styles.imagePreview, { width: imageSize.width, height: imageSize.height, maxWidth: '100%' }]}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[
                  styles.imagePreview,
                  { width: imageSize.width, height: imageSize.height, maxWidth: '100%', backgroundColor: theme.backgroundSecondary, justifyContent: 'center', alignItems: 'center' }
                ]}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
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
