/**
 * Custom Hook: useChatAvatar
 * Управление аватаром чата
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { fileApi } from '@api/fileApi';
import { useChatStore } from '@store/chatStore';
import { useNotification } from '@contexts/NotificationContext';

interface UseChatAvatarReturn {
  isUploadingAvatar: boolean;
  changeAvatar: () => Promise<void>;
}

export const useChatAvatar = (chatId: number): UseChatAvatarReturn => {
  const { showError } = useNotification();
  const updateChat = useChatStore((state) => state.updateChat);

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const changeAvatar = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        // Web implementation using file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = async (e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) return;

          // Validate file size (max 5MB)
          if (file.size > 5 * 1024 * 1024) {
            showError('Размер файла не должен превышать 5 МБ');
            return;
          }

          // Validate file type
          if (!file.type.startsWith('image/')) {
            showError('Пожалуйста, выберите изображение');
            return;
          }

          setIsUploadingAvatar(true);

          try {
            console.log('📤 Uploading chat avatar...');

            // Upload file to file-service as PUBLIC file
            const uploadedFile = await fileApi.uploadFile(file, 'avatar', undefined, true);
            console.log('✅ Avatar uploaded:', uploadedFile);

            // Use public file URL
            const avatarUrl = fileApi.getPublicFileUrl(uploadedFile.file_name);
            console.log('📸 Public Avatar URL:', avatarUrl);

            // Update chat with new avatar URL
            await updateChat(chatId, { avatar: avatarUrl });
            console.log('✅ Chat updated with new avatar');
          } catch (error) {
            console.error('❌ Failed to upload chat avatar:', error);
            showError('Не удалось обновить изображение. Попробуйте снова.');
          } finally {
            setIsUploadingAvatar(false);
          }
        };

        input.click();
      } else {
        // Mobile implementation using expo-image-picker
        console.log('📸 Requesting media library permissions...');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          showError('Нужно разрешение для доступа к галерее');
          return;
        }

        console.log('📸 Opening image picker...');
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          console.log('📸 Image picker cancelled');
          return;
        }

        const asset = result.assets[0];

        // Validate file size (max 5MB) if available
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          showError('Размер файла не должен превышать 5 МБ');
          return;
        }

        setIsUploadingAvatar(true);

        try {
          console.log('📤 Uploading chat avatar from mobile...');

          // Create file object for mobile
          const file = {
            uri: asset.uri,
            name: asset.fileName || `avatar_${Date.now()}.jpg`,
            type: asset.type === 'image' ? 'image/jpeg' : asset.mimeType || 'image/jpeg',
          };

          // Upload file to file-service as PUBLIC file
          const uploadedFile = await fileApi.uploadFile(file, 'avatar', undefined, true);
          console.log('✅ Avatar uploaded:', uploadedFile);

          // Use public file URL
          const avatarUrl = fileApi.getPublicFileUrl(uploadedFile.file_name);
          console.log('📸 Public Avatar URL:', avatarUrl);

          // Update chat with new avatar URL
          await updateChat(chatId, { avatar: avatarUrl });
          console.log('✅ Chat updated with new avatar');
        } catch (error) {
          console.error('❌ Failed to upload chat avatar:', error);
          showError('Не удалось обновить изображение. Попробуйте снова.');
        } finally {
          setIsUploadingAvatar(false);
        }
      }
    } catch (error) {
      console.error('❌ Error opening file picker:', error);
      showError('Не удалось открыть выбор файла');
    }
  }, [chatId, showError, updateChat]);

  return {
    isUploadingAvatar,
    changeAvatar,
  };
};
