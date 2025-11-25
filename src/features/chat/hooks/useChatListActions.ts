import { useCallback } from 'react';
import { useChatStore } from '@store/chatStore';

/**
 * Custom hook for chat list actions (delete, pin, mark as read, favorite, etc.)
 */
export const useChatListActions = () => {
  const {
    deleteChat,
    updateChat,
    leaveChat,
    pinChat,
    unpinChat,
    markChatAsRead,
    toggleFavorite,
    chats,
  } = useChatStore();

  /**
   * Delete a chat
   */
  const handleDeleteChat = useCallback(
    async (chatId: number, clearHistory?: boolean) => {
      try {
        await deleteChat(chatId, clearHistory);
      } catch (error) {
        console.error('Failed to delete chat:', error);
        throw error;
      }
    },
    [deleteChat]
  );

  /**
   * Delete multiple selected chats
   */
  const handleDeleteSelectedChats = useCallback(
    async (selectedChatIds: number[]) => {
      if (selectedChatIds.length === 0) return;

      try {
        await Promise.all(selectedChatIds.map((id) => deleteChat(id)));
      } catch (error) {
        console.error('Failed to delete chats:', error);
        throw error;
      }
    },
    [deleteChat]
  );

  /**
   * Mark multiple chats as read
   */
  const handleMarkSelectedAsRead = useCallback(
    async (selectedChatIds: number[]) => {
      if (selectedChatIds.length === 0) return;

      try {
        await Promise.all(selectedChatIds.map((id) => markChatAsRead(id)));
      } catch (error) {
        console.error('Failed to mark chats as read:', error);
        throw error;
      }
    },
    [markChatAsRead]
  );

  /**
   * Rename a chat
   */
  const handleRenameChat = useCallback(
    async (chatId: number, newName: string) => {
      try {
        await updateChat(chatId, { name: newName });
      } catch (error) {
        console.error('Failed to rename chat:', error);
        throw error;
      }
    },
    [updateChat]
  );

  /**
   * Leave a chat
   */
  const handleLeaveChat = useCallback(
    async (chatId: number) => {
      try {
        await leaveChat(chatId);
      } catch (error) {
        console.error('Failed to leave chat:', error);
        throw error;
      }
    },
    [leaveChat]
  );

  /**
   * Toggle pin status of a chat
   */
  const handleTogglePinned = useCallback(
    async (chatId: number) => {
      try {
        const chat = chats.find((c) => c.id === chatId);
        if (!chat) {
          console.warn('[useChatListActions] handleTogglePinned: chat not found', chatId);
          return;
        }

        console.log(
          '[useChatListActions] handleTogglePinned called for chat',
          chatId,
          'is_pinned:',
          chat.is_pinned
        );

        if (chat.is_pinned) {
          console.log('[useChatListActions] Calling unpinChat...');
          await unpinChat(chatId);
          console.log('[useChatListActions] unpinChat completed');
        } else {
          console.log('[useChatListActions] Calling pinChat...');
          await pinChat(chatId);
          console.log('[useChatListActions] pinChat completed');
        }
      } catch (error) {
        console.error('Failed to toggle pin:', error);
        throw error;
      }
    },
    [chats, pinChat, unpinChat]
  );

  /**
   * Mark a chat as read
   */
  const handleMarkAsRead = useCallback(
    async (chatId: number) => {
      try {
        await markChatAsRead(chatId);
      } catch (error) {
        console.error('Failed to mark chat as read:', error);
        throw error;
      }
    },
    [markChatAsRead]
  );

  /**
   * Toggle favorite status of a chat
   */
  const handleToggleFavorite = useCallback(
    async (chatId: number) => {
      try {
        await toggleFavorite(chatId);
      } catch (error) {
        console.error('Failed to toggle favorite:', error);
        throw error;
      }
    },
    [toggleFavorite]
  );

  return {
    handleDeleteChat,
    handleDeleteSelectedChats,
    handleMarkSelectedAsRead,
    handleRenameChat,
    handleLeaveChat,
    handleTogglePinned,
    handleMarkAsRead,
    handleToggleFavorite,
  };
};
