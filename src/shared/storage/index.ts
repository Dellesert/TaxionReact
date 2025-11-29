/**
 * Storage module
 *
 * MMKV кэширование работает только на native (iOS/Android).
 * На web - no-op (ничего не делает).
 *
 * Требует development build (не Expo Go):
 * npx expo prebuild
 * npx expo run:ios
 */

import { Platform } from 'react-native';
import { StateStorage } from 'zustand/middleware';

export const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// No-op storage для web или когда MMKV недоступен
const noOpStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// Storage instances
let chatStorageInstance: StateStorage = noOpStorage;
let taskStorageInstance: StateStorage = noOpStorage;
let calendarStorageInstance: StateStorage = noOpStorage;
let pollStorageInstance: StateStorage = noOpStorage;
let userStorageInstance: StateStorage = noOpStorage;
let isInitialized = false;

/**
 * Инициализация MMKV storage (вызывается лениво при первом использовании)
 */
const initializeMMKV = () => {
  if (isInitialized || !isNative) return;

  try {
    // Dynamic require чтобы не ломать web bundle
    const { createMMKV } = require('react-native-mmkv');

    const createStorage = (id: string): StateStorage => {
      const mmkv = createMMKV({ id });
      return {
        getItem: (name: string) => mmkv.getString(name) ?? null,
        setItem: (name: string, value: string) => mmkv.set(name, value),
        removeItem: (name: string) => mmkv.remove(name),
      };
    };

    chatStorageInstance = createStorage('taxion-chat-storage');
    taskStorageInstance = createStorage('taxion-task-storage');
    calendarStorageInstance = createStorage('taxion-calendar-storage');
    pollStorageInstance = createStorage('taxion-poll-storage');
    userStorageInstance = createStorage('taxion-user-storage');

    isInitialized = true;
    console.log('[Storage] MMKV initialized successfully');
  } catch (e) {
    console.warn('[Storage] MMKV not available, using no-op storage:', e);
  }
};

// Lazy getters
export const getZustandChatStorage = (): StateStorage => {
  initializeMMKV();
  return chatStorageInstance;
};

export const getZustandTaskStorage = (): StateStorage => {
  initializeMMKV();
  return taskStorageInstance;
};

export const getZustandCalendarStorage = (): StateStorage => {
  initializeMMKV();
  return calendarStorageInstance;
};

export const getZustandPollStorage = (): StateStorage => {
  initializeMMKV();
  return pollStorageInstance;
};

export const getZustandUserStorage = (): StateStorage => {
  initializeMMKV();
  return userStorageInstance;
};

/**
 * Проверить доступность MMKV
 */
export const isMMKVAvailable = (): boolean => {
  if (!isNative) return false;
  initializeMMKV();
  return isInitialized;
};

/**
 * Очистить все хранилища
 */
