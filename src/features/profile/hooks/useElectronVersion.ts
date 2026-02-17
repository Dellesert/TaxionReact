/**
 * Hook for getting version from Electron
 * Загружает версию приложения из Electron main process
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';

// Check if running in Electron
const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;

interface ElectronVersionState {
  version: string;
  build: string;
  isLoading: boolean;
}

/**
 * Hook to get app version, with special handling for Electron
 * Returns version and build number from:
 * - Native app (iOS/Android): expo-application
 * - Electron: IPC call to main process
 * - Web: expo-constants
 */
export function useElectronVersion(): ElectronVersionState {
  const [state, setState] = useState<ElectronVersionState>(() => {
    // Initial state based on platform
    if (isElectron) {
      return { version: '...', build: '...', isLoading: true };
    }

    // Native or web fallback
    const version = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '1.0.0';
    const build = Platform.OS === 'web'
      ? String(Constants.expoConfig?.ios?.buildNumber ?? Constants.expoConfig?.android?.versionCode ?? '1')
      : Application.nativeBuildVersion ?? '1';

    return { version, build, isLoading: false };
  });

  useEffect(() => {
    if (!isElectron) return;

    const loadElectronVersion = async () => {
      try {
        const electron = (window as any).electron;

        // Get status from updater which includes version and build
        const status = await electron.updater.getStatus();

        setState({
          version: status.currentVersion || '1.0.0',
          build: String(status.currentBuildNumber || '1'),
          isLoading: false,
        });
      } catch (error) {
        console.error('[useElectronVersion] Failed to get version:', error);

        // Fallback to app:version
        try {
          const electron = (window as any).electron;
          const version = await electron.app.getVersion();

          setState({
            version: version || '1.0.0',
            build: '1',
            isLoading: false,
          });
        } catch {
          setState({
            version: '1.0.0',
            build: '1',
            isLoading: false,
          });
        }
      }
    };

    loadElectronVersion();
  }, []);

  return state;
}
