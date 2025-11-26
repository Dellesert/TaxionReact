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

// Отключаем строгий режим Reanimated для уменьшения количества warnings
if (typeof global !== 'undefined') {
  (global as any)._WORKLET = false;
  // Отключаем strict mode для Reanimated
  if ((global as any).__reanimatedLoggerConfig) {
    (global as any).__reanimatedLoggerConfig.strict = false;
  } else {
    (global as any).__reanimatedLoggerConfig = { strict: false };
  }
}

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
  // Reanimated warnings - отключаем в strict mode выше
  '[Reanimated]',
]);

// ВАЖНО: LogBox.ignoreAllLogs() удален для отслеживания реальных ошибок в разработке
// В production используйте условие: if (!__DEV__) LogBox.ignoreAllLogs();

// Подавление ошибки dismiss в Android DateTimePicker
// Это известная проблема в библиотеке @react-native-community/datetimepicker
// Ошибка безвредна и не влияет на функциональность
if (Platform.OS === 'android') {
  // Перехватываем console.error
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const errorMessage = args[0]?.toString() || '';
    const errorStack = args[1]?.stack?.toString() || '';

    // Подавляем только конкретную ошибку dismiss из DateTimePicker
    // Более строгая проверка для предотвращения скрытия других ошибок
    const isDismissError = (
      (errorMessage.includes('Cannot read property \'dismiss\'') ||
       errorMessage.includes('Cannot read properties of undefined (reading \'dismiss\')')) &&
      (errorMessage.includes('DateTimePicker') || errorStack.includes('DateTimePicker') ||
       errorStack.includes('RNDateTimePicker'))
    );

    if (isDismissError) {
      return; // Игнорируем только ошибку DateTimePicker
    }
    originalConsoleError(...args);
  };

  // Перехватываем глобальные ошибки
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorStack = error?.stack || '';

    // Подавляем только конкретную ошибку dismiss из DateTimePicker
    // Более строгая проверка - обе условия должны совпадать
    const isDismissError = (
      (errorMessage.includes('Cannot read property \'dismiss\'') ||
       errorMessage.includes('Cannot read properties of undefined (reading \'dismiss\')')) &&
      (errorStack.includes('DateTimePicker') || errorStack.includes('RNDateTimePicker'))
    );

    if (isDismissError) {
      console.log('[Suppressed] DateTimePicker dismiss error (harmless)');
      return; // Игнорируем только эту конкретную ошибку
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
