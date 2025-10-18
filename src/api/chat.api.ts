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
 * Get list of chats
 */
export const getChats = async (filters?: ChatListFilters): Promise<Chat[]> => {
  const params = {
    limit: filters?.limit || 20,
    offset: filters?.offset || 0,
  };

  const response = await api.get<{ chats: Chat[] }>(API_ENDPOINTS.CHAT.LIST, {
    params,
  });

  // Normalize last_message to match Message type
  const normalizedChats = response.data.chats.map(chat => {
    if (chat.last_message) {
      return {
        ...chat,
        last_message: {
          ...chat.last_message,
          message_type: chat.last_message.type || chat.last_message.message_type || 'text',
          attachments: chat.last_message.attachments || [],
          reactions: chat.last_message.reactions || [],
          read_by: chat.last_message.read_by || [],
          is_pinned: chat.last_message.is_pinned || false,
        }
      };
    }
    return chat;
  });

  return normalizedChats;
};

/**
 * Create new chat
 */
export const createChat = async (data: CreateChatDto): Promise<Chat> => {
  console.log('🆕 Creating chat with data:', data);
  console.log('🔗 Endpoint:', API_ENDPOINTS.CHAT.CREATE);

  const response = await api.post<Chat>(API_ENDPOINTS.CHAT.CREATE, data);

  console.log('✅ Chat created, full response:', response);
  console.log('✅ Chat created, response.data:', response.data);
  console.log('✅ New chat ID:', response.data?.id);
  console.log('✅ New chat ID type:', typeof response.data?.id);

  // Проверяем структуру ответа
  if (response.data && response.data.chat) {
    console.log('📦 Response has chat field, extracting it');
    return response.data.chat;
  }

  return response.data;
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
  const response = await api.put<ApiResponse<Chat>>(API_ENDPOINTS.CHAT.UPDATE(id), data);
  return response.data.data;
};

/**
 * Delete chat
 */
export const deleteChat = async (id: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.CHAT.DELETE(id));
};

/**
 * Pin chat
 */
export const pinChat = async (id: number): Promise<Chat> => {
  const response = await api.put<ApiResponse<Chat>>(API_ENDPOINTS.CHAT.PIN(id));
  return response.data.data;
};

/**
 * Unpin chat
 */
export const unpinChat = async (id: number): Promise<Chat> => {
  const response = await api.put<ApiResponse<Chat>>(API_ENDPOINTS.CHAT.UNPIN(id));
  return response.data.data;
};

/**
 * Mute chat notifications
 */
export const muteChat = async (id: number): Promise<Chat> => {
  const response = await api.put<ApiResponse<Chat>>(API_ENDPOINTS.CHAT.MUTE(id));
  return response.data.data;
};

/**
 * Unmute chat notifications
 */
export const unmuteChat = async (id: number): Promise<Chat> => {
  const response = await api.put<ApiResponse<Chat>>(API_ENDPOINTS.CHAT.UNMUTE(id));
  return response.data.data;
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
 * Remove member from chat
 */
export const removeChatMember = async (chatId: number, userId: number): Promise<void> => {
  await api.delete(API_ENDPOINTS.CHAT.REMOVE_MEMBER(chatId, userId));
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
    before_message_id: params?.before_message_id,
    after_message_id: params?.after_message_id,
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
  const normalizedMessages = response.data.messages.map(msg => ({
    ...msg,
    message_type: (msg as any).type || msg.message_type || 'text',
    attachments: msg.attachments || [],
    reactions: msg.reactions || [],
    read_receipts: (msg as any).read_receipts || [],
    read_by: msg.read_by || [],
    is_pinned: msg.is_pinned || false,
  }));

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
  return response.data.message;
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
  const response = await api.put<ApiResponse<Message>>(
    API_ENDPOINTS.MESSAGE.UPDATE(messageId),
    data
  );
  return response.data.data;
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
  console.log(`✅ Marking message ${messageId} as read`);
  await api.post(API_ENDPOINTS.MESSAGE.MARK_READ(messageId));
  console.log(`✅ Message ${messageId} marked as read successfully`);
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