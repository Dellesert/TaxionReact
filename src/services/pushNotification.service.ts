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
import { iosPushNotificationService } from './pushNotificationIOS.service';
import { isElectron } from '@shared/utils/platform';
import { electronPushNotificationService } from './pushNotificationElectron.service';
import { NOTIFICATION_CHANNELS } from '@shared/constants/app.constants';

// Настройка обработки уведомлений (не для Electron - там нет expo-notifications)
if (!isElectron()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Создание Android Notification Channels
 * Соответствует типам уведомлений с бэкенда
 */
async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    // 1. Messages - высокий приоритет, звук
    await Notifications.setNotificationChannelAsync('messages', {
      name: NOTIFICATION_CHANNELS.messages.name,
      description: NOTIFICATION_CHANNELS.messages.description,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 250, 250],
      showBadge: true,
      enableLights: true,
      lightColor: NOTIFICATION_CHANNELS.messages.lightColor,
    });

    // 2. Tasks - средний приоритет
    await Notifications.setNotificationChannelAsync('tasks', {
      name: NOTIFICATION_CHANNELS.tasks.name,
      description: NOTIFICATION_CHANNELS.tasks.description,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 200, 200],
      showBadge: true,
    });

    // 3. Calendar - высокий приоритет (важные события)
    await Notifications.setNotificationChannelAsync('calendar', {
      name: NOTIFICATION_CHANNELS.calendar.name,
      description: NOTIFICATION_CHANNELS.calendar.description,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 300, 200, 300],
      showBadge: true,
      enableLights: true,
      lightColor: NOTIFICATION_CHANNELS.calendar.lightColor,
    });

    // 4. Mentions - высокий приоритет
    await Notifications.setNotificationChannelAsync('mentions', {
      name: NOTIFICATION_CHANNELS.mentions.name,
      description: NOTIFICATION_CHANNELS.mentions.description,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 250, 100, 250],
      showBadge: true,
      enableLights: true,
      lightColor: NOTIFICATION_CHANNELS.mentions.lightColor,
    });

    // 5. Reminders - высокий приоритет (критичные напоминания)
    await Notifications.setNotificationChannelAsync('reminders', {
      name: NOTIFICATION_CHANNELS.reminders.name,
      description: NOTIFICATION_CHANNELS.reminders.description,
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      enableVibrate: true,
      vibrationPattern: [0, 400, 200, 400],
      showBadge: true,
      enableLights: true,
      lightColor: NOTIFICATION_CHANNELS.reminders.lightColor,
    });

    // 6. Polls - средний приоритет
    await Notifications.setNotificationChannelAsync('polls', {
      name: NOTIFICATION_CHANNELS.polls.name,
      description: NOTIFICATION_CHANNELS.polls.description,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

    // 7. System - средний приоритет
    await Notifications.setNotificationChannelAsync('system', {
      name: NOTIFICATION_CHANNELS.system.name,
      description: NOTIFICATION_CHANNELS.system.description,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      showBadge: false,
    });

    // 8. Announcements - средний приоритет
    await Notifications.setNotificationChannelAsync('announcements', {
      name: NOTIFICATION_CHANNELS.announcements.name,
      description: NOTIFICATION_CHANNELS.announcements.description,
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });

  } catch (error) {
    console.error('[Push] Error creating notification channels:', error);
  }
}

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

    // Для Electron используем специальный сервис с нативными уведомлениями
    if (isElectron()) {
      return electronPushNotificationService.registerForPushNotifications();
    }

    // Для iOS используем специальный сервис с поддержкой Firebase FCM
    if (Platform.OS === 'ios') {
      return iosPushNotificationService.registerForPushNotifications();
    }

    // Для web используем Firebase Cloud Messaging
    if (Platform.OS === 'web') {
      return this.registerForWebPushNotifications();
    }

    // Для Android используем стандартный Expo Notifications (FCM токен)

    // Создаем Android Notification Channels перед регистрацией
    await setupAndroidNotificationChannels();

    // Проверяем, что это физическое устройство
    if (!Device.isDevice) {
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
      return null;
    }

    try {
      // Получаем Device Push Token (FCM token для Android)
      const tokenData = await Notifications.getDevicePushTokenAsync();
      const token = tokenData.data as string;
      this.devicePushToken = token;


      // Отправляем токен на бэкенд
      await this.sendTokenToBackend(token);

      return token;
    } catch (error) {
      console.error('[Push] Error getting push token:', error);
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
        return null;
      }

      const messaging = getFirebaseMessaging();
      if (!messaging) {
        console.error('Firebase messaging not initialized');
        return null;
      }

      // Регистрируем service worker
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

      // Получаем FCM токен
      const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
      const token = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration: registration,
      });

      if (token) {
        this.devicePushToken = token;

        // Отправляем токен на бэкенд
        await this.sendTokenToBackend(token);

        return token;
      } else {
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

    // Для iOS используем специальный сервис
    if (Platform.OS === 'ios') {
      iosPushNotificationService.setupNotificationListeners(
        onNotificationReceived,
        onNotificationResponse
      );
      return;
    }

    // Для web используем Firebase onMessage
    if (Platform.OS === 'web') {
      this.setupWebNotificationListeners(onNotificationReceived);
      return;
    }

    // Для Android используем стандартные Expo Notifications listeners

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
   * Настройка web listeners через Firebase
   */
  private setupWebNotificationListeners(
    onNotificationReceived?: (notification: Notifications.Notification) => void
  ): void {
    const messaging = getFirebaseMessaging();
    if (!messaging) return;

    this.webMessageUnsubscribe = onMessage(messaging, (payload) => {

      // Показываем нативное уведомление браузера (для foreground)
      if (payload.notification && Notification.permission === 'granted') {
        const { title, body } = payload.notification;
        if (title) {
          try {
            // Используем аватар отправителя как иконку уведомления
            const senderAvatar = payload.data?.sender_avatar as string | undefined;
            const notificationIcon = senderAvatar || '/favicon.ico';

            const notification = new Notification(title, {
              body: body || '',
              icon: notificationIcon,
              tag: payload.messageId || 'default',
              requireInteraction: true,
              data: payload.data, // Передаем данные в notification
            });

            notification.onclick = () => {
              window.focus();
              notification.close();

              // Отправляем сообщение для навигации
              if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                // Отправляем сообщение в главное окно через broadcast
                const notificationData = payload.data || {};
                window.postMessage({
                  type: 'NOTIFICATION_CLICK',
                  data: notificationData,
                }, window.location.origin);
              }
            };

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
    // Для iOS используем специальный сервис
    if (Platform.OS === 'ios') {
      iosPushNotificationService.removeNotificationListeners();
      return;
    }

    // Для остальных платформ
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
    // Для Electron используем специальный метод
    if (isElectron()) {
      await electronPushNotificationService.setBadgeCount(count);
      return;
    }

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
    // Для Electron используем специальный сервис
    if (isElectron()) {
      await electronPushNotificationService.unregister();
      return;
    }

    // Для iOS используем специальный сервис
    if (Platform.OS === 'ios') {
      await iosPushNotificationService.unregisterDevice();
      return;
    }

    // Для остальных платформ
    if (!this.deviceId) return;

    try {
      await api.delete(`/devices/${this.deviceId}`);

      this.devicePushToken = null;
      this.deviceId = null;
    } catch (error) {
      console.error('Error unregistering device:', error);
    }
  }
}

export const pushNotificationService = PushNotificationService.getInstance();

// Экспортируем функцию для инициализации каналов
export { setupAndroidNotificationChannels };
