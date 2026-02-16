/**
 * Electron Video Cache Utility
 * Provides video caching for the Electron desktop app via the main process FileCache.
 * Mirrors the mobile videoCache.ts API shape for consistency.
 */

import { isElectron, getElectronAPI } from './platform';

/**
 * Check if a video is already in the Electron file cache.
 * Returns a file:// URI if cached, null otherwise.
 */
export async function getElectronCachedVideoUri(url: string): Promise<string | null> {
  if (!isElectron()) return null;

  try {
    const electron = getElectronAPI();
    if (!electron?.cache?.get) return null;

    const filepath = await electron.cache.get(url);
    if (filepath) {
      return `file://${filepath}`;
    }
    return null;
  } catch (e) {
    console.warn('[electronVideoCache] Error checking cache:', e);
    return null;
  }
}

/**
 * Download a video in the Electron main process and cache it to disk.
 * The download happens entirely in Node.js (no renderer memory usage).
 * Returns a file:// URI on success, or null on failure.
 */
export async function cacheElectronVideo(
  url: string,
  sessionId: string | null,
): Promise<string | null> {
  if (!isElectron()) return null;

  try {
    const electron = getElectronAPI();
    if (!electron?.cache?.download) return null;

    const headers: Record<string, string> = {};
    if (sessionId) {
      headers['X-Session-ID'] = sessionId;
    }

    const filepath = await electron.cache.download(url, headers);
    if (filepath) {
      return `file://${filepath}`;
    }
    return null;
  } catch (e) {
    console.warn('[electronVideoCache] Download/cache failed:', e);
    return null;
  }
}

/**
 * Check if a given URI is from the Electron file cache.
 * Used to avoid deleting cached files during share/save operations.
 */
export function isElectronCacheUri(uri: string): boolean {
  if (!uri || !isElectron()) return false;
  return uri.startsWith('file://') && uri.includes('media-cache');
}
