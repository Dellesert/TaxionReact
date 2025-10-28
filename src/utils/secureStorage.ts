/**
 * Secure Storage Wrapper
 * Использует SecureStore для мобильных платформ и localStorage для веб
 *
 * IMPORTANT: SecureStore в Expo Go может не персистить данные между сессиями
 * Поэтому используем AsyncStorage как fallback для токенов
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

// Keys that should use AsyncStorage instead of SecureStore in development
// because SecureStore doesn't persist in Expo Go
const PERSISTENT_KEYS = ['access_token', 'refresh_token', 'user_data'];

/**
 * Migrate data from SecureStore to AsyncStorage for persistent keys
 * This is needed because SecureStore doesn't persist in Expo Go
 */
export const migrateToAsyncStorage = async (): Promise<void> => {
  if (isWeb) return; // No need to migrate on web

  console.log('🔄 [SecureStorage] Starting migration from SecureStore to AsyncStorage...');

  for (const key of PERSISTENT_KEYS) {
    try {
      // Try to get value from SecureStore
      const secureValue = await SecureStore.getItemAsync(key);

      if (secureValue) {
        // Check if already in AsyncStorage
        const asyncValue = await AsyncStorage.getItem(key);

        if (!asyncValue) {
          // Migrate to AsyncStorage
          await AsyncStorage.setItem(key, secureValue);
          console.log(`✅ [SecureStorage] Migrated ${key} to AsyncStorage`);

          // Optionally delete from SecureStore
          await SecureStore.deleteItemAsync(key);
        } else {
          console.log(`ℹ️ [SecureStorage] ${key} already in AsyncStorage`);
        }
      }
    } catch (error) {
      console.error(`❌ [SecureStorage] Failed to migrate ${key}:`, error);
    }
  }

  console.log('✅ [SecureStorage] Migration completed');
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  try {
    if (isWeb) {
      localStorage.setItem(key, value);
      console.log(`✅ [SecureStorage] Saved to localStorage: ${key}`, {
        valueLength: value?.length,
        preview: value?.substring(0, 20) + '...',
      });
    } else {
      // Use AsyncStorage for persistent keys (tokens) to ensure they survive app restarts
      // SecureStore doesn't persist in Expo Go development mode
      if (PERSISTENT_KEYS.includes(key)) {
        await AsyncStorage.setItem(key, value);
        console.log(`✅ [SecureStorage] Saved to AsyncStorage: ${key}`, {
          valueLength: value?.length,
          preview: value?.substring(0, 20) + '...',
        });
      } else {
        await SecureStore.setItemAsync(key, value);
        console.log(`✅ [SecureStorage] Saved to SecureStore: ${key}`);
      }
    }
  } catch (error) {
    console.error(`❌ [SecureStorage] Failed to save ${key}:`, error);
    throw error;
  }
};

export const getItemAsync = async (key: string): Promise<string | null> => {
  try {
    let value: string | null = null;

    if (isWeb) {
      value = localStorage.getItem(key);
      console.log(`🔍 [SecureStorage] Retrieved from localStorage: ${key}`, {
        found: !!value,
        valueLength: value?.length,
        preview: value ? value.substring(0, 20) + '...' : 'NULL',
      });
    } else {
      // Use AsyncStorage for persistent keys (tokens) to ensure they survive app restarts
      if (PERSISTENT_KEYS.includes(key)) {
        value = await AsyncStorage.getItem(key);
        console.log(`🔍 [SecureStorage] Retrieved from AsyncStorage: ${key}`, {
          found: !!value,
          valueLength: value?.length,
          preview: value ? value.substring(0, 20) + '...' : 'NULL',
        });
      } else {
        value = await SecureStore.getItemAsync(key);
        console.log(`🔍 [SecureStorage] Retrieved from SecureStore: ${key}`, {
          found: !!value,
        });
      }
    }

    return value;
  } catch (error) {
    console.error(`❌ [SecureStorage] Failed to retrieve ${key}:`, error);
    return null;
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  try {
    if (isWeb) {
      localStorage.removeItem(key);
      console.log(`🗑️ [SecureStorage] Deleted from localStorage: ${key}`);
    } else {
      // Use AsyncStorage for persistent keys (tokens)
      if (PERSISTENT_KEYS.includes(key)) {
        await AsyncStorage.removeItem(key);
        console.log(`🗑️ [SecureStorage] Deleted from AsyncStorage: ${key}`);
      } else {
        await SecureStore.deleteItemAsync(key);
        console.log(`🗑️ [SecureStorage] Deleted from SecureStore: ${key}`);
      }
    }
  } catch (error) {
    console.error(`❌ [SecureStorage] Failed to delete ${key}:`, error);
    throw error;
  }
};
