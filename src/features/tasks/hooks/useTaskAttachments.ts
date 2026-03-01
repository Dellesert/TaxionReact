import { useState, useCallback } from 'react';
import { TaskAttachment } from '../types/task.types';
import * as taskApi from '../api/task.api';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import { Platform } from 'react-native';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { fileApi } from '@api/fileApi';
import { getCachedFileUri, cacheFile } from '@shared/utils/fileCache';

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
      setAttachments(data);
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


      // Step 1: Upload file to file-service
      const fileToUpload = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      };

      // Mark task files as public so all task participants can access them
      const uploadedFile = await fileApi.uploadFile(fileToUpload, 'attachment', undefined, true);

      // Step 2: Attach file to task using file_id
      const result = await taskApi.attachFileToTask(taskIdNum, uploadedFile.id);

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
        // For mobile: check file cache first, download if missing
        const downloadUrl = fileApi.getDownloadUrl(file.file_name);
        const originalFileName = decodeURIComponent(attachment.file_name);

        // Try to get from cache
        let localUri = getCachedFileUri(downloadUrl);

        if (!localUri) {
          // Download and cache the file
          localUri = await cacheFile(downloadUrl, sessionId);
        }

        // Open file with native viewer
        try {
          await FileViewer.open(localUri, {
            displayName: originalFileName,
            showOpenWithDialog: true,
            showAppsSuggestions: true,
          });
        } catch (viewerError: any) {
          // If FileViewer fails, fallback to sharing
          const isAvailable = await Sharing.isAvailableAsync();

          if (isAvailable) {
            await Sharing.shareAsync(localUri, {
              UTI: attachment.mime_type,
              mimeType: attachment.mime_type,
            });
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
      await taskApi.deleteAttachment(attachmentId);
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
