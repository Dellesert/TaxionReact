/**
 * Custom Hook: useChatTyping
 * Управление индикатором печати
 */

import { useCallback } from 'react';
import { useTypingIndicator } from '@hooks/useWebSocket';
import { useTypingIndicator as useTypingUsers } from '@hooks/useTypingIndicator';

interface UseChatTypingReturn {
  typingUsers: string[];
  handleTyping: () => void;
}

export const useChatTyping = (chatId: number): UseChatTypingReturn => {
  const { sendTypingStart } = useTypingIndicator(chatId);
  const { startTyping, typingUsers } = useTypingUsers(String(chatId));

  const handleTyping = useCallback(() => {
    startTyping();
    sendTypingStart();
  }, [startTyping, sendTypingStart]);

  return {
    typingUsers,
    handleTyping,
  };
};
