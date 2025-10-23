/**
 * Token Refresh Service
 * Automatically refreshes access token before it expires
 */

import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import * as authApi from '@api/auth.api';

// JWT token decoder (without verification - just to read expiry)
const decodeToken = (token: string): { exp: number } | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

class TokenRefreshService {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  /**
   * Start automatic token refresh
   * Checks token expiry and schedules refresh 2 minutes before expiration
   */
  public async start(): Promise<void> {
    console.log('🔄 Starting automatic token refresh service...');

    // Clear any existing timer
    this.stop();

    // Schedule next refresh
    await this.scheduleNextRefresh();
  }

  /**
   * Stop automatic token refresh
   */
  public stop(): void {
    if (this.refreshTimer) {
      console.log('⏹️ Stopping token refresh service');
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Schedule next token refresh based on current token expiry
   */
  private async scheduleNextRefresh(): Promise<void> {
    try {
      const accessToken = await secureStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);

      if (!accessToken) {
        console.log('⚠️ No access token found, skipping refresh schedule');
        return;
      }

      const decoded = decodeToken(accessToken);

      if (!decoded || !decoded.exp) {
        console.error('❌ Failed to decode token expiry');
        return;
      }

      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const timeUntilExpiry = expiryTime - currentTime;

      // Refresh 2 minutes (120 seconds) before expiry
      const REFRESH_BEFORE_EXPIRY = 2 * 60 * 1000; // 2 minutes in milliseconds
      const timeUntilRefresh = timeUntilExpiry - REFRESH_BEFORE_EXPIRY;

      console.log('⏰ Token expiry schedule:', {
        expiresAt: new Date(expiryTime).toLocaleTimeString(),
        timeUntilExpiry: Math.floor(timeUntilExpiry / 1000) + 's',
        refreshIn: timeUntilRefresh > 0 ? Math.floor(timeUntilRefresh / 1000) + 's' : 'EXPIRED',
      });

      // If token is already expired or expires in less than 2 minutes, refresh immediately
      if (timeUntilRefresh <= 0 || timeUntilExpiry <= 0) {
        console.log('⚡ Token expired or expires soon, refreshing immediately...');
        await this.performRefresh();
        return;
      }

      // Schedule refresh
      this.refreshTimer = setTimeout(async () => {
        await this.performRefresh();
      }, timeUntilRefresh);

      console.log(`✅ Token refresh scheduled in ${Math.floor(timeUntilRefresh / 1000)} seconds`);
    } catch (error) {
      console.error('❌ Failed to schedule token refresh:', error);
    }
  }

  /**
   * Perform token refresh
   */
  private async performRefresh(): Promise<void> {
    if (this.isRefreshing) {
      console.log('⏳ Token refresh already in progress, skipping...');
      return;
    }

    try {
      this.isRefreshing = true;
      console.log('🔄 Performing automatic token refresh...');

      const refreshToken = await secureStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        console.error('❌ No refresh token available');
        return;
      }

      // Call refresh API
      const response = await authApi.refreshToken({ refresh_token: refreshToken });

      // Store new tokens
      await secureStorage.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, response.tokens.access_token);
      await secureStorage.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, response.tokens.refresh_token);

      console.log('✅ Token refreshed successfully!');

      // Schedule next refresh
      await this.scheduleNextRefresh();
    } catch (error) {
      console.error('❌ Automatic token refresh failed:', error);

      // Try again in 1 minute
      console.log('🔄 Retrying token refresh in 1 minute...');
      this.refreshTimer = setTimeout(async () => {
        await this.performRefresh();
      }, 60 * 1000);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Manually trigger token refresh
   */
  public async refresh(): Promise<void> {
    await this.performRefresh();
  }
}

// Export singleton instance
export const tokenRefreshService = new TokenRefreshService();
