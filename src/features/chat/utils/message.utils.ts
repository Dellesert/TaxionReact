/**
 * Утилиты для работы с сообщениями
 */

import { Message } from '../types/chat.types';

/**
 * Форматирует дату сообщения в формат "часы:минуты"
 */
export const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Проверяет, является ли файл изображением
 */
export const isImageFile = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
};

/**
 * Проверяет, является ли сообщение пересланным
 * Поддерживает как новый формат (is_forwarded), так и старый (по префиксу в контенте)
 */
export const isForwardedMessage = (message: Message | string): boolean => {
  // Если передан объект Message - используем новое поле is_forwarded
  if (typeof message === 'object' && message !== null) {
    // Сначала проверяем новое поле
    if (message.is_forwarded === true) {
      return true;
    }
    // Fallback для старых сообщений - проверка по префиксу в контенте
    return message.content?.startsWith('📩 Переслано от ') ?? false;
  }
  // Если передана строка (обратная совместимость)
  return typeof message === 'string' && message.startsWith('📩 Переслано от ');
};

/**
 * Получает имя оригинального отправителя пересланного сообщения
 */
export const getOriginalSenderName = (message: Message): string | null => {
  // Новый формат - используем original_sender
  if (message.original_sender) {
    return message.original_sender.first_name ||
           message.original_sender.name ||
           message.original_sender.email?.split('@')[0] ||
           `User ${message.original_sender_id}`;
  }

  // Fallback для старых сообщений - парсим из контента
  if (message.content?.startsWith('📩 Переслано от ')) {
    const match = message.content.match(/^📩 Переслано от ([^:]+):/);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
};

/**
 * Парсит пересланное сообщение, извлекая заголовок и контент
 * Поддерживает как новый формат (original_sender), так и старый (парсинг из контента)
 */
export const parseForwardedMessage = (message: Message | string): { header: string | null; content: string } => {
  // Если передан объект Message
  if (typeof message === 'object' && message !== null) {
    // Новый формат - сообщение с is_forwarded и original_sender
    if (message.is_forwarded && message.original_sender) {
      const senderName = getOriginalSenderName(message);
      return {
        header: `📩 Переслано от ${senderName}`,
        content: message.content || ''
      };
    }

    // Fallback для старых сообщений
    return parseForwardedMessageFromContent(message.content || '');
  }

  // Если передана строка (обратная совместимость)
  return parseForwardedMessageFromContent(message);
};

/**
 * Внутренняя функция для парсинга старого формата пересланных сообщений
 * @deprecated Используйте parseForwardedMessage с объектом Message
 */
const parseForwardedMessageFromContent = (content: string): { header: string | null; content: string } => {
  if (!content.startsWith('📩 Переслано от ')) {
    return { header: null, content };
  }

  const lines = content.split('\n');
  const header = lines[0]; // "📩 Переслано от ...:"

  // Поддержка старого формата с разделителем (для обратной совместимости)
  const separatorIndex = content.indexOf('─────────────');
  if (separatorIndex !== -1) {
    const parsedContent = content.substring(separatorIndex + 13).trim();
    return { header, content: parsedContent };
  }

  // Новый формат: заголовок с двоеточием, контент со второй строки
  return { header, content: lines.slice(1).join('\n').trim() };
};

/**
 * Заменяет localhost на реальный IP адрес для кросс-платформенности
 * Использует IP из переменных окружения
 */
export const replaceLocalhostWithIP = (url: string): string => {
  if (!url) return url;

  // Получаем базовый URL из переменных окружения
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  // Извлекаем только протокол и хост (без /api/v1)
  const baseHost = apiBaseUrl.replace(/\/api\/v1$/, '');

  // Если URL начинается с /, это относительный путь - добавляем baseHost
  if (url.startsWith('/')) {
    return baseHost + url;
  }

  // Заменяем различные варианты localhost и продакшн URL
  const replacedUrl = url
    .replace(/http:\/\/localhost:8080/g, baseHost)
    .replace(/http:\/\/127\.0\.0\.1:8080/g, baseHost)
    .replace(/http:\/\/0\.0\.0\.0:8080/g, baseHost)
    .replace(/https:\/\/taxion\.fusioninsight\.cloud/g, baseHost);

  return replacedUrl;
};

/**
 * Получает отображаемый контент сообщения с учётом is_deleted
 *
 * ВАЖНО: Бэкенд больше НЕ фильтрует контент удалённых сообщений в WebSocket.
 * Фронтенд ДОЛЖЕН сам проверять флаг is_deleted перед отображением!
 *
 * @param message - Сообщение для обработки
 * @param currentUserId - ID текущего пользователя
 * @returns Отображаемый контент сообщения
 */
export const getDisplayContent = (message: { content: string; is_deleted: boolean; sender_id: number }, currentUserId: number | undefined): string => {
  // Если сообщение удалено
  if (message.is_deleted) {
    // Если это сообщение от текущего пользователя, показываем контент
    // (пользователь может видеть свои удалённые сообщения)
    if (currentUserId !== undefined && message.sender_id === currentUserId) {
      return message.content;
    }
    // Для других пользователей скрываем контент
    return 'Сообщение удалено';
  }

  // Сообщение не удалено - возвращаем контент как есть
  return message.content;
};
