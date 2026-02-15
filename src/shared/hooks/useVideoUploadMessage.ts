/**
 * Video Upload Message Hook
 * Оптимистичная отправка видео-сообщений с фоновой загрузкой и прогрессом
 */

import { useCallback, useRef } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { Message, PendingVideoFile } from '@/features/chat/types/chat.types';
import { fileApi } from '@api/fileApi';
import * as chatApi from '@/features/chat/api/chat.api';

// Счётчик для генерации временных ID (отрицательные, чтобы не конфликтовать с серверными)
let videoTempIdCounter = -1000;

// Максимальное время ожидания загрузки + конвертации (2 минуты)
const MAX_UPLOAD_TIMEOUT = 120000;

// Доля загрузки в общем прогрессе (0-80%), остальные 80-100% — конвертация на сервере
const UPLOAD_PROGRESS_WEIGHT = 0.8;

// Хранилище данных для retry
const pendingVideoUploads = new Map<number, {
  tempId: number;
  chatId: number;
  content: string;
  replyToId?: number;
  pendingFiles: PendingVideoFile[];
  existingFileIds?: number[];
}>();

/**
 * Хук для отправки сообщений с видео-загрузкой в фоне
 */
export const useVideoUploadMessage = (chatId: number) => {
  const currentUser = useAuthStore((state) => state.user);
  const processingIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  const timeoutsRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  /**
   * Обновить прогресс загрузки на оптимистичном сообщении
   */
  const updateUploadProgress = useCallback((tempId: number, progress: number) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];
      const updatedMessages = existingMessages.map((msg) =>
        msg.id === tempId
          ? { ...msg, upload_progress: Math.round(progress) }
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
   * Создать оптимистичное сообщение с локальными видео-превью
   */
  const createVideoOptimisticMessage = useCallback((
    content: string,
    pendingFiles: PendingVideoFile[],
    replyToId?: number,
  ): Message => {
    const tempId = videoTempIdCounter--;

    // Создаём pseudo-attachments из локальных файлов для отображения
    const pseudoAttachments = pendingFiles.map((file, index) => ({
      id: -(index + 1),
      message_id: tempId,
      file_id: 0,
      file_url: file.localUri,
      file_name: file.fileName,
      file_size: file.fileSize,
      mime_type: file.mimeType,
      file_type: 'video',
      thumbnail_url: undefined,
      duration: file.duration,
      width: file.width,
      height: file.height,
      local_uri: file.localUri,
    }));

    return {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUser?.id || 0,
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_edited: false,
      is_deleted: false,
      is_pinned: false,
      attachments: pseudoAttachments,
      reactions: [],
      read_by: [],
      delivered_to: [],
      read_receipts: [],
      reply_to_id: replyToId,
      sending: true,
      sender: currentUser || undefined,
      message_type: 'video',
      upload_progress: 0,
      pending_video_files: pendingFiles,
    };
  }, [chatId, currentUser]);

  /**
   * Добавить оптимистичное сообщение в store
   */
  const addToStore = useCallback((message: Message) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];

      const updateChatWithMessage = (chat: any) => {
        if (chat.id === chatId) {
          return { ...chat, last_message: message };
        }
        return chat;
      };

      const sortByLastMessage = (chats: any[]) => {
        return [...chats].sort((a, b) => {
          const timeA = a.last_message?.created_at || a.created_at || '';
          const timeB = b.last_message?.created_at || b.created_at || '';
          return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
      };

      const updatedTabs = { ...state.tabs };
      (Object.keys(updatedTabs) as Array<'all' | 'private' | 'group' | 'favorite'>).forEach(tabKey => {
        const tab = updatedTabs[tabKey];
        if (!tab.loaded) return;
        updatedTabs[tabKey] = {
          ...tab,
          pinnedChats: tab.pinnedChats.map(updateChatWithMessage),
          regularChats: sortByLastMessage(tab.regularChats.map(updateChatWithMessage)),
        };
      });

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
   * Заменить оптимистичное сообщение реальным
   */
  const replaceWithReal = useCallback((tempId: number, realMessage: Message) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];
      const updatedMessages = existingMessages.map((msg) =>
        msg.id === tempId
          ? { ...realMessage, sending: false, upload_progress: undefined, pending_video_files: undefined }
          : msg
      );

      const updateChatWithMessage = (chat: any) => {
        if (chat.id === chatId) {
          return { ...chat, last_message: realMessage };
        }
        return chat;
      };

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

    // Cleanup
    pendingVideoUploads.delete(tempId);
    cleanupTimers(tempId);
  }, [chatId]);

  /**
   * Пометить сообщение как неудачное
   */
  const markFailed = useCallback((tempId: number, error?: Error) => {
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];
      const updatedMessages = existingMessages.map((msg) =>
        msg.id === tempId
          ? { ...msg, sending: false, failed: true, error: error?.message, upload_progress: undefined }
          : msg
      );
      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
      };
    });
    cleanupTimers(tempId);
  }, [chatId]);

  /**
   * Очистить таймеры для сообщения
   */
  const cleanupTimers = useCallback((tempId: number) => {
    const interval = processingIntervalsRef.current.get(tempId);
    if (interval) {
      clearInterval(interval);
      processingIntervalsRef.current.delete(tempId);
    }
    const timeout = timeoutsRef.current.get(tempId);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(tempId);
    }
  }, []);

  /**
   * Запустить анимацию прогресса конвертации (80% → 99%)
   */
  const startProcessingAnimation = useCallback((tempId: number) => {
    let currentProgress = 80;
    const interval = setInterval(() => {
      currentProgress = Math.min(99, currentProgress + 1);
      updateUploadProgress(tempId, currentProgress);
      if (currentProgress >= 99) {
        clearInterval(interval);
        processingIntervalsRef.current.delete(tempId);
      }
    }, 500);
    processingIntervalsRef.current.set(tempId, interval);
  }, [updateUploadProgress]);

  /**
   * Отправка сообщения с фоновой загрузкой видео
   */
  const sendMessageWithVideoUpload = useCallback(async (
    content: string,
    replyToId?: number,
    pendingFiles?: PendingVideoFile[],
    existingFileIds?: number[],
  ): Promise<void> => {
    if (!pendingFiles || pendingFiles.length === 0) return;

    // 1. Создаём оптимистичное сообщение
    const optimisticMessage = createVideoOptimisticMessage(content, pendingFiles, replyToId);
    const tempId = optimisticMessage.id;

    // 2. Сохраняем данные для retry
    pendingVideoUploads.set(tempId, {
      tempId,
      chatId,
      content,
      replyToId,
      pendingFiles,
      existingFileIds,
    });

    // 3. Добавляем в store (мгновенный UI)
    addToStore(optimisticMessage);

    // 4. Таймаут
    const timeout = setTimeout(() => {
      if (pendingVideoUploads.has(tempId)) {
        markFailed(tempId, new Error('Превышено время ожидания загрузки'));
      }
    }, MAX_UPLOAD_TIMEOUT);
    timeoutsRef.current.set(tempId, timeout);

    // 5. Загружаем файлы
    try {
      const uploadedFileIds: number[] = [...(existingFileIds || [])];
      let uploadBytesComplete = false;

      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        const fileObj = {
          uri: file.localUri,
          name: file.fileName,
          type: file.mimeType,
        };

        const uploaded = await fileApi.uploadFile(
          fileObj,
          undefined,
          (fileProgress) => {
            // Маппим прогресс загрузки в 0-80%
            const fileWeight = 1 / pendingFiles.length;
            const baseProgress = (i / pendingFiles.length) * UPLOAD_PROGRESS_WEIGHT * 100;
            const currentFileProgress = (fileProgress / 100) * fileWeight * UPLOAD_PROGRESS_WEIGHT * 100;
            const totalProgress = baseProgress + currentFileProgress;

            // Если прогресс достиг ~80% (все байты отправлены), запускаем анимацию конвертации
            if (fileProgress >= 100 && i === pendingFiles.length - 1 && !uploadBytesComplete) {
              uploadBytesComplete = true;
              startProcessingAnimation(tempId);
            } else if (!uploadBytesComplete) {
              updateUploadProgress(tempId, Math.min(80, totalProgress));
            }
          },
          true, // isPublic
        );

        uploadedFileIds.push(uploaded.id);
      }

      // Все файлы загружены и сконвертированы — сервер вернул ответ
      cleanupTimers(tempId);
      updateUploadProgress(tempId, 100);

      // 6. Отправляем реальное сообщение
      const realMessage = await chatApi.sendMessage(chatId, {
        content: content.trim(),
        reply_to_id: replyToId,
        file_ids: uploadedFileIds,
      });

      // 7. Заменяем оптимистичное реальным
      replaceWithReal(tempId, realMessage);

    } catch (error: any) {
      console.error('[VideoUpload] Failed:', error);
      markFailed(tempId, error);
    }
  }, [chatId, createVideoOptimisticMessage, addToStore, markFailed, cleanupTimers, updateUploadProgress, startProcessingAnimation, replaceWithReal]);

  /**
   * Повторная загрузка неудачного видео-сообщения
   */
  const retryVideoUpload = useCallback(async (tempId: number): Promise<void> => {
    const data = pendingVideoUploads.get(tempId);
    if (!data) {
      // Пытаемся восстановить из store
      const messages = useChatStore.getState().messages[chatId] || [];
      const failedMsg = messages.find((msg) => msg.id === tempId && msg.failed);
      if (!failedMsg || !failedMsg.pending_video_files) return;

      pendingVideoUploads.set(tempId, {
        tempId,
        chatId,
        content: failedMsg.content,
        replyToId: failedMsg.reply_to_id,
        pendingFiles: failedMsg.pending_video_files,
      });
    }

    const uploadData = pendingVideoUploads.get(tempId)!;

    // Сбрасываем статус
    useChatStore.setState((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((msg) =>
          msg.id === tempId
            ? { ...msg, sending: true, failed: false, error: undefined, upload_progress: 0 }
            : msg
        ),
      },
    }));

    // Таймаут
    const timeout = setTimeout(() => {
      if (pendingVideoUploads.has(tempId)) {
        markFailed(tempId, new Error('Превышено время ожидания загрузки'));
      }
    }, MAX_UPLOAD_TIMEOUT);
    timeoutsRef.current.set(tempId, timeout);

    try {
      const uploadedFileIds: number[] = [...(uploadData.existingFileIds || [])];
      let uploadBytesComplete = false;

      for (let i = 0; i < uploadData.pendingFiles.length; i++) {
        const file = uploadData.pendingFiles[i];
        const fileObj = {
          uri: file.localUri,
          name: file.fileName,
          type: file.mimeType,
        };

        const uploaded = await fileApi.uploadFile(
          fileObj,
          undefined,
          (fileProgress) => {
            const fileWeight = 1 / uploadData.pendingFiles.length;
            const baseProgress = (i / uploadData.pendingFiles.length) * UPLOAD_PROGRESS_WEIGHT * 100;
            const currentFileProgress = (fileProgress / 100) * fileWeight * UPLOAD_PROGRESS_WEIGHT * 100;
            const totalProgress = baseProgress + currentFileProgress;

            if (fileProgress >= 100 && i === uploadData.pendingFiles.length - 1 && !uploadBytesComplete) {
              uploadBytesComplete = true;
              startProcessingAnimation(tempId);
            } else if (!uploadBytesComplete) {
              updateUploadProgress(tempId, Math.min(80, totalProgress));
            }
          },
          true,
        );

        uploadedFileIds.push(uploaded.id);
      }

      cleanupTimers(tempId);
      updateUploadProgress(tempId, 100);

      const realMessage = await chatApi.sendMessage(chatId, {
        content: uploadData.content.trim(),
        reply_to_id: uploadData.replyToId,
        file_ids: uploadedFileIds,
      });

      replaceWithReal(tempId, realMessage);
    } catch (error: any) {
      console.error('[VideoUpload] Retry failed:', error);
      markFailed(tempId, error);
    }
  }, [chatId, markFailed, cleanupTimers, updateUploadProgress, startProcessingAnimation, replaceWithReal]);

  /**
   * Отменить загрузку и удалить сообщение
   */
  const cancelVideoUpload = useCallback((tempId: number) => {
    cleanupTimers(tempId);
    pendingVideoUploads.delete(tempId);

    // Удаляем сообщение из store
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];
      const filteredMessages = existingMessages.filter((msg) => msg.id !== tempId);

      const lastMessage = filteredMessages.length > 0
        ? filteredMessages[filteredMessages.length - 1]
        : undefined;

      const restoreChatLastMessage = (chat: any) => {
        if (chat.id === chatId) {
          return { ...chat, last_message: lastMessage };
        }
        return chat;
      };

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
  }, [chatId, cleanupTimers]);

  return {
    sendMessageWithVideoUpload,
    retryVideoUpload,
    cancelVideoUpload,
  };
};

export default useVideoUploadMessage;
