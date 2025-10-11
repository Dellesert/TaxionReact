/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    console.log('🚀 APP STARTED - VERSION 2.0 - NEW CODE LOADED!');
    console.log('📱 Tachyon Messenger Initializing...');
    // Initialize auth state on app start
    initialize();
  }, [initialize]);

  return <AppNavigator />;
}
