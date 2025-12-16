import { useState, useCallback, useRef, useEffect } from 'react';
import { Animated, Keyboard, Platform, LayoutAnimation, UIManager } from 'react-native';
import type { Chat } from '../types/chat.types';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

        if (Platform.OS === 'ios') {
          // Use LayoutAnimation on iOS for perfect sync with keyboard
          LayoutAnimation.configureNext({
            duration: event.duration,
            update: {
              type: LayoutAnimation.Types.keyboard,
            },
          });
          // Update Animated.Value immediately (LayoutAnimation handles visual transition)
          keyboardHeightAnim.setValue(height);
        } else {
          // Use Animated.timing on Android
          Animated.timing(keyboardHeightAnim, {
            toValue: height,
            duration: 120,
            useNativeDriver: true,
          }).start();
        }
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

        if (Platform.OS === 'ios') {
          // Use LayoutAnimation on iOS for perfect sync with keyboard
          LayoutAnimation.configureNext({
            duration: event.duration,
            update: {
              type: LayoutAnimation.Types.keyboard,
            },
          });
          // Update Animated.Value immediately (LayoutAnimation handles visual transition)
          keyboardHeightAnim.setValue(0);
        } else {
          // Use Animated.timing on Android
          Animated.timing(keyboardHeightAnim, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }).start();
        }
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
