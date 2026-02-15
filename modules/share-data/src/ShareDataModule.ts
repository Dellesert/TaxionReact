import { Platform } from 'react-native';

interface ShareChatData {
  id: number;
  name: string;
  type: string;
  avatar?: string;
  last_message_content?: string;
  last_message_time?: string;
}

function getShareDataModule() {
  const { requireNativeModule } = require('expo-modules-core');
  return requireNativeModule('ShareData');
}

export function syncChatsToShareExtension(chats: ShareChatData[]): void {
  if (Platform.OS !== 'ios') return;
  try {
    const ShareData = getShareDataModule();
    const json = JSON.stringify(chats.slice(0, 50));
    ShareData.syncChats(json);
  } catch (e) {
    console.warn('[ShareData] Failed to sync chats:', e);
  }
}

export function syncAuthToShareExtension(
  sessionId: string,
  userId: number,
  apiBaseUrl: string
): void {
  if (Platform.OS !== 'ios') return;
  try {
    const ShareData = getShareDataModule();
    ShareData.syncAuth(sessionId, userId, apiBaseUrl);
    console.log('[ShareData] syncAuth called — userId:', userId, 'apiBaseUrl:', apiBaseUrl);
  } catch (e) {
    console.error('[ShareData] Failed to sync auth:', e);
    // TODO: убрать после отладки
    const { Alert } = require('react-native');
    Alert.alert('[ShareData] syncAuth error', String(e));
  }
}

export function clearShareExtensionData(): void {
  if (Platform.OS !== 'ios') return;
  try {
    const ShareData = getShareDataModule();
    ShareData.clearSyncedData();
  } catch (e) {
    console.warn('[ShareData] Failed to clear data:', e);
  }
}
