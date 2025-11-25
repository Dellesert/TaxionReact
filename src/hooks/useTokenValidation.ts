import { useState, useEffect } from 'react';
import { validateResetToken } from '../api/password-reset.api';

interface UseTokenValidationReturn {
  isValidating: boolean;
  isValid: boolean;
  email: string;
  expiresAt: string;
}

/**
 * Hook for validating password reset token
 */
export const useTokenValidation = (
  token: string | undefined,
  onInvalidToken: (error: string) => void
): UseTokenValidationReturn => {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  useEffect(() => {
    if (!token) {
      onInvalidToken('Токен не найден');
      return;
    }

    const validate = async () => {
      try {
        const response = await validateResetToken(token);
        setIsValid(response.valid);
        setEmail(response.email);
        setExpiresAt(response.expires_at);
      } catch (err: any) {
        onInvalidToken(err.message || 'Токен сброса пароля недействителен или истёк');
      } finally {
        setIsValidating(false);
      }
    };

    validate();
  }, [token, onInvalidToken]);

  return {
    isValidating,
    isValid,
    email,
    expiresAt,
  };
};
