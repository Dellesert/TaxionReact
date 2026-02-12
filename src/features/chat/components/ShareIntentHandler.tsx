import React, { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@shared/store/authStore';
import { ShareIntentModal } from './modals/ShareIntentModal';
import type { ShareIntent as ShareIntentType } from 'expo-share-intent';

// Only import share intent on native platforms
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Component that listens for share intents from other apps (iOS/Android only)
 * and shows a chat picker modal when content is shared.
 */
export const ShareIntentHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (!isNative) {
    return <>{children}</>;
  }

  return <NativeShareIntentHandler>{children}</NativeShareIntentHandler>;
};

const NativeShareIntentHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Lazy import to avoid bundling on web
  const { ShareIntentProvider } = require('expo-share-intent');

  return (
    <ShareIntentProvider options={{ debug: __DEV__ }}>
      <ShareIntentListener />
      {children}
    </ShareIntentProvider>
  );
};

const ShareIntentListener: React.FC = () => {
  const { useShareIntentContext } = require('expo-share-intent') as typeof import('expo-share-intent');
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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

  const handleSent = useCallback(() => {
    setShowModal(false);
    setPendingIntent(null);
    resetShareIntent(true);
  }, [resetShareIntent]);

  return (
    <ShareIntentModal
      visible={showModal}
      shareIntent={pendingIntent}
      onClose={handleClose}
      onSent={handleSent}
    />
  );
};
