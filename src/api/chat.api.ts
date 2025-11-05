/**
 * Chat API
 * API клиент для работы с чатами и сообщениями
 */

import api from './axios.config';
import { API_ENDPOINTS, PAGINATION } from '@constants/api.constants';
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
import { ApiResponse, PaginatedResponse } from '../types/common.types';

// ============= Chat Operations =============

/**
 * Get list of chats with pagination
 */
export const getChats = async (
  limit?: number,
  offset?: number
): Promise<{ chats: Chat[]; total: number; hasMore: boolean }> => {
  const params = {
    limit: limit || 50,
    offset: offset || 0,
  };

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
          console.error('Failed to parse poll_data in last_message:', e);
        }
      } else if ((chat.last_message as any).poll_data) {
        normalizedMessage.poll_data = (chat.last_message as any).poll_data;
      }

      // Parse task_data if it's a JSON string
      if ((chat.last_message as any).task_data && typeof (chat.last_message as any).task_data === 'string') {
        try {
          normalizedMessage.task_data = JSON.parse((chat.last_message as any).task_data);
        } catch (e) {
          console.error('Failed to parse task_data in last_message:', e);
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
  console.log('💬 Getting or creating direct chat with user:', userId);
  console.log('🔗 Endpoint:', API_ENDPOINTS.CHAT.DIRECT(userId));

  const response = await api.post<{ chat: Chat }>(API_ENDPOINTS.CHAT.DIRECT(userId));

  console.log('✅ Direct chat response:', response.data);

  // Check response structure
  if (response.data && response.data.chat) {
    console.log('📦 Response has chat field, extracting it');
    return response.data.chat;
  }

  return response.data as any;
};

/**
 * Get or create task chat
 */
export const getOrCreateTaskChat = async (taskId: number): Promise<Chat> => {
  console.log('📋 Getting or creating task chat for task:', taskId);
  console.log('🔗 Endpoint:', API_ENDPOINTS.CHAT.TASK(taskId));

  const response = await api.post<{ chat: Chat }>(API_ENDPOINTS.CHAT.TASK(taskId));

  console.log('✅ Task chat response:', response.data);

  // Check response structure
  if (response.data && response.data.chat) {
    console.log('📦 Response has chat field, extracting it');
    return response.data.chat;
  }

  return response.data as any;
};

/**
 * Get chat by ID
 */
export const getChat = async (id: number): Promise<Chat> => {
  const response = await api.get<ApiResponse<Chat>>(API_ENDPOINTS.CHAT.BY_ID(id));
  return response.data.data;
};

/**
 * Update chat
 */
export const updateChat = async (id: number, data: UpdateChatDto): Promise<Chat> => {
  console.log('✏️ Updating chat:', id, 'with data:', data);
  const response = await api.put<any>(API_ENDPOINTS.CHAT.UPDATE(id), data);
  console.log('✅ Update response:', response.data);

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
  console.log(`🗑️ API: Deleting chat ${id} (clearHistory: ${clearHistory})`);
  const params = clearHistory ? { clear_history: 'true' } : undefined;
  console.log(`📡 API: DELETE ${API_ENDPOINTS.CHAT.DELETE(id)} with params:`, params);
  await api.delete(API_ENDPOINTS.CHAT.DELETE(id), { params });
  console.log(`✅ API: Chat ${id} deleted successfully`);
};

/**
 * Join chat (for group/channel chats)
 * @param chatId - ID of chat to join
 */
export const joinChat = async (chatId: number): Promise<void> => {
  console.log(`👋 Joining chat ${chatId}`);
  await api.post(API_ENDPOINTS.CHAT.JOIN(chatId));
  console.log(`✅ Successfully joined chat ${chatId}`);
};

// ============= Chat Members =============

/**
 * Get chat members
 */
export const getChatMembers = async (chatId: number): Promise<ChatMember[]> => {
  console.log('👥 Getting chat members for chat:', chatId);
  console.log('🔗 Endpoint:', API_ENDPOINTS.CHAT.MEMBERS(chatId));

  const response = await api.get<ApiResponse<ChatMember[]>>(
    API_ENDPOINTS.CHAT.MEMBERS(chatId)
  );

  console.log('✅ Chat members response:', response.data);
  console.log('✅ Response keys:', Object.keys(response.data));

  // Сервер возвращает {count, members}
  if (response.data && response.data.members) {
    console.log('📦 Found members array:', response.data.members.length);
    return response.data.members;
  }

  // Или стандартный формат {data: [...]}
  if (response.data && response.data.data) {
    console.log('📦 Found data array:', response.data.data.length);
    return response.data.data;
  }

  console.warn('⚠️ Unexpected response format, returning empty array');
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
  console.log(`👤 Updating member role in chat ${chatId} for user ${userId} to ${role}`);
  await api.put(`/chats/${chatId}/members/${userId}`, { role });
  console.log(`✅ Member role updated successfully`);
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

  console.log(`🌐 API getMessages: chatId=${chatId}, queryParams=`, queryParams);
  console.log(`🌐 API URL: ${API_ENDPOINTS.CHAT.MESSAGES(chatId)}`);

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

  // Логируем сырой ответ с бэкенда
  if (response.data.messages.length > 0) {
    console.log('🔍 Raw backend message sample:', {
      id: response.data.messages[0].id,
      sender_id: response.data.messages[0].sender_id,
      read_receipts: (response.data.messages[0] as any).read_receipts,
      reactions: response.data.messages[0].reactions,
    });
  }

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

    // Parse poll_data if it's a JSON string
    if ((msg as any).poll_data && typeof (msg as any).poll_data === 'string') {
      try {
        message.poll_data = JSON.parse((msg as any).poll_data);
      } catch (e) {
        console.error('Failed to parse poll_data:', e);
      }
    } else if ((msg as any).poll_data) {
      message.poll_data = (msg as any).poll_data;
    }

    // Parse task_data if it's a JSON string
    if ((msg as any).task_data && typeof (msg as any).task_data === 'string') {
      try {
        message.task_data = JSON.parse((msg as any).task_data);
      } catch (e) {
        console.error('Failed to parse task_data:', e);
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
  console.log('📤 sendMessage API called with data:', JSON.stringify(data, null, 2));

  const response = await api.post<{ message: Message }>(
    API_ENDPOINTS.CHAT.SEND_MESSAGE,
    { ...data, chat_id: chatId }
  );

  console.log('📥 sendMessage API response:', JSON.stringify(response.data.message, null, 2));

  // Normalize: convert 'type' to 'message_type' and parse poll_data
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || response.data.message.message_type || 'text',
  };

  // Parse poll_data if it's a JSON string
  if ((response.data.message as any).poll_data && typeof (response.data.message as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((response.data.message as any).poll_data);
      console.log('📊 Parsed poll_data in sendMessage:', message.poll_data);
    } catch (e) {
      console.error('❌ Failed to parse poll_data in sendMessage:', e);
    }
  } else if ((response.data.message as any).poll_data) {
    message.poll_data = (response.data.message as any).poll_data;
  }

  // Parse task_data if it's a JSON string
  if ((response.data.message as any).task_data && typeof (response.data.message as any).task_data === 'string') {
    try {
      message.task_data = JSON.parse((response.data.message as any).task_data);
    } catch (e) {
      console.error('❌ Failed to parse task_data in sendMessage:', e);
    }
  } else if ((response.data.message as any).task_data) {
    message.task_data = (response.data.message as any).task_data;
  }

  console.log('💾 sendMessage returning:', {
    id: message.id,
    message_type: message.message_type,
    has_poll_data: !!message.poll_data,
    has_task_data: !!message.task_data
  });

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
  await api.post(API_ENDPOINTS.MESSAGE.MARK_CHAT_READ(chatId));
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
  console.log(`📡 API: Clearing chat history for chat ${chatId}`);
  console.log(`📡 Endpoint: POST ${API_ENDPOINTS.CHAT.CLEAR_HISTORY(chatId)}`);
  await api.post(API_ENDPOINTS.CHAT.CLEAR_HISTORY(chatId));
  console.log(`✅ API: Chat history cleared successfully for chat ${chatId}`);
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
  console.log(`📌 Pinning message ${messageId}`);
  const response = await api.post<{ message: Message }>(API_ENDPOINTS.MESSAGE.PIN(messageId));
  console.log(`✅ Message ${messageId} pinned successfully`);

  // Normalize: convert 'type' to 'message_type' and parse poll_data
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || (response.data.message as any).message_type || 'text',
  };

  if ((response.data.message as any).poll_data && typeof (response.data.message as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((response.data.message as any).poll_data);
      console.log('📊 Parsed poll_data in pinMessage:', message.poll_data);
    } catch (e) {
      console.error('❌ Failed to parse poll_data in pinMessage:', e);
    }
  }

  console.log('💾 pinMessage returning:', { id: message.id, message_type: message.message_type, has_poll_data: !!message.poll_data });
  return message;
};

/**
 * Unpin message in chat
 * @param messageId - ID of message to unpin
 */
export const unpinMessage = async (messageId: number): Promise<Message> => {
  console.log(`📌 Unpinning message ${messageId}`);
  const response = await api.post<{ message: Message }>(API_ENDPOINTS.MESSAGE.UNPIN(messageId));
  console.log(`✅ Message ${messageId} unpinned successfully`);

  // Normalize: convert 'type' to 'message_type' and parse poll_data
  const message: any = {
    ...response.data.message,
    message_type: (response.data.message as any).type || (response.data.message as any).message_type || 'text',
  };

  if ((response.data.message as any).poll_data && typeof (response.data.message as any).poll_data === 'string') {
    try {
      message.poll_data = JSON.parse((response.data.message as any).poll_data);
      console.log('📊 Parsed poll_data in unpinMessage:', message.poll_data);
    } catch (e) {
      console.error('❌ Failed to parse poll_data in unpinMessage:', e);
    }
  }

  console.log('💾 unpinMessage returning:', { id: message.id, message_type: message.message_type, has_poll_data: !!message.poll_data });
  return message;
};

/**
 * Toggle favorite status for chat
 * @param chatId - ID of chat to toggle favorite
 * @param isFavorite - Set as favorite (true) or unfavorite (false)
 */
export const toggleChatFavorite = async (chatId: number, isFavorite: boolean): Promise<void> => {
  console.log(`⭐ Toggling favorite for chat ${chatId} to ${isFavorite}`);
  await api.put(`/chats/${chatId}/favorite`, { is_favorite: isFavorite });
  console.log(`✅ Chat ${chatId} favorite status updated to ${isFavorite}`);
};

/**
 * Toggle pinned status for chat
 * @param chatId - ID of chat to toggle pinned
 * @param isPinned - Set as pinned (true) or unpinned (false)
 */
export const toggleChatPinned = async (chatId: number, isPinned: boolean): Promise<void> => {
  console.log(`📌 Toggling pinned for chat ${chatId} to ${isPinned}`);
  await api.put(`/chats/${chatId}/pinned`, { is_pinned: isPinned });
  console.log(`✅ Chat ${chatId} pinned status updated to ${isPinned}`);
};