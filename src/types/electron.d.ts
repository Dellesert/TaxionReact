/**
 * Type definitions for Electron API exposed via contextBridge
 */

export interface NotificationData {
  screen?: 'Chat' | 'Task' | 'Poll' | 'Calendar';
  chatId?: number;
  taskId?: number;
  pollId?: number;
  eventId?: number;
  [key: string]: any;
}

export interface NotificationResponse {
  success: boolean;
  error?: string;
}

export interface NotificationRegisterResponse extends NotificationResponse {
  deviceId?: string;
  platform?: string;
}

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

  // Notification API
  notification: {
    show: (title: string, body: string, data?: NotificationData) => Promise<NotificationResponse>;
    register: (sessionId?: string) => Promise<NotificationRegisterResponse>;
    unregister: () => Promise<NotificationResponse>;
    setBadgeCount: (count: number) => Promise<NotificationResponse>;
    onClicked: (callback: (data: NotificationData) => void) => () => void;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};
