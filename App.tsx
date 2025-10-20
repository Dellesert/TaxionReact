/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect } from 'react';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { websocketService } from './src/services/websocket.service';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Initialize auth state and theme on app start
    initialize();
    loadTheme();
  }, []);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isAuthenticated) {
      websocketService.connect();
    } else {
      websocketService.disconnect();
    }

    // Cleanup on unmount
    return () => {
      websocketService.disconnect();
    };
  }, [isAuthenticated]);

  return <AppNavigator />;
}
