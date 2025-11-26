import { useMemo } from 'react';
import { Message } from '../types/chat.types';

/**
 * Хук для получения данных отправителя сообщения и отправителя цитируемого сообщения
 *
 * ОПТИМИЗАЦИЯ: Backend теперь всегда возвращает sender в сообщениях
 * Этот хук просто извлекает sender из message объекта
 */
export const useMessageData = (message: Message) => {
  // Sender всегда приходит с бэкенда
  const sender = useMemo(() => message.sender || null, [message.sender]);

  // Reply sender тоже всегда приходит с бэкенда
  const replySender = useMemo(
    () => message.reply_to?.sender || null,
    [message.reply_to?.sender]
  );

  return { sender, replySender };
};
