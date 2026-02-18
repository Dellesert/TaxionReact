import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { fileApi, FileUploadResponse } from '@api/fileApi';
import { useTheme } from '@shared/hooks/useTheme';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useInAppNotificationStore } from '@shared/store/inAppNotificationStore';
import { formatFileUploadError } from '@shared/utils/errorUtils';
import { ApiError } from '@types/common.types';
import { PendingVideoFile } from '../../types/chat.types';
import { FILE_UPLOAD } from '@shared/constants/app.constants';
import { ContextMenu } from '@shared/components/common/ContextMenu';

interface FileAttachmentPickerProps {
  onFilesSelected: (fileIds: number[]) => void;
  onPendingVideoFiles?: (files: PendingVideoFile[]) => void;
  onError?: (error: string) => void;
  currentAttachmentCount?: number;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export const FileAttachmentPicker: React.FC<FileAttachmentPickerProps> = ({
  onFilesSelected,
  onPendingVideoFiles,
  onError,
  currentAttachmentCount = 0,
  onProcessingChange,
}) => {
  const { theme } = useTheme();
  const { showOptions } = useActionModal();
  const showNotification = useInAppNotificationStore((state) => state.showNotification);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);
  const [processing, setProcessing] = useState(false);
  const buttonRef = useRef<View>(null);

  useEffect(() => {
    onProcessingChange?.(processing);
  }, [processing, onProcessingChange]);

  /**
   * Helper function to show error notification
   */
  const showErrorToast = (error: unknown, fallbackMessage: string) => {
    let errorMessage = fallbackMessage;

    // If it's a structured ApiError, format it properly
    if (error && typeof error === 'object' && ('error_code' in error || 'details' in error)) {
      errorMessage = formatFileUploadError(error as ApiError);
    } else if (error instanceof Error) {
      errorMessage = error.message || fallbackMessage;
    }

    // Show toast notification
    showNotification({
      id: Date.now(),
      user_id: 0,
      type: 'system',
      title: 'Ошибка загрузки',
      message: errorMessage,
      is_read: false,
      priority: 'high',
      created_at: new Date().toISOString(),
    });

    // Call legacy onError callback if provided
    onError?.(errorMessage);
  };

  const handleCameraPick = async () => {

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        showErrorToast(new Error('Нужно разрешение для доступа к камере'), 'Нужно разрешение для доступа к камере');
        return;
      }

      setProcessing(true);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObjects = await Promise.all(
          result.assets.map(async (asset) => {
            const isVideo = asset.type === 'video';
            const fileName = asset.fileName || (isVideo ? `video_${Date.now()}.mp4` : `photo_${Date.now()}.jpg`);
            const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

            if (asset.uri.startsWith('blob:')) {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              return new File([blob], fileName, { type: mimeType });
            } else {
              return {
                uri: asset.uri,
                name: fileName,
                type: mimeType,
              };
            }
          })
        );

