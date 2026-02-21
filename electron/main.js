const { app, BrowserWindow, ipcMain, safeStorage, Notification, protocol, net, session, Menu, Tray, dialog, nativeImage } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const Store = require('electron-store');
const FileCache = require('./FileCache');
const { AppUpdater, getAppInfo } = require('./updater');

const isDev = !app.isPackaged;

// Allow video autoplay without user gesture (Chromium blocks it by default)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Set AppUserModelId for Windows notifications
// This is required for notifications to work properly on Windows
if (process.platform === 'win32') {
  app.setAppUserModelId('com.dellesert.tachyon-messenger');
}

// Single instance lock - prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the first instance, handle second-instance event
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      if (!mainWindow.isVisible()) {
        mainWindow.show();
      }
      mainWindow.focus();
    }
  });
}

// Tray instance
let tray = null;

// Store for app settings (close behavior, etc.)
const appSettingsStore = new Store({ name: 'app-settings' });

// Close behavior options: 'minimize' | 'quit' | null (not set yet)
function getCloseBehavior() {
  return appSettingsStore.get('closeBehavior', null);
}

function setCloseBehavior(behavior) {
  appSettingsStore.set('closeBehavior', behavior);
}

// Flag to track if we're really quitting
let isQuitting = false;

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

// Get tray icon path (smaller version for tray)
const getTrayIconPath = () => {
  // Use the same icon for tray, electron will resize it
  return getIconPath();
};

// Get tray icon - use white version if available, otherwise use regular icon
function getTrayIcon() {
  // Try to load white tray icon first
  const whiteTrayIconPaths = [
    // Dev paths
    path.join(__dirname, 'resources', 'tray-icon-white.png'),
    path.join(__dirname, '..', 'assets', 'images', 'tray-icon-white.png'),
    // Production paths
    path.join(process.resourcesPath || '', 'tray-icon-white.png'),
  ];

  for (const iconPath of whiteTrayIconPaths) {
    try {
      if (fs.existsSync(iconPath)) {
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          return icon;
        }
      }
    } catch (e) {
      // Continue to next path
    }
  }

  // Fallback to regular icon
  return nativeImage.createFromPath(getIconPath());
}

