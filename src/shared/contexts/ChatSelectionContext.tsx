/**
 * Chat Selection Context
 * Контекст для управления выбором чата в desktop режиме
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface ChatSelectionContextType {
  selectedChatId: number | null;
  selectedChatName: string;
  selectedChatUnreadCount: number;
  selectChat: (chatId: number, chatName: string, unreadCount?: number) => void;
  clearSelection: () => void;
}

const ChatSelectionContext = createContext<ChatSelectionContextType | undefined>(undefined);

interface ChatSelectionProviderProps {
  children: ReactNode;
}

export const ChatSelectionProvider: React.FC<ChatSelectionProviderProps> = ({ children }) => {
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const [selectedChatName, setSelectedChatName] = useState<string>('');
  const [selectedChatUnreadCount, setSelectedChatUnreadCount] = useState<number>(0);

  const selectChat = useCallback((chatId: number, chatName: string, unreadCount: number = 0) => {
    setSelectedChatId(chatId);
    setSelectedChatName(chatName);
    setSelectedChatUnreadCount(unreadCount);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedChatId(null);
    setSelectedChatName('');
    setSelectedChatUnreadCount(0);
  }, []);

  return (
    <ChatSelectionContext.Provider
      value={{
        selectedChatId,
        selectedChatName,
        selectedChatUnreadCount,
        selectChat,
        clearSelection,
      }}
    >
      {children}
    </ChatSelectionContext.Provider>
  );
};

export const useChatSelection = () => {
  const context = useContext(ChatSelectionContext);
  if (context === undefined) {
    throw new Error('useChatSelection must be used within a ChatSelectionProvider');
  }
  return context;
};
