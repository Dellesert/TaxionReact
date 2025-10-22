import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { fileApi, FileUploadResponse } from '../../api/fileApi';
import { useTheme } from '@hooks/useTheme';

interface FileAttachmentPickerProps {
  onFilesSelected: (fileIds: number[]) => void;
  onError?: (error: string) => void;
}

export const FileAttachmentPicker: React.FC<FileAttachmentPickerProps> = ({
  onFilesSelected,
  onError,
}) => {
  const { theme } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleImagePick = async () => {
    setMenuVisible(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        onError?.('Нужно разрешение для доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
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
      console.error('Error picking image:', error);
      onError?.('Ошибка при выборе изображения');
    }
  };

  const handleDocumentPick = async () => {
    setMenuVisible(false);
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
      console.error('Error picking document:', error);
      onError?.('Ошибка при выборе документа');
    }
  };

  const uploadFiles = async (files: (File | { uri: string; name: string; type: string })[]) => {
    setUploading(true);
    setProgress(0);

    try {
      const uploadedFiles: FileUploadResponse[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const uploadedFile = await fileApi.uploadFile(
          file,
          undefined,
          (fileProgress) => {
            const totalProgress = ((i + fileProgress / 100) / files.length) * 100;
            setProgress(totalProgress);
          }
        );

        uploadedFiles.push(uploadedFile);
      }

      const fileIds = uploadedFiles.map(f => f.id);
      onFilesSelected(fileIds);
    } catch (error) {
      console.error('Error uploading files:', error);
      onError?.('Ошибка при загрузке файлов: ' + (error as Error).message);
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

  return (
    <>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.backgroundTertiary }]}
        onPress={() => setMenuVisible(true)}
      >
        <Ionicons name="add" size={24} color={theme.primary} />
      </TouchableOpacity>

      {/* Attachment menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.menuContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.menuItem, { borderBottomColor: theme.border }]}
                  onPress={handleImagePick}
                >
                  <Ionicons name="image-outline" size={24} color={theme.primary} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Фото и видео</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={handleDocumentPick}
                >
                  <Ionicons name="document-attach-outline" size={24} color={theme.primary} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Документ</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 42,
    padding: 8,
    marginRight: 5,
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
    justifyContent: 'flex-end',
    paddingBottom: 80, // Position above message input
    paddingLeft: 16,
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuText: {
    fontSize: 16,
  },
});
