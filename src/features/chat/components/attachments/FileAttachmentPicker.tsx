import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { fileApi, FileUploadResponse } from '@api/fileApi';
import { useTheme } from '@shared/hooks/useTheme';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useInAppNotificationStore } from '@shared/store/inAppNotificationStore';
import { formatFileUploadError } from '@shared/utils/errorUtils';
import { ApiError } from '@types/common.types';

interface FileAttachmentPickerProps {
  onFilesSelected: (fileIds: number[]) => void;
  onError?: (error: string) => void;
}

export const FileAttachmentPicker: React.FC<FileAttachmentPickerProps> = ({
  onFilesSelected,
  onError,
}) => {
  const { theme } = useTheme();
  const { showOptions } = useActionModal();
  const showNotification = useInAppNotificationStore((state) => state.showNotification);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [showMenu, setShowMenu] = useState(false);

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

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObjects = await Promise.all(
          result.assets.map(async (asset) => {
            if (asset.uri.startsWith('blob:')) {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
              const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
              return new File([blob], fileName, { type: mimeType });
            } else {
              return {
                uri: asset.uri,
                name: asset.fileName || `photo_${Date.now()}.jpg`,
                type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
              };
            }
          })
        );

        await uploadFiles(fileObjects);
      }
    } catch (error) {
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

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const fileObjects = await Promise.all(
          result.assets.map(async (asset) => {
            if (asset.uri.startsWith('blob:')) {
              const response = await fetch(asset.uri);
              const blob = await response.blob();
              const fileName = asset.fileName || `image_${Date.now()}.jpg`;
              const mimeType = asset.type === 'video' ? 'video/mp4' : 'image/jpeg';
              return new File([blob], fileName, { type: mimeType });
            } else {
              return {
                uri: asset.uri,
                name: asset.fileName || `image_${Date.now()}.jpg`,
                type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
              };
            }
          })
        );

        await uploadFiles(fileObjects);
      }
    } catch (error) {
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

  const handleMenuOption = (option: 'gallery' | 'camera' | 'document') => {
    setShowMenu(false);

    // Небольшая задержка чтобы модалка успела закрыться
    setTimeout(() => {
      if (option === 'gallery') {
        handleImagePick();
      } else if (option === 'camera') {
        handleCameraPick();
      } else if (option === 'document') {
        handleDocumentPick();
      }
    }, 100);
  };

  const handleDocumentPick = async () => {
    try {
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
      }
    } catch (error) {
      showErrorToast(error, 'Ошибка при выборе документа');
    }
  };

  const uploadFiles = async (files: (File | { uri: string; name: string; type: string })[]) => {
    setUploading(true);
    setProgress(0);

    try {
      const uploadedFiles: FileUploadResponse[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Set initial progress for this file (show at least 1% to indicate upload started)
        const baseProgress = (i / files.length) * 100;
        setProgress(Math.max(1, baseProgress));

        const uploadedFile = await fileApi.uploadFile(
          file,
          undefined,
          (fileProgress) => {
            // Calculate total progress across all files
            // baseProgress: progress from previously uploaded files
            // fileProgress / 100 / files.length: current file's contribution to total progress
            const totalProgress = baseProgress + (fileProgress / files.length);
            setProgress(Math.min(99, totalProgress)); // Cap at 99% until all files are done
          },
          true  // Make chat attachments public so all chat members can access them
        );

        uploadedFiles.push(uploadedFile);
      }

      // Set 100% when all files are uploaded
      setProgress(100);

      const fileIds = uploadedFiles.map(f => f.id);
      onFilesSelected(fileIds);
    } catch (error) {
      showErrorToast(error, 'Ошибка при загрузке файлов');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (uploading) {
    return (
      <View style={styles.uploadingContainer}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.uploadingText, { color: theme.textSecondary }]}>
          Загрузка... {Math.round(progress)}%
        </Text>
      </View>
    );
  }

  // Одна кнопка с меню вложений на всех платформах
  return (
    <>
      {/* Модальное меню для веба */}
      {Platform.OS === 'web' && (
        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowMenu(false)}>
            <View style={[styles.menuContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <TouchableOpacity
                style={[styles.menuItem, { borderBottomColor: theme.border }]}
                onPress={() => handleMenuOption('gallery')}
              >
                <Ionicons name="image-outline" size={24} color={theme.primary} />
                <Text style={[styles.menuText, { color: theme.text }]}>Галерея</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, { borderBottomWidth: 0 }]}
                onPress={() => handleMenuOption('document')}
              >
                <Ionicons name="document-attach-outline" size={24} color={theme.primary} />
                <Text style={[styles.menuText, { color: theme.text }]}>Документы</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: theme.backgroundTertiary, marginTop: 8 }]}
                onPress={() => setShowMenu(false)}
              >
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Modal>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.backgroundTertiary }]}
        onPress={() => {
          showAttachmentMenu();
        }}
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
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
    marginRight: 5,
  },
  uploadingText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  menuContainer: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