export const clearAllStorages = (): void => {
  if (!isNative) return;

  try {
    const { createMMKV } = require('react-native-mmkv');
    createMMKV({ id: 'taxion-chat-storage' }).clearAll();
    createMMKV({ id: 'taxion-task-storage' }).clearAll();
    createMMKV({ id: 'taxion-calendar-storage' }).clearAll();
    createMMKV({ id: 'taxion-poll-storage' }).clearAll();
    createMMKV({ id: 'taxion-user-storage' }).clearAll();
    console.log('[Storage] All storages cleared');
  } catch (e) {
    console.warn('[Storage] Failed to clear storages:', e);
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
 * Получить размер всех хранилищ в байтах
 */
export const getStorageSize = (): StorageInfo => {
  if (!isNative) {
    return { chatSize: 0, taskSize: 0, calendarSize: 0, pollSize: 0, userSize: 0, totalSize: 0 };
  }

  try {
    const { createMMKV } = require('react-native-mmkv');

    const getSize = (id: string): number => {
      const mmkv = createMMKV({ id });
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

    const chatSize = getSize('taxion-chat-storage');
    const taskSize = getSize('taxion-task-storage');
    const calendarSize = getSize('taxion-calendar-storage');
    const pollSize = getSize('taxion-poll-storage');
    const userSize = getSize('taxion-user-storage');

    return {
      chatSize,
      taskSize,
      calendarSize,
      pollSize,
      userSize,
      totalSize: chatSize + taskSize + calendarSize + pollSize + userSize,
    };
  } catch (e) {
    console.warn('[Storage] Failed to get storage size:', e);
    return { chatSize: 0, taskSize: 0, calendarSize: 0, pollSize: 0, userSize: 0, totalSize: 0 };
  }
};

// ============= Cache Size Limit =============

// Default cache limit: 5GB
const DEFAULT_CACHE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB in bytes
let cacheLimitBytes = DEFAULT_CACHE_LIMIT;

// Storage ID for settings
const SETTINGS_STORAGE_ID = 'taxion-settings-storage';

/**
 * Получить текущий лимит кэша в байтах
 */
export const getCacheLimit = (): number => {
  if (!isNative) return DEFAULT_CACHE_LIMIT;

  try {
    const { createMMKV } = require('react-native-mmkv');
    const settings = createMMKV({ id: SETTINGS_STORAGE_ID });
    const savedLimit = settings.getNumber('cache_limit');
    if (savedLimit && savedLimit > 0) {
      cacheLimitBytes = savedLimit;
    }
  } catch (e) {
    // Use default
  }

  return cacheLimitBytes;
};

/**
 * Установить лимит кэша в байтах
 */
export const setCacheLimit = (bytes: number): void => {
  if (!isNative) return;

  try {
    const { createMMKV } = require('react-native-mmkv');
    const settings = createMMKV({ id: SETTINGS_STORAGE_ID });
    settings.set('cache_limit', bytes);
    cacheLimitBytes = bytes;
    console.log('[Storage] Cache limit set to', formatBytesInternal(bytes));
  } catch (e) {
    console.warn('[Storage] Failed to set cache limit:', e);
  }
};

/**
 * Проверить, превышен ли лимит кэша
 */
export const isCacheLimitExceeded = (): boolean => {
  const storageInfo = getStorageSize();
  const limit = getCacheLimit();
  return storageInfo.totalSize > limit;
};

/**
 * Получить процент использования кэша
 */
export const getCacheUsagePercent = (): number => {
  const storageInfo = getStorageSize();
  const limit = getCacheLimit();
  if (limit === 0) return 0;
  return Math.min(100, (storageInfo.totalSize / limit) * 100);
};

/**
 * Очистить старые данные если превышен лимит
 * Очищает в порядке: календарь -> опросы -> задачи -> профили -> чаты
 */
export const enforceCacheLimit = (): boolean => {
  if (!isNative) return false;

  const storageInfo = getStorageSize();
  const limit = getCacheLimit();

  if (storageInfo.totalSize <= limit) {
    return false; // Лимит не превышен
  }

  console.log('[Storage] Cache limit exceeded, cleaning up...');
  console.log('[Storage] Current size:', formatBytesInternal(storageInfo.totalSize), '/ Limit:', formatBytesInternal(limit));

  try {
    const { createMMKV } = require('react-native-mmkv');

    // Порядок очистки: наименее важные данные первыми
    const cleanupOrder = [
      { id: 'taxion-calendar-storage', name: 'Calendar', size: storageInfo.calendarSize },
      { id: 'taxion-poll-storage', name: 'Polls', size: storageInfo.pollSize },
      { id: 'taxion-task-storage', name: 'Tasks', size: storageInfo.taskSize },
      { id: 'taxion-user-storage', name: 'Users', size: storageInfo.userSize },
      { id: 'taxion-chat-storage', name: 'Chats', size: storageInfo.chatSize },
    ];

    let currentSize = storageInfo.totalSize;

    for (const storage of cleanupOrder) {
      if (currentSize <= limit) break;

      if (storage.size > 0) {
        console.log(`[Storage] Clearing ${storage.name} cache (${formatBytesInternal(storage.size)})`);
        createMMKV({ id: storage.id }).clearAll();
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

// Internal helper for formatting bytes (to avoid circular dependency)
const formatBytesInternal = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
