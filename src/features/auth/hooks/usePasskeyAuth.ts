import { useState, useEffect, useCallback } from 'react';
import { isPasskeySupported, authenticateWithPasskey, formatPasskeyError } from '@shared/utils/passkeyUtils';
import { isSuperAdminWebOnly } from '@shared/utils/errorUtils';
import type { ApiError } from '../../../types/common.types';
import { useAuth } from '@shared/hooks/useAuth';

interface UsePasskeyAuthReturn {
  isPasskeyLoading: boolean;
  passkeySupported: boolean;
  handlePasskeyLogin: () => Promise<void>;
}

/**
 * Hook for handling passkey authentication
 */
export const usePasskeyAuth = (
  onError: (error: ApiError | string) => void
): UsePasskeyAuthReturn => {
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const { setUser } = useAuth();

  useEffect(() => {
    checkPasskeySupport();
  }, []);

  const checkPasskeySupport = async () => {
    try {
      const supported = await isPasskeySupported();
      setPasskeySupported(supported);
    } catch (error) {
      console.error('Error checking passkey support:', error);
      setPasskeySupported(false);
    }
  };

  const handlePasskeyLogin = useCallback(async () => {
    setIsPasskeyLoading(true);

    try {

      const authApi = await import('../api/auth.api');

      // 1. Get challenge from server
      const beginResponse = await authApi.beginDiscoverablePasskeyLogin();

      // 2. Authenticate with device
      const credential = await authenticateWithPasskey(
        beginResponse.publicKey.challenge,
        { publicKey: beginResponse.publicKey }
      );

      // 3. Verify credential on server
      const loginResponse = await authApi.finishPasskeyLogin(credential);

      // 4. Block super admin access
      if (loginResponse.user.role === 'super_admin') {
        onError('Super admin доступ ограничен веб-панелью. Используйте админ-панель.');
        return;
      }

      // 5. Save session to storage
      const secureStorage = await import('@shared/utils/secureStorage');
      const { STORAGE_KEYS } = await import('@shared/constants/app.constants');

      if (loginResponse.session?.session_id) {
        await secureStorage.setItemAsync(
          STORAGE_KEYS.SESSION_ID,
          loginResponse.session.session_id
        );
      }

      await secureStorage.setItemAsync(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(loginResponse.user)
      );


      // 6. Update auth state
      setUser(loginResponse.user);
    } catch (error: any) {
      console.error('❌ Passkey login error:', error);

      if (error && typeof error === 'object' && 'error_code' in error) {
        const apiError = error as ApiError;

        if (isSuperAdminWebOnly(apiError)) {
          onError('Супер-администратор может входить только через веб-панель');
          return;
        }

        onError(apiError);
      } else {
        const errorMessage = formatPasskeyError(error);
        onError(errorMessage);
      }
    } finally {
      setIsPasskeyLoading(false);
    }
  }, [setUser, onError]);

  return {
    isPasskeyLoading,
    passkeySupported,
    handlePasskeyLogin,
  };
};
