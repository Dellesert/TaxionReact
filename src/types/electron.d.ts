/**
 * Type definitions for Electron API exposed via contextBridge
 */

interface ElectronAPI {
  platform: string;
  isElectron: true;

  ipc: {
    invoke: (channel: string, ...args: any[]) => Promise<any>;
    send: (channel: string, ...args: any[]) => void;
    on: (channel: string, callback: (...args: any[]) => void) => () => void;
  };

  cache: {
    get: (url: string) => Promise<string | null>;
    put: (url: string, buffer: ArrayBuffer, mimeType: string) => Promise<string>;
    stats: () => Promise<{ totalSize: number; fileCount: number }>;
    clear: () => Promise<{ success: boolean }>;
  };

  secureStorage: {
    set: (key: string, value: string) => Promise<void>;
    get: (key: string) => Promise<string | null>;
    delete: (key: string) => Promise<void>;
  };

  app: {
    getVersion: () => Promise<string>;
  };

  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
