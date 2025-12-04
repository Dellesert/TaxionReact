/**
 * Chat Types
 * Типы для работы с чатами и сообщениями
 */

import { ISODateString } from '@/types/common.types';
import { User } from '@/types/user.types';

// Chat Types
export type ChatType = 'private' | 'group' | 'channel';

// Message Types
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'system' | 'poll' | 'task';

// Attachment Interface
export interface Attachment {
  id: number;
  message_id: number;
  file_id: number; // Reference to file in file-service
  file_url: string;
  file_name: string;
  file_size: number;
  mime_type: string; // MIME type of the file (e.g., "image/png", "application/pdf")
  file_type: string; // Category: "image", "video", "audio", "document", "other"
  thumbnail_url?: string;
  created_at?: ISODateString;
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

// Read Receipt Interface
export interface ReadReceipt {
  id: number;
  message_id: number;
  user_id: number;
  read_at: ISODateString;
}

// Poll Data in Message (для сообщений типа 'poll')
export interface MessagePollData {
  poll_id: number;
  poll_title: string;
  poll_question?: string;
  poll_type?: string;
  poll_status?: 'draft' | 'active' | 'closed' | 'archived' | 'cancelled';
  total_votes?: number;
  ends_at?: ISODateString;
}

// Task Data in Message (для сообщений типа 'task')
export interface MessageTaskData {
  task_id: number;
  task_title: string;
  task_description?: string;
  task_status?: 'new' | 'in_progress' | 'review' | 'done';
  task_priority?: 'low' | 'medium' | 'high' | 'critical';
  due_date?: ISODateString;
  assigned_to?: number[];
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
  deleted_by?: number;
  deleted_at?: ISODateString;
  attachments: Attachment[];
  reactions: Reaction[];
  read_receipts?: ReadReceipt[];
  read_by: number[];
  created_at: ISODateString;
  updated_at: ISODateString;
  edited_at?: ISODateString;
  sending?: boolean; // Локальное поле для индикации отправки
  failed?: boolean; // Локальное поле - ошибка отправки (оптимистичные обновления)
  error?: string; // Локальное поле - текст ошибки
  delivered_to?: number[]; // Локальное поле - список user IDs кто получил сообщение через WebSocket
  poll_data?: MessagePollData; // Данные опроса для сообщений типа 'poll'
  task_data?: MessageTaskData; // Данные задачи для сообщений типа 'task'
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
  avatar_thumbnail?: string; // Thumbnail for group chat avatars
  creator_id: number;
  created_by?: number;
  creator?: User;
  is_pinned?: boolean;
  is_muted?: boolean;
  is_favorite?: boolean;
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
  avatar?: string;
  member_ids: number[];
}

// Update Chat DTO
export interface UpdateChatDto {
  name?: string;
  description?: string;
  avatar?: string;
  avatar_thumbnail?: string;
}

// Send Message DTO
export interface SendMessageDto {
  content: string;
  message_type?: MessageType; // Frontend uses message_type
  type?: MessageType;         // Backend expects 'type', not 'message_type'
  reply_to_id?: number;
  file_ids?: number[]; // IDs of uploaded files from file-service
  attachments?: {
    file_url: string;
    file_name: string;
    file_type: string;
    file_size: number;
  }[];
  poll_id?: number; // ID of poll to share
  task_id?: number; // ID of task to share
  poll_data?: any;  // Poll data object for backend
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

// Get Messages Params (NEW - cursor-based pagination)
export interface GetMessagesParams {
  limit?: number;
  offset?: number; // Deprecated - use cursor-based endpoints instead
  before_message_id?: number; // Deprecated
  after_message_id?: number; // Deprecated
}

// NEW API Response Types
export interface GetLatestMessagesParams {
  limit?: number; // default: 10, max: 100
  include_unread_marker?: boolean; // default: true
}

export interface UnreadInfo {
  first_unread_id: number | null; // ID первого непрочитанного
  unread_count: number; // Количество непрочитанных
}

export interface GetLatestMessagesResponse {
  messages: Message[]; // В ХРОНОЛОГИЧЕСКОМ порядке (старые → новые)
  total: number; // Всего сообщений в чате
  has_older: boolean; // Есть ли более старые сообщения?
  unread_info?: UnreadInfo;
  pinned_messages: Message[]; // Все закрепленные сообщения в чате (недавно закрепленные первыми)
}

export interface GetMessagesBeforeParams {
  limit?: number; // default: 10, max: 100
}

export interface GetMessagesBeforeResponse {
  messages: Message[]; // В хронологическом порядке
  has_older: boolean;
  oldest_id?: number; // Cursor для следующего запроса
}

export interface GetMessageContextParams {
  before?: number; // default: 15, max: 50
  after?: number; // default: 15, max: 50
}

export interface GetMessageContextResponse {
  messages: Message[]; // В хронологическом порядке
  target_message_id: number; // ID целевого сообщения
  has_older: boolean;
  has_newer: boolean;
}

export interface MarkChatAsReadResponse {
  message: string; // "Chat marked as read"
  marked_count: number; // Количество помеченных сообщений
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

// WebSocket Events Payloads (NEW BACKEND STRUCTURE)
export interface WsMessageNewPayload {
  message: Message; // ПОЛНЫЙ объект сообщения с content
  is_latest: boolean; // Флаг для auto-scroll
}

export interface WsMessageUpdatePayload {
  message: Message; // ПОЛНЫЙ объект сообщения
}

export interface WsMessageDeletePayload {
  message_id: number;
  chat_id: number;
  delete_for: 'everyone' | 'me'; // Тип удаления
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
