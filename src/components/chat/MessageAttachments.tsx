import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Attachment } from '../../types/chat.types';
import { API_BASE_URL } from '../../constants/api.constants';

interface MessageAttachmentsProps {
  attachments: Attachment[];
}

const getFileIcon = (mimeType: string): keyof typeof Ionicons.glyphMap => {
  if (mimeType.startsWith('image/')) return 'image-outline';
  if (mimeType.startsWith('video/')) return 'videocam-outline';
  if (mimeType.startsWith('audio/')) return 'musical-notes-outline';
  if (mimeType.includes('pdf')) return 'document-text-outline';
  if (mimeType.includes('word') || mimeType.includes('document'))
    return 'document-text-outline';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet'))
    return 'grid-outline';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation'))
    return 'easel-outline';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('archive'))
    return 'archive-outline';
  return 'document-outline';
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

const isVideoFile = (mimeType: string): boolean => {
  return mimeType.startsWith('video/');
};

// Helper to ensure full URL
const getFullUrl = (url: string): string => {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If relative path, prepend base URL without /api/v1
  const baseUrl = API_BASE_URL.replace('/api/v1', '');
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({
  attachments,
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const handleAttachmentPress = async (attachment: Attachment) => {
    try {
      const fullUrl = getFullUrl(attachment.file_url);
      console.log('📎 Opening attachment:', { original: attachment.file_url, full: fullUrl, name: attachment.file_name });
      const canOpen = await Linking.canOpenURL(fullUrl);
      if (canOpen) {
        await Linking.openURL(fullUrl);
      } else {
        console.warn('❌ Cannot open URL:', fullUrl);
      }
    } catch (error) {
      console.error('❌ Error opening attachment:', error);
    }
  };

  const images = attachments.filter(a => isImageFile(a.file_type));
  const videos = attachments.filter(a => isVideoFile(a.file_type));
  const files = attachments.filter(a => !isImageFile(a.file_type) && !isVideoFile(a.file_type));

  return (
    <View style={styles.container}>
      {/* Image Attachments */}
      {images.length > 0 && (
        <View style={styles.imagesContainer}>
          {images.map((attachment) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.imageWrapper}
              onPress={() => handleAttachmentPress(attachment)}
            >
              <Image
                source={{ uri: getFullUrl(attachment.thumbnail_url || attachment.file_url) }}
                style={styles.image}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Video Attachments */}
      {videos.length > 0 && (
        <View style={styles.videosContainer}>
          {videos.map((attachment) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.videoWrapper}
              onPress={() => handleAttachmentPress(attachment)}
            >
              {attachment.thumbnail_url ? (
                <Image
                  source={{ uri: getFullUrl(attachment.thumbnail_url) }}
                  style={styles.videoThumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Ionicons name="videocam-outline" size={48} color="#666" />
                </View>
              )}
              <View style={styles.videoPlayIcon}>
                <Ionicons name="play-circle" size={40} color="white" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* File Attachments */}
      {files.length > 0 && (
        <View style={styles.filesContainer}>
          {files.map((attachment) => (
            <TouchableOpacity
              key={attachment.id}
              style={styles.fileItem}
              onPress={() => handleAttachmentPress(attachment)}
            >
              <Ionicons
                name={getFileIcon(attachment.file_type)}
                size={32}
                color="#007AFF"
              />
              <View style={styles.fileInfo}>
                <Text style={styles.fileName} numberOfLines={1}>
                  {attachment.original_name || attachment.file_name}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(attachment.file_size)}
                </Text>
              </View>
              <Ionicons name="download-outline" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
    gap: 8,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videosContainer: {
    gap: 8,
  },
  videoWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  videoPlayIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  filesContainer: {
    gap: 8,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
});
