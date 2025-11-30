/**
 * Sync Metadata Storage
 * Хранение timestamps последней синхронизации для дифференциальной загрузки
 */

import { isNative } from './index';

// Ключ хранилища
const SYNC_METADATA_KEY = 'sync_metadata';
const SETTINGS_STORAGE_ID = 'taxion-settings-storage';

export interface SyncMetadata {
  /** Последняя синхронизация чатов */
  chats?: number;
  /** Последняя синхронизация задач */
  tasks?: number;
  /** Последняя синхронизация опросов */
  polls?: number;
  /** Последняя синхронизация календаря */
  calendar?: number;
  /** Последняя синхронизация пользователей */
  users?: number;
}

/**
 * Получить метаданные синхронизации
 */
export const getSyncMetadata = (): SyncMetadata => {
  if (!isNative) return {};

  try {
    const { createMMKV } = require('react-native-mmkv');
    const storage = createMMKV({ id: SETTINGS_STORAGE_ID });
    const data = storage.getString(SYNC_METADATA_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.warn('[SyncMetadata] Failed to get metadata:', e);
    return {};
  }
};

/**
 * Обновить метаданные синхронизации
 */
export const updateSyncMetadata = (updates: Partial<SyncMetadata>): void => {
  if (!isNative) return;

  try {
    const { createMMKV } = require('react-native-mmkv');
    const storage = createMMKV({ id: SETTINGS_STORAGE_ID });
    const current = getSyncMetadata();
    const updated = { ...current, ...updates };
    storage.set(SYNC_METADATA_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('[SyncMetadata] Failed to update metadata:', e);
  }
};

/**
 * Получить timestamp последней синхронизации для фичи
 */
export const getLastSyncTime = (feature: keyof SyncMetadata): number | undefined => {
  const metadata = getSyncMetadata();
  return metadata[feature];
};

/**
 * Получить ISO строку для API запроса
 */
export const getLastSyncISO = (feature: keyof SyncMetadata): string | undefined => {
  const timestamp = getLastSyncTime(feature);
  if (!timestamp) return undefined;
  return new Date(timestamp).toISOString();
};

/**
 * Установить время последней синхронизации
 */
export const setLastSyncTime = (feature: keyof SyncMetadata, timestamp?: number): void => {
  updateSyncMetadata({ [feature]: timestamp ?? Date.now() });
};

/**
 * Очистить все метаданные синхронизации
 */
export const clearSyncMetadata = (): void => {
  if (!isNative) return;

  try {
    const { createMMKV } = require('react-native-mmkv');
    const storage = createMMKV({ id: SETTINGS_STORAGE_ID });
    storage.delete(SYNC_METADATA_KEY);
    console.log('[SyncMetadata] Cleared all sync metadata');
  } catch (e) {
    console.warn('[SyncMetadata] Failed to clear metadata:', e);
  }
};

/**
 * Проверить, нужна ли синхронизация (данные устарели)
 */
export const needsSync = (feature: keyof SyncMetadata, maxAgeMs: number): boolean => {
  const lastSync = getLastSyncTime(feature);
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
