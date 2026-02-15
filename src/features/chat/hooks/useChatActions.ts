import { useState, useCallback } from 'react';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { getChatDisplayName } from '../utils/chatUtils';
import { useOptimisticMessage } from '@shared/hooks/useOptimisticMessage';
import { useVideoUploadMessage } from '@shared/hooks/useVideoUploadMessage';
import { PendingVideoFile } from '../types/chat.types';

/**
 * Хук для обработки действий с сообщениями в чате
 *
 * ОПТИМИЗАЦИЯ:
 * - Извлекает функции из store (они стабильны и не меняются)
 * - Использует оптимистичные обновления для мгновенного UI response
 */
export const useChatActions = (chatId: number) => {
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [pendingVideoFiles, setPendingVideoFiles] = useState<PendingVideoFile[]>([]);

  // Оптимизация: извлекаем функции напрямую (они стабильны в Zustand)
  const sendMessage = useChatStore((state) => state.sendMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const deleteMessageForUser = useChatStore((state) => state.deleteMessageForUser);
  const restoreMessage = useChatStore((state) => state.restoreMessage);
  const deletePermanentMessage = useChatStore((state) => state.deletePermanentMessage);
  const pinMessage = useChatStore((state) => state.pinMessage);
  const unpinMessage = useChatStore((state) => state.unpinMessage);
  const getChatById = useChatStore((state) => state.getChatById);
  const setError = useChatStore((state) => state.set);
  const currentUser = useAuthStore((state) => state.user);

  // Оптимистичные сообщения для мгновенного UI response
  const {
    sendMessageOptimistic,
    retryMessage,
    discardFailedMessage,
    isOptimisticMessage,
    getMessageStatus,
  } = useOptimisticMessage(chatId);

  // Загрузка видео с оптимистичным отображением
  const {
    sendMessageWithVideoUpload,
    retryVideoUpload,
    cancelVideoUpload,
  } = useVideoUploadMessage(chatId);

  /**
   * Callback для FileAttachmentPicker — добавляет pending видео файлы
   */
  const handlePendingVideoFiles = useCallback((files: PendingVideoFile[]) => {
    setPendingVideoFiles((prev) => [...prev, ...files]);
  }, []);

  /**
   * Удалить pending видео по индексу
   */
  const removePendingVideo = useCallback((index: number) => {
    setPendingVideoFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Отправка сообщения с оптимистичным обновлением
   * Сообщение появляется мгновенно, затем подтверждается сервером
   */
  const handleSendMessage = useCallback(async (content: string, replyToId?: number) => {
    if (!content.trim() && selectedFileIds.length === 0 && pendingVideoFiles.length === 0) {
      setError({ error: 'Message content or files are required' });
      return;
    }

    const chat = getChatById(chatId);
    if (!chat) {
      // Don't return here - allow sending message even if chat is not in store yet
      // The chat might be loading or will be created by the message
    }

    try {
      if (content.startsWith('EDIT:')) {
        // Редактирование - не используем оптимистичные обновления
        const parts = content.split(':');
        const messageId = parseInt(parts[1]);
        const newContent = parts.slice(2).join(':');
        await updateMessage(messageId, newContent);
        setEditingMessage(null);
      } else if (pendingVideoFiles.length > 0) {
        // Видео-сообщение — оптимистичная загрузка в фоне
        // Захватываем данные в локальные переменные и очищаем state ДО await,
        // чтобы UI мгновенно обновился и нельзя было нажать "Отправить" повторно
        const filesToUpload = [...pendingVideoFiles];
        const fileIdsToSend = selectedFileIds.length > 0 ? [...selectedFileIds] : undefined;
        setPendingVideoFiles([]);
        setSelectedFileIds([]);
        await sendMessageWithVideoUpload(content.trim(), replyToId, filesToUpload, fileIdsToSend);
      } else {
        // Обычное сообщение — стандартный оптимистичный flow
        const fileIdsToSend = selectedFileIds.length > 0 ? selectedFileIds : undefined;

        // Отправляем с оптимистичным UI
        await sendMessageOptimistic(content.trim(), replyToId, fileIdsToSend);

        // Очищаем выбранные файлы только при успехе
        setSelectedFileIds([]);
      }
    } catch (error: any) {
      console.error('Failed to send/edit message:', error);
      // Ошибки обрабатываются в useOptimisticMessage / useVideoUploadMessage
    }
  }, [chatId, selectedFileIds, pendingVideoFiles, getChatById, updateMessage, sendMessageOptimistic, sendMessageWithVideoUpload, setError]);

  const handleReply = (message: any) => {
    setReplyingToMessage(message);
  };

  const handleEdit = (message: any) => {
    setEditingMessage(message);
  };

  const handleDelete = async (messageId: number, deleteFor: 'everyone' | 'me') => {
    try {
      // Проверяем, является ли сообщение оптимистичным (ещё не отправлено)
      if (isOptimisticMessage(messageId)) {
        // Просто удаляем локально
        discardFailedMessage(messageId);
        return;
      }

      await deleteMessageForUser(messageId, deleteFor);
    } catch (error: any) {
      console.error('Failed to delete message:', error);
      setError({ error: error.message || 'Failed to delete message' });
    }
  };

  const handleRestore = async (messageId: number) => {
    try {
      await restoreMessage(messageId);
    } catch (error: any) {
      console.error('Failed to restore message:', error);
      setError({ error: error.message || 'Failed to restore message' });
    }
  };

  const handleDeletePermanent = async (messageId: number) => {
    try {
      await deletePermanentMessage(messageId);
    } catch (error: any) {
      console.error('Failed to permanently delete message:', error);
      setError({ error: error.message || 'Failed to permanently delete message' });
    }
  };

  const handlePin = async (messageId: number) => {
    try {
      await pinMessage(messageId);
    } catch (error: any) {
      console.error('Failed to pin message:', error);
      setError({ error: error.message || 'Failed to pin message' });
    }
  };

  const handleUnpin = async (messageId: number) => {
    try {
      await unpinMessage(messageId);
    } catch (error: any) {
      console.error('Failed to unpin message:', error);
      setError({ error: error.message || 'Failed to unpin message' });
    }
  };

  const handleForward = (message: any) => {
    setForwardingMessage(message);
  };

  const handleForwardToChat = async (targetChatId: number) => {
    if (!forwardingMessage) return;

    try {
      // Получаем file_ids из вложений сообщения
      const fileIds = forwardingMessage.attachments?.length > 0
        ? forwardingMessage.attachments.map((attachment: any) => attachment.file_id).filter((id: number) => id > 0)
        : undefined;

      // Если id = 0, это означает пересылку только файлов (например, из ImageViewer)
      // В этом случае не используем forward_from_message_id
      const isFileOnlyForward = forwardingMessage.id === 0 && fileIds && fileIds.length > 0;

      if (isFileOnlyForward) {
        // Пересылка только файлов без ссылки на оригинальное сообщение
        await sendMessage(targetChatId, '', undefined, fileIds, {});
      } else if (forwardingMessage.message_type === 'poll' && forwardingMessage.poll_data) {
        // Для опросов передаём poll_data
        await sendMessage(targetChatId, '', undefined, fileIds, {
          type: 'poll',
          poll_data: forwardingMessage.poll_data,
          forward_from_message_id: forwardingMessage.id,
        });
      } else {
        // Для обычных сообщений просто передаём forward_from_message_id
        await sendMessage(targetChatId, '', undefined, fileIds, {
          forward_from_message_id: forwardingMessage.id,
        });
      }

      // Не удаляем сообщение из исходного чата при пересылке
      // await deleteMessageForUser(forwardingMessage.id, 'me');
    } catch (error: any) {
      console.error('Failed to forward message:', error);
      setError({ error: error.message || 'Failed to forward message' });
      throw error;
    }
  };

  /**
   * Повторная отправка неудачного сообщения (обычного или видео)
   */
  const handleRetryMessage = useCallback(async (messageId: number) => {
    // Проверяем, есть ли pending видео файлы у этого сообщения
    const messages = useChatStore.getState().messages[chatId] || [];
    const failedMsg = messages.find((msg) => msg.id === messageId && msg.failed);

    if (failedMsg?.pending_video_files && failedMsg.pending_video_files.length > 0) {
      // Retry видео-загрузки
      await retryVideoUpload(messageId);
    } else {
      // Retry обычного сообщения
      const success = await retryMessage(messageId);
      if (!success) {
        console.error('Failed to retry message:', messageId);
      }
    }
  }, [chatId, retryMessage, retryVideoUpload]);

  /**
   * Удаление неудачного сообщения
   */
  const handleDiscardFailedMessage = useCallback((messageId: number) => {
    // Проверяем, видео ли это
    const messages = useChatStore.getState().messages[chatId] || [];
    const failedMsg = messages.find((msg) => msg.id === messageId);

    if (failedMsg?.pending_video_files && failedMsg.pending_video_files.length > 0) {
      cancelVideoUpload(messageId);
    } else {
      discardFailedMessage(messageId);
    }
  }, [chatId, discardFailedMessage, cancelVideoUpload]);

  return {
    editingMessage,
    setEditingMessage,
    replyingToMessage,
    setReplyingToMessage,
    highlightedMessageId,
    setHighlightedMessageId,
    forwardingMessage,
    setForwardingMessage,
    selectedFileIds,
    setSelectedFileIds,
    handleSendMessage,
    handleReply,
    handleEdit,
    handleDelete,
    handleRestore,
    handleDeletePermanent,
    handlePin,
    handleUnpin,
    handleForward,
    handleForwardToChat,
    // Оптимистичные сообщения
    handleRetryMessage,
    handleDiscardFailedMessage,
    isOptimisticMessage,
    getMessageStatus,
    // Видео-загрузка
    pendingVideoFiles,
    setPendingVideoFiles,
    handlePendingVideoFiles,
    removePendingVideo,
  };
};
