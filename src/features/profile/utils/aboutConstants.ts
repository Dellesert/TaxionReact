/**
 * About Screen Constants
 * Константы для экрана "О приложении"
 */

import Constants from 'expo-constants';

// Версия берется автоматически из app.json
export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
// Build номер из нативных настроек (ios.buildNumber / android.versionCode)
export const APP_BUILD = Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1';
export const APP_NAME = 'Tachyon Messenger';
export const COMPANY_NAME = 'Tachyon Technologies';
export const SUPPORT_EMAIL = 'mishajackson@inbox.ru';
export const WEBSITE_URL = 'https://exmple.com';

export const APP_DESCRIPTION =
  'Tachyon Messenger — современный корпоративный мессенджер с функциями управления задачами, ' +
  'опросами и календарем событий. Приложение разработано для эффективной коммуникации ' +
  'внутри организации и повышения продуктивности команды.';

export const APP_FEATURES = [
  { icon: 'chatbubbles' as const, text: 'Личные и групповые чаты' },
  { icon: 'checkbox' as const, text: 'Управление задачами' },
  { icon: 'bar-chart' as const, text: 'Опросы и голосования' },
  { icon: 'calendar' as const, text: 'Календарь событий' },
  { icon: 'shield-checkmark' as const, text: 'Безопасная аутентификация' },
];

export const CONTACT_LINKS = [
  {
    icon: 'globe-outline' as const,
    text: 'Веб-сайт',
    action: 'website' as const,
  },
  {
    icon: 'mail-outline' as const,
    text: 'Поддержка',
    action: 'email' as const,
  },
];
