import { useMemo } from 'react';
import { replaceLocalhostWithIP, isImageFile } from '@/features/chat/utils/message.utils';

interface Attachment {
  id: number;
  file_url: string;
  mime_type?: string;
  file_type?: string;
}

/**
 * Хук для подготовки URL изображений
 * Теперь использует expo-image с встроенным кешированием,
 * поэтому не нужно загружать и конвертировать в base64
 */
export const useImageLoader = (attachments?: Attachment[]) => {
  const imageUrls = useMemo(() => {
    if (!attachments || attachments.length === 0) {
      return {};
    }

    const urls: { [key: number]: string } = {};

    for (const attachment of attachments) {
      const mimeType = attachment.mime_type || attachment.file_type || '';
      if (isImageFile(mimeType)) {
        // Просто заменяем localhost на реальный IP
        // expo-image сам загрузит и закеширует изображение
        urls[attachment.id] = replaceLocalhostWithIP(attachment.file_url);
      }
    }

    return urls;
  }, [attachments]);

  return imageUrls;
};
