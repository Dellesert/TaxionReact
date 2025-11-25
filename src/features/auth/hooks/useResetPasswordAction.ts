import { useState } from 'react';
import { validateNewPassword } from '../utils/passwordResetHelpers';
import { resetPassword } from '../api/password-reset.api';

interface UseResetPasswordActionReturn {
  isLoading: boolean;
  error: string | null;
  handleReset: (token: string, password: string, confirmPassword: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for handling password reset action
 */
export const useResetPasswordAction = (onSuccess: () => void): UseResetPasswordActionReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async (token: string, password: string, confirmPassword: string) => {
    setError(null);

    const validation = validateNewPassword(password, confirmPassword);
    if (!validation.isValid) {
      setError(validation.error!);
      return;
    }

    setIsLoading(true);

    try {
      await resetPassword(token, {
        password,
        confirm_password: confirmPassword,
      });

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Не удалось сбросить пароль');
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    isLoading,
    error,
    handleReset,
    clearError,
  };
};
