/**
 * Custom Hook: useChatTyping
 * Управление индикатором печати
 *
 * ОПТИМИЗАЦИЯ: Использует websocketService вместо socket.io-client
 */

import { useCallback } from 'react';
import { useTypingIndicator } from '../hooks/useTypingIndicator';
import { websocketService } from '@services/websocket.service';

interface UseChatTypingReturn {
  typingUsers: string[];
  handleTyping: () => void;
}

export const useChatTyping = (chatId: number): UseChatTypingReturn => {
  const { startTyping, typingUsers } = useTypingIndicator(String(chatId));

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
