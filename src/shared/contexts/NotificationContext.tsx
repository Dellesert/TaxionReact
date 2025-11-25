/**
 * Notification Context
 * Контекст для управления уведомлениями (Toast messages)
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Toast, { ToastType, ToastProps } from '@shared/components/ui/Toast';
import { ApiError } from '@types/common.types';
import { formatApiError, extractRequestId } from '@shared/utils/errorUtils';

interface NotificationItem extends Omit<ToastProps, 'onHide'> {
  id: string;
}

interface NotificationContextValue {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showApiError: (error: ApiError) => void;
  hideNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const showNotification = useCallback(
    (message: string, type: ToastType = 'info', duration?: number) => {
      const id = `${Date.now()}-${Math.random()}`;
      const notification: NotificationItem = {
        id,
        message,
        type,
        duration,
      };

      setNotifications((prev) => {
        // Ограничиваем количество одновременных уведомлений до 3
        const newNotifications = [...prev, notification];
        return newNotifications.slice(-3);
      });

      // Автоматически удаляем уведомление через duration + 300ms (время анимации)
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, (duration || 4000) + 300);
    },
    []
  );

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const showSuccess = useCallback(
    (message: string) => {
      showNotification(message, 'success');
    },
    [showNotification]
  );

  const showError = useCallback(
    (message: string) => {
      showNotification(message, 'error', 5000);
    },
    [showNotification]
  );

  const showWarning = useCallback(
    (message: string) => {
      showNotification(message, 'warning');
    },
    [showNotification]
  );

  const showInfo = useCallback(
    (message: string) => {
      showNotification(message, 'info');
    },
    [showNotification]
  );

  const showApiError = useCallback(
    (error: ApiError) => {
      const message = formatApiError(error);
      showError(message);
    },
    [showError]
  );

  const value: NotificationContextValue = {
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showApiError,
    hideNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {notifications.length > 0 && (
        <View style={styles.toastContainer} pointerEvents="box-none">
          {notifications.map((notification, index) => (
            <View
              key={notification.id}
              style={[styles.toastWrapper, { bottom: 100 + index * 90 }]}
            >
              <Toast
                {...notification}
                onHide={() => hideNotification(notification.id)}
              />
            </View>
          ))}
        </View>
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
});

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};
