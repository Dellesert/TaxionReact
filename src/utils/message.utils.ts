/**
 * Утилиты для работы с сообщениями
 */

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
 */
export const isForwardedMessage = (content: string): boolean => {
  return content.startsWith('📩 Переслано от ');
};

/**
 * Парсит пересланное сообщение, извлекая заголовок и контент
 */
export const parseForwardedMessage = (content: string): { header: string | null; content: string } => {
  if (!isForwardedMessage(content)) {
    return { header: null, content };
  }

  const lines = content.split('\n');
  const header = lines[0]; // "📩 Переслано от ..."

  // Находим разделитель и берём контент после него
  const separatorIndex = content.indexOf('─────────────');
  if (separatorIndex !== -1) {
    const parsedContent = content.substring(separatorIndex + 13).trim(); // +13 для длины разделителя
    return { header, content: parsedContent };
  }

  // Если разделителя нет, возвращаем всё кроме первой строки
  return { header, content: lines.slice(1).join('\n').trim() };
};

/**
 * Заменяет localhost на реальный IP адрес для кросс-платформенности
 */
export const replaceLocalhostWithIP = (url: string): string => {
  return url.replace('http://localhost:8080', 'http://192.168.1.160:8080');
};
