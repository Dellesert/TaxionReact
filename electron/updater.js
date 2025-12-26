const { app, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const API_BASE_URL = 'https://taxion.fusioninsight.cloud';
const UPDATE_CHECK_URL = `${API_BASE_URL}/api/v1/app-versions/latest/windows`;
const DOWNLOAD_URL = `${API_BASE_URL}/downloads/windows/latest`;
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

/**
 * Get app version from electron/package.json
 * In dev mode, app.getVersion() returns Electron version, not app version
 */
function getAppVersion() {
  try {
    // Try to read from electron/package.json
    const isDev = !app.isPackaged;
    let packagePath;

    if (isDev) {
      // In development, read from electron/package.json directly
      packagePath = path.join(__dirname, 'package.json');
    } else {
      // In production, the package.json is in the app directory
      packagePath = path.join(app.getAppPath(), 'package.json');
    }

    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (packageJson.version) {
        console.log('[Updater] Got version from package.json:', packageJson.version);
        return packageJson.version;
      }
    }
  } catch (error) {
    console.error('[Updater] Error reading package.json:', error);
  }

  // Fallback to app.getVersion() (works correctly in production)
  const version = app.getVersion();
  console.log('[Updater] Fallback to app.getVersion():', version);
  return version;
}

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.currentVersion = getAppVersion();
    this.checkIntervalId = null;
    this.lastCheckTime = null;
  }

  /**
   * Compare semantic versions
   * Returns true if latest > current
   */
  isNewerVersion(latest, current) {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const latestPart = latestParts[i] || 0;
      const currentPart = currentParts[i] || 0;

      if (latestPart > currentPart) return true;
      if (latestPart < currentPart) return false;
    }
    return false;
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Check for updates
   * @param {boolean} silent - If true, don't show "no updates" dialog
   * @returns {Promise<{hasUpdate: boolean, version?: string, error?: string}>}
   */
  async checkForUpdates(silent = false) {
    try {
      console.log('[Updater] Checking for updates...');
      console.log('[Updater] Current version:', this.currentVersion);
      console.log('[Updater] API URL:', UPDATE_CHECK_URL);

      const response = await fetch(UPDATE_CHECK_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('[Updater] Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[Updater] API response:', JSON.stringify(data, null, 2));

      const latestVersion = data.version;

      console.log('[Updater] Latest version from API:', latestVersion);
      console.log('[Updater] Comparing:', latestVersion, 'vs', this.currentVersion);
      console.log('[Updater] isNewerVersion result:', this.isNewerVersion(latestVersion, this.currentVersion));

      this.lastCheckTime = new Date();

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log('[Updater] Update available!');
        await this.showUpdateDialog(data);
        return { hasUpdate: true, version: latestVersion };
      } else {
        console.log('[Updater] No update available');
        if (!silent) {
          this.showNoUpdateDialog();
        }
        return { hasUpdate: false };
      }
    } catch (error) {
      console.error('[Updater] Error checking for updates:', error);
      console.error('[Updater] Error stack:', error.stack);

      if (!silent) {
        dialog.showErrorBox(
          'Ошибка проверки обновлений',
          `Не удалось проверить наличие обновлений.\n${error.message}`
        );
      }

      return { hasUpdate: false, error: error.message };
    }
  }

  /**
   * Show update available dialog
   */
  async showUpdateDialog(updateInfo) {
    const { version, changelog, is_critical, file_size } = updateInfo;
    const sizeMB = this.formatFileSize(file_size || 0);

    let detail = `Текущая версия: ${this.currentVersion}\nНовая версия: ${version}`;

    if (file_size) {
      detail += `\nРазмер: ${sizeMB}`;
    }

    if (changelog) {
      detail += `\n\nЧто нового:\n${changelog}`;
    }

    const buttons = is_critical
      ? ['Скачать сейчас']
      : ['Скачать сейчас', 'Напомнить позже'];

    const result = await dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Доступно обновление',
      message: `Доступна новая версия Tachyon Messenger`,
      detail: detail,
      buttons: buttons,
      defaultId: 0,
      cancelId: is_critical ? -1 : 1,
      noLink: true,
    });

    if (result.response === 0) {
      console.log('[Updater] User chose to download update');
      shell.openExternal(DOWNLOAD_URL);
    } else {
      console.log('[Updater] User chose to skip update');
    }
  }

  /**
   * Show no update available dialog
   */
  showNoUpdateDialog() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Обновления не найдены',
      message: 'У вас установлена последняя версия',
      detail: `Текущая версия: ${this.currentVersion}`,
      buttons: ['OK'],
    });
  }

  /**
   * Show system notification about update (less intrusive)
   */
  showUpdateNotification(version) {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Доступно обновление Tachyon',
        body: `Версия ${version} готова к установке. Нажмите, чтобы скачать.`,
        silent: false,
      });

      notification.on('click', () => {
        shell.openExternal(DOWNLOAD_URL);
      });

      notification.show();
    }
  }

  /**
   * Start automatic update checking
   */
  startAutoCheck() {
    // Check after 10 seconds on startup (silent)
    setTimeout(() => {
      this.checkForUpdates(true);
    }, 10000);

    // Then check every hour
    this.checkIntervalId = setInterval(() => {
      this.checkForUpdates(true);
    }, CHECK_INTERVAL);

    console.log('[Updater] Auto-check started');
  }

  /**
   * Stop automatic update checking
   */
  stopAutoCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log('[Updater] Auto-check stopped');
    }
  }

  /**
   * Get updater status info
   */
  getStatus() {
    return {
      currentVersion: this.currentVersion,
      lastCheckTime: this.lastCheckTime,
      autoCheckEnabled: !!this.checkIntervalId,
    };
  }
}

module.exports = { AppUpdater };
