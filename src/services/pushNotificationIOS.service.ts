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
    console.log('[PushIOS] ✅ Firebase Messaging module loaded successfully');
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
    console.log('[PushIOS] registerForPushNotifications called');

    // Проверяем, что это iOS устройство
    if (Platform.OS !== 'ios') {
      console.log('[PushIOS] Not iOS platform, skipping');
      return null;
    }

    // Проверяем, что это физическое устройство
    console.log('[PushIOS] Device.isDevice:', Device.isDevice);
    if (!Device.isDevice) {
      console.log('[PushIOS] Push notifications require a physical device');
      return null;
    }

    try {
      // Шаг 1: Инициализируем Firebase Messaging
      const messaging = await initFirebaseMessaging();

      if (messaging) {
        console.log('[PushIOS] Firebase Messaging initialized');

        // Шаг 2: Запросить разрешения через Firebase
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        console.log('[PushIOS] Firebase authorization status:', authStatus, 'enabled:', enabled);

        if (!enabled) {
          console.log('[PushIOS] ❌ Push notification permission denied');
          return null;
        }

        // Шаг 3: Получить APNs токен (для логирования)
        const apnsToken = await messaging().getAPNSToken();
        if (apnsToken) {
          this.apnsToken = apnsToken;
          console.log('[PushIOS] 📱 APNs Token:', apnsToken.substring(0, 20) + '...');
        }

        // Шаг 4: Получить FCM токен
        const fcmToken = await messaging().getToken();
        this.fcmToken = fcmToken;
        console.log('[PushIOS] 📬 FCM Token:', fcmToken.substring(0, 20) + '...');

        // Шаг 5: Настроить listener для обновления токена
        this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
          console.log('[PushIOS] 🔄 FCM Token refreshed:', newToken.substring(0, 20) + '...');
          this.fcmToken = newToken;
          await this.sendTokenToBackend(newToken);
        });

        // Шаг 6: Отправляем FCM токен на бэкенд
        await this.sendTokenToBackend(fcmToken);

        return fcmToken;
      } else {
        // Fallback на expo-notifications если Firebase недоступен
        console.log('[PushIOS] ⚠️ Firebase Messaging not available, falling back to expo-notifications');

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('[PushIOS] ❌ Push notification permission denied');
          return null;
        }

        const apnsTokenData = await Notifications.getDevicePushTokenAsync();
        this.apnsToken = apnsTokenData.data as string;
        console.log('[PushIOS] 📱 APNs Token (fallback):', this.apnsToken.substring(0, 20) + '...');

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

      console.log('[PushIOS] ✅ Token registered successfully on backend');
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
    console.log('[PushIOS] Setting up notification listeners');

    // Listener для входящих уведомлений (когда приложение открыто)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('[PushIOS] ✅ Notification received while app is OPEN:');
        console.log('[PushIOS] Title:', notification.request.content.title);
        console.log('[PushIOS] Body:', notification.request.content.body);
        console.log('[PushIOS] Data:', JSON.stringify(notification.request.content.data));
        onNotificationReceived?.(notification);
      }
    );

    // Listener для нажатий на уведомления
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('[PushIOS] ✅ Notification tapped:');
        console.log('[PushIOS] Action:', response.actionIdentifier);
        console.log('[PushIOS] Title:', response.notification.request.content.title);
        console.log('[PushIOS] Data:', JSON.stringify(response.notification.request.content.data));
        onNotificationResponse?.(response);
      }
    );

    console.log('[PushIOS] Notification listeners registered successfully');
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
    console.log('[PushIOS] Notification listeners removed');
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
      console.log('[PushIOS] No device ID, skipping unregister');
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
      console.log('[PushIOS] ✅ Device unregistered successfully');
    } catch (error) {
      console.error('[PushIOS] ❌ Error unregistering device:', error);
    }
  }
}

export const iosPushNotificationService = IOSPushNotificationService.getInstance();
