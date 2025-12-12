/**
 * Secure Storage Wrapper
 * - SecureStore для мобильных платформ
 * - localStorage для веб
 * - safeStorage API для Electron (OS-native encryption)
 *
 * IMPORTANT: SecureStore в Expo Go может не персистить данные между сессиями
 * Поэтому используем AsyncStorage как fallback для токенов
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { isElectron } from './platform';

// Dynamically import Electron secure storage
let electronSecureStorage: typeof import('./secureStorage.electron') | null = null;

if (isElectron()) {
  // Electron environment - use safe storage
  electronSecureStorage = require('./secureStorage.electron');
}

const isWeb = Platform.OS === 'web' && !isElectron();

// Keys that should use AsyncStorage instead of SecureStore in development
// because SecureStore doesn't persist in Expo Go
const PERSISTENT_KEYS = ['access_token', 'refresh_token', 'user_data'];

/**
 * Migrate data from SecureStore to AsyncStorage for persistent keys
 * This is needed because SecureStore doesn't persist in Expo Go
 */
export const migrateToAsyncStorage = async (): Promise<void> => {
  // Only migrate on native platforms (not web, not Electron)
  if (isWeb || electronSecureStorage) return;


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

          // Optionally delete from SecureStore
          await SecureStore.deleteItemAsync(key);
        } else {
        }
      }
    } catch (error) {
      console.error(`❌ [SecureStorage] Failed to migrate ${key}:`, error);
    }
  }

};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  try {
    if (electronSecureStorage) {
      // Electron: use safeStorage API
      await electronSecureStorage.setItemAsync(key, value);
    } else if (isWeb) {
      // Web: use localStorage
      localStorage.setItem(key, value);
    } else {
      // Native: use AsyncStorage for persistent keys (tokens) to ensure they survive app restarts
      // SecureStore doesn't persist in Expo Go development mode
      if (PERSISTENT_KEYS.includes(key)) {
        await AsyncStorage.setItem(key, value);
      } else {
        await SecureStore.setItemAsync(key, value);
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

    if (electronSecureStorage) {
      // Electron: use safeStorage API
      value = await electronSecureStorage.getItemAsync(key);
    } else if (isWeb) {
      // Web: use localStorage
      value = localStorage.getItem(key);
    } else {
      // Native: use AsyncStorage for persistent keys (tokens) to ensure they survive app restarts
      if (PERSISTENT_KEYS.includes(key)) {
        value = await AsyncStorage.getItem(key);
      } else {
        value = await SecureStore.getItemAsync(key);
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
    if (electronSecureStorage) {
      // Electron: use safeStorage API
      await electronSecureStorage.deleteItemAsync(key);
    } else if (isWeb) {
      // Web: use localStorage
      localStorage.removeItem(key);
    } else {
      // Native: use AsyncStorage for persistent keys (tokens)
      if (PERSISTENT_KEYS.includes(key)) {
        await AsyncStorage.removeItem(key);
      } else {
        await SecureStore.deleteItemAsync(key);
      }
    }
  } catch (error) {
    console.error(`❌ [SecureStorage] Failed to delete ${key}:`, error);
    throw error;
  }
};
