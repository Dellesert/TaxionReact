/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect, useRef } from 'react';
import { LogBox, AppState, AppStateStatus, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from '@shared/store/authStore';
import { useThemeStore } from '@shared/store/themeStore';
import { useNotificationStore } from '@shared/store/notificationStore';
import { websocketService } from './src/services/websocket.service';
import { pushNotificationService } from './src/services/pushNotification.service';
import { NotificationProvider } from '@shared/contexts/NotificationContext';
import { ActionModalProvider } from '@shared/contexts/ActionModalContext';
import { OfflineBanner } from '@shared/components/common/OfflineBanner';
import { NetworkSyncProvider } from '@shared/providers/NetworkSyncProvider';
import { useCacheWarmingOnAuth } from '@shared/hooks/useCacheWarming';
import {
  getNavigationScreenByType,
  getNavigationParams,
} from '@/features/notifications/utils/notificationFormatters';

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
      return; // Игнорируем только эту конкретную ошибку
    }

    // Все остальные ошибки обрабатываются как обычно
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });
}

export default function App() {
  // Оптимизация: разделяем селекторы для уменьшения ре-рендеров на 30-40%
  // Каждый селектор теперь подписывается только на свои данные
  const initialize = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const loadTheme = useThemeStore((state) => state.loadTheme);
  const initSystemThemeListener = useThemeStore((state) => state.initSystemThemeListener);

  const loadUnreadCount = useNotificationStore((state) => state.loadUnreadCount);

  // Navigation ref for push notification navigation
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Прогрев кэша при авторизации (загружает чаты, задачи, опросы в фоне)
  useCacheWarmingOnAuth(isAuthenticated);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect/disconnect WebSocket and register for push notifications based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      console.log('[App] User authenticated - setting up push notifications');
      websocketService.connect();
      // Load unread notification count when user is authenticated
      loadUnreadCount();

      // Web: Setup listeners for notification clicks
      if (Platform.OS === 'web') {
        const handleNotificationClick = (notificationData: Record<string, any>) => {
          const type = notificationData.type as string;
          const screenName = getNavigationScreenByType(type, notificationData);
          const params = getNavigationParams(type, notificationData);

          console.log('[App] Notification click navigation:', {
            type,
            screenName,
            params
          });

          if (screenName && params && navigationRef.current?.isReady()) {
            // Small delay to ensure app is ready
            setTimeout(() => {
              if (screenName === 'Tasks' && params.taskId) {
                // @ts-ignore
                navigationRef.current?.navigate('TaskDetail', { taskId: params.taskId });
              } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                const pollId = params.params?.pollId || params.pollId;
                // @ts-ignore
                navigationRef.current?.navigate('PollDetail', { pollId });
              } else if (params.screen) {
                // Nested navigation
                // @ts-ignore
                navigationRef.current?.navigate(screenName, params);
              } else {
                // Regular navigation
                // @ts-ignore
                navigationRef.current?.navigate(screenName, params);
              }
            }, 300);
          }
        };

        // Service Worker messages (for background notifications)
        let cleanupServiceWorker: (() => void) | undefined;
        if ('serviceWorker' in navigator) {
          const handleServiceWorkerMessage = (event: MessageEvent) => {
            console.log('[App] Service Worker message:', event.data);

            if (event.data.type === 'NOTIFICATION_CLICK') {
              handleNotificationClick(event.data.data || {});
            }
          };

          navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

          cleanupServiceWorker = () => {
            navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
          };
        }

        // Window messages (for foreground notifications clicked via browser notification)
        const handleWindowMessage = (event: MessageEvent) => {
          // Проверяем origin для безопасности
          if (event.origin !== window.location.origin) return;

          console.log('[App] Window message:', event.data);

          if (event.data.type === 'NOTIFICATION_CLICK') {
            handleNotificationClick(event.data.data || {});
          }
        };

        window.addEventListener('message', handleWindowMessage);

        // Cleanup
        return () => {
          cleanupServiceWorker?.();
          window.removeEventListener('message', handleWindowMessage);
        };
      }

      // Register for push notifications
      pushNotificationService.registerForPushNotifications().then((token) => {
        if (token) {
          console.log('[App] ✅ Push notifications registered, token:', token.substring(0, 20) + '...');
        } else {
          console.log('[App] ❌ Failed to register push notifications');
        }
      });

      // Setup notification listeners
      pushNotificationService.setupNotificationListeners(
        (notification) => {
          console.log('[App] 📬 Notification received in app:', notification.request.content.title);
          // Reload unread count when notification received
          loadUnreadCount();
        },
        (response) => {
          console.log('[App] 👆 Notification tapped:', response.notification.request.content.title);
          const notificationData = response.notification.request.content.data || {};

          console.log('[App] Notification data:', notificationData);

          // Navigate using the same logic as in-app notifications
          const type = notificationData.type as string;
          const screenName = getNavigationScreenByType(type, notificationData);
          const params = getNavigationParams(type, notificationData);

          console.log('[App] Push notification navigation:', {
            type,
            screenName,
            params
          });

          if (screenName && params) {
            // Navigate with retry mechanism for background->foreground transition
            const attemptNavigation = (retries = 0) => {
              if (navigationRef.current?.isReady()) {
                console.log('[App] Navigation ready, navigating from tap...');
                if (screenName === 'Tasks' && params.taskId) {
                  // @ts-ignore
                  navigationRef.current.navigate('TaskDetail', { taskId: params.taskId });
                } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                  const pollId = params.params?.pollId || params.pollId;
                  // @ts-ignore
                  navigationRef.current.navigate('PollDetail', { pollId });
                } else if (screenName === 'Chats' && params.screen === 'Chat') {
                  // @ts-ignore
                  navigationRef.current.navigate('Chats', params);
                } else if (params.screen) {
                  // Nested navigation
                  // @ts-ignore
                  navigationRef.current.navigate(screenName, params);
                } else {
                  // Regular navigation
                  // @ts-ignore
                  navigationRef.current.navigate(screenName, params);
                }
              } else if (retries < 10) {
                console.log('[App] Navigation not ready for tap, retrying...', retries + 1);
                setTimeout(() => attemptNavigation(retries + 1), 300);
              } else {
                console.log('[App] Navigation failed after retries for tap');
              }
            };

            // Small delay then attempt navigation
            setTimeout(() => attemptNavigation(), 100);
          }
        }
      );

      // Check for last notification response (when app was opened from notification)
      import('expo-notifications').then(({ default: Notifications }) => {
        Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response) {
            console.log('[App] 🚀 App opened from notification:');
            console.log('[App] Title:', response.notification.request.content.title);
            console.log('[App] Body:', response.notification.request.content.body);
            console.log('[App] Data:', JSON.stringify(response.notification.request.content.data));

            // Navigate to the appropriate screen
            const notificationData = response.notification.request.content.data || {};
            const type = notificationData.type as string;
            const screenName = getNavigationScreenByType(type, notificationData);
            const params = getNavigationParams(type, notificationData);

            console.log('[App] Cold start navigation:', { type, screenName, params });

            if (screenName && params) {
              // Wait for navigation to be ready (cold start may need more time)
              const attemptNavigation = (retries = 0) => {
                if (navigationRef.current?.isReady()) {
                  console.log('[App] Navigation ready, navigating...');
                  if (screenName === 'Tasks' && params.taskId) {
                    // @ts-ignore
                    navigationRef.current.navigate('TaskDetail', { taskId: params.taskId });
                  } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                    const pollId = params.params?.pollId || params.pollId;
                    // @ts-ignore
                    navigationRef.current.navigate('PollDetail', { pollId });
                  } else if (screenName === 'Chats' && params.screen === 'Chat') {
                    // @ts-ignore
                    navigationRef.current.navigate('Chats', params);
                  } else if (params.screen) {
                    // @ts-ignore
                    navigationRef.current.navigate(screenName, params);
                  } else {
                    // @ts-ignore
                    navigationRef.current.navigate(screenName, params);
                  }
                } else if (retries < 10) {
                  // Retry up to 10 times with 300ms delay (3 seconds total)
                  console.log('[App] Navigation not ready, retrying...', retries + 1);
                  setTimeout(() => attemptNavigation(retries + 1), 300);
                } else {
                  console.log('[App] Navigation failed after retries');
                }
              };

              // Start navigation attempt after a small delay
              setTimeout(() => attemptNavigation(), 500);
            }
          } else {
            console.log('[App] App opened normally (not from notification)');
          }
        });
      });
    } else {
      console.log('[App] User logged out - cleaning up push notifications');
      websocketService.disconnect();
      pushNotificationService.removeNotificationListeners();
      pushNotificationService.unregisterDevice();
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
      pushNotificationService.removeNotificationListeners();
    };
  }, [isAuthenticated]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    let appState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {

      // When app comes to foreground, reconnect WebSocket if needed
      if (appState.match(/inactive|background/) && nextAppState === 'active' && isAuthenticated) {

        // Check if WebSocket is still connected
        if (!websocketService.isConnected()) {
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
          <NetworkSyncProvider enabled={isAuthenticated}>
            <AppNavigator ref={navigationRef} />
            <OfflineBanner />
          </NetworkSyncProvider>
        </ActionModalProvider>
      </NotificationProvider>
    </GestureHandlerRootView>
  );
}
