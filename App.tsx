/**
 * App.tsx
 * Главный файл приложения Tachyon Messenger
 */

import './global.css';
import React, { useEffect } from 'react';
import { LogBox, AppState, AppStateStatus } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuthStore } from './src/store/authStore';
import { useThemeStore } from './src/store/themeStore';
import { websocketService } from './src/services/websocket.service';
import { tokenRefreshService } from './src/services/tokenRefresh.service';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

export default function App() {
  const initialize = useAuthStore((state) => state.initialize);
  const loadTheme = useThemeStore((state) => state.loadTheme);
  const initSystemThemeListener = useThemeStore((state) => state.initSystemThemeListener);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    // Initialize auth state and theme on app start
    initialize();
    loadTheme();

    // Initialize system theme listener
    const subscription = initSystemThemeListener();

    return () => {
      // Cleanup listener on unmount
      subscription?.remove();
    };
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

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);

      if (nextAppState === 'active' && isAuthenticated) {
        console.log('📱 App became active, checking token validity...');
        // When app comes to foreground, check and refresh token if needed
        await tokenRefreshService.start();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
