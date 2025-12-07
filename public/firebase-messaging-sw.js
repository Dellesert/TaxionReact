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

  const notificationTitle = payload.notification?.title || 'Новое сообщение';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/assets/images/icon.png',
    badge: '/assets/images/icon.png',
    data: payload.data,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  event.notification.close();

  // Открываем приложение при клике на уведомление
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Если окно уже открыто, фокусируемся на нём
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Иначе открываем новое окно
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
