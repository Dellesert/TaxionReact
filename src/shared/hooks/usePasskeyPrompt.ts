/**
 * usePasskeyPrompt Hook
 * Предлагает пользователю добавить Passkey после первого входа на мобильном устройстве
 */

import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@shared/hooks/useAuth';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { isPasskeySupported, registerPasskey, formatPasskeyError } from '@shared/utils/passkeyUtils';
import { getDefaultDeviceName } from '@/features/profile/utils/passkeyHelpers';
import * as authApi from '@/features/auth/api/auth.api';

const PROMPT_DELAY_MS = 2000;

export const usePasskeyPrompt = () => {
  const { user } = useAuth();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();
  const prompted = useRef(false);

  useEffect(() => {
    if (!user || prompted.current) return;
    if (Platform.OS === 'web') return;

    prompted.current = true;

    const timer = setTimeout(() => {
      checkAndPrompt();
    }, PROMPT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [user]);

  const checkAndPrompt = async () => {
    try {
      // Check passkey support on device
      const supported = await isPasskeySupported();
      if (!supported) return;

      // Check if already dismissed
      const dismissKey = `${STORAGE_KEYS.PASSKEY_PROMPT_DISMISSED}_${user!.id}`;
      const dismissed = await secureStorage.getItemAsync(dismissKey);
      if (dismissed) return;

      // Check if user already has passkeys
      const { passkeys } = await authApi.listPasskeys();
      if (passkeys && passkeys.length > 0) return;

      // Show prompt
      showConfirm(
        'Добавить Passkey?',
        'Passkey позволяет входить в приложение быстро и безопасно — с помощью Face ID, Touch ID или отпечатка пальца. Добавить сейчас?',
        () => handleRegister(dismissKey),
        () => handleDismiss(dismissKey),
        { confirmText: 'Добавить', cancelText: 'Позже' },
      );
    } catch {
      // Silently fail — don't block the user
    }
  };

  const handleRegister = async (dismissKey: string) => {
    try {
      const beginResponse = await authApi.beginPasskeyRegister();
      const credential = await registerPasskey(
        beginResponse.publicKey.challenge,
        { publicKey: beginResponse.publicKey },
      );

      const deviceName = getDefaultDeviceName();
      await authApi.finishPasskeyRegister({ credential, name: deviceName });

      showSuccess('Passkey успешно добавлен!');
    } catch (error: unknown) {
      const message = formatPasskeyError(error);
      showError(message);
    } finally {
      await secureStorage.setItemAsync(dismissKey, 'true');
    }
  };

  const handleDismiss = async (dismissKey: string) => {
    await secureStorage.setItemAsync(dismissKey, 'true');
  };
};
