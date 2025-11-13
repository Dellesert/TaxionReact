/**
 * Task Attachments List Component
 * Отображает список прикрепленных файлов с возможностью загрузки и удаления
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { TaskAttachment } from '@/types/task.types';
import {
  getTaskAttachments,
  uploadAttachment,
  deleteAttachment,
} from '@/api/task.api';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAuthStore } from '@store/authStore';
import { Avatar } from '@components/common/Avatar';

interface TaskAttachmentsListProps {
  taskId: number;
  onAttachmentAdded?: () => void;
}

// File type icons
const FILE_TYPE_ICONS: Record<string, string> = {
  pdf: 'document-text',
  doc: 'document',
  docx: 'document',
  xls: 'grid',
  xlsx: 'grid',
  ppt: 'easel',
  pptx: 'easel',
  txt: 'document-text-outline',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  zip: 'archive',
  rar: 'archive',
  '7z': 'archive',
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const TaskAttachmentsList: React.FC<TaskAttachmentsListProps> = ({
  taskId,
  onAttachmentAdded,
}) => {
  const { user: currentUser } = useAuthStore();
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadAttachments = async () => {
    try {
      const data = await getTaskAttachments(taskId);
      setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить файлы');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAttachments();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAttachments();
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      setUploading(true);

      // Create file object for upload
      const fileToUpload = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      };

      await uploadAttachment(taskId, fileToUpload as any);
      loadAttachments();
      onAttachmentAdded?.();
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить файл');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAttachment = (attachment: TaskAttachment) => {
    Alert.alert(
      'Удалить файл?',
      `Вы уверены, что хотите удалить "${attachment.file_name}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAttachment(attachment.id);
              setAttachments(prev => prev.filter(a => a.id !== attachment.id));
              onAttachmentAdded?.();
            } catch (error) {
              console.error('Error deleting attachment:', error);
              Alert.alert('Ошибка', 'Не удалось удалить файл');
            }
          },
        },
      ]
    );
  };

  const getFileIcon = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return FILE_TYPE_ICONS[ext] || 'document-outline';
  };

  const renderAttachmentItem = ({ item }: { item: TaskAttachment }) => {
    const icon = getFileIcon(item.file_name);
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: ru,
    });

    // DEBUG: Log attachment data
    console.log('🔍 TaskAttachmentsList - Attachment:', {
      id: item.id,
      file_name: item.file_name,
      uploaded_by: item.uploaded_by,
      uploaded_by_user_id: item.uploaded_by_user_id,
    });

    // Check if current user is the uploader
    const canDelete = currentUser && item.uploaded_by_user_id === currentUser.id;

    return (
      <View style={styles.attachmentItem}>
        <View style={styles.fileIcon}>
          <Ionicons name={icon as any} size={24} color="#3b82f6" />
        </View>

        <View style={styles.attachmentContent}>
          <Text style={styles.fileName} numberOfLines={1}>
            {item.file_name}
          </Text>
          <View style={styles.fileMeta}>
            <Text style={styles.fileSize}>
              {formatFileSize(item.file_size)}
            </Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.fileTime}>{timeAgo}</Text>
          </View>
          {item.uploaded_by && (
            <View style={styles.uploaderContainer}>
              <Avatar
                name={item.uploaded_by.name}
                imageUrl={item.uploaded_by.avatar}
                size={18}
              />
              <Text style={styles.uploader} numberOfLines={1}>
                {item.uploaded_by.name}
              </Text>
            </View>
          )}
        </View>

        {/* Show delete button only for the user who uploaded the file */}
        {canDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteAttachment(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="attach-outline" size={48} color="#d1d5db" />
      <Text style={styles.emptyText}>Файлов пока нет</Text>
      <Text style={styles.emptySubtext}>
        Прикрепите документы, изображения или другие файлы
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Файлы ({attachments.length})
        </Text>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handlePickDocument}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <>
              <Ionicons name="add-circle" size={20} color="#3b82f6" />
              <Text style={styles.uploadButtonText}>Загрузить</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {attachments.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={attachments}
          renderItem={renderAttachmentItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3b82f6',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fileIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    marginRight: 12,
  },
  attachmentContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileSize: {
    fontSize: 13,
    color: '#6b7280',
  },
  dot: {
    fontSize: 13,
    color: '#d1d5db',
  },
  fileTime: {
    fontSize: 13,
    color: '#6b7280',
  },
  uploaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  uploader: {
    fontSize: 11,
    color: '#9ca3af',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
});
