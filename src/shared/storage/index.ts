/**
 * Storage module with platform-specific implementations
 *
 * - iOS/Android: Uses react-native-mmkv (fast, synchronous)
 * - Web: Uses @react-native-async-storage/async-storage (async, browser compatible)
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Storage IDs
const STORAGE_IDS = {
  chat: 'taxion-chat-storage',
  task: 'taxion-task-storage',
  calendar: 'taxion-calendar-storage',
  poll: 'taxion-poll-storage',
  user: 'taxion-user-storage',
  settings: 'taxion-settings-storage',
} as const;

// ============= MMKV Implementation (Native) =============

let mmkvInstances: Record<string, any> = {};
let isMMKVInitialized = false;

/**
 * Initialize MMKV storage (lazy, only for native platforms)
 */
const initializeMMKV = () => {
  if (isMMKVInitialized || !isNative) return;

  try {
    // Dynamic require to avoid bundling issues on web
    const { createMMKV } = require('react-native-mmkv');

    Object.values(STORAGE_IDS).forEach((id) => {
      mmkvInstances[id] = createMMKV({ id });
    });

    isMMKVInitialized = true;
    console.log('[Storage] MMKV initialized successfully');
  } catch (e) {
    console.warn('[Storage] MMKV not available:', e);
  }
};

/**
 * Create MMKV-based StateStorage for Zustand (synchronous, native only)
 */
const createMMKVStorage = (storageId: string): StateStorage => {
  initializeMMKV();

  return {
    getItem: (name: string) => {
      const mmkv = mmkvInstances[storageId];
      return mmkv?.getString(name) ?? null;
    },
    setItem: (name: string, value: string) => {
      const mmkv = mmkvInstances[storageId];
      mmkv?.set(name, value);
    },
    removeItem: (name: string) => {
      const mmkv = mmkvInstances[storageId];
      mmkv?.remove(name);
    },
  };
};

// ============= AsyncStorage Implementation (Web) =============

/**
 * Create AsyncStorage-based StateStorage for Zustand (async, web compatible)
 */
const createAsyncStorage = (namespace: string): StateStorage => ({
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(`${namespace}:${name}`);
      return value;
    } catch (e) {
      console.warn(`[Storage] Failed to get item ${name} from ${namespace}:`, e);
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      await AsyncStorage.setItem(`${namespace}:${name}`, value);
    } catch (e) {
      console.warn(`[Storage] Failed to set item ${name} in ${namespace}:`, e);
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(`${namespace}:${name}`);
    } catch (e) {
      console.warn(`[Storage] Failed to remove item ${name} from ${namespace}:`, e);
    }
  },
});

// ============= Public API =============

/**
 * Create storage instance based on platform
 */
const createStorage = (storageId: string): StateStorage => {
  if (isNative) {
    return createMMKVStorage(storageId);
  } else {
    return createAsyncStorage(storageId);
  }
};

// Export storage getters
export const getZustandChatStorage = (): StateStorage => createStorage(STORAGE_IDS.chat);
export const getZustandTaskStorage = (): StateStorage => createStorage(STORAGE_IDS.task);
export const getZustandCalendarStorage = (): StateStorage => createStorage(STORAGE_IDS.calendar);
export const getZustandPollStorage = (): StateStorage => createStorage(STORAGE_IDS.poll);
export const getZustandUserStorage = (): StateStorage => createStorage(STORAGE_IDS.user);

/**
 * Clear all storages
 */
export const clearAllStorages = async (): Promise<void> => {
  if (isNative) {
    // MMKV: synchronous
    try {
      Object.values(mmkvInstances).forEach((mmkv) => mmkv.clearAll());
      console.log('[Storage] All MMKV storages cleared');
    } catch (e) {
      console.warn('[Storage] Failed to clear MMKV storages:', e);
    }
  } else {
    // AsyncStorage: asynchronous
    try {
      const keys = await AsyncStorage.getAllKeys();
      const storageKeys = keys.filter((key) =>
        Object.values(STORAGE_IDS).some((id) => key.startsWith(`${id}:`))
      );
      await AsyncStorage.multiRemove(storageKeys);
      console.log('[Storage] All AsyncStorage storages cleared');
    } catch (e) {
      console.warn('[Storage] Failed to clear AsyncStorage:', e);
    }
  }
};

export interface StorageInfo {
  chatSize: number;
  taskSize: number;
  calendarSize: number;
  pollSize: number;
  userSize: number;
  totalSize: number;
}

/**
 * Get storage size in bytes (approximate)
 */
