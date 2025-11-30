/**
 * Avatar Utilities
 * Вспомогательные функции для работы с аватарами
 */

import { User } from '@/types/user.types';

export type AvatarContext = 'list' | 'profile' | 'chat' | 'small' | 'medium' | 'large';

/**
 * Получить подходящий URL аватара в зависимости от контекста
 * @param user - Пользователь
 * @param context - Контекст использования аватара
 * @returns URL аватара или undefined
 */
export const getAvatarUrl = (user: User | null | undefined, context: AvatarContext = 'chat'): string | undefined => {
  if (!user) return undefined;

  // В профиле всегда используем оригинал
  if (context === 'profile' || context === 'large') {
    return user.avatar;
  }

  // В списках, чате и для маленьких размеров используем thumbnail (если есть)
  // С fallback на оригинал
  if (context === 'list' || context === 'chat' || context === 'small' || context === 'medium') {
    return user.avatar_thumbnail || user.avatar;
  }

  return user.avatar;
};

/**
 * Получить URL thumbnail аватара
 * @param user - Пользователь
 * @returns URL thumbnail или undefined
 */
export const getAvatarThumbnailUrl = (user: User | null | undefined): string | undefined => {
  if (!user) return undefined;
  return user.avatar_thumbnail;
};

/**
 * Получить URL оригинального аватара
 * @param user - Пользователь
 * @returns URL оригинала или undefined
 */
export const getAvatarOriginalUrl = (user: User | null | undefined): string | undefined => {
  if (!user) return undefined;
  return user.avatar;
};
