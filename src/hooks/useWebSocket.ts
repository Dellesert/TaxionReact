/**
 * WebSocket Hook
 * Custom hook для работы с WebSocket соединением в реальном времени
 */

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@store/authStore';
import { useChatStore } from '@store/chatStore';
import { useNotificationStore } from '@store/notificationStore';
import { WS_URL, WS_EVENTS } from '@constants/api.constants';
import {
  WsMessageNewPayload,
  WsMessageUpdatePayload,
  WsMessageDeletePayload,
  WsTypingPayload,
  WsUserStatusPayload,
} from '@types/chat.types';
import { Notification } from '@types/notification.types';

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: Error | null;
  reconnect: () => void;
}

/**
 * Custom hook for WebSocket connection
 */
export const useWebSocket = (): UseWebSocketReturn => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  const { tokens, isAuthenticated } = useAuthStore();
  const chatStore = useChatStore();
  const notificationStore = useNotificationStore();

  /**
   * Initialize WebSocket connection
   */
  useEffect(() => {
    if (!isAuthenticated || !tokens?.access_token) {
      return;
    }

    // Create socket connection
    const socket = io(WS_URL, {
      query: { token: tokens.access_token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on(WS_EVENTS.CONNECT, () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on(WS_EVENTS.DISCONNECT, (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on(WS_EVENTS.ERROR, (error: Error) => {
      console.error('WebSocket error:', error);
      setConnectionError(error);
    });

    // ============= Chat Events =============

    // New message
    socket.on(WS_EVENTS.MESSAGE_NEW, (payload: WsMessageNewPayload) => {
      console.log('New message received:', payload);
      chatStore.handleNewMessage(payload.message);
    });

    // Message updated
    socket.on(WS_EVENTS.MESSAGE_UPDATE, (payload: WsMessageUpdatePayload) => {
      console.log('Message updated:', payload);
      chatStore.handleMessageUpdate(payload.message);
    });

    // Message deleted
    socket.on(WS_EVENTS.MESSAGE_DELETE, (payload: WsMessageDeletePayload) => {
      console.log('Message deleted:', payload);
      chatStore.handleMessageDelete(payload.message_id, payload.chat_id);
    });

    // User typing start
    socket.on(WS_EVENTS.TYPING_START, (payload: WsTypingPayload) => {
      console.log('User typing:', payload);
      chatStore.handleTypingStart(payload.chat_id, {
        chat_id: payload.chat_id,
        user_id: payload.user_id,
        user: payload.user,
        timestamp: Date.now(),
      });
    });

    // User typing stop
    socket.on(WS_EVENTS.TYPING_STOP, (payload: WsTypingPayload) => {
      console.log('User stopped typing:', payload);
      chatStore.handleTypingStop(payload.chat_id, payload.user_id);
    });

    // ============= User Status Events =============

    // User online
    socket.on(WS_EVENTS.USER_ONLINE, (payload: WsUserStatusPayload) => {
      console.log('User online:', payload);
      // Update user status in relevant stores/components
    });

    // User offline
    socket.on(WS_EVENTS.USER_OFFLINE, (payload: WsUserStatusPayload) => {
      console.log('User offline:', payload);
      // Update user status in relevant stores/components
    });

    // User status change
    socket.on(WS_EVENTS.USER_STATUS_CHANGE, (payload: WsUserStatusPayload) => {
      console.log('User status changed:', payload);
      // Update user status in relevant stores/components
    });

    // ============= Notification Events =============

    // New notification (if using WebSocket for notifications)
    socket.on('notification:new', (notification: Notification) => {
      console.log('New notification:', notification);
      notificationStore.handleNewNotification(notification);
    });

    // Cleanup on unmount
    return () => {
      console.log('Cleaning up WebSocket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, tokens?.access_token]);

  /**
   * Manually reconnect
   */
  const reconnect = () => {
    if (socketRef.current) {
      socketRef.current.connect();
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    reconnect,
  };
};

/**
 * Hook to emit typing events
 */
export const useTypingIndicator = (chatId: number) => {
  const { socket, isConnected } = useWebSocket();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const sendTypingStart = () => {
    if (!socket || !isConnected) return;

    socket.emit(WS_EVENTS.TYPING_START, { chat_id: chatId });

    // Auto-stop typing after 3 seconds
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop();
    }, 3000);
  };

  const sendTypingStop = () => {
    if (!socket || !isConnected) return;

    socket.emit(WS_EVENTS.TYPING_STOP, { chat_id: chatId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    sendTypingStart,
    sendTypingStop,
  };
};
