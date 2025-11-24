import { useState, useCallback } from 'react';
import { Poll } from '@/types/poll.types';
import * as pollApi from '@api/poll.api';
import * as chatApi from '@api/chat.api';

interface UsePollActionsReturn {
  isPublishing: boolean;
  isDeleting: boolean;
  handlePublish: (
    poll: Poll,
    onSuccess: () => void,
    onError: (message: string) => void
  ) => Promise<void>;
  handleClose: (
    poll: Poll,
    onSuccess: () => void,
    onError: (message: string) => void,
    showConfirm: (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      options?: any
    ) => void
  ) => void;
  handleDelete: (
    poll: Poll,
    onSuccess: () => void,
    onError: (message: string) => void,
    showConfirm: (
      title: string,
      message: string,
      onConfirm: () => void,
      onCancel?: () => void,
      options?: any
    ) => void
  ) => void;
  handleSharePoll: (poll: Poll, chatId: number) => Promise<void>;
}

/**
 * Custom hook for managing poll actions (publish, close, delete, share)
 */
export const usePollActions = (): UsePollActionsReturn => {
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePublish = useCallback(
    async (
      poll: Poll,
      onSuccess: () => void,
      onError: (message: string) => void
    ) => {
      try {
        setIsPublishing(true);
        await pollApi.updatePollStatus(poll.id, { status: 'active' });
        onSuccess();
      } catch (error: any) {
        console.error('Failed to publish poll:', error);
        onError(error.message || 'Не удалось опубликовать опрос');
      } finally {
        setIsPublishing(false);
      }
    },
    []
  );

  const handleClose = useCallback(
    (
      poll: Poll,
      onSuccess: () => void,
      onError: (message: string) => void,
      showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        options?: any
      ) => void
    ) => {
      showConfirm(
        'Завершить опрос?',
        'Вы уверены, что хотите завершить этот опрос? После завершения голосование будет невозможно.',
        async () => {
          try {
            setIsPublishing(true);
            await pollApi.updatePollStatus(poll.id, { status: 'closed' });
            onSuccess();
          } catch (error: any) {
            console.error('Failed to close poll:', error);
            onError(error.message || 'Не удалось завершить опрос');
          } finally {
            setIsPublishing(false);
          }
        },
        undefined,
        { confirmText: 'Завершить', cancelText: 'Отмена', destructive: true }
      );
    },
    []
  );

  const handleDelete = useCallback(
    (
      poll: Poll,
      onSuccess: () => void,
      onError: (message: string) => void,
      showConfirm: (
        title: string,
        message: string,
        onConfirm: () => void,
        onCancel?: () => void,
        options?: any
      ) => void
    ) => {
      showConfirm(
        'Удалить опрос?',
        'Вы уверены, что хотите удалить этот опрос? Это действие нельзя отменить.',
        async () => {
          try {
            setIsDeleting(true);
            await pollApi.deletePoll(poll.id);
            onSuccess();
          } catch (error: any) {
            console.error('❌ Failed to delete poll:', error);
            console.error('❌ Error message:', error.message);
            console.error('❌ Error details:', error.details);
            onError(
              error.details?.error || error.message || 'Не удалось удалить опрос'
            );
          } finally {
            setIsDeleting(false);
          }
        },
        undefined,
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    },
    []
  );

  const handleSharePoll = useCallback(async (poll: Poll, chatId: number) => {
    try {
      const pollData: any = {
        poll_id: poll.id,
        poll_title: poll.title,
        poll_question: poll.description,
        poll_type: poll.type,
        poll_status: poll.status,
        total_votes: poll.total_votes || 0,
        ends_at: poll.end_time,
      };

      const messageData: any = {
        content: poll.title,
        type: 'poll',
        poll_id: poll.id,
        poll_data: pollData,
      };

      await chatApi.sendMessage(chatId, messageData);
    } catch (error) {
      console.error('❌ Failed to share poll:', error);
      throw error;
    }
  }, []);

  return {
    isPublishing,
    isDeleting,
    handlePublish,
    handleClose,
    handleDelete,
    handleSharePoll,
  };
};
