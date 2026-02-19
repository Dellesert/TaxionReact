/**
 * Sync Metadata Storage
 * Stores timestamps of last sync for differential loading
 *
 * - iOS/Android: Uses MMKV (synchronous)
 * - Web: Uses AsyncStorage (asynchronous)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Storage keys
const SETTINGS_STORAGE_ID = 'taxion-settings-storage';
const SYNC_METADATA_KEY = isNative ? 'sync_metadata' : `${SETTINGS_STORAGE_ID}:sync_metadata`;

export interface SyncMetadata {
  /** Last chat sync */
  chats?: number;
  /** Last task sync */
  tasks?: number;
  /** Last poll sync */
  polls?: number;
  /** Last calendar sync */
  calendar?: number;
  /** Last user sync */
  users?: number;
}

// MMKV instance (lazy-loaded for native)
let mmkvSettings: any = null;

const getMMKVSettings = () => {
  if (!isNative) return null;
  if (!mmkvSettings) {
    try {
      const { createMMKV } = require('react-native-mmkv');
      mmkvSettings = createMMKV({ id: SETTINGS_STORAGE_ID });
    } catch (e) {
      console.warn('[SyncMetadata] MMKV not available:', e);
    }
  }
  return mmkvSettings;
};

/**
 * Get sync metadata
 */
export const getSyncMetadata = async (): Promise<SyncMetadata> => {
  try {
    if (isNative) {
      const mmkv = getMMKVSettings();
      const data = mmkv?.getString(SYNC_METADATA_KEY);
      return data ? JSON.parse(data) : {};
    } else {
      const data = await AsyncStorage.getItem(SYNC_METADATA_KEY);
      return data ? JSON.parse(data) : {};
    }
  } catch (e) {
    console.warn('[SyncMetadata] Failed to get metadata:', e);
    return {};
  }
};

/**
 * Update sync metadata
 */
export const updateSyncMetadata = async (updates: Partial<SyncMetadata>): Promise<void> => {
  try {
    const current = await getSyncMetadata();
    const updated = { ...current, ...updates };
    const serialized = JSON.stringify(updated);

    if (isNative) {
      const mmkv = getMMKVSettings();
      mmkv?.set(SYNC_METADATA_KEY, serialized);
    } else {
      await AsyncStorage.setItem(SYNC_METADATA_KEY, serialized);
    }
  } catch (e) {
    console.warn('[SyncMetadata] Failed to update metadata:', e);
  }
};

/**
 * Get timestamp of last sync for a feature
 */
export const getLastSyncTime = async (feature: keyof SyncMetadata): Promise<number | undefined> => {
  const metadata = await getSyncMetadata();
  return metadata[feature];
};

/**
 * Get ISO string for API request
 */
export const getLastSyncISO = async (feature: keyof SyncMetadata): Promise<string | undefined> => {
  const timestamp = await getLastSyncTime(feature);
  if (!timestamp) return undefined;
  return new Date(timestamp).toISOString();
};

/**
 * Set last sync time
 */
export const setLastSyncTime = async (feature: keyof SyncMetadata, timestamp?: number): Promise<void> => {
  await updateSyncMetadata({ [feature]: timestamp ?? Date.now() });
};

/**
 * Clear all sync metadata
 */
export const clearSyncMetadata = async (): Promise<void> => {
  try {
    if (isNative) {
      const mmkv = getMMKVSettings();
      mmkv?.remove(SYNC_METADATA_KEY);
    } else {
      await AsyncStorage.removeItem(SYNC_METADATA_KEY);
    }
  } catch (e) {
    console.warn('[SyncMetadata] Failed to clear metadata:', e);
  }
};

/**
 * Check if sync is needed (data is stale)
 */
export const needsSync = async (feature: keyof SyncMetadata, maxAgeMs: number): Promise<boolean> => {
  const lastSync = await getLastSyncTime(feature);
  if (!lastSync) return true;
  return Date.now() - lastSync > maxAgeMs;
};

export default {
  getSyncMetadata,
  updateSyncMetadata,
  getLastSyncTime,
  getLastSyncISO,
  setLastSyncTime,
  clearSyncMetadata,
  needsSync,
};
