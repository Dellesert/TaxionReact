import { useCallback, useState } from 'react';
import { Keyboard } from 'react-native';
import { useAuth } from '@shared/hooks/useAuth';
import {
  validateLoginFields,
  is2FANotEnabledError,
  is2FARequiredError,
  isSuperAdminWebOnlyError,
  isPasskeyOnlyError,
  isAccountDeactivatedError,
  isInvalidCredentialsError,
} from '../utils/authHelpers';
import { extractErrorCode } from '@shared/utils/errorUtils';
import type { ApiError } from '../../../types/common.types';

interface UsePasswordAuthReturn {
  isPasswordLoading: boolean;
  handlePasswordLogin: (
    email: string,
    password: string,
    onNavigateTo2FA: (email: string) => void,
    onError: (error: ApiError | string) => void,
    onSuccess?: (message: string) => void
  ) => Promise<void>;
}

/**
 * Hook for handling password-based authentication with 2FA support
 */
export const usePasswordAuth = (): UsePasswordAuthReturn => {
  const { login } = useAuth();
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const handlePasswordLogin = useCallback(
    async (
      email: string,
      password: string,
      onNavigateTo2FA: (email: string) => void,
      onError: (error: ApiError | string) => void,
      onSuccess?: (message: string) => void
    ) => {
      console.log('Login button clicked!', { email });

      Keyboard.dismiss();

      // Validate fields
      const validation = validateLoginFields(email, password);
      if (!validation.isValid) {
        onError(validation.error!);
        return;
      }

      setIsPasswordLoading(true);
      try {
        console.log('Calling login...');
        const authApi = await import('../api/auth.api');

        // Try to send 2FA code first
        try {
          const response = await authApi.send2FACode({ email, password });
          console.log('✅ 2FA code sent successfully:', response);
          onSuccess?.('Код подтверждения отправлен на ваш email');
          onNavigateTo2FA(email);
          return;
        } catch (twoFAError: any) {
          console.log('⚠️ 2FA error:', twoFAError);

          const errorCode = extractErrorCode(twoFAError);

          // Handle specific error codes
          if (errorCode) {
            if (is2FARequiredError(twoFAError)) {
              console.log('🔐 2FA is required');
              try {
                await authApi.send2FACode({ email, password });
                onSuccess?.('Код подтверждения отправлен на ваш email');
              } catch (sendError) {
                console.log('⚠️ Error sending code:', sendError);
              }
              onNavigateTo2FA(email);
              return;
            }

            if (isSuperAdminWebOnlyError(twoFAError)) {
              console.log('🚫 Super admin access blocked');
              onError('Супер-администратор может входить только через веб-панель');
              return;
            }

            if (isPasskeyOnlyError(twoFAError)) {
              console.log('🔑 Passkey only');
              onError('Для этого аккаунта доступен только вход через Passkey');
              return;
            }

            if (isAccountDeactivatedError(twoFAError) || isInvalidCredentialsError(twoFAError)) {
              onError(twoFAError);
              return;
            }

            // 2FA not enabled - do regular login
            if (is2FANotEnabledError(twoFAError)) {
              console.log('🔓 2FA not enabled, doing regular login...');
              await login({ email, password });
              console.log('✅ Regular login successful!');
              return;
            }

            // Other error_code
            onError(twoFAError);
            return;
          }

          // Fallback: check by message/status
          if (isSuperAdminWebOnlyError(twoFAError)) {
            console.log('🚫 Super admin access blocked');
            onError('Супер-администратор может входить только через веб-панель');
            return;
          }

          if (is2FARequiredError(twoFAError)) {
            console.log('🔐 2FA globally required');
            try {
              await authApi.send2FACode({ email, password });
            } catch (sendError) {
              console.log('⚠️ Code already sent or error:', sendError);
            }
            onNavigateTo2FA(email);
            return;
          }

          if (is2FANotEnabledError(twoFAError)) {
            console.log('🔓 2FA not enabled, doing regular login...');
            await login({ email, password });
            console.log('✅ Regular login successful!');
          } else {
            console.error('❌ Unexpected error:', twoFAError);
            onError(twoFAError);
          }
        }
      } catch (err: any) {
        console.error('Login error:', err);
        if (err && typeof err === 'object' && 'error_code' in err) {
          onError(err as ApiError);
        } else {
          onError(err.message || 'Не удалось войти в систему');
        }
      } finally {
        setIsPasswordLoading(false);
      }
    },
    [login]
  );

  return {
    isPasswordLoading,
    handlePasswordLogin,
  };
};
