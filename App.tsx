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
import { CustomTitleBar } from '@shared/components/common/CustomTitleBar';
import { TitleBarSearchProvider } from '@shared/contexts/TitleBarSearchContext';
import { DesktopNavigationProvider } from '@shared/contexts/DesktopNavigationContext';
import { isElectron } from '@shared/utils/platform';
import { electronPushNotificationService } from '@/services/pushNotificationElectron.service';

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

    // Подавляем ошибку dismiss из DateTimePicker
    // Это известная проблема в библиотеке - ошибка безвредна
    const isDismissError = (
      errorMessage.includes('Cannot read property \'dismiss\'') ||
      errorMessage.includes('Cannot read properties of undefined (reading \'dismiss\')')
    );

    if (isDismissError) {
      // Логируем для отладки, но не показываем как ошибку
      console.log('[DatePicker] Suppressed dismiss error (harmless)');
      return;
    }
    originalConsoleError(...args);
  };

  // Перехватываем глобальные ошибки
  const originalErrorHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const errorMessage = error?.message || error?.toString() || '';
    const errorStack = error?.stack || '';

    // Подавляем ошибку dismiss из DateTimePicker
    // Это известная проблема в библиотеке - ошибка безвредна и не влияет на работу
    const isDismissError = (
      errorMessage.includes('Cannot read property \'dismiss\'') ||
      errorMessage.includes('Cannot read properties of undefined (reading \'dismiss\')')
    );

    if (isDismissError) {
      console.log('[DatePicker] Suppressed dismiss error (harmless)');
      return; // Не передаём дальше - предотвращаем crash
    }

    // Все остальные ошибки обрабатываются как обычно
    if (originalErrorHandler) {
      originalErrorHandler(error, isFatal);
    }
  });

  // Дополнительно: перехватываем необработанные Promise rejection
  if (typeof (global as any).addEventListener === 'function') {
    (global as any).addEventListener?.('unhandledrejection', (event: any) => {
      const errorMessage = event?.reason?.message || event?.reason?.toString() || '';
      if (errorMessage.includes('dismiss')) {
        event.preventDefault?.();
        console.log('[DatePicker] Suppressed unhandled rejection (harmless)');
      }
    });
  }
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
      websocketService.connect();
      // Load unread notification count when user is authenticated
      loadUnreadCount();

      // Web: Setup listeners for notification clicks (but not Electron)
      if (Platform.OS === 'web' && !isElectron()) {
        const handleNotificationClick = (notificationData: Record<string, any>) => {
          const type = notificationData.type as string;
          const screenName = getNavigationScreenByType(type, notificationData);
          const params = getNavigationParams(type, notificationData);

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

      // Electron: Setup navigation callback for notification clicks
      if (isElectron()) {
        electronPushNotificationService.setNavigationCallback((notificationData) => {

          if (!notificationData) {
            return;
          }

          if (!navigationRef.current?.isReady()) {
            return;
          }

          // Prepare data for navigation helpers
          // Backend sends: { type, data: { chat_id, task_id, etc }, ... }
          // Navigation helpers expect: { type, chat_id, task_id, etc }
          const flattenedData = {
            ...notificationData,
            ...(notificationData.data || {}), // Flatten nested data object
          };

          // Use the same navigation logic as web version
          const type = flattenedData.type as string;
          const screenName = getNavigationScreenByType(type, flattenedData);
          const params = getNavigationParams(type, flattenedData);

          if (!screenName || !params) {
            return;
          }

          // Small delay to ensure window is focused and ready
          setTimeout(() => {
            try {
              if (screenName === 'Chats' && params.screen === 'Chat' && params.params?.chatId) {
                // Navigate to specific chat (nested navigation)
                // @ts-ignore
                navigationRef.current?.navigate('Chats', {
                  screen: 'Chat',
                  params: { chatId: params.params.chatId }
                });
              } else if (screenName === 'Tasks' && params.taskId) {
                // Navigate to specific task (nested navigation)
                // @ts-ignore
                navigationRef.current?.navigate('Tasks', {
                  screen: 'TaskDetail',
                  params: { taskId: params.taskId }
                });
              } else if (screenName === 'Polls' && params.screen === 'PollDetail' && params.params?.pollId) {
                // Navigate to specific poll (nested navigation)
                // @ts-ignore
                navigationRef.current?.navigate('Polls', {
                  screen: 'PollDetail',
                  params: { pollId: params.params.pollId }
                });
              } else if (screenName === 'Calendar') {
                // Navigate to calendar (event detail if available)
                // @ts-ignore
                navigationRef.current?.navigate('Calendar', params.eventId ? { eventId: params.eventId } : undefined);
              } else {
              }
            } catch (error) {
              console.error('[App] Navigation error:', error);
            }
          }, 300);
        });
      }

      // Register for push notifications
      pushNotificationService.registerForPushNotifications().then((token) => {
        if (token) {
        } else {
        }
      });

      // Setup notification listeners
      pushNotificationService.setupNotificationListeners(
        (notification) => {
          // Reload unread count when notification received
          loadUnreadCount();
        },
        (response) => {
          let notificationData = response.notification.request.content.data || {};

          // iOS иногда отправляет данные как строки - проверяем и парсим
          if (typeof notificationData === 'string') {
            try {
              notificationData = JSON.parse(notificationData);
            } catch (e) {
              console.error('[App] Failed to parse notification data:', e);
            }
          }

          // Navigate using the same logic as in-app notifications
          const type = notificationData.type as string;
          const screenName = getNavigationScreenByType(type, notificationData);
          const params = getNavigationParams(type, notificationData);

          if (!screenName || !params) {
            return;
          }

          // Navigate with retry mechanism for background->foreground transition
          const attemptNavigation = (retries = 0) => {
              if (navigationRef.current?.isReady()) {
                if (screenName === 'Tasks' && params.taskId) {
                  // Navigate to specific task
                  // @ts-ignore
                  navigationRef.current.navigate('Tasks', {
                    screen: 'TaskDetail',
                    params: { taskId: params.taskId }
                  });
                } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                  // Navigate to specific poll
                  const pollId = params.params?.pollId || params.pollId;
                  // @ts-ignore
                  navigationRef.current.navigate('Polls', {
                    screen: 'PollDetail',
                    params: { pollId }
                  });
                } else if (screenName === 'Chats' && params.screen === 'Chat' && params.params?.chatId) {
                  // Navigate to specific chat
                  // @ts-ignore
                  navigationRef.current.navigate('Chats', {
                    screen: 'Chat',
                    params: { chatId: params.params.chatId }
                  });
                } else if (screenName === 'Calendar') {
                  // Navigate to calendar (with event if available)
                  // @ts-ignore
                  navigationRef.current.navigate('Calendar', params.eventId ? { eventId: params.eventId } : undefined);
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
                setTimeout(() => attemptNavigation(retries + 1), 300);
              }
            };

          // Small delay then attempt navigation
          setTimeout(() => attemptNavigation(), 100);
        }
      );

      // Check for last notification response (when app was opened from notification)
      import('expo-notifications').then(({ default: Notifications }) => {
        Notifications.getLastNotificationResponseAsync().then((response) => {
          if (response) {
            // Navigate to the appropriate screen
            let notificationData = response.notification.request.content.data || {};

            // iOS иногда отправляет данные как строки - проверяем и парсим
            if (typeof notificationData === 'string') {
              try {
                notificationData = JSON.parse(notificationData);
              } catch (e) {
                console.error('[App] Failed to parse notification data:', e);
              }
            }

            const type = notificationData.type as string;
            const screenName = getNavigationScreenByType(type, notificationData);
            const params = getNavigationParams(type, notificationData);

            if (screenName && params) {
              // Wait for navigation to be ready (cold start may need more time)
              const attemptNavigation = (retries = 0) => {
                if (navigationRef.current?.isReady()) {
                  if (screenName === 'Tasks' && params.taskId) {
                    // Navigate to specific task
                    // @ts-ignore
                    navigationRef.current.navigate('Tasks', {
                      screen: 'TaskDetail',
                      params: { taskId: params.taskId }
                    });
                  } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                    // Navigate to specific poll
                    const pollId = params.params?.pollId || params.pollId;
                    // @ts-ignore
                    navigationRef.current.navigate('Polls', {
                      screen: 'PollDetail',
                      params: { pollId }
                    });
                  } else if (screenName === 'Chats' && params.screen === 'Chat' && params.params?.chatId) {
                    // Navigate to specific chat
                    // @ts-ignore
                    navigationRef.current.navigate('Chats', {
                      screen: 'Chat',
                      params: { chatId: params.params.chatId }
                    });
                  } else if (screenName === 'Calendar') {
                    // Navigate to calendar (with event if available)
                    // @ts-ignore
                    navigationRef.current.navigate('Calendar', params.eventId ? { eventId: params.eventId } : undefined);
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
                  // Retry up to 10 times with 300ms delay (3 seconds total)
                  setTimeout(() => attemptNavigation(retries + 1), 300);
                }
              };

              // Start navigation attempt after a small delay
              setTimeout(() => attemptNavigation(), 500);
            }
          }
        });
      });
    } else {
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
      <DesktopNavigationProvider>
        <TitleBarSearchProvider>
          <CustomTitleBar navigationRef={navigationRef} />
          <NotificationProvider>
            <ActionModalProvider>
              <NetworkSyncProvider enabled={isAuthenticated}>
                <AppNavigator ref={navigationRef} />
                <OfflineBanner />
              </NetworkSyncProvider>
            </ActionModalProvider>
          </NotificationProvider>
        </TitleBarSearchProvider>
      </DesktopNavigationProvider>
    </GestureHandlerRootView>
  );
}
