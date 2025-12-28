import { useState, useCallback } from 'react';
import { usePasswordPolicy } from '@shared/hooks/usePasswordPolicy';
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
  const { validatePassword } = usePasswordPolicy();

  const handleReset = useCallback(
    async (token: string, password: string, confirmPassword: string) => {
      setError(null);

      // Validate passwords are filled
      if (!password || !confirmPassword) {
        setError('Заполните все поля');
        return;
      }

      // Validate passwords match
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }

      // Validate password using dynamic policy
      const validation = validatePassword(password);
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
    },
    [onSuccess, validatePassword]
  );

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
