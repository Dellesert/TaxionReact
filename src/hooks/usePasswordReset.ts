import { useState, useCallback } from 'react';
import { validateEmail } from '../utils/passwordResetHelpers';
import { requestPasswordReset } from '../api/password-reset.api';

interface UsePasswordResetReturn {
  isLoading: boolean;
  error: string | null;
  success: boolean;
  requestReset: (email: string) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for handling password reset requests
 */
export const usePasswordReset = (): UsePasswordResetReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const requestReset = useCallback(async (email: string): Promise<void> => {
    setError(null);

    // Validate email
    const validation = validateEmail(email);
    if (!validation.isValid) {
      setError(validation.error || 'Ошибка валидации');
      throw new Error(validation.error);
    }

    setIsLoading(true);

    try {
      await requestPasswordReset({ email });
      setSuccess(true);
    } catch (err: any) {
      const errorMessage = err.message || 'Не удалось отправить запрос';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    success,
    requestReset,
    clearError,
  };
};
