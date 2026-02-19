/**
 * WebSocket Service - ИСПРАВЛЕННАЯ ВЕРСИЯ
 * Управляет WebSocket соединением для real-time общения
 */

import { z } from 'zod';
import { useChatStore } from '@shared/store/chatStore';
import { useAuthStore } from '@shared/store/authStore';
import { useNotificationStore } from '@shared/store/notificationStore';
import { useInAppNotificationStore } from '@shared/store/inAppNotificationStore';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import * as chatApi from '@/features/chat/api/chat.api';
import { isElectron } from '@shared/utils/platform';
import { electronPushNotificationService } from './pushNotificationElectron.service';

type WSMessageType =
  // Messages
  | 'new_message' | 'message_edit' | 'message_delete'
  | 'message_read' | 'typing' | 'reaction'
  | 'new_thread_message' | 'thread_update'
  // Chats
  | 'chat_create' | 'chat_update' | 'chat_delete'
  // Members
  | 'member_add' | 'member_remove' | 'member_update'
  // Presence
  | 'user_join' | 'user_leave' | 'user_presence'
  // Notifications
  | 'notification:new'
  | 'notification:update'
  // Session
  | 'session_revoked'
  // System
  | 'error' | 'pong' | 'ping';

// WebSocket close code for session revocation (custom code range 4000-4999)
const WS_CLOSE_SESSION_REVOKED = 4001;

interface WSMessage {
  type: WSMessageType;
  chat_id: number;
  user_id?: number;
  data: any;
  timestamp?: string;
}

// Схема валидации WebSocket сообщений
const WSMessageSchema = z.object({
  type: z.string(),
  chat_id: z.number().optional(), // Optional для системных сообщений
  user_id: z.number().optional(),
  data: z.any(),
  timestamp: z.string().optional(),
});

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10; // Увеличено до 10
  private baseReconnectDelay = 1000; // Базовая задержка 1 секунда
  private maxReconnectDelay = 30000; // Максимальная задержка 30 секунд
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isIntentionalClose = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Deduplicate user_presence events
  private lastPresenceUpdate: Map<number, number> = new Map(); // user_id -> timestamp
  private presenceDebounceMs = 1000; // Ignore duplicates within 1 second
  private maxPresenceMapSize = 1000; // Maximum entries before cleanup
  private presenceCleanupAgeMs = 300000; // Clean entries older than 5 minutes

  // Message batching для оптимизации производительности
  private messageQueue: WSMessage[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 50; // Батчим сообщения за 50ms
  private readonly MAX_BATCH_SIZE = 20; // Максимум 20 сообщений в батче

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    try {
      // Get session ID (session mode) or access token (JWT mode fallback)
      const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);

      if (!sessionId) {
        console.error('❌ No session ID found for WebSocket connection');
        return;
      }

      // WebSocket URL from env (chat service on port 8082)
      const wsBaseUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8082';
      const wsUrl = `${wsBaseUrl}/api/v1/ws?session_id=${encodeURIComponent(sessionId)}`;


      this.ws = new WebSocket(wsUrl);

      // Set up event handlers with error suppression
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

      // Add error event listener to prevent unhandled promise rejections
      if (this.ws.addEventListener) {
        this.ws.addEventListener('error', (event) => {
          event.preventDefault?.();
        }, { once: true });
      }
    } catch (error) {
      console.error('❌ Failed to connect WebSocket:', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.isIntentionalClose = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Очищаем батч сообщений
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    this.messageQueue = [];

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private getReconnectDelay(): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (max)
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );
    return delay;
  }

  /**
   * Reset reconnection attempts (called on successful connection)
   */
  private resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Clean up old presence update records to prevent memory leaks
   */
  private cleanupPresenceMap(): void {
    // Only cleanup if map is getting large
    if (this.lastPresenceUpdate.size < this.maxPresenceMapSize) {
      return;
    }

    const now = Date.now();
    const entriesToDelete: number[] = [];

    // Find old entries
    for (const [userId, timestamp] of this.lastPresenceUpdate) {
      if (now - timestamp > this.presenceCleanupAgeMs) {
        entriesToDelete.push(userId);
      }
    }

    // Delete old entries
    entriesToDelete.forEach(userId => {
      this.lastPresenceUpdate.delete(userId);
    });

  }

  /**
   * ИСПРАВЛЕННЫЙ метод отправки сообщений
   * Всегда отправляет правильную структуру WSMessage
   */
  private send(message: WSMessage): void {
    if (!this.isConnected()) {
      console.error('❌ WebSocket not connected - cannot send:', message);
      return;
    }

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket is not connected - cannot send:', message);
      return;
    }

    try {
      const raw = JSON.stringify(message);
      this.ws.send(raw);
    } catch (err) {
      console.error('❌ Failed to send WS message:', err, message);
    }
  }

  /**
   * Join chat room
   */
  joinChat(chatId: number): void {
    this.send({
      type: 'user_join',
      chat_id: chatId,
      data: {},
    });
  }

  /**
   * Leave chat room
   */
  leaveChat(chatId: number): void {
    this.send({
      type: 'user_leave',
      chat_id: chatId,
      data: {},
    });
  }

  /**
   * Send typing indicator
   */
  sendTyping(chatId: number, isTyping: boolean): void {
    this.send({
      type: 'typing',
      chat_id: chatId,
      data: { is_typing: isTyping },
    });
  }

  /**
   * ИСПРАВЛЕННЫЙ метод отправки чат-сообщений
   * Отправляет правильную структуру для new_message
   */
