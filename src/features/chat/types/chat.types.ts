/**
 * Chat Types
 * Типы для работы с чатами и сообщениями
 */

import { ISODateString } from '@/types/common.types';
import { User } from '@/types/user.types';

// Chat Types
export type ChatType = 'private' | 'group' | 'channel' | 'saved';

// Message Types
export type MessageType = 'text' | 'image' | 'file' | 'voice' | 'video' | 'system' | 'poll' | 'task';

// Pending video file (local, not yet uploaded)
export interface PendingVideoFile {
  localUri: string;       // Local URI from image picker
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  duration?: number;
}

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
  thumbnail_url?: string;        // Legacy = medium
  thumbnail_small_url?: string;  // ~100x100
  thumbnail_medium_url?: string; // ~400x300
  thumbnail_large_url?: string;  // ~800x600
  duration?: number; // Duration in seconds (for video/audio)
  width?: number; // Media width in pixels
  height?: number; // Media height in pixels
  created_at?: ISODateString;
  local_uri?: string; // Local URI for optimistic video uploads
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

// Link Preview Interface
export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  site_name?: string;
}

// Chat Link Response (from GET /chats/:id/links)
export interface ChatLink {
  message_id: number;
  sender_id: number;
  sender?: {
    id: number;
    name: string;
    avatar?: string;
  };
  link_preview: LinkPreview;
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
  upload_progress?: number; // Локальное поле - прогресс загрузки видео 0-100
  pending_video_files?: PendingVideoFile[]; // Локальное поле - видео файлы в процессе загрузки
  poll_data?: MessagePollData; // Данные опроса для сообщений типа 'poll'
  task_data?: MessageTaskData; // Данные задачи для сообщений типа 'task'
  link_preview?: LinkPreview; // Превью ссылки из текста сообщения
  // Forward-related fields
  forwarded_from_message_id?: number; // ID оригинального сообщения
  original_sender_id?: number; // ID оригинального отправителя
  original_sender?: User; // Данные оригинального отправителя
  is_forwarded?: boolean; // Флаг пересланного сообщения
  // Thread-related fields (for channel comments)
  thread_root_id?: number; // ID корневого поста (если это комментарий в треде)
  thread_reply_count?: number; // Количество комментариев в треде
  thread_last_reply_at?: ISODateString; // Время последнего комментария
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
  muted_until?: string | null;
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
  // Forward-related field
  forward_from_message_id?: number; // ID сообщения для пересылки
  // Thread-related field
  thread_root_id?: number; // ID корневого поста для комментария в треде
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

// Thread Messages Response (for channel post comments)
export interface GetThreadMessagesResponse {
  messages: Message[]; // Комментарии в хронологическом порядке
  total: number; // Всего комментариев
  has_more: boolean; // Есть ли ещё комментарии для подгрузки?
  root_message?: Message; // Корневой пост
}

// Chat List Filters
export interface ChatListFilters {
  type?: ChatType;
  is_pinned?: boolean;
  search?: string;
}

// Typing Indicator
export type TypingAction = 'typing' | 'uploading_photo' | 'uploading_video';

export interface TypingIndicator {
  chat_id: number;
  user_id: number;
  user?: User;
  action?: TypingAction;
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

// Thread WebSocket Events
export interface WsThreadMessagePayload {
  message: Message; // Новый комментарий в треде
  is_latest: boolean;
}

export interface WsThreadUpdatePayload {
  id: number;
  thread_reply_count: number;
  thread_last_reply_at?: ISODateString;
}
