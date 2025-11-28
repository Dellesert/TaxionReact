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
    if (isWeb) {
      localStorage.setItem(key, value);
    } else {
      // Use AsyncStorage for persistent keys (tokens) to ensure they survive app restarts
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

    if (isWeb) {
      value = localStorage.getItem(key);
    } else {
      // Use AsyncStorage for persistent keys (tokens) to ensure they survive app restarts
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
    if (isWeb) {
      localStorage.removeItem(key);
    } else {
      // Use AsyncStorage for persistent keys (tokens)
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
