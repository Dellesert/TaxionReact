/**
 * iOS-specific Push Notification Service using Firebase SDK
 * Этот сервис использует нативный Firebase SDK для получения FCM токена на iOS
 */

import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '@shared/api/axios.config';

// Динамический импорт Firebase Messaging для iOS
let firebaseMessaging: typeof import('@react-native-firebase/messaging').default | null = null;

// Инициализируем Firebase Messaging для iOS
async function initFirebaseMessaging() {
  if (Platform.OS !== 'ios') {
    return null;
  }

  if (firebaseMessaging) {
    return firebaseMessaging;
  }

  try {
    // Динамически импортируем @react-native-firebase/messaging
    const messaging = require('@react-native-firebase/messaging').default;
    firebaseMessaging = messaging;
    return messaging;
  } catch (error) {
    console.warn('[PushIOS] ⚠️ Firebase Messaging module not available:', error);
    return null;
  }
}

// Настройка обработки уведомлений
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationState {
  token: string | null;
  notification: Notifications.Notification | null;
}

class IOSPushNotificationService {
  private static instance: IOSPushNotificationService;
  private fcmToken: string | null = null;
  private apnsToken: string | null = null;
  private deviceId: string | null = null;
  private notificationListener: EventSubscription | null = null;
  private responseListener: EventSubscription | null = null;
  private tokenRefreshUnsubscribe: (() => void) | null = null;

  private constructor() {}

  static getInstance(): IOSPushNotificationService {
    if (!IOSPushNotificationService.instance) {
      IOSPushNotificationService.instance = new IOSPushNotificationService();
    }
    return IOSPushNotificationService.instance;
  }

  /**
   * Запросить разрешение и зарегистрировать устройство для push-уведомлений
   */
  async registerForPushNotifications(): Promise<string | null> {

    // Проверяем, что это iOS устройство
    if (Platform.OS !== 'ios') {
      return null;
    }

    // Проверяем, что это физическое устройство
    if (!Device.isDevice) {
      return null;
    }

    try {
      // Шаг 1: Инициализируем Firebase Messaging
      const messaging = await initFirebaseMessaging();

      if (messaging) {

        // Шаг 2: Запросить разрешения через Firebase
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;


        if (!enabled) {
          return null;
        }

        // Шаг 3: Получить APNs токен (ОБЯЗАТЕЛЬНО перед FCM)
        // Ждем пока iOS зарегистрирует устройство в APNs
        let apnsToken = await messaging().getAPNSToken();

        // Если токен еще не готов, ждем с ретраями
        if (!apnsToken) {
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 500));
            apnsToken = await messaging().getAPNSToken();
            if (apnsToken) break;
          }
        }

        if (!apnsToken) {
          // Пробуем принудительно зарегистрировать в APNs
          await messaging().registerDeviceForRemoteMessages();
          apnsToken = await messaging().getAPNSToken();
        }

        if (apnsToken) {
          this.apnsToken = apnsToken;
        } else {
          console.error('[PushIOS] ❌ Could not obtain APNS token');
          return null;
        }

        // Шаг 4: Получить FCM токен (теперь когда APNS токен есть)
        const fcmToken = await messaging().getToken();
        this.fcmToken = fcmToken;

