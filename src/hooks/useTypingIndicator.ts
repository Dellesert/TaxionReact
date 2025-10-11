import { useState, useEffect, useCallback } from 'react';

interface UseTypingIndicatorReturn {
  typingUsers: string[];
  startTyping: () => void;
  stopTyping: () => void;
}

export const useTypingIndicator = (chatId: string): UseTypingIndicatorReturn => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const startTyping = useCallback(() => {
    // Clear previous timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 3 seconds
    const timeout = setTimeout(() => {
      stopTyping();
    }, 3000);

    setTypingTimeout(timeout);
  }, [typingTimeout]);

  const stopTyping = useCallback(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
      setTypingTimeout(null);
    }
  }, [typingTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
};
