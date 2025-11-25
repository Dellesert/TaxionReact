/**
 * usePasskeyData Hook
 * Управление данными Passkey
 */

import { useState, useEffect } from 'react';
import { useNotification } from '@shared/contexts/NotificationContext';
import * as authApi from '@/features/auth/api/auth.api';
import { isPasskeySupported } from '../utils/passkeyUtils';
import type { Passkey } from '../../../types/user.types';

export const usePasskeyData = () => {
  const { showError } = useNotification();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => {
    checkPasskeySupport();
    loadPasskeys();
  }, []);

  const checkPasskeySupport = async () => {
    try {
      const supported = await isPasskeySupported();
      setPasskeySupported(supported);
    } catch (error) {
      setPasskeySupported(false);
    }
  };

  const loadPasskeys = async () => {
    try {
      setIsLoading(true);
      const response = await authApi.listPasskeys();
      setPasskeys(response.passkeys || []);
    } catch (error: unknown) {
      showError('Не удалось загрузить список Passkey');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    passkeys,
    isLoading,
    passkeySupported,
    loadPasskeys,
  };
};
