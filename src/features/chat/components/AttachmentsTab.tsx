/**
 * Attachments Tab
 * Вкладка вложений чата
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { Attachment } from '../types/chat.types';
import * as chatApi from '../api/chat.api';
import { ImageViewer } from './ImageViewer';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { replaceLocalhostWithIP } from '../utils/message.utils';
import { decodeFileName } from '../utils/file.utils';

interface AttachmentsTabProps {
  chatId: number;
}

type AttachmentType = 'images' | 'files' | 'links';

export const AttachmentsTab: React.FC<AttachmentsTabProps> = ({ chatId }) => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const [selectedType, setSelectedType] = useState<AttachmentType>('images');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const screenWidth = Dimensions.get('window').width;
  const imageSize = (screenWidth - 48) / 3; // 3 колонки с отступами

  useEffect(() => {
    const loadSessionId = async () => {
      const authSessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      setSessionId(authSessionId);
    };
    loadSessionId();
  }, []);

  useEffect(() => {
    loadAttachments();
  }, [chatId]);

  const loadAttachments = async () => {
    try {
      setIsLoading(true);
      // API для получения вложений чата
      const { attachments: data } = await chatApi.getChatAttachments(chatId, 100, 0);
      setAttachments(data || []);
    } catch (error) {
      console.error('Failed to load attachments:', error);
      setAttachments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filterAttachmentsByType = (type: AttachmentType): Attachment[] => {
    switch (type) {
      case 'images':
        return attachments.filter((att) => att.file_type === 'image');
      case 'files':
        return attachments.filter((att) => att.file_type === 'document' || att.file_type === 'other' || att.file_type === 'audio');
      case 'links':
        // Ссылки могут потребовать отдельной логики
        return [];
      default:
        return [];
    }
  };

  const filteredAttachments = filterAttachmentsByType(selectedType);

  // Извлекаем все URL изображений для галереи
  const imageAttachments = attachments.filter((att) => att.file_type === 'image');
  const imageUrls = imageAttachments.map((att) => att.file_url);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string): string => {
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('word') || mimeType.includes('msword') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('sheet')) return 'stats-chart';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'archive';
    if (mimeType.includes('video')) return 'videocam';
    if (mimeType.includes('image')) return 'image';
    if (mimeType.includes('audio')) return 'musical-notes';
    return 'document-attach';
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageViewer(true);
  };

  const handleCloseImageViewer = () => {
    setShowImageViewer(false);
    setSelectedImageIndex(0);
  };

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

  const handleAttachmentPress = async (attachment: Attachment, index: number) => {
    // Если это изображение, открываем в ImageViewer
    if (attachment.file_type === 'image') {
      handleImagePress(index);
      return;
    }

    // Для других типов файлов используем handleFileDownload для предпросмотра
    await handleFileDownload(attachment);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: theme.background,
    },
    filterButton: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
    },
    activeFilterButton: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    filterText: {
      color: theme.textSecondary,
    },
    activeFilterText: {
      color: '#FFFFFF',
    },
    imageContainer: {
      backgroundColor: theme.backgroundSecondary,
    },
    fileItem: {
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    fileName: {
      color: theme.text,
    },
    fileSize: {
      color: theme.textSecondary,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Загрузка вложений...
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* Фильтры */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        <TouchableOpacity
          style={[
            styles.filterButton,
            dynamicStyles.filterButton,
            selectedType === 'images' && dynamicStyles.activeFilterButton,
          ]}
          onPress={() => setSelectedType('images')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="image-outline"
            size={20}
            color={selectedType === 'images' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              dynamicStyles.filterText,
              selectedType === 'images' && dynamicStyles.activeFilterText,
            ]}
          >
            Фото
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            dynamicStyles.filterButton,
            selectedType === 'files' && dynamicStyles.activeFilterButton,
          ]}
          onPress={() => setSelectedType('files')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="document-outline"
            size={20}
            color={selectedType === 'files' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              dynamicStyles.filterText,
              selectedType === 'files' && dynamicStyles.activeFilterText,
            ]}
          >
            Файлы
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            dynamicStyles.filterButton,
            selectedType === 'links' && dynamicStyles.activeFilterButton,
          ]}
          onPress={() => setSelectedType('links')}
          activeOpacity={0.7}
        >
          <Ionicons
            name="link-outline"
            size={20}
            color={selectedType === 'links' ? '#FFFFFF' : theme.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              dynamicStyles.filterText,
              selectedType === 'links' && dynamicStyles.activeFilterText,
            ]}
          >
            Ссылки
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Контент */}
      {filteredAttachments.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons
              name={
                selectedType === 'images'
                  ? 'image-outline'
                  : selectedType === 'files'
                  ? 'document-outline'
                  : 'link-outline'
              }
              size={64}
              color={theme.textTertiary}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {selectedType === 'images' && 'Нет фотографий'}
              {selectedType === 'files' && 'Нет файлов'}
              {selectedType === 'links' && 'Нет ссылок'}
            </Text>
          </View>
        ) : selectedType === 'images' ? (
          // Сетка изображений
          <View style={styles.imagesGrid}>
            {filteredAttachments.map((attachment, index) => {
              // Найти индекс в общем массиве изображений для галереи
              const globalIndex = imageAttachments.findIndex((img) => img.id === attachment.id);

              return (
                <TouchableOpacity
                  key={attachment.id}
                  style={[
                    styles.imageContainer,
                    dynamicStyles.imageContainer,
                    { width: imageSize, height: imageSize },
                  ]}
                  onPress={() => handleAttachmentPress(attachment, globalIndex)}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{
                      uri: attachment.thumbnail_url || attachment.file_url,
                      headers: sessionId ? {
                        'X-Session-ID': sessionId,
                      } : undefined,
                    }}
                    style={styles.image}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          // Список файлов
          <View style={styles.filesList}>
            {filteredAttachments.map((attachment, index) => (
              <TouchableOpacity
                key={attachment.id}
                style={[styles.fileItem, dynamicStyles.fileItem]}
                onPress={() => handleAttachmentPress(attachment, index)}
                activeOpacity={0.7}
              >
                <View style={styles.fileIconContainer}>
                  <Ionicons
                    name={getFileIcon(attachment.mime_type) as any}
                    size={32}
                    color={theme.primary}
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text
                    style={[styles.fileName, dynamicStyles.fileName]}
                    numberOfLines={1}
                  >
                    {attachment.file_name}
                  </Text>
                  <Text style={[styles.fileSize, dynamicStyles.fileSize]}>
                    {formatFileSize(attachment.file_size)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

      {/* Image Viewer Modal */}
      <ImageViewer
        visible={showImageViewer}
        imageUrls={imageUrls}
        initialIndex={selectedImageIndex}
        onClose={handleCloseImageViewer}
      />
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  filtersContainer: {
    maxHeight: 60,
  },
  filtersContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    justifyContent: 'center',
    flexGrow: 1,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 6,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  filesList: {
    padding: 16,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
  },
});
