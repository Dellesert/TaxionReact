/**
 * Attachments Tab
 * Вкладка вложений чата
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Platform,
  Linking,
  Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { Attachment, ChatLink } from '../../types/chat.types';
import * as chatApi from '../../api/chat.api';
import { MediaViewer, MediaItem } from '../modals/MediaViewer';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { replaceLocalhostWithIP } from '../../utils/message.utils';
import { decodeFileName } from '../../utils/file.utils';

interface AttachmentsTabProps {
  chatId: number;
  onForwardImage?: (attachment: Attachment) => void;
}

type AttachmentType = 'images' | 'files' | 'links';

export const AttachmentsTab: React.FC<AttachmentsTabProps> = ({ chatId, onForwardImage }) => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const [selectedType, setSelectedType] = useState<AttachmentType>('images');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [links, setLinks] = useState<ChatLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinksLoading, setIsLinksLoading] = useState(false);
  const [linksLoaded, setLinksLoaded] = useState(false);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Адаптивная сетка для десктопа и мобильных устройств
  const screenWidth = Dimensions.get('window').width;
  const isDesktop = screenWidth > 768;

  // На десктопе используем до 6 колонок с максимальным размером 150px
  // На мобильных - 3 колонки
  const getImageDimensions = () => {
    if (isDesktop) {
      // Для десктопа: адаптивная сетка с колонками до 150px
      const maxImageSize = 150;
      const totalPadding = 48; // padding контейнера
      const gap = 6; // gap между элементами

      // Вычисляем количество колонок, которые поместятся
      const availableWidth = screenWidth - totalPadding;
      const columns = Math.floor(availableWidth / (maxImageSize + gap));
      const clampedColumns = Math.max(3, Math.min(6, columns)); // От 3 до 6 колонок

      // Вычисляем размер изображения с учетом gap
      const totalGapWidth = gap * (clampedColumns - 1);
      const imageSize = (availableWidth - totalGapWidth) / clampedColumns;

      return Math.floor(imageSize);
    } else {
      // Для мобильных: 3 колонки как раньше
      return (screenWidth - 48) / 3;
    }
  };

  const imageSize = getImageDimensions();

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

  const loadLinks = async () => {
    if (linksLoaded) return;
    try {
      setIsLinksLoading(true);
      const { links: data } = await chatApi.getChatLinks(chatId, 100, 0);
      setLinks(data || []);
      setLinksLoaded(true);
    } catch (error) {
      console.error('Failed to load links:', error);
      setLinks([]);
    } finally {
      setIsLinksLoading(false);
    }
  };

  // Загружаем ссылки при переключении на вкладку "Ссылки"
  useEffect(() => {
    if (selectedType === 'links') {
      loadLinks();
    }
  }, [selectedType]);

  const filterAttachmentsByType = (type: AttachmentType): Attachment[] => {
    switch (type) {
      case 'images':
        return attachments.filter((att) => att.file_type === 'image' || att.file_type === 'video');
      case 'files':
        return attachments.filter((att) => att.file_type === 'document' || att.file_type === 'other' || att.file_type === 'audio');
      default:
        return [];
    }
  };

  const filteredAttachments = filterAttachmentsByType(selectedType);

  const handleLinkPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
    } catch {
      showError('Не удалось открыть ссылку');
    }
  };

  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  };

  // Извлекаем все медиа-вложения (изображения + видео) для галереи
  const mediaAttachments = attachments.filter((att) => att.file_type === 'image' || att.file_type === 'video');
  const mediaItems: MediaItem[] = useMemo(() => {
    return mediaAttachments.map(att => ({
      type: att.file_type === 'video' ? 'video' as const : 'image' as const,
      url: replaceLocalhostWithIP(att.file_url),
      thumbnailUrl: att.thumbnail_url ? replaceLocalhostWithIP(att.thumbnail_url) : undefined,
      attachmentId: att.id,
      duration: att.duration,
    }));
  }, [mediaAttachments]);

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

  const handleCloseMediaViewer = () => {
    setShowMediaViewer(false);
    setSelectedMediaIndex(0);
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
    // Если это изображение или видео, открываем в MediaViewer
    if (attachment.file_type === 'image' || attachment.file_type === 'video') {
      const mediaIndex = mediaItems.findIndex(item => item.attachmentId === attachment.id);
      setSelectedMediaIndex(mediaIndex >= 0 ? mediaIndex : 0);
      setShowMediaViewer(true);
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
            name="images-outline"
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
            Медиа
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
      {selectedType === 'links' ? (
        // Вкладка ссылок
        isLinksLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : links.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="link-outline" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Нет ссылок
            </Text>
          </View>
        ) : (
          <View style={styles.linksList}>
            {links.map((link) => {
              const preview = link.link_preview;
              const hostname = getHostname(preview.url);

              return (
                <TouchableOpacity
                  key={`${link.message_id}-${preview.url}`}
                  style={[styles.linkItem, { backgroundColor: theme.backgroundSecondary, borderBottomColor: theme.border }]}
                  onPress={() => handleLinkPress(preview.url)}
                  activeOpacity={0.7}
                >
                  {preview.image ? (
                    <RNImage
                      source={{ uri: preview.image }}
                      style={styles.linkImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.linkImagePlaceholder, { backgroundColor: theme.primary + '15' }]}>
                      <Ionicons name="globe-outline" size={28} color={theme.primary} />
                    </View>
                  )}
                  <View style={styles.linkContent}>
                    <Text style={[styles.linkSiteName, { color: theme.primary }]} numberOfLines={1}>
                      {preview.site_name || hostname}
                    </Text>
                    {preview.title ? (
                      <Text style={[styles.linkTitle, { color: theme.text }]} numberOfLines={2}>
                        {preview.title}
                      </Text>
                    ) : null}
                    {preview.description ? (
                      <Text style={[styles.linkDescription, { color: theme.textSecondary }]} numberOfLines={2}>
                        {preview.description}
                      </Text>
                    ) : null}
                    <View style={styles.linkUrlRow}>
                      <Ionicons name="link-outline" size={12} color={theme.textTertiary} />
                      <Text style={[styles.linkUrl, { color: theme.textTertiary }]} numberOfLines={1}>
                        {hostname}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )
      ) : filteredAttachments.length === 0 ? (
        <View style={styles.emptyState}>
            <Ionicons
              name={
                selectedType === 'images'
                  ? 'image-outline'
                  : 'document-outline'
              }
              size={64}
              color={theme.textTertiary}
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {selectedType === 'images' && 'Нет медиафайлов'}
              {selectedType === 'files' && 'Нет файлов'}
            </Text>
          </View>
        ) : selectedType === 'images' ? (
          // Сетка изображений
          <View style={styles.imagesGrid}>
            {filteredAttachments.map((attachment, index) => {
              const isVideo = attachment.file_type === 'video';

              return (
                <TouchableOpacity
                  key={attachment.id}
                  style={[
                    styles.imageContainer,
                    dynamicStyles.imageContainer,
                    { width: imageSize, height: imageSize },
                  ]}
                  onPress={() => handleAttachmentPress(attachment, index)}
                  activeOpacity={0.8}
                >
                  {/* Placeholder/Loading state */}
                  <View style={[
                    styles.imagePlaceholder,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    }
                  ]}>
                    <Ionicons name={isVideo ? "videocam-outline" : "image-outline"} size={32} color={theme.textTertiary} />
                  </View>

                  {/* Actual thumbnail */}
                  <Image
                    source={{
                      uri: replaceLocalhostWithIP(attachment.thumbnail_url || attachment.file_url),
                      headers: sessionId ? {
                        'X-Session-ID': sessionId,
                      } : undefined,
                    }}
                    style={styles.image}
                    contentFit="cover"
                    transition={200}
                    cachePolicy="disk"
                  />

                  {/* Video play overlay */}
                  {isVideo && (
                    <View style={styles.videoPlayOverlay}>
                      <View style={styles.videoPlayIcon}>
                        <Ionicons name="play" size={20} color="#FFFFFF" />
                      </View>
                    </View>
                  )}
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

      {/* Media Viewer Modal (фото + видео) */}
      <MediaViewer
        visible={showMediaViewer}
        mediaItems={mediaItems}
        initialIndex={selectedMediaIndex}
        onClose={handleCloseMediaViewer}
        onForward={onForwardImage ? (item: MediaItem) => {
          const attachment = attachments.find(att => att.id === item.attachmentId);
          if (attachment) {
            setShowMediaViewer(false);
            onForwardImage(attachment);
          }
        } : undefined}
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
    justifyContent: 'center',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
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
  linksList: {
    padding: 16,
  },
  linkItem: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
  },
  linkImage: {
    width: 80,
    height: 80,
  },
  linkImagePlaceholder: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkContent: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  linkSiteName: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
  linkDescription: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  linkUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkUrl: {
    fontSize: 11,
    flex: 1,
  },
  videoPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 2,
  },
});
