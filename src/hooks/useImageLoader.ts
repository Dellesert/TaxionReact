import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import { replaceLocalhostWithIP, isImageFile } from '@utils/message.utils';

interface Attachment {
  id: number;
  file_url: string;
  mime_type?: string;
  file_type?: string;
}

/**
 * Хук для загрузки изображений с авторизацией
 */
export const useImageLoader = (attachments?: Attachment[]) => {
  const [imageUrls, setImageUrls] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const loadImages = async () => {
      if (!attachments || attachments.length === 0) {
        return;
      }

      const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        return;
      }

      for (const attachment of attachments) {
        const mimeType = attachment.mime_type || attachment.file_type || '';
        if (isImageFile(mimeType) && !imageUrls[attachment.id]) {
          try {
            // Replace localhost with real IP on ALL platforms
            const fileUrl = replaceLocalhostWithIP(attachment.file_url);

            const response = await fetch(fileUrl, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const blob = await response.blob();

              if (Platform.OS === 'web') {
                // На Web используем blob URL (быстрее и меньше памяти)
                const imageUrl = URL.createObjectURL(blob);
                setImageUrls(prev => ({ ...prev, [attachment.id]: imageUrl }));
              } else {
                // На React Native конвертируем blob в base64
                const reader = new FileReader();
                reader.readAsDataURL(blob);

                reader.onloadend = () => {
                  const base64data = reader.result as string;
                  setImageUrls(prev => ({ ...prev, [attachment.id]: base64data }));
                };
              }
            }
          } catch (error) {
            // Silent error handling
          }
        }
      }
    };

    loadImages();

    // Cleanup blob URLs on unmount (только для веб)
    return () => {
      if (Platform.OS === 'web') {
        Object.values(imageUrls).forEach(url => {
          // Только blob URLs нужно освобождать (не base64)
          if (url && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      }
    };
  }, [attachments]);

  return imageUrls;
};
