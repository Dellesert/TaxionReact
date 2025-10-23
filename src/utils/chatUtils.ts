/**
 * Chat Utilities
 * Вспомогательные функции для работы с чатами
 */

import { Chat } from '../types/chat.types';
import { User } from '../types/user.types';

/**
 * Получить отображаемое имя чата
 * Для личных чатов возвращает имя собеседника
 * Для групповых чатов возвращает название чата
 */
export const getChatDisplayName = (chat: Chat, currentUserId?: number): string => {
  // Для личных чатов показываем имя собеседника
  if (chat.type === 'private' && chat.members && currentUserId) {
    const otherMember = chat.members.find(
      (member) => member.user_id !== currentUserId
    );

    if (otherMember?.user) {
      return otherMember.user.full_name || otherMember.user.name || otherMember.user.email;
    }
  }

  // Для групповых чатов или если не удалось найти собеседника
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
 * Для личных чатов возвращает аватар собеседника
 * Для групповых чатов возвращает аватар чата
 */
export const getChatDisplayAvatar = (chat: Chat, currentUserId?: number): string | undefined => {
  // Для личных чатов показываем аватар собеседника
  if (chat.type === 'private') {
    const companion = getPersonalChatCompanion(chat, currentUserId);
    if (companion?.avatar) {
      return companion.avatar;
    }
  }

  // Для групповых чатов или если не удалось найти собеседника
  return chat.avatar || chat.avatar;
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
