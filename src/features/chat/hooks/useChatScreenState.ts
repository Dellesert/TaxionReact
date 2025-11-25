import { useState, useCallback } from 'react';
import type { Chat } from '../types/chat.types';

/**
 * Custom hook to manage all local state for ChatScreen
 */
export const useChatScreenState = () => {
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [showUnreadBanner, setShowUnreadBanner] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [pollModalVisible, setPollModalVisible] = useState(false);
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);
  const [ignoreReadReceipts, setIgnoreReadReceipts] = useState(true);
  const [initialUnreadCount, setInitialUnreadCount] = useState(0);
  const [savedUnreadCount, setSavedUnreadCount] = useState(0);
  const [chatData, setChatData] = useState<Chat | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const resetChatState = useCallback(() => {
    setShowUnreadBanner(true);
    setIgnoreReadReceipts(true);
    setInitialUnreadCount(0);
  }, []);

  return {
    // Modal states
    membersModalVisible,
    setMembersModalVisible,
    pollModalVisible,
    setPollModalVisible,
    selectedPollId,
    setSelectedPollId,

    // Connection and UI states
    isConnected,
    setIsConnected,
    isLayoutReady,
    setIsLayoutReady,
    contentReady,
    setContentReady,

    // Keyboard state
    keyboardHeight,
    setKeyboardHeight,

    // Unread and read receipts
    showUnreadBanner,
    setShowUnreadBanner,
    ignoreReadReceipts,
    setIgnoreReadReceipts,
    initialUnreadCount,
    setInitialUnreadCount,
    savedUnreadCount,
    setSavedUnreadCount,

    // Chat data
    chatData,
    setChatData,
    isLoadingChat,
    setIsLoadingChat,

    // Reset
    resetChatState,
  };
};
