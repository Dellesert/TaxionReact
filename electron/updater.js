const { app, dialog, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const API_BASE_URL = 'https://taxion.fusioninsight.cloud';
const UPDATE_CHECK_URL = `${API_BASE_URL}/api/v1/app-versions/latest/windows`;
const DOWNLOAD_URL = `${API_BASE_URL}/downloads/windows/latest`;
const CHECK_INTERVAL = 60 * 60 * 1000; // Check every hour

/**
 * Get app version and build number from electron/package.json
 * In dev mode, app.getVersion() returns Electron version, not app version
 */
function getAppInfo() {
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
        return {
          version: packageJson.version,
          buildNumber: packageJson.buildNumber ?? 0,
        };
      }
    }
  } catch (error) {
    console.error('[Updater] Error reading package.json:', error);
  }

  // Fallback to app.getVersion() (works correctly in production)
  const version = app.getVersion();
  return { version, buildNumber: 0 };
}

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    const appInfo = getAppInfo();
    this.currentVersion = appInfo.version;
    this.currentBuildNumber = appInfo.buildNumber;
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

      const response = await fetch(UPDATE_CHECK_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });


      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const latestVersion = data.version;
      const latestBuildNumber = data.build_number ?? 0;


      this.lastCheckTime = new Date();

      const isNewerVer = this.isNewerVersion(latestVersion, this.currentVersion);
      const isSameVerNewerBuild = latestVersion === this.currentVersion && latestBuildNumber > this.currentBuildNumber;

      if (isNewerVer || isSameVerNewerBuild) {
        await this.showUpdateDialog(data);
        return { hasUpdate: true, version: latestVersion };
      } else {
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
    const { version, build_number, changelog, is_critical, file_size } = updateInfo;
    const sizeMB = this.formatFileSize(file_size || 0);

    const currentLabel = this.currentBuildNumber > 0
      ? `${this.currentVersion} (${this.currentBuildNumber})`
      : this.currentVersion;
    const newLabel = build_number && build_number > 0
      ? `${version} (${build_number})`
      : version;

    let detail = `Текущая версия: ${currentLabel}\nНовая версия: ${newLabel}`;

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
      shell.openExternal(DOWNLOAD_URL);
    } else {
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

  }

  /**
   * Stop automatic update checking
   */
  stopAutoCheck() {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }

  /**
   * Get updater status info
   */
  getStatus() {
    return {
      currentVersion: this.currentVersion,
      currentBuildNumber: this.currentBuildNumber,
      lastCheckTime: this.lastCheckTime,
      autoCheckEnabled: !!this.checkIntervalId,
    };
  }
}

module.exports = { AppUpdater, getAppInfo };
