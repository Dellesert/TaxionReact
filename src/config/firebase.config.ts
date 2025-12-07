/**
 * Firebase Configuration for Web Push Notifications
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging } from 'firebase/messaging';
import { Platform } from 'react-native';

// Firebase config - замените на свои значения из Firebase Console
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export function initializeFirebase(): FirebaseApp | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  return app;
}

export function getFirebaseMessaging(): Messaging | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  if (!app) {
    initializeFirebase();
  }

  if (app && !messaging) {
    messaging = getMessaging(app);
  }

  return messaging;
}

export { app, messaging };
