/**
 * Chat API
 * API клиент для работы с чатами и сообщениями
 */

import api from '@shared/api/axios.config';
import { API_ENDPOINTS, PAGINATION } from '@shared/constants/api.constants';
import {
  Chat,
  Message,
  ChatMember,
  CreateChatDto,
  UpdateChatDto,
  SendMessageDto,
  UpdateMessageDto,
  AddChatMembersDto,
  AddReactionDto,
  SearchMessagesParams,
  GetMessagesParams,
  ChatListFilters,
} from '../types/chat.types';
import { ApiResponse, PaginatedResponse } from '../../../types/common.types';

// ============= Chat Operations =============

/**
 * Get total unread messages count across all chats
 */
export const getChatUnreadCount = async (): Promise<number> => {
  try {
    const response = await api.get<{ unread_count: number }>(API_ENDPOINTS.CHAT.UNREAD_COUNT);
    return response.data.unread_count || 0;
  } catch (error) {
    return 0;
  }
};

/**
 * Get all pinned chats (without pagination)
 */
export const getPinnedChats = async (
  type?: 'private' | 'group' | 'channel'
): Promise<{ chats: Chat[]; count: number }> => {
  const params: any = {};

  if (type) {
    params.type = type;
  }

  const response = await api.get<{ chats: Chat[]; count: number }>(
    API_ENDPOINTS.CHAT.PINNED,
    { params }
  );

  // Normalize chats similar to getChats
  const normalizedChats = response.data.chats.map(chat => {
    if (chat.last_message) {
      const normalizedMessage: any = {
        ...chat.last_message,
        message_type: chat.last_message.type || chat.last_message.message_type || 'text',
        attachments: chat.last_message.attachments || [],
        reactions: chat.last_message.reactions || [],
        read_by: chat.last_message.read_by || [],
        is_pinned: chat.last_message.is_pinned || false,
      };

      if ((chat.last_message as any).poll_data && typeof (chat.last_message as any).poll_data === 'string') {
        try {
          normalizedMessage.poll_data = JSON.parse((chat.last_message as any).poll_data);
        } catch (e) {
        }
      } else if ((chat.last_message as any).poll_data) {
        normalizedMessage.poll_data = (chat.last_message as any).poll_data;
      }

      if ((chat.last_message as any).task_data && typeof (chat.last_message as any).task_data === 'string') {
        try {
          normalizedMessage.task_data = JSON.parse((chat.last_message as any).task_data);
        } catch (e) {
        }
      } else if ((chat.last_message as any).task_data) {
        normalizedMessage.task_data = (chat.last_message as any).task_data;
      }

      return {
        ...chat,
        last_message: normalizedMessage
      };
    }
    return chat;
  });

  return {
    chats: normalizedChats,
    count: response.data.count
  };
};

/**
 * Get list of chats with pagination and filters
 */
