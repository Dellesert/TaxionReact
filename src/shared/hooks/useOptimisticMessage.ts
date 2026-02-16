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

      // Helper to update chat with new message and sort
      const updateChatWithMessage = (chat: any) => {
        if (chat.id === chatId) {
          return { ...chat, last_message: message };
        }
        return chat;
      };

      // Sort chats by last message time
      const sortByLastMessage = (chats: any[]) => {
        return [...chats].sort((a, b) => {
          const timeA = a.last_message?.created_at || a.created_at || '';
          const timeB = b.last_message?.created_at || b.created_at || '';
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
      };

      // Update all tabs
      const updatedTabs = { ...state.tabs };
      (Object.keys(updatedTabs) as Array<'all' | 'private' | 'group' | 'favorite'>).forEach(tabKey => {
        const tab = updatedTabs[tabKey];
        if (!tab.loaded) return;

        // Update and sort regular chats
        const updatedRegular = sortByLastMessage(tab.regularChats.map(updateChatWithMessage));
        const updatedPinned = tab.pinnedChats.map(updateChatWithMessage);

        updatedTabs[tabKey] = {
          ...tab,
          pinnedChats: updatedPinned,
          regularChats: updatedRegular,
        };
      });

      // Reconstruct chats from current tab
      const currentTabData = updatedTabs[state.currentTab];
      const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      return {
        messages: {
          ...state.messages,
          [chatId]: [...existingMessages, message],
        },
        chats: updatedChats,
        tabs: updatedTabs,
      };
    });
  }, [chatId]);

  /**
   * Замена временного сообщения на реальное с сервера
   */
  const replaceOptimisticMessage = useCallback((tempId: number, realMessage: Message) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];

      // Replace optimistic message and remove any WS-delivered duplicate with the same real ID
      const updatedMessages = existingMessages.reduce<Message[]>((acc, msg) => {
        if (msg.id === tempId) {
          // Replace optimistic message with real one
          acc.push({ ...realMessage, sending: false });
        } else if (msg.id === realMessage.id) {
          // Skip WebSocket-delivered duplicate (arrived before API response)
        } else {
          acc.push(msg);
        }
        return acc;
      }, []);

      // Helper to update chat with real message
      const updateChatWithMessage = (chat: any) => {
        if (chat.id === chatId) {
          return { ...chat, last_message: realMessage };
        }
        return chat;
      };

      // Update all tabs
      const updatedTabs = { ...state.tabs };
      (Object.keys(updatedTabs) as Array<'all' | 'private' | 'group' | 'favorite'>).forEach(tabKey => {
        const tab = updatedTabs[tabKey];
        if (!tab.loaded) return;

        updatedTabs[tabKey] = {
          ...tab,
          pinnedChats: tab.pinnedChats.map(updateChatWithMessage),
          regularChats: tab.regularChats.map(updateChatWithMessage),
        };
      });

      // Reconstruct chats from current tab
      const currentTabData = updatedTabs[state.currentTab];
      const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
        chats: updatedChats,
        tabs: updatedTabs,
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

      // Helper to restore last_message in chat
      const restoreChatLastMessage = (chat: any) => {
        if (chat.id === chatId) {
          return { ...chat, last_message: lastMessage };
        }
        return chat;
      };

      // Update all tabs
      const updatedTabs = { ...state.tabs };
      (Object.keys(updatedTabs) as Array<'all' | 'private' | 'group' | 'favorite'>).forEach(tabKey => {
        const tab = updatedTabs[tabKey];
        if (!tab.loaded) return;

        updatedTabs[tabKey] = {
          ...tab,
          pinnedChats: tab.pinnedChats.map(restoreChatLastMessage),
          regularChats: tab.regularChats.map(restoreChatLastMessage),
        };
      });

      // Reconstruct chats from current tab
      const currentTabData = updatedTabs[state.currentTab];
      const updatedChats = [...currentTabData.pinnedChats, ...currentTabData.regularChats];

      return {
        messages: {
          ...state.messages,
          [chatId]: filteredMessages,
        },
        chats: updatedChats,
        tabs: updatedTabs,
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
