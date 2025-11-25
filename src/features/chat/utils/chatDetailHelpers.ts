/**
 * Chat Detail Helpers
 * Вспомогательные функции для экрана деталей чата
 */

import { Message } from '../types/chat.types';

/**
 * Проверка, является ли сообщение собственным
 */
export const isOwnMessage = (message: Message, currentUserId: number | undefined): boolean => {
  return message.sender_id === currentUserId;
};

/**
 * Проверка валидности chat ID
 */
export const isValidChatId = (chatId: number): boolean => {
  return Boolean(chatId) && !isNaN(chatId);
};

/**
 * Проверка, нужно ли показывать загрузку
 */
export const shouldShowLoading = (isLoading: boolean, messagesCount: number): boolean => {
  return isLoading && messagesCount === 0;
};
