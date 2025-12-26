/**
 * About Screen Constants
 * Константы для экрана "О приложении"
 */

export const APP_VERSION = '1.0.0';
export const APP_BUILD = '737';
export const APP_NAME = 'Tachyon Messenger';
export const COMPANY_NAME = 'Tachyon Technologies';
export const SUPPORT_EMAIL = 'support@taxion.ru';
export const WEBSITE_URL = 'https://tahion.spb.ru';

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
