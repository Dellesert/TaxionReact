/**
 * Electron Push Notification Service
 *
 * Handles push notifications for Electron desktop app using native Electron Notification API
 * and WebSocket for real-time notification delivery.
 */

import axios from '@shared/api/axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import type { NotificationData } from '../types/electron';

class ElectronPushNotificationService {
  private deviceId: string | null = null;
  private unsubscribeClickHandler: (() => void) | null = null;
  private navigationCallback: ((data: NotificationData) => void) | null = null;

  /**
   * Check if Electron API is available
   */
  private isElectronAvailable(): boolean {
    return typeof window !== 'undefined' &&
           window.electron?.isElectron === true &&
           window.electron?.notification !== undefined;
  }

  /**
   * Register device for push notifications
   * Generates unique device ID and registers with backend
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      if (!this.isElectronAvailable()) {
        console.warn('[Push Electron] Electron API not available');
        return null;
      }


      // Get device ID from Electron main process
      const result = await window.electron!.notification.register();

      if (!result.success || !result.deviceId) {
        console.error('[Push Electron] Failed to get device ID:', result.error);
        return null;
      }

      this.deviceId = result.deviceId;
      const platform = result.platform || 'electron';


      // Register device with backend
      try {
        const response = await axios.post(API_ENDPOINTS.DEVICES.REGISTER, {
          token: this.deviceId,
          platform: 'electron',
        });

        if (response.data?.id) {
          // Store backend device ID for later unregistration
          this.deviceId = response.data.id;
        }
      } catch (error) {
        console.error('[Push Electron] Failed to register with backend:', error);
        // Continue anyway - notifications will still work via WebSocket
      }

      // Setup notification click handler
      this.setupNotificationListeners();

      return this.deviceId;
    } catch (error) {
      console.error('[Push Electron] Error during registration:', error);
      return null;
    }
  }

  /**
   * Setup listeners for notification events
   */
  private setupNotificationListeners(): void {
    if (!this.isElectronAvailable()) {
      return;
    }

    // Remove existing listener if any
    if (this.unsubscribeClickHandler) {
      this.unsubscribeClickHandler();
    }

    // Listen for notification clicks
    this.unsubscribeClickHandler = window.electron!.notification.onClicked((data) => {

      // Call navigation callback if set
      if (this.navigationCallback) {
        this.navigationCallback(data);
      } else {
        console.warn('[Push Electron] Navigation callback not set!');
      }

      // Handle navigation based on notification data
      this.handleNotificationNavigation(data);
    });

  }

  /**
   * Handle navigation when notification is clicked
   */
  private handleNotificationNavigation(data: NotificationData): void {
    if (!data || !data.screen) {
      return;
    }


    // The actual navigation will be handled by the callback set via setNavigationCallback
    // or by the component that integrates this service
  }

  /**
   * Set callback for handling navigation
   */
  setNavigationCallback(callback: (data: NotificationData) => void): void {
    this.navigationCallback = callback;
  }

  /**
   * Show a notification
   * Called by WebSocket service when new notification arrives
   */
  async showNotification(title: string, body: string, data?: NotificationData): Promise<void> {
    try {
      if (!this.isElectronAvailable()) {
        console.warn('[Push Electron] Cannot show notification - Electron API not available');
        return;
      }


      const result = await window.electron!.notification.show(title, body, data);

      if (!result.success) {
        console.error('[Push Electron] Failed to show notification:', result.error);
      }
    } catch (error) {
      console.error('[Push Electron] Error showing notification:', error);
    }
  }

  /**
   * Update badge count (macOS only)
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      if (!this.isElectronAvailable()) {
        return;
      }

      await window.electron!.notification.setBadgeCount(count);
    } catch (error) {
      console.error('[Push Electron] Error setting badge count:', error);
    }
  }

  /**
   * Unregister device from push notifications
   * Called on logout
   */
  async unregister(): Promise<void> {
    try {
      if (!this.isElectronAvailable()) {
        return;
      }


      // Unregister from backend if we have a device ID
      if (this.deviceId) {
        try {
          await axios.delete(API_ENDPOINTS.DEVICES.UNREGISTER(this.deviceId));
        } catch (error) {
          console.error('[Push Electron] Failed to unregister from backend:', error);
        }
      }

      // Remove notification click listener
      if (this.unsubscribeClickHandler) {
        this.unsubscribeClickHandler();
        this.unsubscribeClickHandler = null;
      }

      // Cleanup
      await window.electron!.notification.unregister();
      this.deviceId = null;
      this.navigationCallback = null;

    } catch (error) {
      console.error('[Push Electron] Error during unregistration:', error);
    }
  }

  /**
   * Check if notifications are available
   */
  isAvailable(): boolean {
    return this.isElectronAvailable();
  }
}

// Export singleton instance
export const electronPushNotificationService = new ElectronPushNotificationService();
export default electronPushNotificationService;