export const getStorageSize = async (): Promise<StorageInfo> => {
  if (isNative) {
    // MMKV: synchronous calculation
    try {
      const getSize = (storageId: string): number => {
        const mmkv = mmkvInstances[storageId];
        if (!mmkv) return 0;

        const keys = mmkv.getAllKeys();
        let size = 0;
        for (const key of keys) {
          const value = mmkv.getString(key);
          if (value) {
            size += value.length * 2; // UTF-16 = 2 bytes per char
          }
        }
        return size;
      };

      const chatSize = getSize(STORAGE_IDS.chat);
      const taskSize = getSize(STORAGE_IDS.task);
      const calendarSize = getSize(STORAGE_IDS.calendar);
      const pollSize = getSize(STORAGE_IDS.poll);
      const userSize = getSize(STORAGE_IDS.user);

      return {
        chatSize,
        taskSize,
        calendarSize,
        pollSize,
        userSize,
        totalSize: chatSize + taskSize + calendarSize + pollSize + userSize,
      };
    } catch (e) {
      console.warn('[Storage] Failed to get MMKV storage size:', e);
      return { chatSize: 0, taskSize: 0, calendarSize: 0, pollSize: 0, userSize: 0, totalSize: 0 };
    }
  } else {
    // AsyncStorage: asynchronous calculation
    try {
      const keys = await AsyncStorage.getAllKeys();

      const calculateSize = async (storageId: string): Promise<number> => {
        const storageKeys = keys.filter((key) => key.startsWith(`${storageId}:`));
        let size = 0;

        for (const key of storageKeys) {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            size += value.length * 2; // UTF-16 = 2 bytes per char
          }
        }

        return size;
      };

      const [chatSize, taskSize, calendarSize, pollSize, userSize] = await Promise.all([
        calculateSize(STORAGE_IDS.chat),
        calculateSize(STORAGE_IDS.task),
        calculateSize(STORAGE_IDS.calendar),
        calculateSize(STORAGE_IDS.poll),
        calculateSize(STORAGE_IDS.user),
      ]);

      return {
        chatSize,
        taskSize,
        calendarSize,
        pollSize,
        userSize,
        totalSize: chatSize + taskSize + calendarSize + pollSize + userSize,
      };
    } catch (e) {
      console.warn('[Storage] Failed to get AsyncStorage size:', e);
      return { chatSize: 0, taskSize: 0, calendarSize: 0, pollSize: 0, userSize: 0, totalSize: 0 };
    }
  }
};

// ============= Cache Size Limit =============

// Default cache limit: 5GB
const DEFAULT_CACHE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB in bytes
const CACHE_LIMIT_KEY = isNative ? 'cache_limit' : `${STORAGE_IDS.settings}:cache_limit`;

/**
 * Get current cache limit in bytes
 */
export const getCacheLimit = async (): Promise<number> => {
  try {
    if (isNative) {
      const mmkv = mmkvInstances[STORAGE_IDS.settings];
      const limit = mmkv?.getNumber(CACHE_LIMIT_KEY);
      return limit && limit > 0 ? limit : DEFAULT_CACHE_LIMIT;
    } else {
      const savedLimit = await AsyncStorage.getItem(CACHE_LIMIT_KEY);
      if (savedLimit) {
        const limit = parseInt(savedLimit, 10);
        if (limit > 0) return limit;
      }
    }
  } catch (e) {
    // Use default
  }
  return DEFAULT_CACHE_LIMIT;
};

/**
 * Set cache limit in bytes
 */
export const setCacheLimit = async (bytes: number): Promise<void> => {
  try {
    if (isNative) {
      const mmkv = mmkvInstances[STORAGE_IDS.settings];
      mmkv?.set(CACHE_LIMIT_KEY, bytes);
    } else {
      await AsyncStorage.setItem(CACHE_LIMIT_KEY, bytes.toString());
    }
    console.log('[Storage] Cache limit set to', formatBytesInternal(bytes));
  } catch (e) {
    console.warn('[Storage] Failed to set cache limit:', e);
  }
};

/**
 * Check if cache limit is exceeded
 */
export const isCacheLimitExceeded = async (): Promise<boolean> => {
  const [storageInfo, limit] = await Promise.all([getStorageSize(), getCacheLimit()]);
  return storageInfo.totalSize > limit;
};

/**
 * Get cache usage percentage
 */
export const getCacheUsagePercent = async (): Promise<number> => {
  const [storageInfo, limit] = await Promise.all([getStorageSize(), getCacheLimit()]);
  if (limit === 0) return 0;
  return Math.min(100, (storageInfo.totalSize / limit) * 100);
};

/**
 * Enforce cache limit by clearing old data
 * Clears in order: calendar -> polls -> tasks -> users -> chats
 */
export const enforceCacheLimit = async (): Promise<boolean> => {
  const [storageInfo, limit] = await Promise.all([getStorageSize(), getCacheLimit()]);

  if (storageInfo.totalSize <= limit) {
    return false; // Limit not exceeded
  }

  console.log('[Storage] Cache limit exceeded, cleaning up...');
  console.log('[Storage] Current size:', formatBytesInternal(storageInfo.totalSize), '/ Limit:', formatBytesInternal(limit));

  try {
    // Cleanup order: least important data first
    const cleanupOrder = [
      { id: STORAGE_IDS.calendar, name: 'Calendar', size: storageInfo.calendarSize },
      { id: STORAGE_IDS.poll, name: 'Polls', size: storageInfo.pollSize },
      { id: STORAGE_IDS.task, name: 'Tasks', size: storageInfo.taskSize },
      { id: STORAGE_IDS.user, name: 'Users', size: storageInfo.userSize },
      { id: STORAGE_IDS.chat, name: 'Chats', size: storageInfo.chatSize },
    ];

    let currentSize = storageInfo.totalSize;

    for (const storage of cleanupOrder) {
      if (currentSize <= limit) break;

      if (storage.size > 0) {
        console.log(`[Storage] Clearing ${storage.name} cache (${formatBytesInternal(storage.size)})`);

        if (isNative) {
          const mmkv = mmkvInstances[storage.id];
          mmkv?.clearAll();
        } else {
          const keys = await AsyncStorage.getAllKeys();
          const storageKeys = keys.filter((key) => key.startsWith(`${storage.id}:`));
          await AsyncStorage.multiRemove(storageKeys);
        }

        currentSize -= storage.size;
      }
    }

    console.log('[Storage] Cleanup completed. New size:', formatBytesInternal(currentSize));
    return true;
  } catch (e) {
    console.warn('[Storage] Failed to enforce cache limit:', e);
    return false;
  }
};

// Internal helper for formatting bytes
const formatBytesInternal = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