// Create system tray
function createTray() {
  if (tray) return;

  let trayIcon;

  try {
    trayIcon = getTrayIcon();

    // Resize for tray (16x16 on Windows, 22x22 on macOS, 24x24 on Linux)
    if (process.platform === 'win32') {
      trayIcon = trayIcon.resize({ width: 14, height: 14 });
    } else if (process.platform === 'darwin') {
      trayIcon = trayIcon.resize({ width: 16, height: 16 });
      // macOS: Set as template image for automatic dark/light mode adaptation
      trayIcon.setTemplateImage(true);
    } else {
      trayIcon = trayIcon.resize({ width: 24, height: 24 });
    }
  } catch (error) {
    console.error('[Tray] Failed to load tray icon:', error);
    return;
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Tachyon Messenger');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть Tachyon',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Double-click on tray icon opens the app
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

}

// Show dialog asking user what to do on close
async function showCloseDialog() {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['Свернуть в трей', 'Закрыть приложение', 'Отмена'],
    defaultId: 0,
    cancelId: 2,
    title: 'Закрытие приложения',
    message: 'Что сделать при закрытии окна?',
    detail: 'Вы можете изменить это поведение в настройках приложения.',
    checkboxLabel: 'Запомнить мой выбор',
    checkboxChecked: true,
  });

  return {
    action: result.response === 0 ? 'minimize' : result.response === 1 ? 'quit' : 'cancel',
    remember: result.checkboxChecked,
  };
}

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

  // Save window state on resize and move
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);

  // Handle window close - minimize to tray or quit based on user preference
  mainWindow.on('close', async (event) => {
    saveWindowState();

    // If we're really quitting, allow the close
    if (isQuitting) {
      return;
    }

    // Check user's close behavior preference
    const closeBehavior = getCloseBehavior();

    if (closeBehavior === 'minimize') {
      // User chose to minimize to tray
      event.preventDefault();
      mainWindow.hide();
    } else if (closeBehavior === 'quit') {
      // User chose to quit - allow normal close
      isQuitting = true;
    } else {
      // First time - show dialog
      event.preventDefault();

      const result = await showCloseDialog();

      if (result.action === 'cancel') {
        // User cancelled, do nothing
        return;
      }

      if (result.remember) {
        setCloseBehavior(result.action);
      }

      if (result.action === 'minimize') {
        mainWindow.hide();
      } else {
        isQuitting = true;
        mainWindow.close();
      }
    }
  });

  // Load the app
  if (isDev) {
    // Development: load from Expo dev server
    const devUrl = process.env.EXPO_DEV_SERVER_URL || 'http://localhost:8093';


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
  // Disable proxy to avoid ERR_PROXY_CONNECTION_FAILED
  // This must be done for both dev and production
  session.defaultSession.setProxy({ mode: 'direct' });

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

  // Create system tray
  createTray();

  // Create main window (splash will close when main window is ready)
  createWindow();

  // macOS: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed (except on macOS and when minimizing to tray)
app.on('window-all-closed', () => {
  // On macOS, keep the app running in the dock
  // On other platforms, if we have a tray and user prefers minimize, keep running
  if (process.platform === 'darwin') {
    return;
  }

  // If tray exists and we're not actually quitting, keep the app running
  if (tray && !isQuitting) {
    return;
  }

  app.quit();
});

// Handle app quit
app.on('before-quit', () => {
  isQuitting = true;

  // Destroy tray on quit
  if (tray) {
    tray.destroy();
    tray = null;
  }
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

  ipcMain.handle('cache:download', async (event, url, headers, mimeType) => {
    try {
      const filepath = await fileCache.downloadAndCache(url, headers || {}, mimeType);
      return filepath;
    } catch (error) {
      console.error('[IPC] cache:download error:', error);
      return null;
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

  ipcMain.handle('cache:videoStats', async () => {
    try {
      return await fileCache.getStatsByMimePrefix('video/');
    } catch (error) {
      console.error('[IPC] cache:videoStats error:', error);
      return { totalSize: 0, fileCount: 0 };
    }
  });

  ipcMain.handle('cache:clearVideos', async () => {
    try {
      return await fileCache.clearByMimePrefix('video/');
    } catch (error) {
      console.error('[IPC] cache:clearVideos error:', error);
      return { cleared: 0 };
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

  // File save handler - allows saving a cached file to user-chosen location
  ipcMain.handle('file:save', async (event, sourcePath, defaultFilename) => {
    try {
      const ext = path.extname(defaultFilename).replace('.', '').toLowerCase();
      const filterName = { jpg: 'Images', jpeg: 'Images', png: 'Images', gif: 'Images', webp: 'Images', mp4: 'Videos', mov: 'Videos', avi: 'Videos' }[ext] || 'Files';
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFilename,
        filters: [{ name: filterName, extensions: [ext] }],
      });
      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }
      await fs.promises.copyFile(sourcePath, result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (error) {
      console.error('[IPC] file:save error:', error);
      return { success: false, error: error.message };
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

  ipcMain.on('window:setFullScreen', (event, isFullScreen) => {
    if (mainWindow) {
      mainWindow.setFullScreen(!!isFullScreen);
    }
  });

  ipcMain.handle('window:isFullScreen', () => {
    return mainWindow ? mainWindow.isFullScreen() : false;
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
      } else if (process.platform === 'win32') {
        // Windows: Set overlay icon (optional)
        // You can implement overlay icon for Windows if needed
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
      // Get version from package.json even before updater is initialized
      const appInfo = getAppInfo();
      return {
        currentVersion: appInfo.version,
        currentBuildNumber: appInfo.buildNumber,
        lastCheckTime: null,
        autoCheckEnabled: false,
      };
    }
    return updater.getStatus();
  });

  // Tray settings handlers
  ipcMain.handle('tray:getCloseBehavior', async () => {
    return getCloseBehavior();
  });

  ipcMain.handle('tray:setCloseBehavior', async (event, behavior) => {
    try {
      if (behavior !== 'minimize' && behavior !== 'quit' && behavior !== null) {
        throw new Error('Invalid close behavior');
      }
      setCloseBehavior(behavior);
      return { success: true, behavior };
    } catch (error) {
      console.error('[Tray] Error setting close behavior:', error);
      return { success: false, error: error.message };
    }
  });

}

// Log version info