sendChatMessage(chatId: number, content: string, replyToId?: number) {
  this.send({
    type: 'new_message',   // обязательно new_message
    chat_id: chatId,
    data: {
      content,
      type: 'text',         // !!! соответствует ожиданиям Go
      reply_to_id: replyToId || null,
    },
  });
}



  /**
   * Mark message as read
   */
  sendRead(chatId: number, messageId: number): void {
    this.send({
      type: 'message_read',
      chat_id: chatId,
      data: { message_id: messageId },
    });
  }

  /**
   * Edit a message
   */
  editMessage(chatId: number, messageId: number, content: string): void {
    this.send({
      type: 'message_edit',
      chat_id: chatId,
      data: { message_id: messageId, content },
    });
  }

  /**
   * Delete a message
   */
  deleteMessage(chatId: number, messageId: number): void {
    this.send({
      type: 'message_delete',
      chat_id: chatId,
      data: { message_id: messageId },
    });
  }

  /**
   * Add reaction to a message
   */
  addReaction(chatId: number, messageId: number, emoji: string): void {
    this.send({
      type: 'reaction',
      chat_id: chatId,
      data: { message_id: messageId, emoji },
    });
  }

  /**
   * Send user presence status (online/offline/away)
   * Called when app goes to background/foreground
   */
  sendPresence(status: 'online' | 'offline' | 'away'): void {
    if (!this.isConnected()) {
      return;
    }

    this.send({
      type: 'user_presence',
      chat_id: 0, // Global presence, not chat-specific
      data: { status },
    });
  }

  /**
   * Handle WebSocket open
   */
  private handleOpen(event: Event): void {
    this.resetReconnectAttempts();
    this.isIntentionalClose = false;

    // Start heartbeat
    this.startHeartbeat();

    // Backend automatically subscribes user to their personal channel
    // All chat events (new_message, chat_create, etc.) are delivered automatically
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {

      // Handle case where backend sends multiple JSON objects in one message
      const rawData = event.data.trim();

      // Try to split by newlines or by finding multiple JSON objects
      let messages: WSMessage[] = [];

      // Check if it's a single valid JSON
      try {
        const singleMessage = JSON.parse(rawData);
        messages = [singleMessage];
      } catch (e) {
        // If single parse fails, try to split multiple JSONs
        // Split by newlines or consecutive closing/opening braces
        const jsonStrings = rawData.split(/\n|(?<=\})(?=\{)/);

        for (const jsonStr of jsonStrings) {
          const trimmed = jsonStr.trim();
          if (trimmed) {
            try {
              messages.push(JSON.parse(trimmed));
            } catch (parseErr) {
              console.error('❌ Failed to parse JSON fragment:', trimmed, parseErr);
            }
          }
        }
      }

      // Process each message with batching
      for (const message of messages) {
        this.queueMessage(message);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  /**
   * Queue message for batched processing
   * Группирует сообщения для обработки пакетами, снижая нагрузку на UI
   */
  private queueMessage(message: WSMessage): void {
    this.messageQueue.push(message);

    // Если достигли максимального размера батча, обрабатываем немедленно
    if (this.messageQueue.length >= this.MAX_BATCH_SIZE) {
      this.processBatch();
      return;
    }

    // Иначе устанавливаем таймер для батчинга
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.processBatch();
      }, this.BATCH_DELAY);
    }
  }

  /**
   * Process batched messages
   * Обрабатывает накопленные сообщения одним пакетом
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.messageQueue.length === 0) {
      return;
    }

    const batch = [...this.messageQueue];
    this.messageQueue = [];


    // Обрабатываем сообщения последовательно
    for (const message of batch) {
      await this.processMessage(message);
    }
  }

  /**
   * Process a single WebSocket message
   */
  private async processMessage(message: WSMessage): Promise<void> {
    try {
      // Валидация структуры сообщения
      const validationResult = WSMessageSchema.safeParse(message);
      if (!validationResult.success) {
        console.error('❌ Invalid WebSocket message structure:', {
          message,
          errors: validationResult.error.errors,
        });
        return; // Пропускаем невалидные сообщения
      }

      const chatStore = useChatStore.getState();
      const authStore = useAuthStore.getState();
      const currentUser = authStore.user;

      switch (message.type) {
        case 'new_message':
          // NEW BACKEND STRUCTURE: { message: MessageResponse, is_latest: boolean }
          const messageData = message.data?.message || message.data; // Support both structures
          const isLatest = message.data?.is_latest ?? true; // Default to true for backward compatibility

          const senderId = message.user_id || messageData?.sender_id;
          const newMessage = {
            id: messageData?.id || Date.now(), // temporary ID if not provided
            chat_id: message.chat_id || messageData?.chat_id,
            sender_id: senderId,
            content: messageData?.content || '', // ✅ BACKEND NOW SENDS FULL CONTENT!
            message_type: messageData?.message_type || messageData?.type || 'text',
            is_edited: messageData?.is_edited || false,
            is_pinned: messageData?.is_pinned || false,
            is_deleted: messageData?.is_deleted || false, // ⚠️ IMPORTANT: Check this flag!
            attachments: messageData?.attachments || [],
            reactions: messageData?.reactions || [],
            read_by: messageData?.read_by || [],
            read_receipts: messageData?.read_receipts || [],
            created_at: message.timestamp || messageData?.created_at || new Date().toISOString(),
            updated_at: messageData?.updated_at || message.timestamp || new Date().toISOString(),
            reply_to_id: messageData?.reply_to_id,
            reply_to: messageData?.reply_to,
            sender: messageData?.sender, // Don't provide fallback - let MessageItem fetch it
            status: messageData?.status || 'sent',
            link_preview: messageData?.link_preview,
          };

          // Pass is_latest flag to the store for auto-scroll logic
          await chatStore.handleNewMessage(newMessage, isLatest);
          break;

        case 'message_edit':
          // Handle message edit/restore - backend sends full message object in data
          const editedMessage = {
            id: message.data?.id || message.data?.message_id,
            chat_id: message.chat_id || message.data?.chat_id,
            sender_id: message.data?.sender_id, // Важно: используем sender_id из data, а не user_id (который содержит ID того, кто сделал действие)
            content: message.data?.content || '',
            message_type: message.data?.message_type || message.data?.type || 'text',
            is_edited: message.data?.is_edited || false,
            is_pinned: message.data?.is_pinned || false,
            is_deleted: message.data?.is_deleted || false, // Important for restore
            attachments: message.data?.attachments || [],
            reactions: message.data?.reactions || [],
            read_by: message.data?.read_by || [],
            read_receipts: message.data?.read_receipts || [], // ВАЖНО: сохраняем read_receipts для корректного определения прочитанных сообщений
            created_at: message.data?.created_at || new Date().toISOString(),
            updated_at: message.data?.updated_at || new Date().toISOString(),
            edited_at: message.data?.edited_at,
            reply_to_id: message.data?.reply_to_id,
            reply_to: message.data?.reply_to,
            sender: message.data?.sender,
            deleted_by: message.data?.deleted_by,
            deleted_at: message.data?.deleted_at,
            poll_data: message.data?.poll_data, // Include poll_data from WebSocket
            link_preview: message.data?.link_preview,
          };
          chatStore.handleMessageUpdate(editedMessage);
          break;

        case 'message_delete':
          // Backend now sends full message object with is_deleted=true and content=""
          if (message.data.id !== undefined) {
            // New format - full message object
            const deletedMessage = {
              id: message.data.id,
              chat_id: message.chat_id || message.data.chat_id,
              sender_id: message.data.sender_id,
              content: '', // Always empty for deleted messages
              message_type: message.data.message_type || message.data.type || 'text',
              is_edited: message.data.is_edited || false,
              is_pinned: message.data.is_pinned || false,
              is_deleted: true, // Always true for delete event
              attachments: [], // Clear attachments for deleted messages
              reactions: message.data.reactions || [],
              read_by: message.data.read_by || [],
              read_receipts: message.data.read_receipts || [],
              created_at: message.data.created_at || new Date().toISOString(),
              updated_at: message.data.updated_at || new Date().toISOString(),
              deleted_at: message.data.deleted_at || new Date().toISOString(),
              reply_to_id: message.data.reply_to_id,
              reply_to: message.data.reply_to,
              sender: message.data.sender,
            };
            chatStore.handleMessageUpdate(deletedMessage); // Use handleMessageUpdate for full message
          } else if (message.data.message_id !== undefined) {
            // Old format - fallback for backward compatibility
            chatStore.handleMessageDelete(message.data.message_id, message.chat_id);
          }
          break;

        case 'typing':
          if (message.data.is_typing) {
            chatStore.handleTypingStart(message.chat_id, message.data);
          } else {
            chatStore.handleTypingStop(message.chat_id, message.data.user_id);
          }
          break;

        case 'user_join':
          chatStore.handleUserJoin(message.chat_id, message.user_id);
          break;

        case 'user_leave':
          chatStore.handleUserLeave(message.chat_id, message.user_id);
          break;

        case 'message_read':
          chatStore.handleMessageRead(message.chat_id, message.data.message_id, message.user_id);
          break;

        case 'chat_update':
          // Handle chat update (e.g., unread_count reset)
          if (message.data.unread_count !== undefined) {
            // Update chat's unread_count directly
            chatStore.set({
              chats: useChatStore.getState().chats.map(chat =>
                chat.id === message.chat_id
                  ? { ...chat, unread_count: message.data.unread_count }
                  : chat
              ),
            });
          }
          break;

        case 'chat_delete':
          // Handle chat deletion
          chatStore.handleChatDelete(message.chat_id);
          break;

        case 'chat_create':
          // Handle new chat creation - load the full chat from API
          try {
            const newChat = await chatApi.getChat(message.chat_id);

            // Validate chat data
            if (!newChat || !newChat.id) {
              console.error('Invalid chat data received for chat_create:', newChat);
              break;
            }

            // Add chat to appropriate tabs
            const state = useChatStore.getState();
            const updatedTabs = { ...state.tabs };
            const chatType = newChat.type || 'private';
            const typeTabMap: Record<string, string | null> = { private: 'private', group: 'group', channel: 'channel' };

            // Add to appropriate tabs
            ['all', typeTabMap[chatType] || null]
              .filter(Boolean)
              .forEach(tabKey => {
                const tab = updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'];
                if (tab && tab.loaded) {
                  updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'] = {
                    ...tab,
                    regularChats: [newChat, ...tab.regularChats],
                  };
                }
              });

            // Update chats for current tab
            const currentTab = state.currentTab;
            const currentTabData = updatedTabs[currentTab];
            const updatedChats = currentTabData
              ? [...currentTabData.pinnedChats, ...currentTabData.regularChats]
              : state.chats;

            chatStore.set({
              chats: updatedChats,
              tabs: updatedTabs,
            });
          } catch (error) {
            console.error('Failed to load new chat:', error);
          }
          break;

        case 'member_add':
          // Handle member added to chat
          try {
            const updatedChat = await chatApi.getChat(message.chat_id);
            const state = useChatStore.getState();

            // Helper to update chat in array
            const updateChatInArray = (chats: any[]) =>
              chats.map(chat => chat.id === message.chat_id ? updatedChat : chat);

            // Update all tabs
            const updatedTabs = { ...state.tabs };
            Object.keys(updatedTabs).forEach(tabKey => {
              const tab = updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'];
              if (!tab || !tab.loaded) return;

              updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'] = {
                ...tab,
                pinnedChats: updateChatInArray(tab.pinnedChats),
                regularChats: updateChatInArray(tab.regularChats),
              };
            });

            // Reconstruct chats from current tab
            const currentTabData = updatedTabs[state.currentTab];
            const updatedChats = currentTabData
              ? [...currentTabData.pinnedChats, ...currentTabData.regularChats]
              : state.chats;

            chatStore.set({
              chats: updatedChats,
              tabs: updatedTabs,
            });
          } catch (error) {
            console.error('Failed to reload chat after member add:', error);
          }
          break;

        case 'member_remove':
          // Handle member removed from chat
          if (message.data?.user_id === currentUser?.id) {
            chatStore.handleChatDelete(message.chat_id);
          } else {
            // Otherwise reload chat to get updated members
            try {
              const updatedChat = await chatApi.getChat(message.chat_id);
              const state = useChatStore.getState();

              // Helper to update chat in array
              const updateChatInArray = (chats: any[]) =>
                chats.map(chat => chat.id === message.chat_id ? updatedChat : chat);

              // Update all tabs
              const updatedTabs = { ...state.tabs };
              Object.keys(updatedTabs).forEach(tabKey => {
                const tab = updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'];
                if (!tab || !tab.loaded) return;

                updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'] = {
                  ...tab,
                  pinnedChats: updateChatInArray(tab.pinnedChats),
                  regularChats: updateChatInArray(tab.regularChats),
                };
              });

              // Reconstruct chats from current tab
              const currentTabData = updatedTabs[state.currentTab];
              const updatedChats = currentTabData
                ? [...currentTabData.pinnedChats, ...currentTabData.regularChats]
                : state.chats;

              chatStore.set({
                chats: updatedChats,
                tabs: updatedTabs,
              });
            } catch (error) {
              console.error('Failed to reload chat after member remove:', error);
            }
          }
          break;

        case 'member_update':
          // Handle member role update
          try {
            const { user_id, role } = message.data;

            // Reload chat to get updated member info
            const updatedChat = await chatApi.getChat(message.chat_id);
            const state = useChatStore.getState();

            // Helper to update chat in array
            const updateChatInArray = (chats: any[]) =>
              chats.map(chat => chat.id === message.chat_id ? updatedChat : chat);

            // Update all tabs
            const updatedTabs = { ...state.tabs };
            Object.keys(updatedTabs).forEach(tabKey => {
              const tab = updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'];
              if (!tab || !tab.loaded) return;

              updatedTabs[tabKey as 'all' | 'private' | 'group' | 'channel'] = {
                ...tab,
                pinnedChats: updateChatInArray(tab.pinnedChats),
                regularChats: updateChatInArray(tab.regularChats),
              };
            });

            // Reconstruct chats from current tab
            const currentTabData = updatedTabs[state.currentTab];
            const updatedChats = currentTabData
              ? [...currentTabData.pinnedChats, ...currentTabData.regularChats]
              : state.chats;

            chatStore.set({
              chats: updatedChats,
              tabs: updatedTabs,
            });
          } catch (error) {
            console.error('Failed to reload chat after member role update:', error);
          }
          break;

        case 'reaction':
          chatStore.handleReaction(message.chat_id, message.data.message_id, message.data.emoji, message.user_id, message.data.action, message.data.user);
          break;

        case 'error':
          console.error('WebSocket error message:', message.data);
          break;

        case 'user_presence':
          // Debounce user_presence updates to reduce spam
          const presenceUserId = message.data.user_id;
          const now = Date.now();
          const lastUpdate = this.lastPresenceUpdate.get(presenceUserId) || 0;


          if (now - lastUpdate < this.presenceDebounceMs) {
            // Skip this duplicate update
            break;
          }

          // Update timestamp and process
          this.lastPresenceUpdate.set(presenceUserId, now);

          // Clean up old entries if map is getting too large
          this.cleanupPresenceMap();

          chatStore.handleUserPresence(message.data);
          break;

        case 'notification:new':
          // Handle new notification in real-time
          const notificationStore = useNotificationStore.getState();
          const inAppNotificationStore = useInAppNotificationStore.getState();

          if (message.data) {
            // Add notification to the beginning of the list
            notificationStore.handleNewNotification(message.data);

            // Show notification based on platform
            try {
              if (isElectron()) {
                // Electron: Show native system notification
                // Pass the complete notification data for proper navigation
                electronPushNotificationService.showNotification(
                  message.data.title || 'Tachyon Messenger',
                  message.data.message || message.data.body || '',
                  message.data // Pass full data object including type, chat_id, task_id, etc.
                );
              } else {
                // Web/Mobile: Show in-app toast notification
                inAppNotificationStore.showNotification(message.data);
              }
            } catch (error) {
              console.error('[WS] Error showing notification:', error);
              // Fallback to in-app notification if Electron notification fails
              inAppNotificationStore.showNotification(message.data);
            }
          }
          break;

        case 'notification:update':
          // Handle notification update (e.g., grouped notification count changed)
          if (message.data) {
            const notifStore = useNotificationStore.getState();
            // Replace the updated notification in the local list
            notifStore.handleNotificationUpdate(message.data);
          }
          break;

        case 'session_revoked':
          // Session was revoked (device removed from active sessions)
          this.isIntentionalClose = true; // Prevent reconnection attempts
          try {
            await authStore.logout({ skipApi: true });
          } catch (e) {
            console.error('[WS] Auto-logout on session_revoked failed:', e);
          }
          break;

        case 'new_thread_message': {
          // New comment in a thread — push to threadMessages store for real-time updates
          const threadMsgData = message.data?.message || message.data;
          if (threadMsgData && threadMsgData.thread_root_id) {
            const threadMsg = {
              id: threadMsgData.id,
              chat_id: message.chat_id || threadMsgData.chat_id,
              sender_id: threadMsgData.sender_id,
              content: threadMsgData.content || '',
              message_type: threadMsgData.message_type || threadMsgData.type || 'text',
              is_edited: threadMsgData.is_edited || false,
              is_pinned: threadMsgData.is_pinned || false,
              is_deleted: threadMsgData.is_deleted || false,
              attachments: threadMsgData.attachments || [],
              reactions: threadMsgData.reactions || [],
              read_by: threadMsgData.read_by || [],
              read_receipts: threadMsgData.read_receipts || [],
              created_at: message.timestamp || threadMsgData.created_at || new Date().toISOString(),
              updated_at: threadMsgData.updated_at || message.timestamp || new Date().toISOString(),
              reply_to_id: threadMsgData.reply_to_id,
              reply_to: threadMsgData.reply_to,
              sender: threadMsgData.sender,
              thread_root_id: threadMsgData.thread_root_id,
            };
            chatStore.handleNewThreadMessage(
              threadMsgData.thread_root_id,
              message.chat_id || threadMsgData.chat_id,
              threadMsg as any,
            );
          }
          break;
        }

        case 'thread_update':
          // Root message thread counters updated — update it in the messages list
          if (message.data) {
            const threadState = useChatStore.getState();
            const rootMsgId = message.data.id;
            if (rootMsgId && threadState.messages[message.chat_id]) {
              const updatedMessages = threadState.messages[message.chat_id].map(msg =>
                msg.id === rootMsgId
                  ? { ...msg, thread_reply_count: message.data.thread_reply_count, thread_last_reply_at: message.data.thread_last_reply_at }
                  : msg
              );
              useChatStore.setState(prev => ({
                messages: { ...prev.messages, [message.chat_id]: updatedMessages },
              }));
            }
          }
          break;

        case 'ping':
        case 'pong':
          // WebSocket ping/pong frames are handled automatically by the browser
          break;

        default:
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(event: Event): void {
    // Suppress default error logging to prevent user-visible errors
    // These errors are normal during connection/reconnection attempts
    if (event.type === 'error') {
      // Prevent default error handling
      event.preventDefault?.();

      // Only log detailed error in development
      if (__DEV__) {
      }
    }
  }

  /**
   * Handle WebSocket close
   */
  private async handleClose(event: CloseEvent): Promise<void> {

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Session revoked via close code (backend closed connection with 4001)
    if (event.code === WS_CLOSE_SESSION_REVOKED) {
      this.isIntentionalClose = true;
      try {
        await useAuthStore.getState().logout({ skipApi: true });
      } catch (e) {
        console.error('[WS] Auto-logout on close code 4001 failed:', e);
      }
      return;
    }

    // Auto-reconnect if not intentional close
    if (!this.isIntentionalClose) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.getReconnectDelay();
        this.reconnectAttempts++;

        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, delay);
      } else {
        // Don't give up completely - reset after a longer delay
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts = 0;
          this.connect();
        }, 60000); // Retry after 1 minute
      }
    }

    this.isIntentionalClose = false;
  }

  /**
   * Start heartbeat to keep connection alive
   * Note: Browser automatically responds to WebSocket ping/pong control frames
   * This heartbeat just monitors connection state
   */
  private startHeartbeat(): void {
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Monitor connection state every 20 seconds (less than backend's 54s ping period)
    this.heartbeatInterval = setInterval(() => {
      if (!this.ws) {
        return;
      }

      const state = this.ws.readyState;

      if (state === WebSocket.CLOSED) {
        // Try to reconnect
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.connect();
        }
      }
    }, 20000);
  }

  /**
   * Manually trigger reconnection (e.g., from UI retry button)
   */
  reconnect(): void {
    this.resetReconnectAttempts();
    this.isIntentionalClose = false;

    // Close existing connection if any
    if (this.ws) {
      this.isIntentionalClose = true; // Prevent auto-reconnect during manual reconnect
      this.ws.close();
      this.ws = null;
    }

    this.isIntentionalClose = false;
    this.connect();
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();