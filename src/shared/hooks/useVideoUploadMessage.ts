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
import { websocketService } from '@services/websocket.service';

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
  const trickleIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());
  // Хранит текущий реальный прогресс XHR для каждого tempId
  const realProgressRef = useRef<Map<number, number>>(new Map());
  // Хранит текущий отображаемый прогресс trickle для каждого tempId
  const trickleProgressRef = useRef<Map<number, number>>(new Map());
  // Хранит ссылки на XHR для отмены загрузки (ключ: "tempId_fileIndex")
  const xhrRefsRef = useRef<Map<string, XMLHttpRequest>>(new Map());
  // Множество отменённых загрузок — чтобы не отправлять сообщение после завершения XHR
  const cancelledUploadsRef = useRef<Set<number>>(new Set());
  // Индексы отменённых файлов внутри конкретного сообщения (для поштучной отмены)
  const cancelledFileIndicesRef = useRef<Map<number, Set<number>>>(new Map());
  // Интервалы повторной отправки typing-индикатора при загрузке (чтобы не исчез по таймауту 5 сек)
  const typingIntervalsRef = useRef<Map<number, ReturnType<typeof setInterval>>>(new Map());

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
      file_type: file.mimeType.startsWith('video/') ? 'video' : 'image',
      thumbnail_url: undefined,
      duration: file.duration,
      width: file.width,
      height: file.height,
      local_uri: file.localUri,
    }));

    // Определяем тип сообщения: если есть хотя бы одно видео — 'video', иначе 'image'
    const hasVideo = pendingFiles.some(f => f.mimeType.startsWith('video/'));
    const messageType = hasVideo ? 'video' : 'image';

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
      message_type: messageType,
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
      // Replace optimistic message and remove any WS-delivered duplicate with the same real ID
      const updatedMessages = existingMessages.reduce<Message[]>((acc, msg) => {
        if (msg.id === tempId) {
          // Replace optimistic message with real one
          acc.push({ ...realMessage, sending: false, upload_progress: undefined, pending_video_files: undefined });
        } else if (msg.id === realMessage.id) {
          // Skip WebSocket-delivered duplicate (arrived before API response)
        } else {
          acc.push(msg);
        }
        return acc;
      }, []);

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
    const trickle = trickleIntervalsRef.current.get(tempId);
    if (trickle) {
      clearInterval(trickle);
      trickleIntervalsRef.current.delete(tempId);
    }
    const typingInterval = typingIntervalsRef.current.get(tempId);
    if (typingInterval) {
      clearInterval(typingInterval);
      typingIntervalsRef.current.delete(tempId);
    }
    realProgressRef.current.delete(tempId);
    trickleProgressRef.current.delete(tempId);
  }, []);

  /**
   * Запустить trickle-анимацию (0% → 70%) как fallback на случай,
   * когда XHR progress events не приходят (частая проблема на React Native iOS).
   * Реальный прогресс от XHR всегда имеет приоритет, если он больше.
   */
  const startTrickleAnimation = useCallback((tempId: number) => {
    trickleProgressRef.current.set(tempId, 1);
    realProgressRef.current.set(tempId, 0);

    // Сразу показываем 1% чтобы пользователь видел, что загрузка началась
    updateUploadProgress(tempId, 1);

    // Скорость trickle зависит от размера файла:
    // Маленькие файлы (< 5MB) — быстрее, большие — медленнее
    const maxTrickle = 70; // Trickle не идёт дальше 70%, оставляем место для реального прогресса
    const interval = setInterval(() => {
      const currentTrickle = trickleProgressRef.current.get(tempId) || 0;
      const currentReal = realProgressRef.current.get(tempId) || 0;

      if (currentTrickle >= maxTrickle || currentReal >= maxTrickle) {
        clearInterval(interval);
        trickleIntervalsRef.current.delete(tempId);
        return;
      }

      // Замедляемся по мере приближения к maxTrickle (ease-out)
      const remaining = maxTrickle - currentTrickle;
      const increment = Math.max(0.5, remaining * 0.08);
      const newTrickle = Math.min(maxTrickle, currentTrickle + increment);
      trickleProgressRef.current.set(tempId, newTrickle);

      // Отображаемый прогресс = max(trickle, realProgress) — всегда показываем бОльший
      const displayProgress = Math.max(newTrickle, currentReal);
      updateUploadProgress(tempId, displayProgress);
    }, 300);

    trickleIntervalsRef.current.set(tempId, interval);
  }, [updateUploadProgress]);

  /**
   * Обновить реальный прогресс от XHR, останавливает trickle если реальный прогресс больше
   */
  const updateRealProgress = useCallback((tempId: number, progress: number) => {
    realProgressRef.current.set(tempId, progress);
    const currentTrickle = trickleProgressRef.current.get(tempId) || 0;
    const displayProgress = Math.max(progress, currentTrickle);
    updateUploadProgress(tempId, Math.min(80, displayProgress));

    // Если реальный прогресс обогнал trickle, останавливаем trickle
    if (progress >= 70) {
      const trickle = trickleIntervalsRef.current.get(tempId);
      if (trickle) {
        clearInterval(trickle);
        trickleIntervalsRef.current.delete(tempId);
      }
    }
  }, [updateUploadProgress]);

  /**
   * Запустить анимацию прогресса конвертации (80% → 99%)
   */
  const startProcessingAnimation = useCallback((tempId: number) => {
    // Останавливаем trickle перед началом processing animation
    const trickle = trickleIntervalsRef.current.get(tempId);
    if (trickle) {
      clearInterval(trickle);
      trickleIntervalsRef.current.delete(tempId);
    }

    let currentProgress = 80;
    updateUploadProgress(tempId, 80);
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
    if (!pendingFiles || pendingFiles.length === 0) {
      console.warn('[VideoUpload] No pending files to upload, skipping');
      return;
    }


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

    // 3.5. Отправляем индикатор "отправляет фото/видео" и повторяем каждые 3 сек
    const hasVideo = pendingFiles.some(f => f.mimeType.startsWith('video/'));
    const uploadAction = hasVideo ? 'uploading_video' : 'uploading_photo';
    websocketService.sendTyping(chatId, true, uploadAction);
    const typingInterval = setInterval(() => {
      websocketService.sendTyping(chatId, true, uploadAction);
    }, 3000);
    typingIntervalsRef.current.set(tempId, typingInterval);

    // 4. Запускаем trickle-анимацию (плавный прогресс как fallback, если XHR events не приходят)
    startTrickleAnimation(tempId);

    // 5. Таймаут
    const timeout = setTimeout(() => {
      if (pendingVideoUploads.has(tempId)) {
        markFailed(tempId, new Error('Превышено время ожидания загрузки'));
      }
    }, MAX_UPLOAD_TIMEOUT);
    timeoutsRef.current.set(tempId, timeout);

    // 6. Загружаем файлы
    try {
      const uploadedFileIds: number[] = [...(existingFileIds || [])];
      let uploadBytesComplete = false;

      // Количество не-отменённых файлов (для расчёта прогресса)
      const activeFileCount = () => {
        const cancelled = cancelledFileIndicesRef.current.get(tempId);
        return cancelled ? pendingFiles.length - cancelled.size : pendingFiles.length;
      };

      for (let i = 0; i < pendingFiles.length; i++) {
        // Пропускаем файлы, отменённые поштучно
        if (cancelledFileIndicesRef.current.get(tempId)?.has(i)) {
          continue;
        }

        // Проверяем полную отмену сообщения
        if (cancelledUploadsRef.current.has(tempId)) {
          return;
        }

        const file = pendingFiles[i];
        const fileObj = {
          uri: file.localUri,
          name: file.fileName,
          type: file.mimeType,
        };

        const xhrKey = `${tempId}_${i}`;

        try {
          const uploaded = await fileApi.uploadFile(
            fileObj,
            undefined,
            (fileProgress) => {
              // Маппим прогресс загрузки в 0-80%
              const total = activeFileCount();
              const fileWeight = 1 / total;
              const completedBefore = uploadedFileIds.length - (existingFileIds || []).length;
              const baseProgress = (completedBefore / total) * UPLOAD_PROGRESS_WEIGHT * 100;
              const currentFileProgress = (fileProgress / 100) * fileWeight * UPLOAD_PROGRESS_WEIGHT * 100;
              const totalProgress = baseProgress + currentFileProgress;

              // Если прогресс достиг ~80% (все байты отправлены) и это последний активный файл, запускаем анимацию конвертации
              const isLastActiveFile = (() => {
                const cancelled = cancelledFileIndicesRef.current.get(tempId);
                for (let j = i + 1; j < pendingFiles.length; j++) {
                  if (!cancelled?.has(j)) return false;
                }
                return true;
              })();

              if (fileProgress >= 100 && isLastActiveFile && !uploadBytesComplete) {
                uploadBytesComplete = true;
                startProcessingAnimation(tempId);
              } else if (!uploadBytesComplete) {
                // Используем updateRealProgress — он сам сравнит с trickle и покажет бОльшее значение
                updateRealProgress(tempId, totalProgress);
              }
            },
            true, // isPublic
            (xhr) => { xhrRefsRef.current.set(xhrKey, xhr); },
          );

          xhrRefsRef.current.delete(xhrKey);

          // Проверяем, не была ли загрузка отменена целиком пока шёл upload
          if (cancelledUploadsRef.current.has(tempId)) {
            return;
          }

          // Проверяем, не был ли этот конкретный файл отменён во время загрузки
          if (cancelledFileIndicesRef.current.get(tempId)?.has(i)) {
            continue;
          }

          uploadedFileIds.push(uploaded.id);
        } catch (fileError: any) {
          xhrRefsRef.current.delete(xhrKey);

          // Если загрузка целиком отменена — выходим
          if (cancelledUploadsRef.current.has(tempId)) {
            return;
          }

          // Если этот конкретный файл был отменён — пропускаем, продолжаем остальные
          if (cancelledFileIndicesRef.current.get(tempId)?.has(i)) {
            continue;
          }

          // Реальная ошибка загрузки — пробрасываем наверх
          throw fileError;
        }
      }

      // Проверяем отмену перед отправкой сообщения
      if (cancelledUploadsRef.current.has(tempId)) {
        cancelledUploadsRef.current.delete(tempId);
        return;
      }

      // Если все файлы были отменены поштучно — очищаем сообщение
      const existingOnly = (existingFileIds || []).length;
      if (uploadedFileIds.length <= existingOnly) {
        cancelledUploadsRef.current.add(tempId);
        cleanupTimers(tempId);
        pendingVideoUploads.delete(tempId);
        websocketService.sendTyping(chatId, false);
        // Удаляем оптимистичное сообщение
        useChatStore.setState((state) => ({
          messages: {
            ...state.messages,
            [chatId]: (state.messages[chatId] || []).filter((msg) => msg.id !== tempId),
          },
        }));
        return;
      }

      // Все файлы загружены и сконвертированы — сервер вернул ответ
      cleanupTimers(tempId);
      updateUploadProgress(tempId, 100);
      websocketService.sendTyping(chatId, false);


      // 6. Отправляем реальное сообщение
      const realMessage = await chatApi.sendMessage(chatId, {
        content: content.trim(),
        reply_to_id: replyToId,
        file_ids: uploadedFileIds,
      });


      // 7. Заменяем оптимистичное реальным
      replaceWithReal(tempId, realMessage);

    } catch (error: any) {
      // Если загрузка была отменена — не помечаем как failed (сообщение уже удалено)
      if (cancelledUploadsRef.current.has(tempId)) {
        cancelledUploadsRef.current.delete(tempId);
        return;
      }
      console.error('[VideoUpload] Failed:', error);
      websocketService.sendTyping(chatId, false);
      markFailed(tempId, error);
    }
  }, [chatId, createVideoOptimisticMessage, addToStore, markFailed, cleanupTimers, updateRealProgress, startTrickleAnimation, startProcessingAnimation, replaceWithReal]);

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

    // Запускаем trickle-анимацию для retry
    startTrickleAnimation(tempId);

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

        const xhrKey = `${tempId}_${i}`;

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
              updateRealProgress(tempId, totalProgress);
            }
          },
          true,
          (xhr) => { xhrRefsRef.current.set(xhrKey, xhr); },
        );

        xhrRefsRef.current.delete(xhrKey);

        if (cancelledUploadsRef.current.has(tempId)) {
          cancelledUploadsRef.current.delete(tempId);
          return;
        }

        uploadedFileIds.push(uploaded.id);
      }

      if (cancelledUploadsRef.current.has(tempId)) {
        cancelledUploadsRef.current.delete(tempId);
        return;
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
      if (cancelledUploadsRef.current.has(tempId)) {
        cancelledUploadsRef.current.delete(tempId);
        return;
      }
      console.error('[VideoUpload] Retry failed:', error);
      markFailed(tempId, error);
    }
  }, [chatId, markFailed, cleanupTimers, updateUploadProgress, updateRealProgress, startTrickleAnimation, startProcessingAnimation, replaceWithReal]);

  /**
   * Отменить загрузку и удалить сообщение целиком
   */
  const cancelVideoUpload = useCallback((tempId: number) => {
    // Прерываем все XHR для этого сообщения
    for (const [key, xhr] of xhrRefsRef.current.entries()) {
      if (key.startsWith(`${tempId}_`)) {
        xhr.abort();
        xhrRefsRef.current.delete(key);
      }
    }
    // Помечаем как отменённый, чтобы async flow не продолжал отправку
    cancelledUploadsRef.current.add(tempId);
    cancelledFileIndicesRef.current.delete(tempId);
    websocketService.sendTyping(chatId, false);

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

  /**
   * Отменить загрузку конкретного файла (по индексу) внутри сообщения.
   * Если после отмены не осталось активных файлов — удаляет сообщение целиком.
   */
  const cancelSingleFileUpload = useCallback((tempId: number, fileIndex: number) => {
    // Запоминаем индекс отменённого файла
    if (!cancelledFileIndicesRef.current.has(tempId)) {
      cancelledFileIndicesRef.current.set(tempId, new Set());
    }
    cancelledFileIndicesRef.current.get(tempId)!.add(fileIndex);

    // Прерываем XHR этого конкретного файла
    const xhrKey = `${tempId}_${fileIndex}`;
    const xhr = xhrRefsRef.current.get(xhrKey);
    if (xhr) {
      xhr.abort();
      xhrRefsRef.current.delete(xhrKey);
    }

    // Проверяем, есть ли ещё активные файлы в этом сообщении
    const uploadData = pendingVideoUploads.get(tempId);
    const totalFiles = uploadData?.pendingFiles.length ?? 0;
    const cancelledCount = cancelledFileIndicesRef.current.get(tempId)?.size ?? 0;

    if (cancelledCount >= totalFiles) {
      // Все файлы отменены — удаляем сообщение целиком
      cancelVideoUpload(tempId);
      return;
    }

    // Удаляем только этот файл из оптимистичного сообщения в store
    useChatStore.setState((state) => {
      const existingMessages = state.messages[chatId] || [];
      const updatedMessages = existingMessages.map((msg) => {
        if (msg.id !== tempId) return msg;
        const updatedAttachments = (msg.attachments || []).filter((_, idx) => idx !== fileIndex);
        const updatedPendingFiles = (msg.pending_video_files || []).filter((_, idx) => idx !== fileIndex);
        return {
          ...msg,
          attachments: updatedAttachments,
          pending_video_files: updatedPendingFiles,
        };
      });
      return {
        messages: {
          ...state.messages,
          [chatId]: updatedMessages,
        },
      };
    });
  }, [chatId, cancelVideoUpload]);

  return {
    sendMessageWithVideoUpload,
    retryVideoUpload,
    cancelVideoUpload,
    cancelSingleFileUpload,
  };
};

export default useVideoUploadMessage;
