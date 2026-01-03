const { app, BrowserWindow, ipcMain, safeStorage, Notification, protocol, net, session, Menu } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const Store = require('electron-store');
const FileCache = require('./FileCache');
const { AppUpdater } = require('./updater');

const isDev = !app.isPackaged;

// Suppress console in production to avoid console window
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

if (!isDev) {
  console.log = () => {};
  console.error = () => {};
  console.warn = () => {};
}

// Get the dist path for production
// In packaged app, dist is in the same directory as main.js inside asar
const getDistPath = () => {
  if (isDev) {
    return path.join(__dirname, '../dist');
  }
  return path.join(__dirname, 'dist');
};

// Get icon path - different for dev vs production
const getIconPath = () => {
  if (isDev) {
    return path.join(__dirname, '../assets/images/icon.png');
  } else {
    // In production, use the icon from resources folder
    // Windows needs .ico, other platforms use .png
    if (process.platform === 'win32') {
      return path.join(process.resourcesPath, 'icon.ico');
    }
    return path.join(process.resourcesPath, 'assets/images/icon_alpha.png');
  }
};

let mainWindow;
let splashWindow;
let fileCache;
let secureStore;
let updater;

// Store for window state (size, position)
const windowStateStore = new Store({ name: 'window-state' });

function getWindowState() {
  const defaults = {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false,
  };

  const state = windowStateStore.get('windowState', defaults);

  // Validate that the window is within screen bounds
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();

  // Check if saved position is on any display
  if (state.x !== undefined && state.y !== undefined) {
    const isOnScreen = displays.some(display => {
      const { x, y, width, height } = display.bounds;
      return (
        state.x >= x &&
        state.x < x + width &&
        state.y >= y &&
        state.y < y + height
      );
    });

    if (!isOnScreen) {
      // Reset to center if off-screen
      state.x = undefined;
      state.y = undefined;
    }
  }

  return state;
}

function saveWindowState() {
  if (!mainWindow) return;

  const isMaximized = mainWindow.isMaximized();

  // Don't save bounds if maximized (save the restored bounds instead)
  if (!isMaximized) {
    const bounds = mainWindow.getBounds();
    windowStateStore.set('windowState', {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: false,
    });
  } else {
    // Just update the maximized flag, keep previous bounds
    const current = windowStateStore.get('windowState', {});
    windowStateStore.set('windowState', {
      ...current,
      isMaximized: true,
    });
  }
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    icon: getIconPath(),
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
  const windowState = getWindowState();

  mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 800,
    minHeight: 600,
    icon: getIconPath(), // App icon
    frame: false, // Remove default frame for custom titlebar
    titleBarStyle: 'hiddenInset', // Hide titlebar on macOS
    trafficLightPosition: { x: -100, y: -100 }, // Hide traffic lights (close/minimize/maximize buttons)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: false, // Disable web security to avoid CORS with app:// protocol
    },
    title: 'Tachyon Messenger',
    show: false, // Don't show until ready
  });

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Save window state on resize, move, and close
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('close', saveWindowState);

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
    // Production: load using app:// protocol
    console.log('[Electron] Loading production with app:// protocol');

    mainWindow.loadURL('app://local/index.html').catch(err => {
      console.error('[Electron] Failed to load:', err);
    });

    // Add error handler for renderer process in production too
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('[Electron] Failed to load:', errorCode, errorDescription);
    });
  }

  // Show window when ready and close splash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Close splash window after main window is shown
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }

    // Initialize updater and start auto-check
    updater = new AppUpdater(mainWindow);
    updater.startAutoCheck();
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

// Register custom protocol scheme before app is ready (MUST be before app.whenReady)
if (!isDev) {
  protocol.registerSchemesAsPrivileged([{
    scheme: 'app',
    privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true }
  }]);
}

// App lifecycle
app.whenReady().then(async () => {
  // Register custom protocol handler for production
  if (!isDev) {
    // MIME types map
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.ttf': 'font/ttf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
    };

    protocol.handle('app', (request) => {
      const requestUrl = new URL(request.url);
      const distPath = getDistPath();
      let filePath = path.join(distPath, decodeURIComponent(requestUrl.pathname));
      let ext = path.extname(filePath).toLowerCase();

      // Check if file exists
      let fileExists = false;
      try {
        fs.accessSync(filePath);
        fileExists = true;
      } catch (e) {
        fileExists = false;
      }

      // SPA fallback: if no extension and file doesn't exist, serve index.html
      if (!fileExists && (!ext || ext === '')) {
        filePath = path.join(distPath, 'index.html');
        ext = '.html';
      }

      try {
        const data = fs.readFileSync(filePath);
        const mimeType = mimeTypes[ext] || 'application/octet-stream';

        return new Response(data, {
          status: 200,
          headers: { 'Content-Type': mimeType }
        });
      } catch (err) {
        console.error('[Protocol] Read error:', err.message);
        return new Response('Not Found', { status: 404 });
      }
    });
  }

  // Disable CORS for API requests in production
  if (!isDev) {
    // Disable proxy to avoid ERR_PROXY_CONNECTION_FAILED
    session.defaultSession.setProxy({ mode: 'direct' });

    session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
      // Remove origin header for external API requests to avoid CORS preflight
      if (!details.url.startsWith('app://')) {
        delete details.requestHeaders['Origin'];
      }
      callback({ requestHeaders: details.requestHeaders });
    });

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // Add CORS headers to responses
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Access-Control-Allow-Origin': ['*'],
          'Access-Control-Allow-Headers': ['*'],
          'Access-Control-Allow-Methods': ['*'],
        }
      });
    });
  }

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
        icon: getIconPath(),
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

  // Updater handlers
  ipcMain.handle('updater:check', async (event, silent = false) => {
    try {
      if (!updater) {
        // Create updater if not exists (for dev mode manual check)
        updater = new AppUpdater(mainWindow);
      }
      const result = await updater.checkForUpdates(silent);
      return result;
    } catch (error) {
      console.error('[Updater] Error in IPC handler:', error);
      return { hasUpdate: false, error: error.message };
    }
  });

  ipcMain.handle('updater:getStatus', async () => {
    if (!updater) {
      return {
        currentVersion: app.getVersion(),
        lastCheckTime: null,
        autoCheckEnabled: false,
      };
    }
    return updater.getStatus();
  });

  console.log('[IPC] Handlers registered successfully');
}

// Log version info
console.log(`[Electron] Electron v${process.versions.electron}`);
console.log(`[Electron] Node v${process.versions.node}`);
console.log(`[Electron] Chrome v${process.versions.chrome}`);
console.log(`[Electron] Environment: ${isDev ? 'development' : 'production'}`);
