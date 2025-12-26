/**
 * About Screen Helpers
 * Вспомогательные функции для экрана "О приложении"
 */

import { Platform } from 'react-native';

// Check if running in Electron
const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;

/**
 * Получить название платформы для отображения
 */
export const getPlatformName = (): string => {
  if (Platform.OS === 'ios') return 'iOS';
  if (Platform.OS === 'android') return 'Android';

  // Check for Electron (desktop)
  if (isElectron) {
    const electronPlatform = (window as any).electron?.platform;
    if (electronPlatform === 'win32') return 'Windows';
    if (electronPlatform === 'darwin') return 'macOS';
    if (electronPlatform === 'linux') return 'Linux';
    return 'Desktop';
  }

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