export const getChats = async (
  limit?: number,
  offset?: number,
  filters?: {
    type?: 'private' | 'group' | 'channel';
    is_favorite?: boolean;
    is_pinned?: boolean;
  }
): Promise<{ chats: Chat[]; total: number; hasMore: boolean }> => {
  const params: any = {
    limit: limit || 50,
    offset: offset || 0,
  };

  // Add filters if provided
  if (filters?.type) {
    params.type = filters.type;
  }
  if (filters?.is_favorite !== undefined) {
    params.is_favorite = filters.is_favorite.toString();
  }
  if (filters?.is_pinned !== undefined) {
    params.is_pinned = filters.is_pinned.toString();
  }

  const response = await api.get<{ chats: Chat[]; total?: number }>(API_ENDPOINTS.CHAT.LIST, {
    params,
  });

  // Normalize last_message to match Message type
  const normalizedChats = response.data.chats.map(chat => {
    if (chat.last_message) {
      const normalizedMessage: any = {
        ...chat.last_message,
        message_type: chat.last_message.type || chat.last_message.message_type || 'text',
        attachments: chat.last_message.attachments || [],
        reactions: chat.last_message.reactions || [],
        read_by: chat.last_message.read_by || [],
        is_pinned: chat.last_message.is_pinned || false,
      };

      // Parse poll_data if it's a JSON string
      if ((chat.last_message as any).poll_data && typeof (chat.last_message as any).poll_data === 'string') {
        try {
          normalizedMessage.poll_data = JSON.parse((chat.last_message as any).poll_data);
        } catch (e) {
        }
      } else if ((chat.last_message as any).poll_data) {
        normalizedMessage.poll_data = (chat.last_message as any).poll_data;
      }

      // Parse task_data if it's a JSON string
      if ((chat.last_message as any).task_data && typeof (chat.last_message as any).task_data === 'string') {
        try {
          normalizedMessage.task_data = JSON.parse((chat.last_message as any).task_data);
        } catch (e) {
        }
      } else if ((chat.last_message as any).task_data) {
        normalizedMessage.task_data = (chat.last_message as any).task_data;
      }

      return {
        ...chat,
        last_message: normalizedMessage
      };
    }
    return chat;
  });

  const total = response.data.total || normalizedChats.length;
  const hasMore = (params.offset + normalizedChats.length) < total;

  return { chats: normalizedChats, total, hasMore };
};

/**
 * Create new chat
 */
export const createChat = async (data: CreateChatDto): Promise<Chat> => {
  const response = await api.post<Chat>(API_ENDPOINTS.CHAT.CREATE, data);

  if (response.data && response.data.chat) {
    return response.data.chat;
  }

  return response.data;
};

/**
 * Get or create direct chat with user
 */
export const getOrCreateDirectChat = async (userId: number): Promise<Chat> => {

  const response = await api.post<{ chat: Chat }>(API_ENDPOINTS.CHAT.DIRECT(userId));


  // Check response structure
  if (response.data && response.data.chat) {
    return response.data.chat;
  }

  return response.data as any;
};

/**
 * Get or create task chat
 */
export const getOrCreateTaskChat = async (taskId: number): Promise<Chat> => {

  const response = await api.post<{ chat: Chat }>(API_ENDPOINTS.CHAT.TASK(taskId));


  // Check response structure
  if (response.data && response.data.chat) {
    return response.data.chat;
  }

  return response.data as any;
};

/**
 * Get chat by ID
 */
export const getChat = async (id: number): Promise<Chat> => {
  const response = await api.get<any>(API_ENDPOINTS.CHAT.BY_ID(id));

  // Handle different response formats
  // Format 1: { data: { chat } }
  if (response.data && response.data.data) {
    return response.data.data;
  }

  // Format 2: { chat: { ... } }
  if (response.data && response.data.chat) {
    return response.data.chat;
  }

  // Format 3: Chat data directly in response.data
  if (response.data && response.data.id) {
    return response.data as any;
  }

  throw new Error(`Invalid chat response format for chat ${id}`);
};

/**
 * Update chat
 */
export const updateChat = async (id: number, data: UpdateChatDto): Promise<Chat> => {
  const response = await api.put<any>(API_ENDPOINTS.CHAT.UPDATE(id), data);

  // Проверяем разные форматы ответа
  if (response.data && response.data.data) {
    return response.data.data;
  }

  // Если формат { chat: Chat } (как в UpdateChat handler)
  if (response.data && response.data.chat) {
    return response.data.chat;
  }

  // Если вернулся сам чат напрямую
  if (response.data && response.data.id) {
    return response.data as Chat;
  }

  throw new Error('Invalid response format from update chat API');
};

/**
 * Delete chat
 * @param id - Chat ID
 * @param clearHistory - Whether to clear chat history for the user
 */
export const deleteChat = async (id: number, clearHistory?: boolean): Promise<void> => {
  const params = clearHistory ? { clear_history: 'true' } : undefined;
  await api.delete(API_ENDPOINTS.CHAT.DELETE(id), { params });
};

