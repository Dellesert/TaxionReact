/**
 * About Screen Helpers
 * Вспомогательные функции для экрана "О приложении"
 */

import { Platform } from 'react-native';

/**
 * Получить название платформы для отображения
 */
export const getPlatformName = (): string => {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';
  return 'Web';
};

/**
 * Форматирование текста версии
 */
export const formatVersionText = (version: string, build: string): string => {
  return `Версия ${version} (${build})`;
};

/**
 * Форматирование текста копирайта
 */
export const formatCopyrightText = (companyName: string): string => {
  const year = new Date().getFullYear();
  return `© ${year} ${companyName}`;
};
