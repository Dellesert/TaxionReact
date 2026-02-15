import { requireNativeModule } from 'expo-modules-core';

interface ShareDataModuleType {
  syncChats(chatsJson: string): void;
  syncAuth(sessionId: string, userId: number, apiBaseUrl: string): void;
  clearSyncedData(): void;
}

export default requireNativeModule<ShareDataModuleType>('ShareData');
