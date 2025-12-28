/**
 * usePasswordPolicy Hook
 * Хук для получения и кэширования политики паролей с сервера
 */

import { useState, useEffect, useCallback } from 'react';
import { getPasswordPolicy, PasswordPolicy, DEFAULT_PASSWORD_POLICY } from '@shared/api/settings.api';

interface UsePasswordPolicyReturn {
  policy: PasswordPolicy;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // Helper functions for validation
  validatePassword: (password: string) => { isValid: boolean; error?: string };
  getPasswordHint: () => string;
  getComplexityHint: () => string;
}

// Global cache for password policy to avoid refetching
let cachedPolicy: PasswordPolicy | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Hook to fetch and use password policy
 */
export const usePasswordPolicy = (): UsePasswordPolicyReturn => {
  const [policy, setPolicy] = useState<PasswordPolicy>(cachedPolicy || DEFAULT_PASSWORD_POLICY);
  const [isLoading, setIsLoading] = useState(!cachedPolicy);
  const [error, setError] = useState<string | null>(null);

  const fetchPolicy = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (cachedPolicy && now - cacheTimestamp < CACHE_DURATION) {
      setPolicy(cachedPolicy);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedPolicy = await getPasswordPolicy();
      cachedPolicy = fetchedPolicy;
      cacheTimestamp = Date.now();
      setPolicy(fetchedPolicy);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch password policy');
      // Keep using default or cached policy
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  /**
   * Validate password against policy
   */
  const validatePassword = useCallback(
    (password: string): { isValid: boolean; error?: string } => {
      if (!password) {
        return { isValid: false, error: 'Введите пароль' };
      }

      if (password.length < policy.min_length) {
        return {
          isValid: false,
          error: `Пароль должен содержать минимум ${policy.min_length} символов`,
        };
      }

      if (password.length > 100) {
        return {
          isValid: false,
          error: 'Пароль не должен превышать 100 символов',
        };
      }

      if (policy.require_complexity) {
        // Check for at least one letter
        const hasLetter = /[a-zA-Z]/.test(password);
        if (!hasLetter) {
          return {
            isValid: false,
            error: 'Пароль должен содержать минимум одну букву',
          };
        }

        // Check for at least one number or symbol
        const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
        if (!hasNumberOrSymbol) {
          return {
            isValid: false,
            error: 'Пароль должен содержать минимум одну цифру или спецсимвол',
          };
        }
      }

      return { isValid: true };
    },
    [policy]
  );

  /**
   * Get password hint text for display
   */
  const getPasswordHint = useCallback((): string => {
    if (policy.require_complexity) {
      return `Минимум ${policy.min_length} символов, буквы и цифры`;
    }
    return `Минимум ${policy.min_length} символов`;
  }, [policy]);

  /**
   * Get full complexity hint for display
   */
  const getComplexityHint = useCallback((): string => {
    const hints: string[] = [`Минимум ${policy.min_length} символов`];

    if (policy.require_complexity && policy.complexity_rules) {
      hints.push(...policy.complexity_rules);
    }

    return hints.join('\n');
  }, [policy]);

  return {
    policy,
    isLoading,
    error,
    refetch: fetchPolicy,
    validatePassword,
    getPasswordHint,
    getComplexityHint,
  };
};

/**
 * Prefetch password policy (call on app start)
 */
export const prefetchPasswordPolicy = async (): Promise<void> => {
  try {
    const policy = await getPasswordPolicy();
    cachedPolicy = policy;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.warn('Failed to prefetch password policy:', error);
  }
};

/**
 * Clear password policy cache (useful for testing or settings change)
 */
export const clearPasswordPolicyCache = (): void => {
  cachedPolicy = null;
  cacheTimestamp = 0;
};
