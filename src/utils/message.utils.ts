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
 * Использует IP из переменных окружения
 */
export const replaceLocalhostWithIP = (url: string): string => {
  if (!url) return url;

  // Получаем базовый URL из переменных окружения
  const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8080/api/v1';
  // Извлекаем только протокол и хост (без /api/v1)
  const baseHost = apiBaseUrl.replace(/\/api\/v1$/, '');

  // Заменяем различные варианты localhost
  const replacedUrl = url
    .replace(/http:\/\/localhost:8080/g, baseHost)
    .replace(/http:\/\/127\.0\.0\.1:8080/g, baseHost)
    .replace(/http:\/\/0\.0\.0\.0:8080/g, baseHost);

  // Логирование для отладки (только если произошла замена)
  if (replacedUrl !== url) {
    console.log('🔄 URL replaced:', url, '->', replacedUrl);
  }

  return replacedUrl;
};
