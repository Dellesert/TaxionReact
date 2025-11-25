import { useState, useCallback } from 'react';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useActionModal } from '@shared/contexts/ActionModalContext';

/**
 * Hook for managing profile actions (logout, theme change, etc.)
 */
export const useProfileActions = () => {
  const { logout } = useAuthStore();
  const { setTheme } = useTheme();
  const { showError } = useNotification();
  const { showConfirm, showOptions } = useActionModal();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle user logout with confirmation
   */
  const handleLogout = useCallback(() => {
    showConfirm(
      'Выход',
      'Вы уверены, что хотите выйти?',
      async () => {
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
      undefined,
      { confirmText: 'Выйти', cancelText: 'Отмена', destructive: true }
    );
  }, [logout, showConfirm, showError]);

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
