import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Keyboard, Platform } from 'react-native';
import type { Chat } from '../types/chat.types';

/**
 * Custom hook to manage all local state for ChatScreen
 */
export const useChatScreenState = () => {
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [showUnreadBanner, setShowUnreadBanner] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
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

  // Store refs for keyboard animation callbacks
  const onKeyboardShow = useRef<((height: number) => void) | null>(null);
  const onKeyboardHide = useRef<(() => void) | null>(null);
  const onKeyboardAnimating = useRef<((currentHeight: number, targetHeight: number) => void) | null>(null);

  // Function to set keyboard callbacks
  const setKeyboardCallbacks = useCallback((
    onShow: ((height: number) => void) | null,
    onHide: (() => void) | null,
    onAnimating?: ((currentHeight: number, targetHeight: number) => void) | null
  ) => {
    onKeyboardShow.current = onShow;
    onKeyboardHide.current = onHide;
    onKeyboardAnimating.current = onAnimating || null;
  }, []);

  // Keyboard listeners for handling keyboard show/hide
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const height = event.endCoordinates.height;
        setKeyboardHeight(height);

        // Call the callback
        if (onKeyboardShow.current) {
          onKeyboardShow.current(height);
        }

        // Start padding animation
        Animated.timing(keyboardHeightAnim, {
          toValue: height,
          duration: Platform.OS === 'ios' ? event.duration : 120,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (event) => {
        setKeyboardHeight(0);

        // Call the callback before animation starts
        if (onKeyboardHide.current) {
          onKeyboardHide.current();
        }

        Animated.timing(keyboardHeightAnim, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? event.duration : 120,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardHeightAnim]);

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
    keyboardHeightAnim,
    setKeyboardCallbacks,

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
