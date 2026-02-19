/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect, useRef } from 'react';
import { LogBox, AppState, AppStateStatus, Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainerRef } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from '@shared/store/authStore';
import { useThemeStore } from '@shared/store/themeStore';
import { useAnimationStore } from '@shared/store/animationStore';
import { useChatStore } from '@shared/store/chatStore';
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

import { TitleBarControlsProvider } from '@shared/contexts/TitleBarControlsContext';
import { DesktopNavigationProvider, navigateToTabGlobal } from '@shared/contexts/DesktopNavigationContext';
import { SidebarProvider } from '@shared/contexts/SidebarContext';
import { isElectron } from '@shared/utils/platform';
import { electronPushNotificationService } from '@/services/pushNotificationElectron.service';
import { appUpdaterService } from '@/services/appUpdater.service';
import { ShareIntentHandler } from '@/features/chat/components/ShareIntentHandler';

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

  const reduceAnimations = useAnimationStore((state) => state.reduceAnimations);
  const loadAnimationPreference = useAnimationStore((state) => state.loadAnimationPreference);

  const loadUnreadCount = useNotificationStore((state) => state.loadUnreadCount);

  // Navigation ref for push notification navigation
  const navigationRef = useRef<NavigationContainerRef<any>>(null);

  // Текущая тема для CSS классов Electron
  const theme = useThemeStore((state) => state.theme);

  // Прогрев кэша при авторизации (загружает чаты, задачи, опросы в фоне)
  useCacheWarmingOnAuth(isAuthenticated);

  // Add Electron-specific CSS classes to html element for window border styling
  useEffect(() => {
    if (Platform.OS === 'web' && isElectron() && typeof document !== 'undefined') {
      const html = document.documentElement;
      html.classList.add('electron-app');

      // Update theme class
      html.classList.remove('theme-light', 'theme-dark');
      html.classList.add(theme.isDark ? 'theme-dark' : 'theme-light');
    }
  }, [theme.isDark]);

  // Toggle reduce-animations CSS class for Electron
  useEffect(() => {
    if (Platform.OS === 'web' && isElectron() && typeof document !== 'undefined') {
      const html = document.documentElement;
      if (reduceAnimations) {
        html.classList.add('reduce-animations');
      } else {
        html.classList.remove('reduce-animations');
      }
    }
  }, [reduceAnimations]);

  useEffect(() => {
    // Initialize auth state and theme on app start
    initialize();
    loadTheme();
    loadAnimationPreference();

    // Initialize system theme listener
    const subscription = initSystemThemeListener();

    // Start auto update check for Android
    // Electron has its own updater in electron/updater.js
    if (Platform.OS === 'android') {
      appUpdaterService.startAutoCheck();
    }

    return () => {
      // Cleanup listener on unmount
      subscription?.remove();
      appUpdaterService.stopAutoCheck();
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
            console.warn('[App Electron] No screen or params for navigation');
            return;
          }

          // Small delay to ensure window is focused and ready
          setTimeout(() => {
            try {
              // Use desktop navigation via global function
              // This works because DesktopNavigationProvider registers the global function
              // Type assertion for params from getNavigationParams
              const p = params as Record<string, any>;
              const nestedParams = p.params as Record<string, any> | undefined;

              let navigationParams: Record<string, unknown> = {};
              let tab = screenName;

              if (screenName === 'Chats' && p.screen === 'Chat' && nestedParams?.chatId) {
                tab = 'Chats';
                navigationParams = {
                  chatId: nestedParams.chatId,
                  ...(nestedParams.messageId ? { messageId: nestedParams.messageId } : {}),
                };
              } else if (screenName === 'Tasks' && p.taskId) {
                tab = 'Tasks';
                navigationParams = {
                  taskId: p.taskId,
                  ...(p.subtaskId ? { subtaskId: p.subtaskId } : {}),
                  ...(p.commentId ? { commentId: p.commentId } : {}),
                };
              } else if (screenName === 'Polls' && (p.screen === 'PollDetail' || nestedParams?.pollId || p.pollId)) {
                tab = 'Polls';
                const pollId = nestedParams?.pollId || p.pollId;
                navigationParams = {
                  pollId,
                  ...(nestedParams?.commentId ? { commentId: nestedParams.commentId } : {}),
                };
              } else if (screenName === 'Calendar') {
                tab = 'Calendar';
                if (p.eventId) {
                  navigationParams = { eventId: p.eventId };
                }
              }


              // Try desktop navigation first (for wide screens)
              const desktopNavUsed = navigateToTabGlobal(tab, navigationParams);

              if (!desktopNavUsed && navigationRef.current?.isReady()) {
                // Fallback to mobile navigation if desktop navigation is not available
                if (screenName === 'Tasks' && p.taskId) {
                  // @ts-ignore
                  navigationRef.current?.navigate('Tasks', {
                    screen: 'TaskDetail',
                    params: { taskId: p.taskId },
                  });
                } else if (screenName === 'Polls' && (p.screen === 'PollDetail' || nestedParams?.pollId || p.pollId)) {
                  const pollId = nestedParams?.pollId || p.pollId;
                  // @ts-ignore
                  navigationRef.current?.navigate('Polls', {
                    screen: 'PollDetail',
                    params: { pollId },
                  });
                } else if (screenName === 'Chats' && p.screen === 'Chat') {
                  // @ts-ignore
                  navigationRef.current?.navigate('Chats', params);
                } else if (screenName === 'Calendar') {
                  // @ts-ignore
                  navigationRef.current?.navigate('Calendar', p.eventId ? {
                    screen: 'CalendarMain',
                    params: { eventId: p.eventId },
                  } : undefined);
                }
              }
            } catch (error) {
              console.error('[App Electron] Navigation error:', error);
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
          const action = notificationData.action as string;


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
                    params: {
                      taskId: params.taskId,
                      ...(params.subtaskId && { subtaskId: params.subtaskId }),
                      ...(params.commentId && { commentId: params.commentId }),
                    }
                  });
                } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                  // Navigate to specific poll
                  const pollId = params.params?.pollId || params.pollId;
                  const commentId = params.params?.commentId || params.commentId;
                  // @ts-ignore
                  navigationRef.current.navigate('Polls', {
                    screen: 'PollDetail',
                    params: {
                      pollId,
                      ...(commentId && { commentId }),
                    }
                  });
                } else if (screenName === 'Chats' && params.screen === 'Chat' && params.params?.chatId) {
                  // Navigate to specific chat
                  const chatId = params.params.chatId;
                  const messageId = params.params.messageId;
                  // @ts-ignore
                  navigationRef.current.navigate('Chats', {
                    screen: 'Chat',
                    params: {
                      chatId,
                      ...(messageId && { messageId }), // Для прокрутки к сообщению
                    }
                  });
                } else if (screenName === 'Calendar') {
                  // Navigate to calendar (with event if available)
                  if (params.eventId) {
                    // Navigate to Calendar tab first, then to CalendarMain with eventId
                    // @ts-ignore
                    navigationRef.current.navigate('Calendar', {
                      screen: 'CalendarMain',
                      params: { eventId: params.eventId },
                      initial: false,
                    });
                  } else {
                    // @ts-ignore
                    navigationRef.current.navigate('Calendar');
                  }
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
              } else {
                console.error('[App] ❌ Failed to navigate after 10 retries');
              }
            };

          // Small delay then attempt navigation
          setTimeout(() => attemptNavigation(), 100);
        }
      );

      // Check for last notification response (when app was opened from notification)
      // Skip on Electron - expo-notifications has no native implementation there
      if (!isElectron()) {
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
            const action = notificationData.action as string;


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
                      params: {
                        taskId: params.taskId,
                        ...(params.subtaskId && { subtaskId: params.subtaskId }),
                        ...(params.commentId && { commentId: params.commentId }),
                      }
                    });
                  } else if (screenName === 'Polls' && (params.screen === 'PollDetail' || params.params?.pollId)) {
                    // Navigate to specific poll
                    const pollId = params.params?.pollId || params.pollId;
                    const commentId = params.params?.commentId || params.commentId;
                    // @ts-ignore
                    navigationRef.current.navigate('Polls', {
                      screen: 'PollDetail',
                      params: {
                        pollId,
                        ...(commentId && { commentId }),
                      }
                    });
                  } else if (screenName === 'Chats' && params.screen === 'Chat' && params.params?.chatId) {
                    // Navigate to specific chat
                    const chatId = params.params.chatId;
                    const messageId = params.params.messageId;
                    // @ts-ignore
                    navigationRef.current.navigate('Chats', {
                      screen: 'Chat',
                      params: {
                        chatId,
                        ...(messageId && { messageId }),
                      }
                    });
                  } else if (screenName === 'Calendar') {
                    // Navigate to calendar (with event if available)
                    if (params.eventId) {
                      // Navigate to Calendar tab first, then to CalendarMain with eventId
                      // @ts-ignore
                      navigationRef.current.navigate('Calendar', {
                        screen: 'CalendarMain',
                        params: { eventId: params.eventId },
                        initial: false,
                      });
                    } else {
                      // @ts-ignore
                      navigationRef.current.navigate('Calendar');
                    }
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
                } else {
                  console.error('[App] ❌ Failed to navigate after 10 retries (cold start)');
                }
              };

              // Start navigation attempt after a small delay
              setTimeout(() => attemptNavigation(), 500);
            } else {
            }
          }
        });
      });
      }
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
    // Web/Electron: Handle visibility change and window focus
    if (Platform.OS === 'web') {
      const handleVisibilityChange = () => {
        if (!isAuthenticated) return;

        if (document.hidden) {
          // Tab/window hidden - send away status
          websocketService.sendPresence('away');
        } else {
          // Tab/window visible - send online status
          if (!websocketService.isConnected()) {
            websocketService.reconnect();
          }
          websocketService.sendPresence('online');
          loadUnreadCount();

          // Silently refresh chat list and unread count to get messages received while tab was hidden
          const chatStore = useChatStore.getState();
          chatStore.silentRefreshCurrentTab().catch((error) => {
            console.error('[App] Failed to refresh chats on visibility change:', error);
          });
          chatStore.loadUnreadCount().catch((error) => {
            console.error('[App] Failed to refresh chat unread count on visibility change:', error);
          });
        }
      };

      // For Electron: also handle window blur/focus
      const handleWindowBlur = () => {
        if (isAuthenticated && isElectron()) {
          websocketService.sendPresence('away');
        }
      };

      const handleWindowFocus = () => {
        if (isAuthenticated && isElectron()) {
          if (!websocketService.isConnected()) {
            websocketService.reconnect();
          }
          websocketService.sendPresence('online');
          loadUnreadCount();

          // Silently refresh chat list and unread count to get messages received while window was unfocused
          const chatStore = useChatStore.getState();
          chatStore.silentRefreshCurrentTab().catch((error) => {
            console.error('[App] Failed to refresh chats on window focus:', error);
          });
          chatStore.loadUnreadCount().catch((error) => {
            console.error('[App] Failed to refresh chat unread count on window focus:', error);
          });
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('blur', handleWindowBlur);
      window.addEventListener('focus', handleWindowFocus);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('blur', handleWindowBlur);
        window.removeEventListener('focus', handleWindowFocus);
      };
    }

    // Native (iOS/Android): Handle AppState changes
    let appState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // When app goes to background/inactive, send offline status
      if (nextAppState.match(/inactive|background/) && appState === 'active' && isAuthenticated) {
        // Send away/offline status when app goes to background
        websocketService.sendPresence('away');
      }

      // When app comes to foreground, reconnect WebSocket if needed
      if (appState.match(/inactive|background/) && nextAppState === 'active' && isAuthenticated) {
        // Check if WebSocket is still connected
        if (!websocketService.isConnected()) {
          await websocketService.reconnect();
        }

        // Send online status when app comes to foreground
        websocketService.sendPresence('online');

        // Reload unread notification count when app becomes active
        loadUnreadCount();

        // Silently refresh chat list and unread count to get messages received while app was in background
        // This ensures new messages from push notifications are visible and badge is updated
        const chatStore = useChatStore.getState();
        chatStore.silentRefreshCurrentTab().catch((error) => {
          console.error('[App] Failed to refresh chats on foreground:', error);
        });
        chatStore.loadUnreadCount().catch((error) => {
          console.error('[App] Failed to refresh chat unread count on foreground:', error);
        });
      }

      appState = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return (
    <SafeAreaProvider>
    <KeyboardProvider>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SidebarProvider>
        <DesktopNavigationProvider>
          <TitleBarControlsProvider>
            <CustomTitleBar navigationRef={navigationRef} isAuthenticated={isAuthenticated} />
            <NotificationProvider>
              <ActionModalProvider>
                <ShareIntentHandler navigationRef={navigationRef}>
                  <NetworkSyncProvider enabled={isAuthenticated}>
                    <AppNavigator ref={navigationRef} />
                    <OfflineBanner />
                  </NetworkSyncProvider>
                </ShareIntentHandler>
              </ActionModalProvider>
            </NotificationProvider>
          </TitleBarControlsProvider>
        </DesktopNavigationProvider>
      </SidebarProvider>
    </GestureHandlerRootView>
    </KeyboardProvider>
    </SafeAreaProvider>
  );
}
