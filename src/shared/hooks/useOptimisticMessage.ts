/**
 * Optimistic Message Hook
 * Мгновенный UI response при отправке сообщений с откатом при ошибке
 */

import { useCallback } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { Message } from '@/features/chat/types/chat.types';
import * as chatApi from '@/features/chat/api/chat.api';

// Счётчик для генерации временных ID
let tempMessageIdCounter = -1;

// Хранилище для отслеживания оптимистичных сообщений
const pendingMessages = new Map<number, {
  tempId: number;
  chatId: number;
  content: string;
  replyToId?: number;
  fileIds?: number[];
  extraData?: any;
  timestamp: number;
}>();

// Таймауты для автоматического rollback
const rollbackTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

// Максимальное время ожидания ответа сервера (30 секунд)
const MAX_PENDING_TIME = 30000;

interface UseOptimisticMessageOptions {
  /** Таймаут для автоматического rollback (мс) */
  rollbackTimeout?: number;
  /** Callback при успешной отправке */
  onSuccess?: (message: Message) => void;
  /** Callback при ошибке */
  onError?: (error: Error, tempId: number) => void;
}

/**
 * Хук для оптимистичной отправки сообщений
 */
export const useOptimisticMessage = (
  chatId: number,
  options: UseOptimisticMessageOptions = {}
) => {
  const {
    rollbackTimeout = MAX_PENDING_TIME,
    onSuccess,
    onError,
  } = options;

  const currentUser = useAuthStore((state) => state.user);

  /**
   * Генерация временного сообщения для мгновенного отображения
   */
  const createOptimisticMessage = useCallback((
    content: string,
    replyToId?: number,
    _fileIds?: number[],
    extraData?: any
  ): Message => {
    const tempId = tempMessageIdCounter--;

    const optimisticMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser?.id || 0,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      is_pinned: false,
      attachments: [],
      reactions: [],
      read_by: [],
      delivered_to: [],
      read_receipts: [],
      reply_to_id: replyToId,
      // Флаг для визуального отображения статуса отправки
      sending: true,
      // Данные отправителя (используем текущего пользователя)
      sender: currentUser || undefined,
      // Дополнительные данные (например, для опросов)
      message_type: extraData?.type || 'text',
      poll_data: extraData?.poll_data,
    };

    return optimisticMessage;
  }, [chatId, currentUser]);

  /**
   * Добавление оптимистичного сообщения в store
   */
  const addOptimisticMessage = useCallback((message: Message) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];

      // Добавляем в конец списка
      return {
        messages: {
          ...state.messages,
          [chatId]: [...existingMessages, message],
        },
        // Обновляем last_message в чате
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? { ...chat, last_message: message }
            : chat
        ),
      };
    });
  }, [chatId]);

  /**
   * Замена временного сообщения на реальное с сервера
   */
  const replaceOptimisticMessage = useCallback((tempId: number, realMessage: Message) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];

      // Находим и заменяем временное сообщение
      const updatedMessages = existingMessages.map((msg) =>
        msg.id === tempId ? { ...realMessage, sending: false } : msg
      );

      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
        // Обновляем last_message реальным сообщением
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? { ...chat, last_message: realMessage }
            : chat
        ),
      };
    });

    // Очищаем из pending
    pendingMessages.delete(tempId);

    // Очищаем таймаут rollback
    const timeout = rollbackTimeouts.get(tempId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);
    }
  }, [chatId]);

  /**
   * Пометка сообщения как неудачного (ошибка отправки)
   */
  const markMessageFailed = useCallback((tempId: number, error?: Error) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];

      const updatedMessages = existingMessages.map((msg) =>
        msg.id === tempId
          ? { ...msg, sending: false, failed: true, error: error?.message }
          : msg
      );

      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
      };
    });
  }, [chatId]);

  /**
   * Откат (удаление) оптимистичного сообщения
   */
  const rollbackOptimisticMessage = useCallback((tempId: number) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];

      // Удаляем временное сообщение
      const filteredMessages = existingMessages.filter((msg) => msg.id !== tempId);

      // Восстанавливаем last_message
      const lastMessage = filteredMessages.length > 0
        ? filteredMessages[filteredMessages.length - 1]
        : undefined;

      return {
        messages: {
          ...state.messages,
          [chatId]: filteredMessages,
        },
        chats: state.chats.map((chat) =>
          chat.id === chatId
            ? { ...chat, last_message: lastMessage }
            : chat
        ),
      };
    });

    // Очищаем из pending
    pendingMessages.delete(tempId);

    // Очищаем таймаут
    const timeout = rollbackTimeouts.get(tempId);
    if (timeout) {
      clearTimeout(timeout);
      rollbackTimeouts.delete(tempId);
    }
  }, [chatId]);

  /**
   * Оптимистичная отправка сообщения
   */
  const sendMessageOptimistic = useCallback(async (
    content: string,
    replyToId?: number,
    fileIds?: number[],
    extraData?: any
  ): Promise<Message | null> => {
    // Валидация
    if (!content.trim() && (!fileIds || fileIds.length === 0)) {
      return null;
    }

    // 1. Создаём оптимистичное сообщение
    const optimisticMessage = createOptimisticMessage(content, replyToId, fileIds, extraData);
    const tempId = optimisticMessage.id;

    // 2. Сохраняем в pending
    pendingMessages.set(tempId, {
      tempId,
      chatId,
      content,
      replyToId,
      fileIds,
      extraData,
      timestamp: Date.now(),
    });

    // 3. Добавляем в store (мгновенный UI response)
    addOptimisticMessage(optimisticMessage);

    // 4. Устанавливаем таймаут для автоматического rollback
    const timeout = setTimeout(() => {
      const pending = pendingMessages.get(tempId);
      if (pending) {
        console.warn(`[OptimisticMessage] Timeout for message ${tempId}, marking as failed`);
        markMessageFailed(tempId, new Error('Timeout'));
        onError?.(new Error('Timeout'), tempId);
      }
    }, rollbackTimeout);
    rollbackTimeouts.set(tempId, timeout);

    // 5. Отправляем на сервер
    try {
      const realMessage = await chatApi.sendMessage(chatId, {
        content: content.trim(),
        reply_to_id: replyToId,
        file_ids: fileIds,
        ...extraData,
      });

      // 6. Заменяем оптимистичное сообщение реальным
      replaceOptimisticMessage(tempId, realMessage);
      onSuccess?.(realMessage);

      return realMessage;
    } catch (error: any) {
      console.error('[OptimisticMessage] Failed to send:', error);

      // Помечаем как неудачное (не удаляем, чтобы пользователь мог повторить)
      markMessageFailed(tempId, error);
      onError?.(error, tempId);

      return null;
    }
  }, [
    chatId,
    createOptimisticMessage,
    addOptimisticMessage,
    replaceOptimisticMessage,
    markMessageFailed,
    rollbackTimeout,
    onSuccess,
    onError,
  ]);

  /**
   * Повторная отправка неудачного сообщения
   */
  const retryMessage = useCallback(async (tempId: number): Promise<boolean> => {
    const pending = pendingMessages.get(tempId);
    if (!pending) {
      // Пытаемся найти сообщение в store
      const messages = useChatStore.getState().messages[chatId] || [];
      const failedMessage = messages.find((msg) => msg.id === tempId && (msg as any).failed);

      if (!failedMessage) {
        console.warn(`[OptimisticMessage] Message ${tempId} not found for retry`);
        return false;
      }

      // Пересоздаём pending из данных сообщения
      pendingMessages.set(tempId, {
        tempId,
        chatId,
        content: failedMessage.content,
        replyToId: failedMessage.reply_to_id,
        fileIds: failedMessage.attachments?.map(a => a.file_id),
        timestamp: Date.now(),
      });
    }

    const messageData = pendingMessages.get(tempId)!;

    // Сбрасываем статус failed
    useChatStore.setState((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) =>
          msg.id === tempId
            ? { ...msg, sending: true, failed: false, error: undefined }
            : msg
        ),
      },
    }));

    try {
      const realMessage = await chatApi.sendMessage(chatId, {
        content: messageData.content.trim(),
        reply_to_id: messageData.replyToId,
        file_ids: messageData.fileIds,
        ...messageData.extraData,
      });

      replaceOptimisticMessage(tempId, realMessage);
      onSuccess?.(realMessage);
      return true;
    } catch (error: any) {
      markMessageFailed(tempId, error);
      onError?.(error, tempId);
      return false;
    }
  }, [chatId, replaceOptimisticMessage, markMessageFailed, onSuccess, onError]);

  /**
   * Удаление неудачного сообщения
   */
  const discardFailedMessage = useCallback((tempId: number) => {
    rollbackOptimisticMessage(tempId);
  }, [rollbackOptimisticMessage]);

  /**
   * Проверка, является ли сообщение оптимистичным
   */
  const isOptimisticMessage = useCallback((messageId: number): boolean => {
    return messageId < 0;
  }, []);

  /**
   * Получение статуса сообщения
   */
  const getMessageStatus = useCallback((messageId: number): 'sending' | 'sent' | 'failed' | null => {
    if (!isOptimisticMessage(messageId)) {
      return 'sent';
    }

    const messages = useChatStore.getState().messages[chatId] || [];
    const message = messages.find((msg) => msg.id === messageId);

    if (!message) return null;
    if ((message as any).failed) return 'failed';
    if ((message as any).sending) return 'sending';
    return 'sent';
  }, [chatId, isOptimisticMessage]);

  return {
    sendMessageOptimistic,
    retryMessage,
    discardFailedMessage,
    rollbackOptimisticMessage,
    isOptimisticMessage,
    getMessageStatus,
  };
};

/**
 * Очистка всех pending сообщений (для logout/cleanup)
 */
export const clearAllPendingMessages = () => {
  pendingMessages.clear();
  rollbackTimeouts.forEach((timeout) => clearTimeout(timeout));
  rollbackTimeouts.clear();
};

export default useOptimisticMessage;