/**
 * Join chat (for group/channel chats)
 * @param chatId - ID of chat to join
 */
export const joinChat = async (chatId: number): Promise<void> => {
  await api.post(API_ENDPOINTS.CHAT.JOIN(chatId));
};

// ============= Chat Members =============

/**
 * Get chat members
 */
export const getChatMembers = async (chatId: number): Promise<ChatMember[]> => {

  const response = await api.get<ApiResponse<ChatMember[]>>(
    API_ENDPOINTS.CHAT.MEMBERS(chatId)
  );

  // Сервер возвращает {count, members}
  if (response.data && response.data.members) {
    return response.data.members;
  }

  // Или стандартный формат {data: [...]}
  if (response.data && response.data.data) {
    return response.data.data;
  }

  return [];
};

/**
 * Add members to chat
 */
export const addChatMembers = async (
  chatId: number,
  data: AddChatMembersDto
): Promise<Chat> => {
  const response = await api.post<ApiResponse<Chat>>(
    API_ENDPOINTS.CHAT.ADD_MEMBERS(chatId),
    data
  );
  return response.data.data;
};

/**
 * Add single member to chat
 */
export const addChatMember = async (
  chatId: number,
  userId: number
): Promise<void> => {
  await api.post(API_ENDPOINTS.CHAT.ADD_MEMBERS(chatId), { user_id: userId });
};

/**
 * Remove member from chat
 */
export const removeChatMember = async (chatId: number, userId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.CHAT.REMOVE_MEMBER(chatId, userId));
};

/**
 * Update member role in chat (promote to admin or demote to member)
 */
export const updateChatMemberRole = async (
  chatId: number,
  userId: number,
  role: 'admin' | 'member'
): Promise<void> => {
  await api.put(`/chats/${chatId}/members/${userId}`, { role });
};

// ============= Message Operations =============

/**
 * Get messages in chat with pagination
 */
export const getMessages = async (
  chatId: number,
  params?: GetMessagesParams
): Promise<PaginatedResponse<Message>> => {
  const queryParams = {
    limit: params?.limit || PAGINATION.DEFAULT_LIMIT,
    offset: params?.offset || PAGINATION.DEFAULT_OFFSET,
    before: params?.before_message_id, // Backend expects "before" not "before_message_id"
    after: params?.after_message_id,   // Backend expects "after" not "after_message_id"
  };


  const response = await api.get<{
    messages: Message[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }>(
    API_ENDPOINTS.CHAT.MESSAGES(chatId),
    { params: queryParams }
  );

  // Normalize messages to ensure all fields are present
  const normalizedMessages = response.data.messages.map(msg => {
    const message: any = {
      ...msg,
      message_type: (msg as any).type || msg.message_type || 'text',
      attachments: msg.attachments || [],
      reactions: msg.reactions || [],
      read_receipts: (msg as any).read_receipts || [],
      read_by: msg.read_by || [],
      is_pinned: msg.is_pinned || false,
    };

    // Добавляем sender если пришел от бэкенда
    if (msg.sender) {
      message.sender = msg.sender;
    }

    // Parse poll_data if it's a JSON string
    if ((msg as any).poll_data && typeof (msg as any).poll_data === 'string') {
      try {
        message.poll_data = JSON.parse((msg as any).poll_data);
      } catch (e) {
      }
    } else if ((msg as any).poll_data) {
      message.poll_data = (msg as any).poll_data;
    }

    // Parse task_data if it's a JSON string
    if ((msg as any).task_data && typeof (msg as any).task_data === 'string') {
      try {
        message.task_data = JSON.parse((msg as any).task_data);
      } catch (e) {
      }
    } else if ((msg as any).task_data) {
      message.task_data = (msg as any).task_data;
    }

    return message;
  });

  // Normalize response to match PaginatedResponse interface
  return {
    data: normalizedMessages,
    messages: normalizedMessages,
    total: response.data.total,
    limit: response.data.limit,
    offset: response.data.offset,
    hasMore: response.data.has_more,
    has_more: response.data.has_more,
  };
};

/**
 * Send message to chat
 */
export const sendMessage = async (chatId: number, data: SendMessageDto): Promise<Message> => {

  const response = await api.post<{ message: Message }>(
    API_ENDPOINTS.CHAT.SEND_MESSAGE,
    { ...data, chat_id: chatId }
  );

  // Normalize: convert 'type' to 'message_type' and parse poll_data
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || response.data.message.message_type || 'text',
  };

  // Parse poll_data if it's a JSON string
  if ((response.data.message as any).poll_data && typeof (response.data.message as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((response.data.message as any).poll_data);
    } catch (e) {
    }
  } else if ((response.data.message as any).poll_data) {
    message.poll_data = (response.data.message as any).poll_data;
  }

  // Parse task_data if it's a JSON string
  if ((response.data.message as any).task_data && typeof (response.data.message as any).task_data === 'string') {
    try {
      message.task_data = JSON.parse((response.data.message as any).task_data);
    } catch (e) {
    }
  } else if ((response.data.message as any).task_data) {
    message.task_data = (response.data.message as any).task_data;
  }

  return message;
};

