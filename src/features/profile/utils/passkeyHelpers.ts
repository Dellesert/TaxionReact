/**
 * Passkey Helpers
 * Вспомогательные функции для работы с Passkey
 */

import { Platform } from 'react-native';

/**
 * Get default device name based on platform
 */
export const getDefaultDeviceName = (): string => {
  return Platform.select({
    ios: 'iPhone',
    android: 'Android',
    web: 'Веб-браузер',
    default: 'Устройство',
  }) || 'Устройство';
};

/**
 * Check if passkey is supported on current platform
 */
export const checkPasskeySupport = async (): Promise<boolean> => {
  try {
    // Use the imported function from passkeyUtils
    const { isPasskeySupported } = await import('./passkeyUtils');
    return await isPasskeySupported();
  } catch (error) {
    return false;
  }
};
