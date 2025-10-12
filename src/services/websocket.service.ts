/**
 * WebSocket Service
 * Управление WebSocket соединением для real-time коммуникации
 */

import { useChatStore } from '@store/chatStore';
import { useAuthStore } from '@store/authStore';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';

type WSMessageType =
  | 'user_join'
  | 'user_leave'
  | 'typing'
  | 'new_message'
  | 'message_update'
  | 'message_delete'
  | 'message_read'
  | 'error'
  | 'pong';

interface WSMessage {
  type: WSMessageType;
  chat_id: number;
  data: any;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isIntentionalClose = false;

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    try {
      // Get access token
      const token = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

      if (!token) {
        console.error('❌ No access token found for WebSocket connection');
        return;
      }

      // WebSocket URL from env (chat service on port 8082)
      const wsBaseUrl = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8082';
      const wsUrl = `${wsBaseUrl}/api/v1/ws?token=${encodeURIComponent(token)}`;

      console.log('🔌 Connecting to WebSocket:', wsBaseUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);

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

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message through WebSocket
   */
  send(message: WSMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      console.log('📤 WebSocket sent:', message);
    } else {
      console.error('❌ WebSocket is not connected');
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
   * Handle WebSocket open
   */
  private handleOpen(event: Event): void {
    console.log('✅ WebSocket connected');
    this.reconnectAttempts = 0;

    // Start heartbeat
    this.startHeartbeat();

    // Notify that connection is established
    const user = useAuthStore.getState().user;
    if (user) {
      console.log('👤 User connected:', user.full_name);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WSMessage = JSON.parse(event.data);
      console.log('📨 WebSocket received:', message);

      const chatStore = useChatStore.getState();

      switch (message.type) {
        case 'new_message':
          console.log('🔍 Raw message.data:', message.data);
          console.log('🔍 message.user_id:', message.user_id);

          // Get current user info to use as sender if it's our message
          const authStore = useAuthStore.getState();
          const currentUser = authStore.user;

          // Construct full message object from WebSocket data
          const newMessage = {
            ...message.data,
            chat_id: message.chat_id,
            created_at: message.timestamp || message.data?.created_at || new Date().toISOString(),
            // If sender is not in data, use current user if user_id matches, otherwise generic
            sender: message.data?.sender || (currentUser && message.user_id === currentUser.id ? {
              id: currentUser.id,
              full_name: currentUser.full_name,
              username: currentUser.username,
              avatar: currentUser.avatar,
            } : {
              id: message.user_id,
              full_name: 'User ' + message.user_id,
              username: 'user' + message.user_id,
              avatar: null,
            }),
          };
          console.log('📥 Constructed message:', newMessage);
          chatStore.handleNewMessage(newMessage);
          break;

        case 'message_update':
          chatStore.handleMessageUpdate(message.data);
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
          break;

        case 'user_leave':
          console.log('👋 User left chat:', message.chat_id);
          break;

        case 'message_read':
          console.log('✅ Message read:', message.data);
          break;

        case 'error':
          console.error('❌ WebSocket error message:', message.data);
          break;

        case 'pong':
          // Heartbeat response
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
  private handleError(error: Event): void {
    console.error('❌ WebSocket error:', error);
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
    if (!this.isIntentionalClose && this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay);
    } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
    }

    this.isIntentionalClose = false;
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
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
