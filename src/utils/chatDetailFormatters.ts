/**
 * Chat Detail Formatters
 * Функции форматирования для экрана деталей чата
 */

import { Message } from '@/types/chat.types';

/**
 * Опции действий над сообщением
 */
export interface MessageActionOption {
  text: string;
  onPress: () => void;
  icon: string;
  style?: 'default' | 'destructive';
}

/**
 * Получить опции действий для сообщения
 */
export const getMessageActionOptions = (
  message: Message,
  callbacks: {
    onReply: (message: Message) => void;
    onForward: (message: Message) => void;
    onCopy: (message: Message) => void;
    onDelete: (message: Message) => void;
  }
): MessageActionOption[] => {
  return [
    {
      text: 'Ответить',
      onPress: () => callbacks.onReply(message),
      icon: 'arrow-undo',
    },
    {
      text: 'Переслать',
      onPress: () => callbacks.onForward(message),
      icon: 'arrow-redo',
    },
    {
      text: 'Скопировать',
      onPress: () => callbacks.onCopy(message),
      icon: 'copy',
    },
    {
      text: 'Удалить',
      onPress: () => callbacks.onDelete(message),
      style: 'destructive',
      icon: 'trash',
    },
  ];
};

/**
 * Форматирование текста загрузки
 */
export const getLoadingText = (hasMessages: boolean): string => {
  return hasMessages ? 'Загрузка...' : 'Загрузка сообщений...';
};

/**
 * Форматирование текста ошибки
 */
export const getErrorText = (errorType: 'load' | 'send' | 'reaction'): string => {
  switch (errorType) {
    case 'load':
      return 'Не удалось загрузить сообщения';
    case 'send':
      return 'Не удалось отправить сообщение';
    case 'reaction':
      return 'Не удалось добавить реакцию';
    default:
      return 'Произошла ошибка';
  }
};
