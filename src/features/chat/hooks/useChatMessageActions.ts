/**
 * Custom Hook: useChatMessageActions
 * Управление операциями с сообщениями (отправка, реакции, действия)
 */

import { useCallback, useRef } from 'react';
import { FlatList } from 'react-native';
import { useChatStore } from '@shared/store/chatStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { Message } from '../types/chat.types';
import { getMessageActionOptions } from '../utils/chatDetailFormatters';

interface UseChatMessageActionsReturn {
  flatListRef: React.RefObject<FlatList | null>;
  handleSendMessage: (content: string) => Promise<void>;
  handleReaction: (messageId: number, emoji: string) => Promise<void>;
  handleLongPress: (message: Message) => void;
  handleLoadMore: () => void;
}

export const useChatMessageActions = (chatId: number): UseChatMessageActionsReturn => {
  const { showError } = useNotification();
  const { showOptions } = useActionModal();
  const flatListRef = useRef<FlatList | null>(null);

  // Zustand actions
  const sendMessage = useChatStore((state) => state.sendMessage);
  const addReaction = useChatStore((state) => state.addReaction);

  // Send message handler
  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage(chatId, content);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } catch (error: unknown) {
        const err = error as { message?: string };
        showError(err.message || 'Не удалось отправить сообщение');
        throw error;
      }
    },
    [chatId, sendMessage, showError]
  );

  // Add reaction handler
  const handleReaction = useCallback(
    async (messageId: number, emoji: string) => {
      try {
        await addReaction(messageId, emoji);
      } catch (error) {
        console.error('Failed to add reaction:', error);
        showError('Не удалось добавить реакцию');
      }
    },
    [addReaction, showError]
  );

  // Message action callbacks
  const handleReply = useCallback((message: Message) => {
    // TODO: Implement reply functionality
  }, []);

  const handleForward = useCallback((message: Message) => {
    // TODO: Implement forward functionality
  }, []);

  const handleCopy = useCallback((message: Message) => {
    // TODO: Implement copy to clipboard
  }, []);

  const handleDelete = useCallback((message: Message) => {
    // TODO: Implement delete functionality
  }, []);

  // Long press handler
  const handleLongPress = useCallback(
    (message: Message) => {
      const options = getMessageActionOptions(message, {
        onReply: handleReply,
        onForward: handleForward,
        onCopy: handleCopy,
        onDelete: handleDelete,
      });

      showOptions('Действия с сообщением', options);
    },
    [showOptions, handleReply, handleForward, handleCopy, handleDelete]
  );

  // Load more messages handler
  const handleLoadMore = useCallback(() => {
    // TODO: Implement pagination
  }, []);

  return {
    flatListRef,
    handleSendMessage,
    handleReaction,
    handleLongPress,
    handleLoadMore,
  };
};
