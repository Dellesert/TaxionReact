/**
 * Platform detection utilities
 */

// Check if running in Electron
export const isElectron = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check for electron API exposed by preload script
  return !!(window as any).electron?.isElectron;
};

// Get Electron API (if available)
export const getElectronAPI = (): any => {
  if (!isElectron()) return null;
  return (window as any).electron;
};

// Platform info
export const getPlatform = (): string => {
  if (isElectron()) {
    const electron = getElectronAPI();
    return electron?.platform || 'unknown';
  }

  if (typeof window !== 'undefined') {
    return 'web';
  }

  return 'unknown';
};
