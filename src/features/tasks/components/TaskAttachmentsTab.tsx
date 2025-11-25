import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskAttachment } from '../types/task.types';
import { Avatar } from '@components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { getUserDisplayName } from '../utils/taskHelpers';
import { getFileIcon, decodeFileName } from '@shared/utils/file.utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskAttachmentsTabProps {
  attachments: TaskAttachment[];
  isLoading: boolean;
  isUploading: boolean;
  canUpload: boolean;
  currentUserId?: number;
  onAttachmentPress: (attachment: TaskAttachment) => void;
  onAttachmentLongPress: (attachment: TaskAttachment) => void;
  onPickFile: () => void;
}

export const TaskAttachmentsTab: React.FC<TaskAttachmentsTabProps> = ({
  attachments,
  isLoading,
  isUploading,
  canUpload,
  currentUserId,
  onAttachmentPress,
  onAttachmentLongPress,
  onPickFile,
}) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: '#6b7280' }]}>
          Загрузка вложений...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {attachments.length > 0 ? (
        <View style={styles.attachmentsList}>
          {attachments.map((attachment) => {
            const fileIcon = getFileIcon(
              attachment.file_type || '',
              attachment.file_name
            );

            return (
              <TouchableOpacity
                key={attachment.id}
                style={[
                  styles.attachmentItem,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => onAttachmentPress(attachment)}
                onLongPress={() => onAttachmentLongPress(attachment)}
                activeOpacity={0.7}
                delayLongPress={500}
              >
                <Ionicons
                  name={fileIcon as any}
                  size={20}
                  color={theme.primary}
                />
                <View style={styles.attachmentDetails}>
                  <Text
                    style={[styles.attachmentName, { color: theme.text }]}
                    numberOfLines={1}
                  >
                    {decodeFileName(attachment.file_name)}
                  </Text>
                  <View style={styles.attachmentMetaRow}>
                    <Text style={styles.attachmentMeta}>
                      {(attachment.file_size / 1024).toFixed(1)} KB •{' '}
                      {format(new Date(attachment.created_at), 'dd MMM yyyy', {
                        locale: ru,
                      })}
                    </Text>
                    {attachment.uploaded_by && (
                      <View style={styles.attachmentUploader}>
                        <Text
                          style={styles.attachmentUploaderName}
                          numberOfLines={1}
                        >
                          {getUserDisplayName(
                            attachment.uploaded_by.name,
                            attachment.uploaded_by.id,
                            currentUserId
                          )}
                        </Text>
                        <Avatar
                          name={attachment.uploaded_by.name}
                          imageUrl={attachment.uploaded_by.avatar}
                          size={20}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons
            name="document-outline"
            size={48}
            color={theme.textTertiary}
          />
          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
            Нет вложений
          </Text>
        </View>
      )}

      {/* Add Attachment Button */}
      {canUpload && (
        <TouchableOpacity
          style={[
            styles.addAttachmentButton,
            {
              borderColor: theme.primary + '66',
              backgroundColor: theme.primary + '0D',
            },
          ]}
          onPress={onPickFile}
          disabled={isUploading}
        >
          {isUploading ? (
            <>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.addAttachmentText, { color: theme.primary }]}>
                Загрузка...
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color={theme.primary} />
              <Text style={[styles.addAttachmentText, { color: theme.primary }]}>
                Добавить файл
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  attachmentsList: {
    gap: 8,
    marginBottom: 12,
  },
  attachmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  attachmentDetails: {
    flex: 1,
  },
  attachmentName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  attachmentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  attachmentMeta: {
    fontSize: 12,
    color: '#6b7280',
  },
  attachmentUploader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentUploaderName: {
    fontSize: 11,
    color: '#9ca3af',
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  addAttachmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addAttachmentText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
