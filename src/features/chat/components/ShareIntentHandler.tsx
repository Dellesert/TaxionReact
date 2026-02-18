import React, { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAuthStore } from '@shared/store/authStore';
import { useChatStore } from '@shared/store/chatStore';
import { ShareIntentModal } from './modals/ShareIntentModal';
import type { ShareIntent as ShareIntentType } from 'expo-share-intent';

// Only import share intent on native platforms
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

interface ShareIntentHandlerProps {
  children: React.ReactNode;
  navigationRef?: React.RefObject<NavigationContainerRef<any>>;
}

/**
 * Component that listens for share intents from other apps (iOS/Android only)
 * and shows a chat picker modal when content is shared.
 */
export const ShareIntentHandler: React.FC<ShareIntentHandlerProps> = ({ children, navigationRef }) => {
  if (!isNative) {
    return <>{children}</>;
  }

  return <NativeShareIntentHandler navigationRef={navigationRef}>{children}</NativeShareIntentHandler>;
};

const NativeShareIntentHandler: React.FC<ShareIntentHandlerProps> = ({ children, navigationRef }) => {
  // Lazy import to avoid bundling on web
  const { ShareIntentProvider } = require('expo-share-intent');

  return (
    <ShareIntentProvider options={{ debug: __DEV__ }}>
      <ShareIntentListener navigationRef={navigationRef} />
      {children}
    </ShareIntentProvider>
  );
};

const ShareIntentListener: React.FC<{ navigationRef?: React.RefObject<NavigationContainerRef<any>> }> = ({ navigationRef }) => {
  const { useShareIntentContext } = require('expo-share-intent') as typeof import('expo-share-intent');
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadMessages = useChatStore((state) => state.loadMessages);

  const [pendingIntent, setPendingIntent] = useState<ShareIntentType | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!hasShareIntent || !isAuthenticated) return;

    const hasContent =
      (shareIntent.files && shareIntent.files.length > 0) ||
      shareIntent.text ||
      shareIntent.webUrl;

    if (hasContent) {
      setPendingIntent(shareIntent);
      setShowModal(true);
    }
  }, [hasShareIntent, isAuthenticated]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setPendingIntent(null);
    resetShareIntent(true);
  }, [resetShareIntent]);

  const handleSent = useCallback((chatId: number, chatName: string) => {
    setShowModal(false);
    setPendingIntent(null);
    resetShareIntent(true);

    // Reload messages for the target chat to ensure they're up to date
    loadMessages(chatId);

    // Navigate to the chat after a short delay to let the modal close
    setTimeout(() => {
      if (navigationRef?.current?.isReady()) {
        // @ts-ignore - nested navigation params
        navigationRef.current.navigate('Chats', {
          screen: 'Chat',
          params: { chatId, chatName },
        });
      }
    }, 300);
  }, [resetShareIntent, loadMessages, navigationRef]);

  return (
    <ShareIntentModal
      visible={showModal}
      shareIntent={pendingIntent}
      onClose={handleClose}
      onSent={handleSent}
    />
  );
};
