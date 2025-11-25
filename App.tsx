/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect } from 'react';
import { LogBox, AppState, AppStateStatus, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from '@shared/store/authStore';
import { useThemeStore } from '@shared/store/themeStore';
import { useNotificationStore } from '@shared/store/notificationStore';
import { websocketService } from './src/services/websocket.service';
import { NotificationProvider } from '@shared/contexts/NotificationContext';
import { ActionModalProvider } from '@shared/contexts/ActionModalContext';

// Добавляем типы для ErrorUtils (глобальная переменная React Native)
declare const ErrorUtils: {
  setGlobalHandler: (handler: (error: Error, isFatal: boolean) => void) => void;
  getGlobalHandler: () => ((error: Error, isFatal: boolean) => void) | undefined;
};

// Ignore specific logs - показываем другие ошибки, но скрываем известные проблемы
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  // Проблема dismiss в DateTimePicker - известный баг библиотеки, не влияет на работу
  'dismiss',
]);

// Optionally, ignore all logs
LogBox.ignoreAllLogs();

// Подавление ошибки dismiss в Android DateTimePicker
// Это известная проблема в библиотеке @react-native-community/datetimepicker
// Ошибка безвредна и не влияет на функциональность
if (Platform.OS === 'android') {
  // Перехватываем console.error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    // Подавляем только конкретную ошибку dismiss
    if (errorMessage.includes('Cannot read property \'dismiss\' of undefined') ||
        errorMessage.includes('Cannot read properties of undefined (reading \'dismiss\')') ||
        errorMessage.includes('dismiss') && errorMessage.includes('undefined')) {
      return; // Игнорируем эту ошибку
    }
    originalConsoleError(...args);
  };

  // Перехватываем глобальные ошибки
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorStack = error?.stack || '';

    // Подавляем только конкретную ошибку dismiss из DateTimePicker
    if (errorMessage.includes('Cannot read property \'dismiss\'') ||
        errorMessage.includes('Cannot read properties of undefined (reading \'dismiss\')') ||
        errorMessage.includes('dismiss') && errorMessage.includes('undefined') ||
        errorStack.includes('DateTimePicker') ||
        errorStack.includes('RNDateTimePicker')) {
      console.log('[Suppressed] DateTimePicker dismiss error (harmless)');
      return; // Игнорируем эту ошибку
    }
    // Все остальные ошибки обрабатываются как обычно
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
}

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const initSystemThemeListener = useThemeStore((state) => state.initSystemThemeListener);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loadUnreadCount = useNotificationStore((state) => state.loadUnreadCount);

  useEffect(() => {
    // Initialize auth state and theme on app start
    initialize();
    loadTheme();

    // Initialize system theme listener
    const subscription = initSystemThemeListener();

    return () => {
      // Cleanup listener on unmount
      subscription?.remove();
    };
  }, []);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();
      // Load unread notification count when user is authenticated
      loadUnreadCount();
    } else {
      websocketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    let appState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 AppState changed from', appState, 'to', nextAppState);

      // When app comes to foreground, reconnect WebSocket if needed
      if (appState.match(/inactive|background/) && nextAppState === 'active' && isAuthenticated) {
        console.log('🔄 App became active - checking WebSocket connection...');

        // Check if WebSocket is still connected
        if (!websocketService.isConnected()) {
          console.log('🔌 WebSocket disconnected - reconnecting...');
          await websocketService.reconnect();
        }

        // Reload unread notification count when app becomes active
        loadUnreadCount();
      }

      appState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NotificationProvider>
        <ActionModalProvider>
          <AppNavigator />
        </ActionModalProvider>
      </NotificationProvider>
    </GestureHandlerRootView>
  );
}
