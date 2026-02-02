/**
 * User Colors Constants
 * Палитра цветов для пользователей в календаре отпусков
 */

// Предопределенная палитра из 15 различимых цветов
export const USER_COLOR_PALETTE: string[] = [
  '#FF6B6B', // Красный
  '#4ECDC4', // Бирюзовый
  '#45B7D1', // Голубой
  '#96CEB4', // Мятный
  '#FFEAA7', // Жёлтый
  '#DDA0DD', // Сливовый
  '#98D8C8', // Аквамарин
  '#F7DC6F', // Золотой
  '#BB8FCE', // Фиолетовый
  '#85C1E9', // Небесный
  '#F8B500', // Оранжевый
  '#00CED1', // Циан
  '#FF69B4', // Розовый
  '#20B2AA', // Морской
  '#FFD700', // Золото
];

// Дефолтный цвет если не задан
export const DEFAULT_USER_COLOR = '#6366F1';

/**
 * Генерация цвета по ID пользователя (fallback если цвет не задан)
 * @param userId - ID пользователя
 * @returns HEX цвет из палитры
 */
export const getUserColorById = (userId: number): string => {
  return USER_COLOR_PALETTE[userId % USER_COLOR_PALETTE.length];
};

/**
 * Проверка валидности HEX цвета
 * @param color - строка цвета
 * @returns true если валидный HEX
 */
export const isValidHexColor = (color: string): boolean => {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};
