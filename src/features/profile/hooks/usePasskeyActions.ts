/**
 * usePasskeyActions Hook
 * Действия с Passkey (регистрация, удаление, переименование)
 */

import { useState } from 'react';
import { Platform } from 'react-native';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import * as authApi from '@/features/auth/api/auth.api';
import { registerPasskey, formatPasskeyError } from '@shared/utils/passkeyUtils';
import { getDefaultDeviceName } from '../utils/passkeyHelpers';
import { getDeletePasskeyMessage } from '../utils/passkeyFormatters';
import type { Passkey } from '../../../types/user.types';

export const usePasskeyActions = (
  passkeySupported: boolean,
  loadPasskeys: () => Promise<void>
) => {
  const { showError, showSuccess } = useNotification();
  const { showConfirm } = useActionModal();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  /**
   * Start passkey registration process
   */
  const handleRegisterPasskey = async (): Promise<{ credential: any; defaultName: string } | null> => {
    if (!passkeySupported) {
      showError('Passkey не поддерживается на этом устройстве');
      return null;
    }

    setIsRegistering(true);
    try {
      // 1. Get creation options from server
      const beginResponse = await authApi.beginPasskeyRegister();

      // 2. Create credential on device
      const credential = await registerPasskey(
        beginResponse.publicKey.challenge,
        { publicKey: beginResponse.publicKey }
      );

      // 3. Get default device name
      const defaultName = getDefaultDeviceName();

      return { credential, defaultName };
    } catch (error: unknown) {
      console.error('❌ Passkey registration error:', error);
      const errorMessage = formatPasskeyError(error);
      showError(errorMessage);
      return null;
    } finally {
      setIsRegistering(false);
    }
  };

  /**
   * Finish passkey registration with device name
   */
  const finishRegistration = async (credential: any, deviceName: string): Promise<boolean> => {
    if (!credential) {
      showError('Credential не найден');
      return false;
    }

    try {
      await authApi.finishPasskeyRegister({
        credential,
        name: deviceName,
      });

      showSuccess('Passkey успешно зарегистрирован!');
      await loadPasskeys();
      return true;
    } catch (error: unknown) {
      console.error('❌ Failed to finish registration:', error);
      showError((error as Error).message || 'Не удалось завершить регистрацию Passkey');
      return false;
    }
  };

  /**
   * Delete passkey
   */
  const handleDeletePasskey = async (passkey: Passkey): Promise<void> => {
    const performDelete = async () => {
      try {
        setIsDeleting(passkey.id);
        await authApi.deletePasskey(passkey.id);
        showSuccess('Passkey удален');
        await loadPasskeys();
      } catch (error: unknown) {
        showError('Не удалось удалить Passkey');
      } finally {
        setIsDeleting(null);
      }
    };

    if (Platform.OS === 'web') {
      // Web: just proceed with deletion
      await performDelete();
    } else {
      // Mobile: show confirmation dialog
      const message = getDeletePasskeyMessage(passkey.name);
      showConfirm(
        'Удалить Passkey',
        message,
        performDelete,
        undefined,
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    }
  };

  /**
   * Rename passkey
   */
  const handleRenamePasskey = async (passkeyId: number, newName: string): Promise<boolean> => {
    try {
      await authApi.updatePasskey(passkeyId, { name: newName });
      showSuccess('Название обновлено');
      await loadPasskeys();
      return true;
    } catch (error: unknown) {
      showError('Не удалось обновить название');
      return false;
    }
  };

  return {
    isRegistering,
    isDeleting,
    handleRegisterPasskey,
    finishRegistration,
    handleDeletePasskey,
    handleRenamePasskey,
  };
};