        await uploadFiles(fileObjects, result.assets);
      } else {
        setProcessing(false);
      }
    } catch (error) {
      setProcessing(false);
      showErrorToast(error, 'Ошибка при съемке фото');
    }
  };

  const handleImagePick = async () => {
    try {
      // Пробуем использовать ImagePicker на всех платформах
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showErrorToast(new Error('Нужно разрешение для доступа к галерее'), 'Нужно разрешение для доступа к галерее');
        return;
      }

      // Включаем множественный выбор на всех платформах
      const pickerOptions: any = {
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsMultipleSelection: true, // Разрешаем выбор нескольких файлов
      };

      setProcessing(true);
      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObjects = await Promise.all(
          result.assets.map(async (asset) => {
            const isVideo = asset.type === 'video';
            const fileName = asset.fileName || (isVideo ? `video_${Date.now()}.mp4` : `image_${Date.now()}.jpg`);
            const mimeType = isVideo ? 'video/mp4' : 'image/jpeg';

            if (asset.uri.startsWith('blob:')) {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              return new File([blob], fileName, { type: mimeType });
            } else {
              return {
                uri: asset.uri,
                name: fileName,
                type: mimeType,
              };
            }
          })
        );

        await uploadFiles(fileObjects, result.assets);
      } else {
        setProcessing(false);
      }
    } catch (error) {
      setProcessing(false);
      showErrorToast(error, 'Ошибка при выборе изображения');
    }
  };

  const showAttachmentMenu = () => {
    if (Platform.OS === 'web') {
      // На вебе показываем модальное меню
      setShowMenu(true);
    } else if (Platform.OS === 'ios') {
      // На iOS используем нативный ActionSheet
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Отмена', 'Галерея', 'Камера', 'Документы'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleImagePick();
          } else if (buttonIndex === 2) {
            handleCameraPick();
          } else if (buttonIndex === 3) {
            handleDocumentPick();
          }
        }
      );
    } else {
      // На Android используем ActionModal
      showOptions(
        'Прикрепить файл',
        [
          { text: 'Галерея', onPress: handleImagePick, icon: 'image' },
          { text: 'Камера', onPress: handleCameraPick, icon: 'camera' },
          { text: 'Документы', onPress: handleDocumentPick, icon: 'document-attach' },
        ]
      );
    }
  };

  const handleDocumentPick = async () => {
    try {
      setProcessing(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const files = result.assets;
        const fileObjects = await Promise.all(
          files.map(async (file) => {
            if (file.uri.startsWith('blob:')) {
              const response = await fetch(file.uri);
              const blob = await response.blob();
              return new File([blob], file.name, { type: file.mimeType || 'application/octet-stream' });
            } else {
              return {
                uri: file.uri,
                name: file.name,
                type: file.mimeType || 'application/octet-stream',
              };
            }
          })
        );

        await uploadFiles(fileObjects);
      } else if ((result as any).type === 'success') {
        const files = Array.isArray((result as any).output) ? (result as any).output : [result];
        await uploadFiles(files.map(file => ({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        })));
      } else {
        setProcessing(false);
      }
    } catch (error) {
      setProcessing(false);
      showErrorToast(error, 'Ошибка при выборе документа');
    }
  };

  const uploadFiles = async (files: (File | { uri: string; name: string; type: string })[], assets?: ImagePicker.ImagePickerAsset[]) => {
    // Note: Limit checks are done in useChatActions hooks to avoid race conditions
    // Just process all files - the callbacks will handle the limit
    const videoFiles: PendingVideoFile[] = [];
    const nonVideoFiles: (File | { uri: string; name: string; type: string })[] = [];

    files.forEach((file, index) => {
      const mimeType = file instanceof File ? file.type : file.type;
      if ((mimeType.startsWith('video/') || mimeType.startsWith('image/')) && onPendingVideoFiles) {
        const asset = assets?.[index];
        videoFiles.push({
          localUri: file instanceof File ? URL.createObjectURL(file) : file.uri,
          fileName: file instanceof File ? file.name : file.name,
          mimeType,
          fileSize: file instanceof File ? file.size : 0,
          width: asset?.width,
          height: asset?.height,
          duration: asset?.duration ? asset.duration / 1000 : undefined, // ms → seconds
        });
      } else {
        nonVideoFiles.push(file);
      }
    });

    // Send video files as pending (will be uploaded when message is sent)
    if (videoFiles.length > 0) {
      onPendingVideoFiles?.(videoFiles);
    }

    // Upload non-video files immediately as before
    if (nonVideoFiles.length > 0) {
      setUploading(true);
      setProgress(0);

      try {
        const uploadedFiles: FileUploadResponse[] = [];

        for (let i = 0; i < nonVideoFiles.length; i++) {
          const file = nonVideoFiles[i];

          const baseProgress = (i / nonVideoFiles.length) * 100;
          setProgress(Math.max(1, baseProgress));

          const uploadedFile = await fileApi.uploadFile(
            file,
            undefined,
            (fileProgress) => {
              const totalProgress = baseProgress + (fileProgress / nonVideoFiles.length);
              setProgress(Math.min(99, totalProgress));
            },
            true
          );

          uploadedFiles.push(uploadedFile);
        }

        setProgress(100);

        const fileIds = uploadedFiles.map(f => f.id);
        onFilesSelected(fileIds);
      } catch (error) {
        showErrorToast(error, 'Ошибка при загрузке файлов');
      } finally {
        setUploading(false);
        setProgress(0);
      }
    }

    setProcessing(false);
  };

  if (uploading) {
    const size = 32;
    const strokeWidth = 3;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * Math.round(progress)) / 100;

    return (
      <View style={styles.uploadingContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.backgroundTertiary}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.primary}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
      </View>
    );
  }

  // Одна кнопка с меню вложений на всех платформах
  const isLimitReached = currentAttachmentCount >= FILE_UPLOAD.MAX_ATTACHMENTS_PER_MESSAGE;

  return (
    <>
      {Platform.OS === 'web' && (
        <ContextMenu
          visible={showMenu}
          options={[
            { key: 'gallery', icon: 'image-outline', label: 'Фото/видео', onPress: handleImagePick },
            { key: 'document', icon: 'document-attach-outline', label: 'Документы', onPress: handleDocumentPick },
          ]}
          onClose={() => setShowMenu(false)}
          anchorRef={buttonRef}
        />
      )}

      <TouchableOpacity
        ref={buttonRef}
        style={[
          styles.button,
          { backgroundColor: theme.backgroundTertiary },
          isLimitReached && { opacity: 0.5 }
        ]}
        onPress={() => {
          if (isLimitReached) {
            showErrorToast(
              null,
              `Достигнут лимит вложений (${FILE_UPLOAD.MAX_ATTACHMENTS_PER_MESSAGE})`
            );
            return;
          }
          showAttachmentMenu();
        }}
        disabled={isLimitReached}
      >
        <Ionicons name="attach" size={24} color={theme.primary} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    // Тени
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 42,
    height: 42,
  },
});
