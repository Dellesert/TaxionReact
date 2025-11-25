import { useState, useCallback } from 'react';
import { TaskAttachment } from '../types/task.types';
import * as taskApi from '../api/task.api';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Platform } from 'react-native';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { fileApi } from '@api/fileApi';
import { getUser } from '@api/user.api';

/**
 * Custom hook for managing task attachments
 */
export const useTaskAttachments = (taskId: string) => {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const loadAttachments = useCallback(async () => {
    try {
      setIsLoadingAttachments(true);
      const taskIdNum = Number(taskId);
      const data = await taskApi.getTaskAttachments(taskIdNum);

      // Load user info for each attachment if not provided by backend
      const attachmentsWithUsers = await Promise.all(
        data.map(async (attachment) => {
          if (!attachment.uploaded_by && attachment.uploaded_by_user_id) {
            try {
              const user = await getUser(attachment.uploaded_by_user_id);
              return {
                ...attachment,
                uploaded_by: {
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatar: user.avatar,
                  position: user.position,
                },
              };
            } catch (error) {
              console.error(`Failed to load user ${attachment.uploaded_by_user_id}:`, error);
              return attachment;
            }
          }
          return attachment;
        })
      );

      setAttachments(attachmentsWithUsers);
    } catch (error) {
      console.error('Error loading attachments:', error);
      throw error;
    } finally {
      setIsLoadingAttachments(false);
    }
  }, [taskId]);

  const uploadAttachment = useCallback(async (file: any) => {
    try {
      setIsUploadingAttachment(true);
      const taskIdNum = Number(taskId);

      console.log('📎 Uploading file:', {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });

      // Step 1: Upload file to file-service
      const fileToUpload = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      };

      console.log('📤 Step 1: Uploading to file-service...');
      // Mark task files as public so all task participants can access them
      const uploadedFile = await fileApi.uploadFile(fileToUpload, 'attachment', undefined, true);
      console.log('✅ File uploaded to file-service:', uploadedFile);

      // Step 2: Attach file to task using file_id
      console.log('📤 Step 2: Attaching to task...');
      const result = await taskApi.attachFileToTask(taskIdNum, uploadedFile.id);
      console.log('✅ File attached to task:', result);

      await loadAttachments();
    } catch (error: any) {
      console.error('❌ Error uploading file:', error);
      console.error('Error details:', error.response?.data || error.message);
      throw error;
    } finally {
      setIsUploadingAttachment(false);
    }
  }, [taskId, loadAttachments]);

  const openAttachment = useCallback(async (attachment: TaskAttachment) => {
    try {
      // Extract file ID from file_path
      const fileId = attachment.file_path.split('/').pop();
      if (!fileId) {
        throw new Error('Неверный путь к файлу');
      }

      console.log('📥 Opening file:', {
        fileName: attachment.file_name,
        fileId,
      });

      // Get session ID
      const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      if (!sessionId) {
        throw new Error('Не авторизован');
      }

      // Use fileApi to get file info first
      const file = await fileApi.getFileById(Number(fileId));

      // For web: create download link with session ID in header using fetch + blob
      if (Platform.OS === 'web') {
        const downloadUrl = fileApi.getDownloadUrl(file.file_name);
        const response = await fetch(downloadUrl, {
          headers: {
            'X-Session-ID': sessionId,
          },
        });

        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // For mobile: download file and open with FileViewer
        const downloadUrl = fileApi.getDownloadUrl(file.file_name);

        // Decode filename and create safe filename
        const originalFileName = decodeURIComponent(attachment.file_name);
        const fileExtension = originalFileName.split('.').pop() || '';
        const safeFileName = `file_${Date.now()}.${fileExtension}`;
        const fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;

        console.log('📥 Downloading to:', fileUri);

        const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri, {
          headers: {
            'X-Session-ID': sessionId,
          },
        });

        console.log('✅ Downloaded:', downloadResult.uri);

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
            console.log(`Файл скачан: ${originalFileName}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error opening file:', error);
      throw error;
    }
  }, []);

  const deleteAttachment = useCallback(async (attachmentId: number) => {
    try {
      console.log('🗑️ Deleting attachment:', attachmentId);
      await taskApi.deleteAttachment(attachmentId);
      console.log('✅ Attachment deleted successfully');
      await loadAttachments();
    } catch (error: any) {
      console.error('❌ Error deleting attachment:', error);
      throw error;
    }
  }, [loadAttachments]);

  return {
    attachments,
    isLoadingAttachments,
    isUploadingAttachment,
    loadAttachments,
    uploadAttachment,
    openAttachment,
    deleteAttachment,
  };
};