/**
 * Get message by ID
 */
export const getMessage = async (messageId: number): Promise<Message> => {
  const response = await api.get<ApiResponse<Message>>(
    API_ENDPOINTS.MESSAGE.BY_ID(messageId)
  );
  return response.data.data;
};

/**
 * Update message
 */
export const updateMessage = async (
  messageId: number,
  data: UpdateMessageDto
): Promise<Message> => {
  const response = await api.put<{ message: Message }>(
    API_ENDPOINTS.MESSAGE.UPDATE(messageId),
    data
  );
  return response.data.message;
};

/**
 * Delete message
 */
export const deleteMessage = async (messageId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.MESSAGE.DELETE(messageId));
};

/**
 * Mark message as read
 */
export const markMessageRead = async (messageId: number): Promise<void> => {
  await api.post(API_ENDPOINTS.MESSAGE.MARK_READ(messageId));
};

/**
 * Mark all messages in chat as read
 */
export const markChatAsRead = async (chatId: number): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.MESSAGE.MARK_CHAT_READ(chatId));
};

/**
 * Search messages
 */
export const searchMessages = async (
  params: SearchMessagesParams
): Promise<PaginatedResponse<Message>> => {
  const queryParams = {
    query: params.query,
    chat_id: params.chat_id,
    limit: params.limit || PAGINATION.DEFAULT_LIMIT,
    offset: params.offset || PAGINATION.DEFAULT_OFFSET,
  };

  const response = await api.get<ApiResponse<PaginatedResponse<Message>>>(
    API_ENDPOINTS.MESSAGE.SEARCH,
    { params: queryParams }
  );
  return response.data.data;
};

// ============= Reactions =============

/**
 * Add reaction to message
 */
export const addReaction = async (messageId: number, data: AddReactionDto): Promise<Message> => {
  const response = await api.post<ApiResponse<Message>>(
    API_ENDPOINTS.MESSAGE.ADD_REACTION(messageId),
    data
  );
  return response.data.data;
};

/**
 * Remove reaction from message
 */
export const removeReaction = async (messageId: number, emoji: string): Promise<Message> => {
  const response = await api.delete<ApiResponse<Message>>(
    API_ENDPOINTS.MESSAGE.REMOVE_REACTION(messageId, emoji)
  );
  return response.data.data;
};

// ============= Message Deletion Operations =============

/**
 * Delete message with option to delete for everyone or just for me
 * @param messageId - ID of message to delete
 * @param deleteFor - 'everyone' or 'me'
 */
