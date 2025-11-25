import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Получить текстовую метку даты для разделителя
 * @param date - дата в формате ISO string или Date
 * @returns "Сегодня", "Вчера" или дата в формате "15 октября"
 */
export const getDateLabel = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isToday(dateObj)) {
    return 'Сегодня';
  }

  if (isYesterday(dateObj)) {
    return 'Вчера';
  }

  // Формат: "15 октября"
  return format(dateObj, 'd MMMM', { locale: ru });
};

/**
 * Получить ключ для группировки по дате (только день без времени)
 * @param date - дата в формате ISO string или Date
 * @returns строка в формате YYYY-MM-DD
 */
export const getDateKey = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'yyyy-MM-dd');
};
