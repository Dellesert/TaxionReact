/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { websocketService } from './src/services/websocket.service';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    console.log('🚀 APP STARTED - VERSION 3.0 - FIXED INFINITE LOOP!');
    console.log('📱 Tachyon Messenger Initializing...');
    // Initialize auth state on app start
    initialize();
  }, []);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔌 User authenticated, connecting WebSocket...');
      websocketService.connect();
    } else {
      console.log('🔌 User not authenticated, disconnecting WebSocket...');
      websocketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated]);

  return <AppNavigator />;
}
