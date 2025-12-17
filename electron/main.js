const { app, BrowserWindow, ipcMain, safeStorage, Notification } = require('electron');
const path = require('path');
const url = require('url');
const Store = require('electron-store');
const FileCache = require('./FileCache');

const isDev = process.env.NODE_ENV !== 'production';

let mainWindow;
let splashWindow;
let fileCache;
let secureStore;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    icon: path.join(__dirname, '../assets/images/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  // Remove menu bar
  splashWindow.setMenuBarVisibility(false);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, '../assets/images/icon.png'), // App icon
    frame: false, // Remove default frame for custom titlebar
    titleBarStyle: 'hidden', // Hide titlebar on macOS
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    title: 'Tachyon Messenger',
    show: false, // Don't show until ready
  });

  // Load the app
  if (isDev) {
    // Development: load from Expo dev server
    const devUrl = process.env.EXPO_DEV_SERVER_URL || 'http://localhost:8093';

    console.log('[Electron] Loading URL:', devUrl);

    mainWindow.loadURL(devUrl).catch(err => {
      console.error('[Electron] Failed to load URL:', err);
    });

    // Open DevTools in development
    mainWindow.webContents.openDevTools();

    // Add error handler for renderer process
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Electron] Failed to load:', errorCode, errorDescription);
    });
  } else {
    // Production: load from build folder
    const startUrl = url.format({
      pathname: path.join(__dirname, '../dist/index.html'),
      protocol: 'file:',
      slashes: true,
    });
    mainWindow.loadURL(startUrl);
  }

  // Show window when ready and close splash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Close splash window after main window is shown
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs (security)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation only to localhost in dev or file protocol in production
    if (isDev) {
      if (!parsedUrl.host.includes('localhost')) {
        event.preventDefault();
      }
    } else {
      if (parsedUrl.protocol !== 'file:') {
        event.preventDefault();
      }
    }
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App lifecycle
app.whenReady().then(async () => {
  // Show splash screen first
  createSplashWindow();

  // Initialize services
  fileCache = new FileCache();
  await fileCache.init();

  secureStore = new Store({ name: 'secure-storage' });

  // Setup IPC handlers
  setupIPCHandlers();

  // Create main window (splash will close when main window is ready)
  createWindow();

  // macOS: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Handle app quit
app.on('before-quit', () => {
  // Cleanup logic here if needed
  console.log('[Electron] App is quitting...');
});

// Security: Disable navigation to prevent XSS
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
  });

  contents.on('will-redirect', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// Setup IPC handlers for cache, secure storage, etc.
function setupIPCHandlers() {
  // Cache handlers
  ipcMain.handle('cache:get', async (event, url) => {
    try {
      const filepath = await fileCache.getCachedFile(url);
      return filepath;
    } catch (error) {
      console.error('[IPC] cache:get error:', error);
      return null;
    }
  });

  ipcMain.handle('cache:put', async (event, url, buffer, mimeType) => {
    try {
      const filepath = await fileCache.cacheFile(url, Buffer.from(buffer), mimeType);
      return filepath;
    } catch (error) {
      console.error('[IPC] cache:put error:', error);
      throw error;
    }
  });

  ipcMain.handle('cache:stats', async () => {
    try {
      return await fileCache.getCacheStats();
    } catch (error) {
      console.error('[IPC] cache:stats error:', error);
      return null;
    }
  });

  ipcMain.handle('cache:clear', async () => {
    try {
      await fileCache.clearCache();
      return { success: true };
    } catch (error) {
      console.error('[IPC] cache:clear error:', error);
      throw error;
    }
  });

  // Secure storage handlers (using safeStorage API)
  ipcMain.handle('secure-storage:set', async (event, key, value) => {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(value);
        const buffer = encrypted.toString('base64');
        secureStore.set(key, buffer);
      } else {
        // Fallback to unencrypted storage
        console.warn('[SecureStorage] Encryption not available, storing unencrypted');
        secureStore.set(key, value);
      }
    } catch (error) {
      console.error('[IPC] secure-storage:set error:', error);
      throw error;
    }
  });

  ipcMain.handle('secure-storage:get', async (event, key) => {
    try {
      const stored = secureStore.get(key);

      if (!stored) return null;

      if (safeStorage.isEncryptionAvailable() && typeof stored === 'string' && stored.length > 0) {
        try {
          const encrypted = Buffer.from(stored, 'base64');
          return safeStorage.decryptString(encrypted);
        } catch (decryptError) {
          // Might be unencrypted data from fallback
          console.warn('[SecureStorage] Decryption failed, returning as-is');
          return stored;
        }
      }

      return stored;
    } catch (error) {
      console.error('[IPC] secure-storage:get error:', error);
      return null;
    }
  });

  ipcMain.handle('secure-storage:delete', async (event, key) => {
    try {
      secureStore.delete(key);
    } catch (error) {
      console.error('[IPC] secure-storage:delete error:', error);
      throw error;
    }
  });

  // App info
  ipcMain.handle('app:version', async () => {
    return app.getVersion();
  });

  // Window controls for custom titlebar
  ipcMain.on('window:minimize', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window:close', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  // Notification handlers
  ipcMain.handle('notification:show', async (event, { title, body, data }) => {
    try {
      // Check if notifications are supported
      if (!Notification.isSupported()) {
        console.warn('[Notification] Notifications not supported on this system');
        return { success: false, error: 'Notifications not supported' };
      }

      const notification = new Notification({
        title: title || 'Tachyon Messenger',
        body: body || '',
        icon: path.join(__dirname, '../assets/images/icon.png'),
        silent: false,
        urgency: 'normal', // low, normal, critical
      });

      // Handle notification click
      notification.on('click', () => {
        console.log('[Notification] Notification clicked:', data);

        // Focus the main window
        if (mainWindow) {
          if (mainWindow.isMinimized()) {
            mainWindow.restore();
          }
          mainWindow.focus();

          // Send notification data to renderer for navigation
          mainWindow.webContents.send('notification:clicked', data);
        }
      });

      // Handle notification close
      notification.on('close', () => {
        console.log('[Notification] Notification closed');
      });

      // Show the notification
      notification.show();

      return { success: true };
    } catch (error) {
      console.error('[Notification] Error showing notification:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notification:register', async (event, sessionId) => {
    try {
      // Generate a unique device ID for this Electron installation
      const { machineIdSync } = require('node-machine-id');
      let deviceId;

      try {
        const machineId = machineIdSync();
        deviceId = `electron-${machineId}`;
      } catch (error) {
        // Fallback to random UUID if machine-id fails
        const { randomUUID } = require('crypto');
        deviceId = `electron-${randomUUID()}`;
      }

      console.log('[Notification] Registering device:', deviceId);

      return {
        success: true,
        deviceId,
        platform: process.platform, // 'win32', 'darwin', 'linux'
      };
    } catch (error) {
      console.error('[Notification] Error registering:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notification:unregister', async (event) => {
    try {
      console.log('[Notification] Unregistering device');
      // Cleanup logic if needed
      return { success: true };
    } catch (error) {
      console.error('[Notification] Error unregistering:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('notification:setBadgeCount', async (event, count) => {
    try {
      if (process.platform === 'darwin') {
        // macOS supports badge count
        app.setBadgeCount(count);
        console.log('[Notification] Badge count set to:', count);
      } else if (process.platform === 'win32') {
        // Windows: Set overlay icon (optional)
        // You can implement overlay icon for Windows if needed
        console.log('[Notification] Badge count not supported on Windows');
      }
      return { success: true };
    } catch (error) {
      console.error('[Notification] Error setting badge count:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[IPC] Handlers registered successfully');
}

// Log version info
console.log(`[Electron] Electron v${process.versions.electron}`);
console.log(`[Electron] Node v${process.versions.node}`);
console.log(`[Electron] Chrome v${process.versions.chrome}`);
console.log(`[Electron] Environment: ${isDev ? 'development' : 'production'}`);
