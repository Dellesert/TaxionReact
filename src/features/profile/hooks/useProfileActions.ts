import { useState, useCallback } from 'react';
import { useAuthStore } from '@shared/store/authStore';
import { useAccountStore } from '@shared/store/accountStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { isElectron } from '@shared/utils/platform';

/**
 * Hook for managing profile actions (logout, theme change, etc.)
 */
export const useProfileActions = () => {
  const { logout } = useAuthStore();
  const { switchToLogin } = useAccountStore();
  const { setTheme } = useTheme();
  const { showError } = useNotification();
  const { showConfirm, showOptions } = useActionModal();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle user logout with choice: switch account or full logout
   */
  const handleLogout = useCallback(async () => {
    if (!isElectron()) {
      try {
        setIsLoggingOut(true);
        await logout();
      } catch (error) {
        console.error('Ошибка при выходе:', error);
        showError('Не удалось выйти из аккаунта');
      } finally {
        setIsLoggingOut(false);
      }
      return;
    }

    showOptions(
      'Выход',
      [
        {
          text: 'Сменить аккаунт',
          icon: 'swap-horizontal-outline',
          onPress: async () => {
            try {
              await switchToLogin();
            } catch (error) {
              console.error('Ошибка при смене аккаунта:', error);
              showError('Не удалось перейти к экрану входа');
            }
          },
        },
        {
          text: 'Выйти полностью',
          icon: 'log-out-outline',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
            } catch (error) {
              console.error('Ошибка при выходе:', error);
              showError('Не удалось выйти из аккаунта');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ],
      'Выберите способ выхода из аккаунта',
    );
  }, [logout, switchToLogin, showOptions, showError]);

  /**
   * Handle theme selection
   */
  const handleThemePress = useCallback(() => {
    showOptions(
      'Выбор темы',
      [
        {
          text: 'Системная',
          icon: 'phone-portrait',
          onPress: () => setTheme('system'),
        },
        {
          text: 'Светлая',
          icon: 'sunny',
          onPress: () => setTheme('light'),
        },
        {
          text: 'Тёмная',
          icon: 'moon',
          onPress: () => setTheme('dark'),
        },
      ]
    );
  }, [showOptions, setTheme]);

  return {
    isLoggingOut,
    handleLogout,
    handleThemePress,
  };
};
