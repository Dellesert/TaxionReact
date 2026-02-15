import { Platform } from 'react-native';

interface ShareChatData {
  id: number;
  name: string;
  type: string;
  avatar?: string;
  last_message_content?: string;
  last_message_time?: string;
}

export function syncChatsToShareExtension(chats: ShareChatData[]): void {
  if (Platform.OS !== 'ios') return;
  try {
    const ShareData = require('..').default;
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
    const ShareData = require('..').default;
    ShareData.syncAuth(sessionId, userId, apiBaseUrl);
  } catch (e) {
    console.warn('[ShareData] Failed to sync auth:', e);
  }
}

export function clearShareExtensionData(): void {
  if (Platform.OS !== 'ios') return;
  try {
    const ShareData = require('..').default;
    ShareData.clearSyncedData();
  } catch (e) {
    console.warn('[ShareData] Failed to clear data:', e);
  }
}
