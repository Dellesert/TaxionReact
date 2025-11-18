/**
 * WebSocket Service - ИСПРАВЛЕННАЯ ВЕРСИЯ
 * Управляет WebSocket соединением для real-time общения
 */

import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as chatApi from '@api/chat.api';

type WSMessageType =
  | 'user_join' | 'user_leave' | 'typing' | 'new_message'
  | 'message_read' | 'message_edit' | 'message_delete'
  | 'reaction' | 'error' | 'pong' | 'ping' | 'user_presence'
  | 'chat_update' | 'chat_delete' | 'chat_create' | 'member_add' | 'member_remove';

interface WSMessage {
  type: WSMessageType;
  chat_id: number;
  user_id?: number;
  data: any;
  timestamp?: string;
}

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

      console.log('🔌 Connecting to WebSocket (session mode):', wsBaseUrl);

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
    console.log('🔌 Disconnecting WebSocket...');
    this.isIntentionalClose = true;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

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
   * Handle WebSocket open
   */
  private handleOpen(event: Event): void {
    console.log('✅ WebSocket connected successfully');
    this.resetReconnectAttempts();
    this.isIntentionalClose = false;

    // Start heartbeat
    this.startHeartbeat();

    // Notify that connection is established
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('👤 User connected:', user.full_name);
    }

    // ✅ РЕШЕНИЕ: Join all user's chats to receive last_message updates
    // This allows chat list to show new messages in real-time
    // without interfering with ChatScreen's join/leave logic
    const chatStore = useChatStore.getState();
    const chats = chatStore.chats;
    if (chats && chats.length > 0) {
      chats.forEach((chat) => {
        this.joinChat(chat.id);
      });
      console.log(`📍 Joined ${chats.length} chats for updates`);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    try {
      console.log('🔸 Raw event.data:', event.data);

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

      // Process each message
      for (const message of messages) {
        await this.processMessage(message);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
    }
  }

  /**
   * Process a single WebSocket message
   */
  private async processMessage(message: WSMessage): Promise<void> {
    try {
      console.log('📨 WebSocket received:', message);

      const chatStore = useChatStore.getState();
      const authStore = useAuthStore.getState();
      const currentUser = authStore.user;

      switch (message.type) {
        case 'new_message':
          // Construct full message object from WebSocket data
          const senderId = message.user_id || message.data?.sender_id;
          const newMessage = {
            id: message.data?.id || Date.now(), // temporary ID if not provided
            chat_id: message.chat_id,
            sender_id: senderId,
            content: message.data?.content || '',
            message_type: message.data?.message_type || message.data?.type || 'text',
            is_edited: message.data?.is_edited || false,
            is_pinned: message.data?.is_pinned || false,
            is_deleted: message.data?.is_deleted || false,
            attachments: message.data?.attachments || [],
            reactions: message.data?.reactions || [],
            read_by: message.data?.read_by || [],
            created_at: message.timestamp || message.data?.created_at || new Date().toISOString(),
            updated_at: message.data?.updated_at || message.timestamp || new Date().toISOString(),
            reply_to_id: message.data?.reply_to_id,
            reply_to: message.data?.reply_to,
            sender: message.data?.sender, // Don't provide fallback - let MessageItem fetch it
          };

          await chatStore.handleNewMessage(newMessage);
          break;

        case 'message_edit':
          // Handle message edit/restore - backend sends full message object in data
          const editedMessage = {
            id: message.data?.id || message.data?.message_id,
            chat_id: message.chat_id || message.data?.chat_id,
            sender_id: message.user_id || message.data?.sender_id,
            content: message.data?.content || '',
            message_type: message.data?.message_type || message.data?.type || 'text',
            is_edited: message.data?.is_edited || false,
            is_pinned: message.data?.is_pinned || false,
            is_deleted: message.data?.is_deleted || false, // Important for restore
            attachments: message.data?.attachments || [],
            reactions: message.data?.reactions || [],
            read_by: message.data?.read_by || [],
            created_at: message.data?.created_at || new Date().toISOString(),
            updated_at: message.data?.updated_at || new Date().toISOString(),
            edited_at: message.data?.edited_at,
            reply_to_id: message.data?.reply_to_id,
            reply_to: message.data?.reply_to,
            sender: message.data?.sender,
            deleted_by: message.data?.deleted_by,
            deleted_at: message.data?.deleted_at,
            poll_data: message.data?.poll_data, // ADDED: Include poll_data from WebSocket
          };
          chatStore.handleMessageUpdate(editedMessage);
          break;

        case 'message_delete':
          chatStore.handleMessageDelete(message.data.message_id, message.chat_id);
          break;

        case 'typing':
          if (message.data.is_typing) {
            chatStore.handleTypingStart(message.chat_id, message.data);
          } else {
            chatStore.handleTypingStop(message.chat_id, message.data.user_id);
          }
          break;

        case 'user_join':
          console.log('👋 User joined chat:', message.chat_id);
          chatStore.handleUserJoin(message.chat_id, message.user_id);
          break;

        case 'user_leave':
          console.log('👋 User left chat:', message.chat_id);
          chatStore.handleUserLeave(message.chat_id, message.user_id);
          break;

        case 'message_read':
          console.log('📖 Message read event:', { chatId: message.chat_id, messageId: message.data.message_id, userId: message.user_id });
          chatStore.handleMessageRead(message.chat_id, message.data.message_id, message.user_id);
          break;

        case 'chat_update':
          // Handle chat update (e.g., unread_count reset)
          console.log('💬 Chat update event:', message.data);
          if (message.data.unread_count !== undefined) {
            // Update chat's unread_count directly
            chatStore.set({
              chats: chatStore.getState().chats.map(chat =>
                chat.id === message.chat_id
                  ? { ...chat, unread_count: message.data.unread_count }
                  : chat
              ),
            });
          }
          break;

        case 'chat_delete':
          // Handle chat deletion
          console.log('🗑️ Chat delete event:', { chatId: message.chat_id, data: message.data });
          chatStore.handleChatDelete(message.chat_id);
          break;

        case 'chat_create':
          // Handle new chat creation - load the full chat from API
          console.log('➕ Chat create event:', { chatId: message.chat_id, data: message.data });
          try {
            const newChat = await chatApi.getChat(message.chat_id);
            console.log('✅ New chat loaded:', newChat);

            // Add chat to appropriate tabs
            const state = chatStore.getState();
            const updatedTabs = { ...state.tabs };
            const chatType = newChat.type;
            const isFavorite = newChat.is_favorite;

            // Add to appropriate tabs
            ['all', chatType === 'private' ? 'private' : chatType === 'group' ? 'group' : null, isFavorite ? 'favorite' : null]
              .filter(Boolean)
              .forEach(tabKey => {
                const tab = updatedTabs[tabKey as 'all' | 'private' | 'group' | 'favorite'];
                if (tab && tab.loaded) {
                  updatedTabs[tabKey as 'all' | 'private' | 'group' | 'favorite'] = {
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
            console.error('❌ Failed to load new chat:', error);
          }
          break;

        case 'member_add':
          // Handle member added to chat
          console.log('👥 Member add event:', { chatId: message.chat_id, data: message.data });
          // Reload chat to get updated members
          try {
            const updatedChat = await chatApi.getChat(message.chat_id);
            chatStore.set({
              chats: chatStore.getState().chats.map(chat =>
                chat.id === message.chat_id ? updatedChat : chat
              ),
            });
          } catch (error) {
            console.error('❌ Failed to reload chat after member add:', error);
          }
          break;

        case 'member_remove':
          // Handle member removed from chat
          console.log('👥 Member remove event:', { chatId: message.chat_id, data: message.data });
          // If current user was removed, delete the chat from store
          if (message.data?.user_id === currentUser?.id) {
            console.log('Current user removed from chat, deleting from store');
            chatStore.handleChatDelete(message.chat_id);
          } else {
            // Otherwise reload chat to get updated members
            try {
              const updatedChat = await chatApi.getChat(message.chat_id);
              chatStore.set({
                chats: chatStore.getState().chats.map(chat =>
                  chat.id === message.chat_id ? updatedChat : chat
                ),
              });
            } catch (error) {
              console.error('❌ Failed to reload chat after member remove:', error);
            }
          }
          break;

        case 'reaction':
          console.log('😊 Reaction added:', message.data);
          chatStore.handleReaction(message.chat_id, message.data.message_id, message.data.emoji, message.user_id);
          break;

        case 'error':
          console.error('❌ WebSocket error message:', message.data);
          break;

        case 'user_presence':
          // Debounce user_presence updates to reduce spam
          const userId = message.data.user_id;
          const now = Date.now();
          const lastUpdate = this.lastPresenceUpdate.get(userId) || 0;

          if (now - lastUpdate < this.presenceDebounceMs) {
            // Skip this duplicate update
            console.log(`⏭️ Skipping duplicate presence update for user ${userId}`);
            break;
          }

          // Update timestamp and process
          this.lastPresenceUpdate.set(userId, now);
          console.log('👤 User presence update:', message.data);
          chatStore.handleUserPresence(message.data);
          break;

        case 'ping':
        case 'pong':
          // WebSocket ping/pong frames are handled automatically by the browser
          // If we receive these as JSON messages, just log them
          console.log('🏓 Ping/Pong message (handled automatically)');
          break;

        default:
          console.log('❓ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
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

      console.log('⚠️ WebSocket connection error (will retry if needed)');

      // Only log detailed error in development
      if (__DEV__) {
        console.log('WebSocket error details:', event);
      }
    }
  }

  /**
   * Handle WebSocket close
   */
  private handleClose(event: CloseEvent): void {
    console.log(`🔌 WebSocket closed: Code ${event.code}, Reason: ${event.reason || 'Unknown'}`);

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Auto-reconnect if not intentional close
    if (!this.isIntentionalClose) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        const delay = this.getReconnectDelay();
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

        this.reconnectTimeout = setTimeout(() => {
          this.connect();
        }, delay);
      } else {
        console.warn('⚠️ Max reconnection attempts reached. Will retry when user interacts with app.');
        // Don't give up completely - reset after a longer delay
        this.reconnectTimeout = setTimeout(() => {
          console.log('🔄 Resetting reconnection attempts after cooldown...');
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
        console.warn('⚠️ WebSocket: No connection object');
        return;
      }

      const state = this.ws.readyState;

      if (state === WebSocket.CONNECTING) {
        console.log('🔄 WebSocket: Still connecting...');
      } else if (state === WebSocket.OPEN) {
        // Connection is alive - no action needed
        // Browser automatically responds to ping frames from server
        console.log('✅ WebSocket: Connection alive');
      } else if (state === WebSocket.CLOSING) {
        console.warn('⚠️ WebSocket: Connection closing...');
      } else if (state === WebSocket.CLOSED) {
        console.error('❌ WebSocket: Connection closed unexpectedly');
        // Try to reconnect
        if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('🔄 Attempting to reconnect...');
          this.connect();
        }
      }
    }, 20000);
  }

  /**
   * Manually trigger reconnection (e.g., from UI retry button)
   */
  reconnect(): void {
    console.log('🔄 Manual reconnect triggered');
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