        // Шаг 5: Настроить listener для обновления токена
        this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
          this.fcmToken = newToken;
          await this.sendTokenToBackend(newToken);
        });

        // Шаг 6: Отправляем FCM токен на бэкенд
        await this.sendTokenToBackend(fcmToken);

        return fcmToken;
      } else {
        // Fallback на expo-notifications если Firebase недоступен

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          return null;
        }

        const apnsTokenData = await Notifications.getDevicePushTokenAsync();
        this.apnsToken = apnsTokenData.data as string;

        await this.sendTokenToBackend(this.apnsToken);
        return this.apnsToken;
      }
    } catch (error) {
      console.error('[PushIOS] ❌ Error in registration process:', error);
      return null;
    }
  }

  /**
   * Отправить токен на бэкенд для регистрации устройства
   */
  private async sendTokenToBackend(token: string): Promise<void> {
    try {
      const response = await api.post('/devices', {
        token,
        platform: 'ios',
        device_id: await this.getDeviceId(),
      });

      // Сохраняем ID устройства для последующего удаления
      if (response.data?.id) {
        this.deviceId = response.data.id;
      }

    } catch (error) {
      console.error('[PushIOS] ❌ Error sending token to backend:', error);
    }
  }

  /**
   * Получить уникальный ID устройства
   */
  private async getDeviceId(): Promise<string> {
    try {
      // Попытаться получить UDID или другой уникальный ID
      return Device.modelId || Device.osInternalBuildId || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Подписаться на уведомления
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Setup Firebase background message handler (for iOS background notifications)
    this.setupFirebaseBackgroundHandler(onNotificationResponse);

    // Listener для входящих уведомлений (когда приложение открыто)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        onNotificationReceived?.(notification);
      }
    );

    // Listener для нажатий на уведомления
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        onNotificationResponse?.(response);
      }
    );
  }

  /**
   * Setup Firebase background notification handler
   */
  private setupFirebaseBackgroundHandler(
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    if (!firebaseMessaging) {
      return;
    }

    // Handle background messages (when app is in background/quit)
    firebaseMessaging().onNotificationOpenedApp((remoteMessage) => {
      if (onNotificationResponse && remoteMessage.data) {
        // Convert Firebase message to Expo notification format
        const expoNotification: Notifications.NotificationResponse = {
          notification: {
            request: {
              identifier: remoteMessage.messageId || String(Date.now()),
              content: {
                title: remoteMessage.notification?.title || null,
                body: remoteMessage.notification?.body || null,
                data: remoteMessage.data || {},
              },
              trigger: null,
            },
            date: Date.now(),
          },
          actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
        };

        onNotificationResponse(expoNotification);
      }
    });

    // Check if app was opened by notification (cold start)
    firebaseMessaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage && onNotificationResponse && remoteMessage.data) {
          // Convert Firebase message to Expo notification format
          const expoNotification: Notifications.NotificationResponse = {
            notification: {
              request: {
                identifier: remoteMessage.messageId || String(Date.now()),
                content: {
                  title: remoteMessage.notification?.title || null,
                  body: remoteMessage.notification?.body || null,
                  data: remoteMessage.data || {},
                },
                trigger: null,
              },
              date: Date.now(),
            },
            actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
          };

          onNotificationResponse(expoNotification);
        }
      });
  }

  /**
   * Отписаться от уведомлений
   */
  removeNotificationListeners(): void {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    if (this.tokenRefreshUnsubscribe) {
      this.tokenRefreshUnsubscribe();
      this.tokenRefreshUnsubscribe = null;
    }
  }

  /**
   * Получить текущий токен
   */
  getToken(): string | null {
    return this.fcmToken || this.apnsToken;
  }

  /**
   * Получить FCM токен (если доступен)
   */
  getFCMToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Получить APNs токен
   */
  getAPNsToken(): string | null {
    return this.apnsToken;
  }

  /**
   * Установить badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  /**
   * Получить badge count
   */
  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  /**
   * Очистить все уведомления
   */
  async clearAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }

  /**
   * Отменить регистрацию устройства (при logout)
   */
  async unregisterDevice(): Promise<void> {
    if (!this.deviceId) {
      return;
    }

    try {
      await api.delete(`/devices/${this.deviceId}`);

      // Удалить FCM токен если доступен
      if (firebaseMessaging && this.fcmToken) {
        await firebaseMessaging().deleteToken();
      }

      this.fcmToken = null;
      this.apnsToken = null;
      this.deviceId = null;
    } catch (error) {
      console.error('[PushIOS] ❌ Error unregistering device:', error);
    }
  }
}

export const iosPushNotificationService = IOSPushNotificationService.getInstance();
