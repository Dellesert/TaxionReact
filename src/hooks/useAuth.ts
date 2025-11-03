/**
 * Auth Hook
 * Custom hook для работы с аутентификацией
 */

import { useAuthStore } from '@store/authStore';

/**
 * Hook для работы с аутентификацией
 */
export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    login,
    register,
    logout,
    refreshUser,
    setUser,
    clearError,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    isInitializing,
    error,
    login,
    register,
    logout,
    refreshUser,
    setUser,
    clearError,
  };
};
