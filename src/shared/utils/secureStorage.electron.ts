/**
 * Secure Storage for Electron using safeStorage API
 * Provides OS-native encryption (Keychain on macOS, DPAPI on Windows, libsecret on Linux)
 */

import { getElectronAPI } from './platform';

const getElectron = () => {
  const electron = getElectronAPI();
  if (!electron) {
    throw new Error('Electron API not available');
  }
  return electron;
};

export const setItemAsync = async (key: string, value: string): Promise<void> => {
  try {
    const electron = getElectron();
    await electron.secureStorage.set(key, value);
    console.log(`[SecureStorage] Saved: ${key}`);
  } catch (error) {
    console.error(`[SecureStorage] Failed to save ${key}:`, error);
    throw error;
  }
};

export const getItemAsync = async (key: string): Promise<string | null> => {
  try {
    const electron = getElectron();
    const value = await electron.secureStorage.get(key);
    if (value) {
      console.log(`[SecureStorage] Retrieved: ${key}`);
    }
    return value;
  } catch (error) {
    console.error(`[SecureStorage] Failed to retrieve ${key}:`, error);
    return null;
  }
};

export const deleteItemAsync = async (key: string): Promise<void> => {
  try {
    const electron = getElectron();
    await electron.secureStorage.delete(key);
    console.log(`[SecureStorage] Deleted: ${key}`);
  } catch (error) {
    console.error(`[SecureStorage] Failed to delete ${key}:`, error);
    throw error;
  }
};
