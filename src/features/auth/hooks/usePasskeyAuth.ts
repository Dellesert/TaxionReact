import { useState, useEffect, useCallback } from 'react';
import { isPasskeySupported, authenticateWithPasskey, formatPasskeyError } from '@utils/passkeyUtils';
import { isSuperAdminWebOnly } from '@utils/errorUtils';
import type { ApiError } from '../../../types/common.types';
import { useAuth } from '@hooks/useAuth';

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
      console.log('Passkey supported:', supported);
    } catch (error) {
      console.error('Error checking passkey support:', error);
      setPasskeySupported(false);
    }
  };

  const handlePasskeyLogin = useCallback(async () => {
    console.log('👆 Passkey button clicked!');
    setIsPasskeyLoading(true);

    try {
      console.log('🔐 Starting discoverable passkey login');

      const authApi = await import('../api/auth.api');

      // 1. Get challenge from server
      const beginResponse = await authApi.beginDiscoverablePasskeyLogin();
      console.log('✅ Got passkey challenge:', beginResponse);

      // 2. Authenticate with device
      const credential = await authenticateWithPasskey(
        beginResponse.publicKey.challenge,
        { publicKey: beginResponse.publicKey }
      );
      console.log('✅ Got credential from device:', credential);

      // 3. Verify credential on server
      const loginResponse = await authApi.finishPasskeyLogin(credential);
      console.log('✅ Passkey login successful:', loginResponse);

      // 4. Block super admin access
      if (loginResponse.user.role === 'super_admin') {
        console.log('🚫 Super admin access blocked');
        onError('Super admin доступ ограничен веб-панелью. Используйте админ-панель.');
        return;
      }

      // 5. Save session to storage
      const secureStorage = await import('@utils/secureStorage');
      const { STORAGE_KEYS } = await import('@constants/app.constants');

      if (loginResponse.session?.session_id) {
        console.log('💾 Saving session ID to storage...');
        await secureStorage.setItemAsync(
          STORAGE_KEYS.SESSION_ID,
          loginResponse.session.session_id
        );
      }

      await secureStorage.setItemAsync(
        STORAGE_KEYS.USER_DATA,
        JSON.stringify(loginResponse.user)
      );

      console.log('✅ Session data saved successfully!');

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
