import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
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

  const handleImagePick = async () => {
    console.log('🔥 handleImagePick called! Platform:', Platform.OS);

    try {
      // Пробуем использовать ImagePicker на всех платформах
      console.log('📸 Requesting media library permissions...');
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        console.error('❌ Media library permission denied');
        onError?.('Нужно разрешение для доступа к галерее');
        return;
      }

      console.log('✅ Media library permission granted');
      console.log('📸 Launching image library...');

      // На iOS используем базовые параметры без allowsMultipleSelection
      const pickerOptions: any = {
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
      };

      // На Android добавляем множественный выбор
      if (Platform.OS === 'android') {
        pickerOptions.allowsMultipleSelection = true;
      }

      console.log('📸 Picker options:', pickerOptions);

      const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);

      console.log('📸 ImagePicker returned!');
      console.log('📸 ImagePicker result:', JSON.stringify(result, null, 2));

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
      console.error('❌ Error picking image:', error);
      onError?.('Ошибка при выборе изображения: ' + (error as Error).message);
    }
  };

  const handleImagePickOld = async () => {
    console.log('🔥 handleImagePick called! Platform:', Platform.OS);

    try {
      // СТАРЫЙ КОД - на случай если новый не сработает
      if (Platform.OS === 'ios') {
        console.log('📸 Using DocumentPicker for iOS (ImagePicker bug workaround)');

        console.log('📸 About to call getDocumentAsync for images/videos...');

        const result = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'video/*'],  // Только изображения и видео
          copyToCacheDirectory: false,
        });

        console.log('📸 DocumentPicker returned!');
        console.log('📸 DocumentPicker result:', JSON.stringify(result, null, 2));

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const fileObjects = await Promise.all(
            result.assets.map(async (asset) => {
              if (asset.uri.startsWith('blob:')) {
                const response = await fetch(asset.uri);
                const blob = await response.blob();
                return new File([blob], asset.name, { type: asset.mimeType || 'image/jpeg' });
              } else {
                return {
                  uri: asset.uri,
                  name: asset.name,
                  type: asset.mimeType || 'image/jpeg',
                };
              }
            })
          );

          await uploadFiles(fileObjects);
        }
      } else {
        // На Android используем ImagePicker как обычно
        console.log('📸 Requesting media library permissions...');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          console.error('❌ Media library permission denied');
          onError?.('Нужно разрешение для доступа к галерее');
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsMultipleSelection: true,
          quality: 0.8,
        });

        console.log('📸 ImagePicker result:', result);

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
      }
    } catch (error) {
      console.error('❌ Error picking image:', error);
      onError?.('Ошибка при выборе изображения: ' + (error as Error).message);
    }
  };

  const handleDocumentPick = async () => {
    console.log('📄 handleDocumentPick called! Platform:', Platform.OS);
    try {
      console.log('📄 Launching document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      console.log('📄 Document picker result:', result);

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
          },
          true  // Make chat attachments public so all chat members can access them
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

  // На iOS убираем modal - он блокирует нативные picker'ы
  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.backgroundTertiary }]}
        onPress={() => {
          console.log('📸 Photo/File button pressed!');
          handleImagePick();
        }}
      >
        <Ionicons name="image-outline" size={20} color={theme.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.backgroundTertiary, marginRight: 5 }]}
        onPress={() => {
          console.log('📄 Document button pressed!');
          handleDocumentPick();
        }}
      >
        <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 5,
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
});
