// Firebase Messaging Service Worker for Web Push Notifications
// Этот файл должен находиться в корне public директории

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
  apiKey: 'AIzaSyD7T84B5n5Z-V0ZY4_eOR06-UgOwjRMeGQ',
  authDomain: 'taxion-476e8.firebaseapp.com',
  projectId: 'taxion-476e8',
  storageBucket: 'taxion-476e8.firebasestorage.app',
  messagingSenderId: '378420589940',
  appId: '1:378420589940:web:254ae1e7ea0d5bf5d0e821',
});

const messaging = firebase.messaging();

// Обработка фоновых сообщений
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  console.log('[firebase-messaging-sw.js] Background message data:', payload.data);

  const notificationTitle = payload.notification?.title || 'Новое сообщение';

  // Используем аватар отправителя как иконку уведомления
  const senderAvatar = payload.data?.sender_avatar;
  const notificationIcon = senderAvatar || '/assets/images/icon.png';

  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: notificationIcon,
    badge: '/assets/images/icon.png',
    data: payload.data, // Данные передаются в notification
    requireInteraction: true, // Уведомление не исчезает автоматически
    tag: payload.messageId || 'default', // Группировка уведомлений
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  console.log('[firebase-messaging-sw.js] Notification data:', event.notification.data);

  event.notification.close();

  // Получаем данные из уведомления
  const notificationData = event.notification.data || {};
  const type = notificationData.type;

  // Формируем URL на основе типа уведомления
  let targetUrl = '/';

  if (type && notificationData) {
    // Используем ту же логику что и в notificationFormatters.ts
    if (type === 'message' && notificationData.chat_id) {
      targetUrl = `/?screen=Chat&chatId=${notificationData.chat_id}`;
    } else if (type === 'task' && notificationData.task_id) {
      targetUrl = `/?screen=Tasks&taskId=${notificationData.task_id}`;
    } else if (type === 'reminder') {
      // Напоминание о событии
      if (notificationData.event_id) {
        targetUrl = `/?screen=Calendar&eventId=${notificationData.event_id}`;
      }
      // Напоминание о задаче
      else if (notificationData.task_id) {
        targetUrl = `/?screen=Tasks&taskId=${notificationData.task_id}`;
      }
      // Групповые напоминания о задачах
      else if (notificationData.task_ids) {
        targetUrl = `/?screen=Tasks`;
      }
    } else if (type === 'event' && notificationData.event_id) {
      targetUrl = `/?screen=Calendar&eventId=${notificationData.event_id}`;
    } else if (type === 'poll' && notificationData.poll_id) {
      targetUrl = `/?screen=Polls&pollId=${notificationData.poll_id}`;
    } else if (type === 'mention' && notificationData.chat_id) {
      targetUrl = `/?screen=Chat&chatId=${notificationData.chat_id}`;
    } else if (type === 'reaction' && notificationData.chat_id) {
      targetUrl = `/?screen=Chat&chatId=${notificationData.chat_id}`;
    }
  }

  console.log('[firebase-messaging-sw.js] Target URL:', targetUrl);

  // Открываем приложение при клике на уведомление
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если окно уже открыто, фокусируемся на нём и отправляем сообщение для навигации
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          // Отправляем сообщение в клиент для обработки навигации
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: notificationData,
            url: targetUrl,
          });
          return client;
        }
      }
      // Иначе открываем новое окно с нужным URL
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
