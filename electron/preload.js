const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Platform detection
  platform: process.platform,
  isElectron: true,

  // IPC Communication (will be used for cache, secure storage, etc.)
  ipc: {
    // Generic invoke for future IPC handlers
    invoke: (channel, ...args) => {
      // Whitelist of allowed channels for security
      const validChannels = [
        'cache:get',
        'cache:put',
        'cache:download',
        'cache:stats',
        'cache:videoStats',
        'cache:clearVideos',
        'cache:clear',
        'secure-storage:set',
        'secure-storage:get',
        'secure-storage:delete',
        'window:isMaximized',
        'app:version',
        'notification:show',
        'notification:register',
        'notification:unregister',
        'notification:setBadgeCount',
        'updater:check',
        'updater:getStatus',
        'tray:getCloseBehavior',
        'tray:setCloseBehavior',
      ];

      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, ...args);
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },

    // Send one-way messages to main process
    send: (channel, ...args) => {
      const validChannels = [
        'tray:update',
        'window:focus',
        'window:minimize',
        'window:maximize',
        'window:close',
      ];

      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, ...args);
      } else {
        throw new Error(`Invalid IPC channel: ${channel}`);
      }
    },

    // Listen for messages from main process
    on: (channel, callback) => {
      const validChannels = [
        'notification:clicked',
        'app:update-available',
        'app:update-downloaded',
      ];

      if (validChannels.includes(channel)) {
        const subscription = (_event, ...args) => callback(...args);
        ipcRenderer.on(channel, subscription);

        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }

      throw new Error(`Invalid IPC channel: ${channel}`);
    },
  },

  // Cache API
  cache: {
    get: (url) => ipcRenderer.invoke('cache:get', url),
    put: (url, buffer, mimeType) => ipcRenderer.invoke('cache:put', url, buffer, mimeType),
    download: (url, headers, mimeType) => ipcRenderer.invoke('cache:download', url, headers, mimeType),
    stats: () => ipcRenderer.invoke('cache:stats'),
    videoStats: () => ipcRenderer.invoke('cache:videoStats'),
    clearVideos: () => ipcRenderer.invoke('cache:clearVideos'),
    clear: () => ipcRenderer.invoke('cache:clear'),
  },

  // Secure Storage API
  secureStorage: {
    set: (key, value) => ipcRenderer.invoke('secure-storage:set', key, value),
    get: (key) => ipcRenderer.invoke('secure-storage:get', key),
    delete: (key) => ipcRenderer.invoke('secure-storage:delete', key),
  },

  // App info
  app: {
    getVersion: () => ipcRenderer.invoke('app:version'),
  },

  // Window controls for custom titlebar
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Notification API
  notification: {
    show: (title, body, data) => ipcRenderer.invoke('notification:show', { title, body, data }),
    register: (sessionId) => ipcRenderer.invoke('notification:register', sessionId),
    unregister: () => ipcRenderer.invoke('notification:unregister'),
    setBadgeCount: (count) => ipcRenderer.invoke('notification:setBadgeCount', count),
    onClicked: (callback) => {
      const subscription = (_event, ...args) => callback(...args);
      ipcRenderer.on('notification:clicked', subscription);

      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener('notification:clicked', subscription);
      };
    },
  },

  // Updater API
  updater: {
    /**
     * Check for updates
     * @param {boolean} silent - If true, don't show "no updates" dialog
     * @returns {Promise<{hasUpdate: boolean, version?: string, error?: string}>}
     */
    checkForUpdates: (silent = false) => ipcRenderer.invoke('updater:check', silent),

    /**
     * Get updater status
     * @returns {Promise<{currentVersion: string, lastCheckTime: Date|null, autoCheckEnabled: boolean}>}
     */
    getStatus: () => ipcRenderer.invoke('updater:getStatus'),
  },

  // Tray API
  tray: {
    /**
     * Get close behavior setting
     * @returns {Promise<'minimize' | 'quit' | null>}
     */
    getCloseBehavior: () => ipcRenderer.invoke('tray:getCloseBehavior'),

    /**
     * Set close behavior setting
     * @param {'minimize' | 'quit' | null} behavior - The behavior on window close
     * @returns {Promise<{success: boolean, behavior?: string, error?: string}>}
     */
    setCloseBehavior: (behavior) => ipcRenderer.invoke('tray:setCloseBehavior', behavior),
  },
});

// Log preload script loaded
console.log('[Preload] Preload script loaded successfully');
console.log('[Preload] Platform:', process.platform);
console.log('[Preload] Electron APIs exposed to renderer');
