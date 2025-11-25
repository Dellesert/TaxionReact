import { useState, useCallback } from 'react';
import * as authApi from '../api/auth.api';
import * as secureStorage from '@shared/utils/secureStorage';
import { STORAGE_KEYS } from '@shared/constants/app.constants';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import { extractErrorCode, ErrorCode, isSuperAdminWebOnly } from '@shared/utils/errorUtils';
import type { ApiError } from '../../../types/common.types';
import { joinCode, isSuperAdmin } from '../utils/twoFactorHelpers';

interface Use2FAVerificationReturn {
  isLoading: boolean;
  handleVerify: (code: string[], email: string) => Promise<boolean>;
}

/**
 * Hook for handling 2FA code verification
 * Manages API calls, session storage, and error handling
 */
export const use2FAVerification = (): Use2FAVerificationReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const notification = useNotification();

  const handleVerify = useCallback(
    async (code: string[], email: string): Promise<boolean> => {
      const fullCode = joinCode(code);

      try {
        setIsLoading(true);
        const response = await authApi.verify2FACode({
          email,
          code: fullCode,
        });

        // Block super_admin access - they must use web panel
        if (isSuperAdmin(response.user.role)) {
          notification.showError('Супер-администратор должен использовать веб-панель');
          return false;
        }

        // Save session
        if (response.session?.session_id) {
          await secureStorage.setItemAsync(STORAGE_KEYS.SESSION_ID, response.session.session_id);
        }

        // Save user data
        await secureStorage.setItemAsync(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));

        // Update store
        useAuthStore.getState().setUser(response.user);

        // Show success notification
        notification.showSuccess('Успешная авторизация');

        return true;
      } catch (err: any) {
        console.error('2FA verification error:', err);

        // Check for specific error codes
        const errorCode = extractErrorCode(err);

        if (errorCode) {
          if (errorCode === ErrorCode.AUTH_2FA_INVALID_CODE) {
            notification.showError('Неверный код подтверждения');
            return false;
          }

          if (errorCode === ErrorCode.AUTH_2FA_CODE_EXPIRED) {
            notification.showError('Код подтверждения истёк. Запросите новый код');
            return false;
          }

          if (isSuperAdminWebOnly(err as ApiError)) {
            notification.showError('Супер-администратор может входить только через веб-панель');
            return false;
          }

          // Show error via notification
          notification.showApiError(err as ApiError);
        } else {
          // Fallback to old logic
          notification.showError(err.message || 'Неверный код');
        }

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [notification]
  );

  return {
    isLoading,
    handleVerify,
  };
};
