import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@store/authStore';
import { useNotification } from '@contexts/NotificationContext';
import { useActionModal } from '@contexts/ActionModalContext';
import { fileApi } from '@api/fileApi';
import { updateAvatar } from '@api/user.api';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import { validateAvatarFile } from '@utils/profileHelpers';

/**
 * Hook for managing profile avatar upload
 */
export const useProfileAvatar = () => {
  const { setUser } = useAuthStore();
  const { showSuccess, showError } = useNotification();
  const { showOptions } = useActionModal();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  /**
   * Upload avatar file and update user profile
   */
  const uploadAvatar = useCallback(async (file: File | { uri: string; name: string; type: string }) => {
    setIsUploadingAvatar(true);

    try {
      console.log('📤 Uploading avatar...');

      // Upload file to file-service as PUBLIC file (no auth required to view)
      const uploadedFile = await fileApi.uploadFile(file, 'avatar', undefined, true);
      console.log('✅ Avatar uploaded:', uploadedFile);

      // Use public file URL (no authentication required)
      const avatarUrl = fileApi.getPublicFileUrl(uploadedFile.file_name);
      console.log('📸 Public Avatar URL:', avatarUrl);

      // Update user profile with new avatar URL
      const updatedUser = await updateAvatar(avatarUrl);
      console.log('✅ Profile updated with new avatar:', updatedUser);

      // Update local user state
      setUser(updatedUser);
      console.log('✅ User state updated in store');

      // Also update stored user data
      await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
      console.log('✅ User data saved to storage');

      showSuccess('Фотография профиля обновлена');
    } catch (error) {
      console.error('❌ Failed to upload avatar:', error);
      showError('Не удалось обновить фотографию. Попробуйте снова.');
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [setUser, showSuccess, showError]);

  /**
   * Handle web file input
   */
  const handleWebFileInput = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) return;

      // Validate file
      const validation = validateAvatarFile(file);
      if (!validation.valid) {
        showError(validation.error!);
        return;
      }

      await uploadAvatar(file);
    };

    input.click();
  }, [uploadAvatar, showError]);

  /**
   * Pick image from camera or gallery on mobile
   */
  const pickImageFromSource = useCallback(async (source: 'camera' | 'gallery') => {
    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      const imageUri = asset.uri;

      // Create file object in React Native format
      const fileName = asset.fileName || `avatar_${Date.now()}.jpg`;
      const mimeType = asset.mimeType || (asset.type === 'image' ? 'image/jpeg' : 'image/jpeg');

      const file = {
        uri: imageUri,
        name: fileName,
        type: mimeType,
      };

      await uploadAvatar(file);
    } catch (error) {
      console.error('❌ Error picking image:', error);
      showError('Не удалось выбрать изображение');
    }
  }, [uploadAvatar, showError]);

  /**
   * Handle mobile image picker with permission request
   */
  const handleMobileImagePicker = useCallback(async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      showError('Пожалуйста, разрешите доступ к галерее для загрузки фото');
      return;
    }

    // Show action sheet to choose between camera and gallery
    showOptions(
      'Выбрать фото',
      [
        {
          text: 'Камера',
          icon: 'camera',
          onPress: async () => {
            const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
            if (!cameraPermission.granted) {
              showError('Пожалуйста, разрешите доступ к камере');
              return;
            }
            await pickImageFromSource('camera');
          },
        },
        {
          text: 'Галерея',
          icon: 'image',
          onPress: () => pickImageFromSource('gallery'),
        },
      ]
    );
  }, [showOptions, showError, pickImageFromSource]);

  /**
   * Main handler for changing avatar
   */
  const handleChangeAvatar = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        handleWebFileInput();
      } else {
        await handleMobileImagePicker();
      }
    } catch (error) {
      console.error('❌ Error opening file picker:', error);
      showError('Не удалось открыть выбор файла');
    }
  }, [handleWebFileInput, handleMobileImagePicker, showError]);

  return {
    isUploadingAvatar,
    handleChangeAvatar,
  };
};
