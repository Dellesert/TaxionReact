import { useState, useCallback } from 'react';

/**
 * Custom hook for handling message selection mode
 */
export const useSelectionMode = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [forwardModalVisible, setForwardModalVisible] = useState(false);

  const handleEnterSelectionMode = useCallback((messageId: number) => {
    setSelectionMode(true);
    setSelectedMessages(new Set([messageId]));
  }, []);

  const handleExitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  }, []);

  const handleToggleMessageSelection = useCallback((messageId: number) => {
    setSelectedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  }, []);

  const handleBulkDelete = useCallback(
    async (
      deleteFor: 'everyone' | 'me',
      onDelete: (messageId: number, deleteFor: 'everyone' | 'me') => Promise<void>
    ) => {
      if (selectedMessages.size === 0) return;

      try {
        const messageIds = Array.from(selectedMessages);
        const { bulkDeleteMessages } = await import('../api/chat.api');

        await bulkDeleteMessages(messageIds, deleteFor);

        if (deleteFor === 'me') {
          // For 'me' deletion, update locally
          for (const messageId of messageIds) {
            await onDelete(messageId, deleteFor);
          }
        }

        handleExitSelectionMode();
      } catch (error) {
        console.error('Failed to delete messages:', error);
        throw error;
      }
    },
    [selectedMessages, handleExitSelectionMode]
  );

  const handleOpenForwardModal = useCallback(() => {
    if (selectedMessages.size === 0) return;
    setForwardModalVisible(true);
  }, [selectedMessages.size]);

  const handleCloseForwardModal = useCallback(() => {
    setForwardModalVisible(false);
  }, []);

  const handleBulkForward = useCallback(
    async (targetChatId: number) => {
      if (selectedMessages.size === 0) return;

      try {
        const messageIds = Array.from(selectedMessages);
        const { bulkForwardMessages } = await import('../api/chat.api');

        const result = await bulkForwardMessages(messageIds, targetChatId);

        console.log(`✅ Forwarded ${result.total_forwarded} messages, ${result.total_failed} failed`);

        handleCloseForwardModal();
        handleExitSelectionMode();

        return result;
      } catch (error) {
        console.error('Failed to forward messages:', error);
        throw error;
      }
    },
    [selectedMessages, handleExitSelectionMode, handleCloseForwardModal]
  );

  return {
    selectionMode,
    selectedMessages,
    forwardModalVisible,
    handleEnterSelectionMode,
    handleExitSelectionMode,
    handleToggleMessageSelection,
    handleBulkDelete,
    handleOpenForwardModal,
    handleCloseForwardModal,
    handleBulkForward,
  };
};
