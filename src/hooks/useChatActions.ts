import { useState } from 'react';
import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import { getChatDisplayName } from '@utils/chatUtils';

/**
 * Хук для обработки действий с сообщениями в чате
 */
export const useChatActions = (chatId: number) => {
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<any | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<any | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);

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

  const handleSendMessage = async (content: string, replyToId?: number) => {
    if (!content.trim() && selectedFileIds.length === 0) {
      console.log('⚠️ [useChatActions] Cannot send empty message');
      setError({ error: 'Message content or files are required' });
      return;
    }

    const chat = getChatById(chatId);
    if (!chat) {
      console.warn('⚠️ [useChatActions] Chat not found in store, but continuing to send message. ChatId:', chatId);
      // Don't return here - allow sending message even if chat is not in store yet
      // The chat might be loading or will be created by the message
    }

    try {
      if (content.startsWith('EDIT:')) {
        const parts = content.split(':');
        const messageId = parseInt(parts[1]);
        const newContent = parts.slice(2).join(':');
        console.log('✏️ [useChatActions] Editing message:', messageId);
        await updateMessage(messageId, newContent);
        setEditingMessage(null);
      } else {
        const fileIdsToSend = selectedFileIds.length > 0 ? selectedFileIds : undefined;
        console.log('📤 [useChatActions] Sending message to chat:', chatId, 'content:', content.substring(0, 50), 'replyTo:', replyToId, 'files:', fileIdsToSend);
        await sendMessage(chatId, content.trim(), replyToId, fileIdsToSend);
        console.log('✅ [useChatActions] Message sent successfully');
        setSelectedFileIds([]);
      }
    } catch (error: any) {
      console.error('❌ [useChatActions] Failed to send/edit message:', error);
      setError({ error: error.message || 'Failed to send/edit message' });
    }
  };

  const handleReply = (message: any) => {
    setReplyingToMessage(message);
  };

  const handleEdit = (message: any) => {
    setEditingMessage(message);
  };

  const handleDelete = async (messageId: number, deleteFor: 'everyone' | 'me') => {
    try {
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
      const senderName = forwardingMessage.sender?.name ||
                        forwardingMessage.sender?.email?.split('@')[0] ||
                        `User ${forwardingMessage.sender_id}`;

      const sourceChat = getChatById(chatId);
      let sourceChatName = '';

      if (sourceChat && sourceChat.type === 'group') {
        const fullName = getChatDisplayName(sourceChat, currentUser?.id);
        sourceChatName = fullName.length > 25 ? fullName.substring(0, 25) + '...' : fullName;
      }

      const forwardPrefix = `📩 Переслано от ${senderName}${sourceChatName ? ` (${sourceChatName})` : ''}`;
      const separator = '\n─────────────\n';

      // Получаем file_ids из вложений сообщения
      const fileIds = forwardingMessage.attachments?.length > 0
        ? forwardingMessage.attachments.map((attachment: any) => attachment.file_id)
        : undefined;

      // Если это опрос - пересылаем как опрос
      if (forwardingMessage.message_type === 'poll' && forwardingMessage.poll_data) {
        const forwardedContent = `${forwardPrefix}${separator}${forwardingMessage.content}`;
        await sendMessage(targetChatId, forwardedContent, undefined, fileIds, {
          type: 'poll',
          poll_data: forwardingMessage.poll_data,
        });
      } else {
        const forwardedContent = `${forwardPrefix}${separator}${forwardingMessage.content}`;
        await sendMessage(targetChatId, forwardedContent, undefined, fileIds);
      }

      // Не удаляем сообщение из исходного чата при пересылке
      // await deleteMessageForUser(forwardingMessage.id, 'me');
    } catch (error: any) {
      console.error('Failed to forward message:', error);
      setError({ error: error.message || 'Failed to forward message' });
      throw error;
    }
  };

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
  };
};
