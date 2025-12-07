/**
 * Push Notification Service
 * Сервис для работы с push-уведомлениями через FCM
 */

import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from '@shared/api/axios.config';
import { getFirebaseMessaging } from '@/config/firebase.config';
import { getToken, onMessage, Unsubscribe } from 'firebase/messaging';

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

class PushNotificationService {
  private static instance: PushNotificationService;
  private devicePushToken: string | null = null;
  private deviceId: string | null = null;
  private notificationListener: EventSubscription | null = null;
  private responseListener: EventSubscription | null = null;
  private webMessageUnsubscribe: Unsubscribe | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Запросить разрешение и зарегистрировать устройство для push-уведомлений
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Для web используем Firebase Cloud Messaging
    if (Platform.OS === 'web') {
      return this.registerForWebPushNotifications();
    }

    // Проверяем, что это физическое устройство
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Проверяем текущие разрешения
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Если разрешения нет, запрашиваем
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    try {
      // Получаем Device Push Token (APNs token для iOS, FCM token для Android)
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const token = tokenData.data as string;
      this.devicePushToken = token;

      console.log('Device Push Token:', token);

      // Отправляем токен на бэкенд
      await this.sendTokenToBackend(token);

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  /**
   * Регистрация web push через Firebase Cloud Messaging
   */
  private async registerForWebPushNotifications(): Promise<string | null> {
    try {
      // Запрашиваем разрешение на уведомления
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Web push notification permission denied');
        return null;
      }

      const messaging = getFirebaseMessaging();
      if (!messaging) {
        console.error('Firebase messaging not initialized');
        return null;
      }

      // Регистрируем service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered:', registration);

      // Получаем FCM токен
      const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.devicePushToken = token;
        console.log('Web FCM Token:', token);

        // Отправляем токен на бэкенд
        await this.sendTokenToBackend(token);

        return token;
      } else {
        console.log('No FCM token available');
        return null;
      }
    } catch (error) {
      console.error('Error getting web push token:', error);
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
        platform: Platform.OS,
      });

      // Сохраняем ID устройства для последующего удаления
      if (response.data?.id) {
        this.deviceId = response.data.id;
      }

      console.log('Push token registered successfully');
    } catch (error) {
      console.error('Error sending push token to backend:', error);
    }
  }

  /**
   * Подписаться на уведомления
   */
  setupNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
  ): void {
    // Для web используем Firebase onMessage
    if (Platform.OS === 'web') {
      this.setupWebNotificationListeners(onNotificationReceived);
      return;
    }

    // Listener для входящих уведомлений (когда приложение открыто)
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    // Listener для нажатий на уведомления
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        onNotificationResponse?.(response);
      }
    );
  }

  /**
   * Настройка web listeners через Firebase
   */
  private setupWebNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void
  ): void {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    this.webMessageUnsubscribe = onMessage(messaging, (payload) => {
      console.log('Web notification received:', payload);

      // Показываем нативное уведомление браузера (для foreground)
      if (payload.notification && Notification.permission === 'granted') {
        const { title, body } = payload.notification;
        if (title) {
          try {
            const notification = new Notification(title, {
              body: body || '',
              icon: '/favicon.ico',
              tag: payload.messageId || 'default',
              requireInteraction: true,
            });

            notification.onclick = () => {
              window.focus();
              notification.close();
            };

            console.log('Browser notification shown');
          } catch (error) {
            console.error('Error showing notification:', error);
          }
        }
      }

      // Конвертируем Firebase payload в формат expo-notifications
      if (onNotificationReceived && payload.notification) {
        const notification = {
          date: Date.now(),
          request: {
            identifier: payload.messageId || String(Date.now()),
            content: {
              title: payload.notification.title || null,
              body: payload.notification.body || null,
              data: payload.data || {},
            },
            trigger: null,
          },
        } as Notifications.Notification;

        onNotificationReceived(notification);
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
    if (this.webMessageUnsubscribe) {
      this.webMessageUnsubscribe();
      this.webMessageUnsubscribe = null;
    }
  }

  /**
   * Получить текущий токен
   */
  getToken(): string | null {
    return this.devicePushToken;
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
    if (!this.deviceId) return;

    try {
      await api.delete(`/devices/${this.deviceId}`);

      this.devicePushToken = null;
      this.deviceId = null;
      console.log('Device unregistered from push notifications');
    } catch (error) {
      console.error('Error unregistering device:', error);
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
