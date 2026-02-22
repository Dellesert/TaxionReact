/**
 * File Cache Utility
 * Caches document files (PDF, DOCX, etc.) to disk for instant re-opening.
 * Mirrors the videoCache.ts pattern using the new expo-file-system API.
 */

import { Platform } from 'react-native';
import { Paths, File as ExpoFile, Directory } from 'expo-file-system';

const FILE_CACHE_DIR = 'file_cache';
const DEFAULT_MAX_CACHE_SIZE = 200 * 1024 * 1024; // 200 MB

// ---- Hash function ----

/**
 * Fast string hash producing a 16-character hex string.
 * Based on cyrb53 — good distribution, no collisions in practice for URLs.
 */
function hashUrl(url: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < url.length; i++) {
    const ch = url.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const lo = (h1 >>> 0).toString(16).padStart(8, '0');
  const hi = (h2 >>> 0).toString(16).padStart(8, '0');
  return lo + hi;
}

/**
 * Extracts file extension from a URL path, defaults to .bin.
 */
function getExtension(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split('/').pop() || '';
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex > 0) {
      const ext = lastSegment.substring(dotIndex).toLowerCase();
      if (ext.length <= 6 && /^\.[a-z0-9]+$/.test(ext)) {
        return ext;
      }
    }
  } catch {}
  return '.bin';
}

// ---- Directory helpers ----

function getCacheDir(): Directory {
  return new Directory(Paths.cache, FILE_CACHE_DIR);
}

function ensureCacheDir(): void {
  const dir = getCacheDir();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
}

// ---- Public API ----

/**
 * Generates a deterministic cache key for a URL.
 */
export function getCacheKeyForUrl(url: string): string {
  return hashUrl(url) + getExtension(url);
}

/**
 * Checks if a file is cached and returns the local file:// URI.
 * Synchronous — uses expo-file-system's synchronous `exists` and `size` properties.
 * Returns null if not cached or on web platform.
 */
export function getCachedFileUri(url: string): string | null {
  if (Platform.OS === 'web') return null;

  try {
    const key = getCacheKeyForUrl(url);
    const file = new ExpoFile(Paths.cache, FILE_CACHE_DIR, key);
    if (file.exists && file.size > 0) {
      return file.uri;
    }
  } catch (e) {
    console.warn('[fileCache] Error checking cache:', e);
  }
  return null;
}

/**
 * Returns true if the given URI points to the file cache directory.
 */
export function isFileCacheUri(uri: string): boolean {
  if (!uri) return false;
  try {
    const cacheDir = getCacheDir();
    return uri.startsWith(cacheDir.uri);
  } catch {
    return false;
  }
}

/**
 * Downloads a file and stores it in the cache.
 * Uses File.downloadFileAsync which streams directly to disk (no memory overhead).
 * Returns the local file:// URI.
 * On web, returns the original URL unchanged.
 */
export async function cacheFile(
  url: string,
  sessionId: string | null,
): Promise<string> {
  if (Platform.OS === 'web') return url;

  const key = getCacheKeyForUrl(url);
  const destFile = new ExpoFile(Paths.cache, FILE_CACHE_DIR, key);

  // Already cached
  if (destFile.exists && destFile.size > 0) {
    return destFile.uri;
  }

  ensureCacheDir();

  const headers: Record<string, string> = {};
  if (sessionId) {
    headers['X-Session-ID'] = sessionId;
  }

  try {
    const downloaded = await ExpoFile.downloadFileAsync(url, destFile, {
      headers,
      idempotent: true,
    });

    // Evict old files if cache exceeds limit
    evictIfNeeded().catch((e) =>
      console.warn('[fileCache] Eviction error:', e),
    );

    return downloaded.uri;
  } catch (e) {
    // Clean up partial file on failure
    try {
      if (destFile.exists) {
        destFile.delete();
      }
    } catch {}
    throw e;
  }
}

/**
 * Returns the total size and file count of the file cache.
 */
export async function getFileCacheSize(): Promise<{
  totalSize: number;
  fileCount: number;
}> {
  if (Platform.OS === 'web') return { totalSize: 0, fileCount: 0 };

  try {
    const dir = getCacheDir();
    if (!dir.exists) return { totalSize: 0, fileCount: 0 };

    const contents = dir.list();
    let totalSize = 0;
    let fileCount = 0;

    for (const item of contents) {
      if (item instanceof ExpoFile) {
        totalSize += item.size;
        fileCount++;
      }
    }

    return { totalSize, fileCount };
  } catch (e) {
    console.warn('[fileCache] Error getting cache size:', e);
    return { totalSize: 0, fileCount: 0 };
  }
}

/**
 * Deletes the entire file cache directory.
 */
export async function clearFileCache(): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const dir = getCacheDir();
    if (dir.exists) {
      dir.delete();
    }
  } catch (e) {
    console.warn('[fileCache] Error clearing cache:', e);
  }
}

/**
 * Evicts the oldest cached files (by modification time) until
 * total cache size is under the specified limit.
 */
export async function evictIfNeeded(
  maxSize: number = DEFAULT_MAX_CACHE_SIZE,
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    const dir = getCacheDir();
    if (!dir.exists) return;

    const contents = dir.list();
    const files: Array<{
      file: InstanceType<typeof ExpoFile>;
      size: number;
      modified: number;
    }> = [];
    let totalSize = 0;

    for (const item of contents) {
      if (item instanceof ExpoFile) {
        const size = item.size;
        const modified = item.modificationTime ?? 0;
        files.push({ file: item, size, modified });
        totalSize += size;
      }
    }

    if (totalSize <= maxSize) return;

    // Sort by modification time ascending (oldest first)
    files.sort((a, b) => a.modified - b.modified);

    for (const entry of files) {
      if (totalSize <= maxSize) break;
      try {
        entry.file.delete();
        totalSize -= entry.size;
      } catch {}
    }
  } catch (e) {
    console.warn('[fileCache] Eviction error:', e);
  }
}
