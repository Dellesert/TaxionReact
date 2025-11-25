/**
 * Passkey Formatters
 * Форматирование данных для Passkey
 */

/**
 * Format date string for passkey display
 */
export const formatPasskeyDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

/**
 * Get confirmation message for deleting passkey
 */
export const getDeletePasskeyMessage = (passkeyName: string | null): string => {
  return `Вы уверены, что хотите удалить "${passkeyName || 'Устройство'}"?`;
};
