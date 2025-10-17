/**
 * Chat Types
 * Типы для работы с чатами и сообщениями
 */

import { ISODateString } from './common.types';
import { User } from './user.types';

// Chat Types
export type ChatType = 'personal' | 'group' | 'channel';

// Message Types
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'system';

// Attachment Interface
export interface Attachment {
  id: number;
  message_id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  thumbnail_url?: string;
  created_at: ISODateString;
}

// Reaction Interface
export interface Reaction {
  id: number;
  message_id: number;
  user_id: number;
  user?: User;
  emoji: string;
  created_at: ISODateString;
}

// Message Interface
export interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  sender?: User;
  content: string;
  message_type: MessageType;
  reply_to_id?: number;
  reply_to?: Message;
  is_edited: boolean;
  is_pinned: boolean;
  is_deleted: boolean;
  attachments: Attachment[];
  reactions: Reaction[];
  read_by: number[];
  created_at: ISODateString;
  updated_at: ISODateString;
  edited_at?: ISODateString;
}

// Chat Member Interface
export interface ChatMember {
  id: number;
  chat_id: number;
  user_id: number;
  user?: User;
  role: 'owner' | 'admin' | 'member';
  is_muted: boolean;
  joined_at: ISODateString;
  last_read_message_id?: number;
}

// Chat Interface
export interface Chat {
  id: number;
  name?: string;
  type: ChatType;
  description?: string;
  avatar?: string;
  avatar_url?: string;
  creator_id: number;
  created_by?: number;
  creator?: User;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_active?: boolean;
  unread_count?: number;
  last_message?: Message;
  members?: ChatMember[];
  member_count?: number;
  members_count?: number;
  created_at: ISODateString;
  updated_at: ISODateString;
}

// Create Chat DTO
export interface CreateChatDto {
  type: ChatType;
  name?: string;
  description?: string;
  avatar_url?: string;
  member_ids: number[];
}

// Update Chat DTO
export interface UpdateChatDto {
  name?: string;
  description?: string;
  avatar_url?: string;
}

// Send Message DTO
export interface SendMessageDto {
  content: string;
  message_type?: MessageType;
  reply_to_id?: number;
  attachments?: {
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[];
}

// Update Message DTO
export interface UpdateMessageDto {
  content: string;
}

// Add Chat Members DTO
export interface AddChatMembersDto {
  user_ids: number[];
}

// Add Reaction DTO
export interface AddReactionDto {
  emoji: string;
}

// Search Messages Params
export interface SearchMessagesParams {
  query: string;
  chat_id?: number;
  limit?: number;
  offset?: number;
}

// Get Messages Params
export interface GetMessagesParams {
  limit?: number;
  offset?: number;
  before_message_id?: number;
  after_message_id?: number;
}

// Chat List Filters
export interface ChatListFilters {
  type?: ChatType;
  is_pinned?: boolean;
  search?: string;
}

// Typing Indicator
export interface TypingIndicator {
  chat_id: number;
  user_id: number;
  user?: User;
  timestamp: number;
}

// Online Status
export interface OnlineStatus {
  user_id: number;
  status: 'online' | 'offline';
  last_seen?: ISODateString;
}

// WebSocket Events Payloads
export interface WsMessageNewPayload {
  message: Message;
}

export interface WsMessageUpdatePayload {
  message: Message;
}

export interface WsMessageDeletePayload {
  message_id: number;
  chat_id: number;
}

export interface WsTypingPayload {
  chat_id: number;
  user_id: number;
  user?: User;
}

export interface WsUserStatusPayload {
  user_id: number;
  status: 'online' | 'offline' | 'busy' | 'away';
  last_seen?: ISODateString;
}