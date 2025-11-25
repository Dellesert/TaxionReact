import { useState, useCallback } from 'react';

/**
 * Custom hook for handling message selection mode
 */
export const useSelectionMode = () => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());

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
        const { bulkDeleteMessages } = await import('@api/chat.api');

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

  return {
    selectionMode,
    selectedMessages,
    handleEnterSelectionMode,
    handleExitSelectionMode,
    handleToggleMessageSelection,
    handleBulkDelete,
  };
};
