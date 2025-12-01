/**
 * Custom Hook: useChatTyping
 * Управление индикатором печати
 *
 * ОПТИМИЗАЦИЯ: Использует websocketService вместо socket.io-client
 */

import { useCallback } from 'react';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { websocketService } from '@services/websocket.service';
import { useChatStore } from '@shared/store/chatStore';
import type { TypingIndicator } from '../types/chat.types';

interface UseChatTypingReturn {
  typingUsers: TypingIndicator[];
  handleTyping: () => void;
}

export const useChatTyping = (chatId: number): UseChatTypingReturn => {
  const { startTyping } = useTypingIndicator(String(chatId));

  // Subscribe to the entire typingUsers object to detect any changes
  // Then extract only the users for this specific chat
  const allTypingUsers = useChatStore((state) => state.typingUsers);
  const typingUsers = allTypingUsers[chatId] || [];

  const handleTyping = useCallback(() => {
    startTyping();
    // Отправляем событие typing через WebSocket
    websocketService.sendTyping(chatId, true);
  }, [startTyping, chatId]);

  return {
    typingUsers,
    handleTyping,
  };
};
