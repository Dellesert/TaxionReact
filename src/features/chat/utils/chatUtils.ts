/**
 * Chat Utilities
 * Вспомогательные функции для работы с чатами
 */

import { Chat } from '../types/chat.types';
import { User } from '@/types/user.types';

/**
 * Получить отображаемое имя чата
 * Бекенд уже возвращает правильное имя для личных чатов (имя собеседника)
 * Для групповых чатов возвращает название чата
 */
export const getChatDisplayName = (chat: Chat, currentUserId?: number): string => {
  // Бекенд уже подставил правильное имя для всех типов чатов
  return chat.name || 'Без названия';
};

/**
 * Получить собеседника в личном чате
 */
export const getPersonalChatCompanion = (chat: Chat, currentUserId?: number): User | null => {
  if (chat.type !== 'private' || !chat.members || !currentUserId) {
    return null;
  }

  const otherMember = chat.members.find(
    (member) => member.user_id !== currentUserId
  );

  return otherMember?.user || null;
};

/**
 * Получить аватар для отображения чата
 * Бекенд уже возвращает правильный аватар для личных чатов (аватар собеседника)
 * Для групповых чатов возвращает аватар чата
 */
export const getChatDisplayAvatar = (chat: Chat, currentUserId?: number): string | undefined => {
  // Бекенд уже подставил правильный аватар для всех типов чатов
  return chat.avatar;
};

/**
 * Получить thumbnail аватара для отображения чата в списках
 * Бекенд уже возвращает правильный avatar для личных чатов
 * Используем его как thumbnail (на бекенде нет отдельного поля avatar_thumbnail для чатов)
 */
export const getChatDisplayAvatarThumbnail = (chat: Chat, currentUserId?: number): string | undefined => {
  // Бекенд уже подставил правильный аватар для всех типов чатов
  // Используем основной avatar как thumbnail
  return chat.avatar;
};

/**
 * Получить текст статуса пользователя для отображения
 */
export const getUserStatusText = (user: User | null | undefined): string => {
  if (!user) return '';

  if (user.status === 'online') {
    return 'в сети';
  }

  // Проверяем оба поля: last_active_at (из API) и last_seen_at (из типов)
  const lastActiveTime = (user as any).last_active_at || user.last_seen_at;

  if (lastActiveTime) {
    const lastSeen = new Date(lastActiveTime);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Был(а) только что';
    } else if (diffMins < 60) {
      return `Был(а) ${diffMins} мин. назад`;
    } else if (diffHours < 24) {
      return `Был(а) ${diffHours} ч. назад`;
    } else if (diffDays === 1) {
      return 'Был(а) вчера';
    } else if (diffDays < 7) {
      return `Был(а) ${diffDays} дн. назад`;
    } else {
      return 'Был(а) ' + lastSeen.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }
  }

  return 'был(а) давно';
};
