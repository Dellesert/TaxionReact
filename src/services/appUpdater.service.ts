/**
 * App Updater Service
 * Проверка обновлений приложения для Android
 * Аналог electron/updater.js для нативной платформы
 */

import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from '@shared/constants/api.constants';

const API_URL = API_BASE_URL.replace('/api/v1', '');
const CHECK_INTERVAL = 60 * 60 * 1000; // Проверка каждый час

interface UpdateInfo {
  version: string;
  changelog?: string;
  is_critical?: boolean;
  file_size?: number;
  download_url?: string;
}

interface UpdateCheckResult {
  hasUpdate: boolean;
  version?: string;
  error?: string;
}

class AppUpdaterService {
  private currentVersion: string;
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastCheckTime: Date | null = null;

  constructor() {
    this.currentVersion = Constants.expoConfig?.version ?? '1.0.0';
  }

  /**
   * Сравнение семантических версий
   * Возвращает true если latest > current
   */
  private isNewerVersion(latest: string, current: string): boolean {
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
   * Форматирование размера файла
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Получить название платформы для API
   */
  private getPlatformKey(): 'android' | 'ios' {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  }

  /**
   * Проверить наличие обновлений
   * @param silent - если true, не показывать диалог "нет обновлений" (диалог обновления показывается всегда)
   */
  async checkForUpdates(silent = false): Promise<UpdateCheckResult> {
    try {
      const platform = this.getPlatformKey();
      const checkUrl = `${API_URL}/api/v1/app-versions/latest/${platform}`;

      console.log('[AppUpdater] Checking for updates...');
      console.log('[AppUpdater] Current version:', this.currentVersion);
      console.log('[AppUpdater] API URL:', checkUrl);

      const response = await fetch(checkUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: UpdateInfo = await response.json();
      const latestVersion = data.version;

      console.log('[AppUpdater] Latest version:', latestVersion);
      this.lastCheckTime = new Date();

      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        console.log('[AppUpdater] Update available!');
        this.showUpdateDialog(data);
        return { hasUpdate: true, version: latestVersion };
      } else {
        console.log('[AppUpdater] No update available');
        if (!silent) {
          this.showNoUpdateDialog();
        }
        return { hasUpdate: false };
      }
    } catch (error: any) {
      console.error('[AppUpdater] Error checking for updates:', error);

      if (!silent) {
        Alert.alert(
          'Ошибка проверки обновлений',
          `Не удалось проверить наличие обновлений.\n${error.message}`,
        );
      }

      return { hasUpdate: false, error: error.message };
    }
  }

  /**
   * Показать диалог доступного обновления
   */
  private showUpdateDialog(updateInfo: UpdateInfo): void {
    const { version, changelog, is_critical, file_size, download_url } = updateInfo;
    const platform = this.getPlatformKey();
    const downloadUrl = download_url || `${API_URL}/downloads/${platform}/latest`;

    let message = `Текущая версия: ${this.currentVersion}\nНовая версия: ${version}`;

    if (file_size) {
      message += `\nРазмер: ${this.formatFileSize(file_size)}`;
    }

    if (changelog) {
      message += `\n\nЧто нового:\n${changelog}`;
    }

    const buttons: Array<{ text: string; onPress?: () => void; style?: 'cancel' | 'default' | 'destructive' }> = [];

    if (!is_critical) {
      buttons.push({ text: 'Напомнить позже', style: 'cancel' });
    }

    buttons.push({
      text: 'Скачать',
      onPress: () => {
        console.log('[AppUpdater] User chose to download update');
        Linking.openURL(downloadUrl);
      },
    });

    Alert.alert(
      'Доступно обновление',
      message,
      buttons,
      { cancelable: !is_critical },
    );
  }

  /**
   * Показать диалог "нет обновлений"
   */
  private showNoUpdateDialog(): void {
    Alert.alert(
      'Обновления не найдены',
      `У вас установлена последняя версия.\nТекущая версия: ${this.currentVersion}`,
    );
  }

  /**
   * Запустить автоматическую проверку обновлений
   */
  startAutoCheck(): void {
    // Проверка через 10 секунд после старта (тихая)
    setTimeout(() => {
      this.checkForUpdates(true);
    }, 10000);

    // Затем каждый час
    this.checkIntervalId = setInterval(() => {
      this.checkForUpdates(true);
    }, CHECK_INTERVAL);

    console.log('[AppUpdater] Auto-check started');
  }

  /**
   * Остановить автоматическую проверку
   */
  stopAutoCheck(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
      console.log('[AppUpdater] Auto-check stopped');
    }
  }

  /**
   * Получить статус обновления
   */
  getStatus() {
    return {
      currentVersion: this.currentVersion,
      lastCheckTime: this.lastCheckTime,
      autoCheckEnabled: !!this.checkIntervalId,
    };
  }
}

export const appUpdaterService = new AppUpdaterService();