export const deleteMessageForUser = async (
  messageId: number,
  deleteFor: 'everyone' | 'me'
): Promise<void> => {
  await api.delete(API_ENDPOINTS.MESSAGE.DELETE(messageId), {
    data: { delete_for: deleteFor },
  });
};

/**
 * Clear chat history for current user
 * @param chatId - ID of chat to clear
 */
export const clearChatHistory = async (chatId: number): Promise<void> => {
  await api.post(API_ENDPOINTS.CHAT.CLEAR_HISTORY(chatId));
};

/**
 * Restore deleted message (admin only)
 * @param messageId - ID of message to restore
 */
export const restoreMessage = async (messageId: number): Promise<void> => {
  await api.post(API_ENDPOINTS.MESSAGE.RESTORE(messageId));
};

/**
 * Permanently delete message (admin only)
 * @param messageId - ID of message to permanently delete
 */
export const deletePermanentMessage = async (messageId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.MESSAGE.DELETE_PERMANENT(messageId));
};

/**
 * Pin message in chat
 * @param messageId - ID of message to pin
 */
export const pinMessage = async (messageId: number): Promise<Message> => {
  const response = await api.post<{ message: Message }>(API_ENDPOINTS.MESSAGE.PIN(messageId));

  // Normalize: convert 'type' to 'message_type' and parse poll_data
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || (response.data.message as any).message_type || 'text',
  };

  if ((response.data.message as any).poll_data && typeof (response.data.message as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((response.data.message as any).poll_data);
    } catch (e) {
    }
  }

  return message;
};

/**
 * Unpin message in chat
 * @param messageId - ID of message to unpin
 */
export const unpinMessage = async (messageId: number): Promise<Message> => {
  const response = await api.post<{ message: Message }>(API_ENDPOINTS.MESSAGE.UNPIN(messageId));

  // Normalize: convert 'type' to 'message_type' and parse poll_data
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || (response.data.message as any).message_type || 'text',
  };

  if ((response.data.message as any).poll_data && typeof (response.data.message as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((response.data.message as any).poll_data);
    } catch (e) {
    }
  }

  return message;
};

/**
 * Toggle favorite status for chat
 * @param chatId - ID of chat to toggle favorite
 * @param isFavorite - Set as favorite (true) or unfavorite (false)
 */
export const toggleChatFavorite = async (chatId: number, isFavorite: boolean): Promise<void> => {
  await api.put(`/chats/${chatId}/favorite`, { is_favorite: isFavorite });
};

/**
 * Toggle pinned status for chat
 * @param chatId - ID of chat to toggle pinned
 * @param isPinned - Set as pinned (true) or unpinned (false)
 */
export const toggleChatPinned = async (chatId: number, isPinned: boolean): Promise<void> => {
  await api.put(`/chats/${chatId}/pinned`, { is_pinned: isPinned });
};

/**
 * Get all attachments for a chat
 * @param chatId - ID of chat to get attachments from
 * @param limit - Number of attachments to retrieve (default: 50, max: 100)
 * @param offset - Offset for pagination (default: 0)
 */
export const getChatAttachments = async (
  chatId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ attachments: any[]; total: number }> => {
  try {
    const response = await api.get(`/chats/${chatId}/attachments`, {
      params: { limit, offset },
    });
    return {
      attachments: response.data.attachments || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { attachments: [], total: 0 };
  }
};

/**
 * Bulk delete messages
 * @param messageIds - Array of message IDs to delete (1-100)
 * @param deleteFor - 'everyone' or 'me'
 */
export const bulkDeleteMessages = async (
  messageIds: number[],
  deleteFor: 'everyone' | 'me' = 'everyone'
): Promise<{ count: number }> => {

  if (messageIds.length === 0) {
    throw new Error('No messages to delete');
  }

  if (messageIds.length > 100) {
    throw new Error('Cannot delete more than 100 messages at once');
  }

  const response = await api.post('/messages/bulk-delete', {
    message_ids: messageIds,
    delete_for: deleteFor,
  });

  return response.data;
};