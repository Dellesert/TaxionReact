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
  GetLatestMessagesParams,
  GetLatestMessagesResponse,
  GetMessagesBeforeParams,
  GetMessagesBeforeResponse,
  GetMessageContextParams,
  GetMessageContextResponse,
  MarkChatAsReadResponse,
  GetThreadMessagesResponse,
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
 * @param limit - Number of chats to fetch
 * @param offset - Pagination offset
 * @param filters - Chat filters
 * @param since - ISO date string for differential sync (only chats updated after this date)
 */
export const getChats = async (
  limit?: number,
  offset?: number,
  filters?: {
    type?: 'private' | 'group' | 'channel';
    is_favorite?: boolean;
    is_pinned?: boolean;
  },
  since?: string
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

  // Add updated_since parameter for differential sync
  if (since) {
    params.updated_since = since;
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

  // Normalize: convert 'type' to 'message_type', ensure arrays are present
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || response.data.message.message_type || 'text',
    attachments: response.data.message.attachments || [],
    reactions: response.data.message.reactions || [],
    read_by: response.data.message.read_by || [],
    is_pinned: response.data.message.is_pinned || false,
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

  // Parse link_preview if it's a JSON string
  if ((response.data.message as any).link_preview && typeof (response.data.message as any).link_preview === 'string') {
    try {
      message.link_preview = JSON.parse((response.data.message as any).link_preview);
    } catch (e) {
    }
  } else if ((response.data.message as any).link_preview) {
    message.link_preview = (response.data.message as any).link_preview;
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
 * Delete a single attachment from a message
 * If it's the last attachment and no text, the whole message is deleted
 */
export const deleteAttachment = async (messageId: number, attachmentId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.MESSAGE.DELETE_ATTACHMENT(messageId, attachmentId));
};

/**
 * Mark message as read
 */
export const markMessageRead = async (messageId: number): Promise<void> => {
  await api.post(API_ENDPOINTS.MESSAGE.MARK_READ(messageId));
};

/**
 * Mark all messages in chat as read (DEPRECATED - use markChatAsReadV2)
 */
export const markChatAsRead = async (chatId: number): Promise<void> => {
  const response = await api.post(API_ENDPOINTS.MESSAGE.MARK_CHAT_READ(chatId));
};

// ============= NEW API v1 - Message Operations =============

/**
 * Get latest messages in chat (NEW API)
 * Messages are returned in chronological order (oldest → newest)
 */
export const getLatestMessages = async (
  chatId: number,
  params?: GetLatestMessagesParams
): Promise<GetLatestMessagesResponse> => {
  const queryParams = {
    limit: params?.limit || PAGINATION.DEFAULT_LIMIT,
    include_unread_marker: params?.include_unread_marker !== false, // default true
  };

  const response = await api.get<GetLatestMessagesResponse>(
    API_ENDPOINTS.CHAT.MESSAGES_LATEST(chatId),
    { params: queryParams }
  );

  // Normalize messages to ensure all fields are present
  const normalizedMessages = response.data.messages.map(msg => normalizeMessage(msg));

  // Normalize pinned messages
  const normalizedPinnedMessages = (response.data.pinned_messages || []).map(msg => normalizeMessage(msg));

  return {
    messages: normalizedMessages,
    total: response.data.total,
    has_older: response.data.has_older,
    unread_info: response.data.unread_info,
    pinned_messages: normalizedPinnedMessages,
  };
};

/**
 * Get messages before a specific message (cursor-based pagination)
 * Messages are returned in chronological order (oldest → newest)
 */
export const getMessagesBefore = async (
  chatId: number,
  messageId: number,
  params?: GetMessagesBeforeParams
): Promise<GetMessagesBeforeResponse> => {
  const queryParams = {
    limit: params?.limit || PAGINATION.DEFAULT_LIMIT,
  };

  const response = await api.get<GetMessagesBeforeResponse>(
    API_ENDPOINTS.CHAT.MESSAGES_BEFORE(chatId, messageId),
    { params: queryParams }
  );

  // Normalize messages
  const normalizedMessages = response.data.messages.map(msg => normalizeMessage(msg));

  return {
    messages: normalizedMessages,
    has_older: response.data.has_older,
    oldest_id: response.data.oldest_id,
  };
};

/**
 * Get messages after a specific message (cursor-based pagination)
 * Messages are returned in chronological order (oldest → newest)
 */
export const getMessagesAfter = async (
  chatId: number,
  messageId: number,
  params?: GetMessagesBeforeParams // Reusing the same params type
): Promise<GetMessagesBeforeResponse> => { // Similar response structure
  const queryParams = {
    limit: params?.limit || PAGINATION.DEFAULT_LIMIT,
  };

  const response = await api.get<any>(
    API_ENDPOINTS.CHAT.MESSAGES_AFTER(chatId, messageId),
    { params: queryParams }
  );

  // Normalize messages
  const normalizedMessages = response.data.messages.map((msg: any) => normalizeMessage(msg));

  return {
    messages: normalizedMessages,
    has_older: response.data.has_newer, // has_newer from backend maps to has_older for consistency
    oldest_id: response.data.newest_id, // newest_id from backend is the cursor
  };
};

/**
 * Get message context (messages around a specific message)
 * Used for "jump to message" functionality (search, reply, notifications)
 */
export const getMessageContext = async (
  chatId: number,
  messageId: number,
  params?: GetMessageContextParams
): Promise<GetMessageContextResponse> => {
  const queryParams = {
    before: params?.before || 15,
    after: params?.after || 15,
  };

  const response = await api.get<GetMessageContextResponse>(
    API_ENDPOINTS.CHAT.MESSAGES_CONTEXT(chatId, messageId),
    { params: queryParams }
  );

  // Normalize messages
  const normalizedMessages = response.data.messages.map(msg => normalizeMessage(msg));

  return {
    messages: normalizedMessages,
    target_message_id: response.data.target_message_id,
    has_older: response.data.has_older,
    has_newer: response.data.has_newer,
  };
};

/**
 * Mark chat as read (NEW API)
 * Returns count of messages marked as read
 */
export const markChatAsReadV2 = async (chatId: number): Promise<MarkChatAsReadResponse> => {
  const response = await api.post<MarkChatAsReadResponse>(API_ENDPOINTS.CHAT.READ(chatId));
  return response.data;
};

/**
 * Helper function to normalize message from backend
 * Ensures all fields match our Message interface
 */
function normalizeMessage(msg: any): Message {
  const message: any = {
    ...msg,
    message_type: (msg as any).type || msg.message_type || 'text',
    attachments: msg.attachments || [],
    reactions: msg.reactions || [],
    read_receipts: (msg as any).read_receipts || [],
    read_by: msg.read_by || [],
    is_pinned: msg.is_pinned || false,
  };

  // Add sender if present
  if (msg.sender) {
    message.sender = msg.sender;
  }

  // Parse poll_data if it's a JSON string
  if ((msg as any).poll_data && typeof (msg as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((msg as any).poll_data);
    } catch (e) {
      // Ignore parse errors
    }
  } else if ((msg as any).poll_data) {
    message.poll_data = (msg as any).poll_data;
  }

  // Parse task_data if it's a JSON string
  if ((msg as any).task_data && typeof (msg as any).task_data === 'string') {
    try {
      message.task_data = JSON.parse((msg as any).task_data);
    } catch (e) {
      // Ignore parse errors
    }
  } else if ((msg as any).task_data) {
    message.task_data = (msg as any).task_data;
  }

  // Parse link_preview if it's a JSON string
  if ((msg as any).link_preview && typeof (msg as any).link_preview === 'string') {
    try {
      message.link_preview = JSON.parse((msg as any).link_preview);
    } catch (e) {
      // Ignore parse errors
    }
  } else if ((msg as any).link_preview) {
    message.link_preview = (msg as any).link_preview;
  }

  return message;
}

/**
 * Search messages (deprecated - use searchMessagesInChat instead)
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

/**
 * Search messages in a specific chat
 * @param chatId - ID чата для поиска
 * @param query - Поисковый запрос (минимум 1 символ, максимум 200)
 * @param limit - Количество результатов (по умолчанию 20, максимум 100)
 * @param offset - Смещение для пагинации
 */
export interface SearchMessagesInChatResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
  query: string;
}

export const searchMessagesInChat = async (
  chatId: number,
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<SearchMessagesInChatResponse> => {
  const queryParams = {
    q: query,
    limit: Math.min(limit, 100),
    offset,
  };

  const response = await api.get<SearchMessagesInChatResponse>(
    `/chats/${chatId}/messages/search`,
    { params: queryParams }
  );

  // Normalize messages
  const normalizedMessages = (response.data.messages || []).map(msg => normalizeMessage(msg));

  return {
    ...response.data,
    messages: normalizedMessages,
  };
};

// ============= Thread (Channel Comments) =============

/**
 * Get thread messages (comments on a channel post)
 */
export const getThreadMessages = async (
  chatId: number,
  messageId: number,
  params?: { limit?: number; before?: number }
): Promise<GetThreadMessagesResponse> => {
  const response = await api.get<GetThreadMessagesResponse>(
    API_ENDPOINTS.CHAT.THREAD(chatId, messageId),
    { params }
  );

  const normalizedMessages = (response.data.messages || []).map(msg => normalizeMessage(msg));
  const rootMessage = response.data.root_message
    ? normalizeMessage(response.data.root_message)
    : undefined;

  return {
    ...response.data,
    messages: normalizedMessages,
    root_message: rootMessage,
  };
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
 * Get all links (messages with link previews) for a chat
 * @param chatId - ID of chat to get links from
 * @param limit - Number of links to retrieve (default: 50, max: 100)
 * @param offset - Offset for pagination (default: 0)
 */
export const getChatLinks = async (
  chatId: number,
  limit: number = 50,
  offset: number = 0
): Promise<{ links: any[]; total: number }> => {
  try {
    const response = await api.get(`/chats/${chatId}/links`, {
      params: { limit, offset },
    });
    return {
      links: response.data.links || [],
      total: response.data.total || 0,
    };
  } catch (error) {
    return { links: [], total: 0 };
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

/**
 * Bulk forward messages to another chat
 * @param messageIds - Array of message IDs to forward (1-100)
 * @param targetChatId - ID of the chat to forward messages to
 */
export const bulkForwardMessages = async (
  messageIds: number[],
  targetChatId: number
): Promise<{
  forwarded_messages: any[];
  failed_message_ids: number[];
  total_forwarded: number;
  total_failed: number;
}> => {

  if (messageIds.length === 0) {
    throw new Error('No messages to forward');
  }

  if (messageIds.length > 100) {
    throw new Error('Cannot forward more than 100 messages at once');
  }

  const response = await api.post('/messages/bulk-forward', {
    message_ids: messageIds,
    target_chat_id: targetChatId,
  });

  return response.data;
};