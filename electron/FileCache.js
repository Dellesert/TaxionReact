const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { app } = require('electron');

class FileCache {
  constructor(options = {}) {
    // Use platform-specific cache directory
    this.cacheDir = path.join(app.getPath('userData'), 'media-cache');
    this.maxSize = options.maxSize || 5 * 1024 * 1024 * 1024; // 5GB default
    this.metadataFile = path.join(this.cacheDir, 'cache-metadata.json');
    this.metadata = new Map();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      await this.loadMetadata();

      // Clean up any orphaned partial downloads from previous crashes
      try {
        const files = await fs.readdir(this.cacheDir);
        for (const file of files) {
          if (file.endsWith('.downloading')) {
            await fs.unlink(path.join(this.cacheDir, file));
          }
        }
      } catch (cleanupErr) {
        console.warn('[FileCache] Cleanup error:', cleanupErr);
      }

      this.initialized = true;
    } catch (error) {
      console.error('[FileCache] Initialization failed:', error);
      throw error;
    }
  }

  // Generate hash-based cache key for URL deduplication
  generateCacheKey(url) {
    return crypto.createHash('sha256').update(url).digest('hex');
  }

  // Get file extension from MIME type
  getExtensionFromMime(mimeType) {
    const map = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
      'application/msword': '.doc',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.ms-powerpoint': '.ppt',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/ogg': '.ogv',
      'audio/mpeg': '.mp3',
      'audio/ogg': '.ogg',
      'audio/wav': '.wav',
      'text/plain': '.txt',
      'text/html': '.html',
      'application/json': '.json',
      'application/zip': '.zip',
    };
    return map[mimeType] || '';
  }

  async cacheFile(url, buffer, mimeType) {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const key = this.generateCacheKey(url);
      const ext = this.getExtensionFromMime(mimeType);
      const filename = `${key}${ext}`;
      const filepath = path.join(this.cacheDir, filename);

      // Check if we need to evict files first
      await this.enforceSizeLimit(buffer.length);

      // Write file
      await fs.writeFile(filepath, buffer);

      // Update metadata
      const metadata = {
        url,
        filename,
        filepath,
        size: buffer.length,
        mimeType,
        accessedAt: Date.now(),
        createdAt: Date.now(),
      };

      this.metadata.set(key, metadata);
      await this.saveMetadata();

      return filepath;
    } catch (error) {
      console.error('[FileCache] Failed to cache file:', error);
      throw error;
    }
  }

  /**
   * Download a file from a remote URL and cache it directly to disk.
   * Streams to a temp file first, then renames for atomicity.
   * @param {string} url - Remote URL to download
   * @param {Object} headers - HTTP headers (e.g. { 'X-Session-ID': '...' })
   * @param {string} [mimeTypeHint] - Optional MIME type hint; if omitted, derived from Content-Type header
   * @returns {Promise<string>} Local file path
   */
  async downloadAndCache(url, headers = {}, mimeTypeHint) {
    if (!this.initialized) {
      await this.init();
    }

    // Check if already cached
    const existingPath = await this.getCachedFile(url);
    if (existingPath) {
      return existingPath;
    }

    const key = this.generateCacheKey(url);
    const tempFilename = `${key}.downloading`;
    const tempFilepath = path.join(this.cacheDir, tempFilename);

    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const httpModule = parsedUrl.protocol === 'https:' ? require('https') : require('http');

      const request = httpModule.get(url, { headers: { ...headers } }, (response) => {
        // Follow redirects
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          response.resume();
          this.downloadAndCache(response.headers.location, headers, mimeTypeHint)
            .then(resolve)
            .catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`HTTP ${response.statusCode} downloading ${url}`));
          return;
        }

        const contentType = mimeTypeHint || response.headers['content-type'] || 'application/octet-stream';
        const mimeType = contentType.split(';')[0].trim();
        const ext = this.getExtensionFromMime(mimeType);
        const finalFilename = `${key}${ext}`;
        const finalFilepath = path.join(this.cacheDir, finalFilename);

        const fsSync = require('fs');
        const writeStream = fsSync.createWriteStream(tempFilepath);
        let downloadedSize = 0;

        response.on('data', (chunk) => {
          downloadedSize += chunk.length;
        });

        response.pipe(writeStream);

        writeStream.on('finish', async () => {
          try {
            await this.enforceSizeLimit(downloadedSize);
            await fs.rename(tempFilepath, finalFilepath);

            const metadata = {
              url,
              filename: finalFilename,
              filepath: finalFilepath,
              size: downloadedSize,
              mimeType,
              accessedAt: Date.now(),
              createdAt: Date.now(),
            };

            this.metadata.set(key, metadata);
            await this.saveMetadata();

            resolve(finalFilepath);
          } catch (err) {
            try { await fs.unlink(tempFilepath); } catch {}
            try { await fs.unlink(finalFilepath); } catch {}
            reject(err);
          }
        });

        writeStream.on('error', async (err) => {
          try { await fs.unlink(tempFilepath); } catch {}
          reject(err);
        });
      });

      request.on('error', async (err) => {
        try { await fs.unlink(tempFilepath); } catch {}
        reject(err);
      });

      // 5-minute timeout for large videos
      request.setTimeout(300000, () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
    });
  }

  async getCachedFile(url) {
    if (!this.initialized) {
      await this.init();
    }

    const key = this.generateCacheKey(url);
    const meta = this.metadata.get(key);

    if (!meta) {
      return null;
    }

    const filepath = path.join(this.cacheDir, meta.filename);

    try {
      // Check if file exists
      await fs.access(filepath);

      // Update access time for LRU
      meta.accessedAt = Date.now();
      this.metadata.set(key, meta);
      await this.saveMetadata();

      return filepath;
    } catch {
      // File doesn't exist - remove from metadata
      this.metadata.delete(key);
      await this.saveMetadata();
      return null;
    }
  }

  // LRU eviction: delete least recently used files
  async enforceSizeLimit(newFileSize) {
    const currentSize = await this.getTotalSize();

    if (currentSize + newFileSize <= this.maxSize) {
      return; // Space available
    }


    // Sort by access time (oldest first)
    const entries = Array.from(this.metadata.entries())
      .sort((a, b) => a[1].accessedAt - b[1].accessedAt);

    let freedSpace = 0;
    const target = currentSize + newFileSize - this.maxSize;

    for (const [key, meta] of entries) {
      if (freedSpace >= target) break;

      const filepath = path.join(this.cacheDir, meta.filename);

      try {
        await fs.unlink(filepath);
        freedSpace += meta.size;
        this.metadata.delete(key);
      } catch (err) {
        console.error('[FileCache] Failed to delete file:', err);
      }
    }

    await this.saveMetadata();
  }

  async getTotalSize() {
    let total = 0;
    for (const meta of this.metadata.values()) {
      total += meta.size;
    }
    return total;
  }

  async loadMetadata() {
    try {
      const data = await fs.readFile(this.metadataFile, 'utf8');
      const parsed = JSON.parse(data);
      this.metadata = new Map(Object.entries(parsed));
    } catch (error) {
      // File doesn't exist or is corrupted - start fresh
      this.metadata = new Map();
    }
  }

  async saveMetadata() {
    try {
      const obj = Object.fromEntries(this.metadata);
      await fs.writeFile(this.metadataFile, JSON.stringify(obj, null, 2));
    } catch (error) {
      console.error('[FileCache] Failed to save metadata:', error);
    }
  }

  async clearCache() {
    if (!this.initialized) {
      await this.init();
    }

    try {
      const files = await fs.readdir(this.cacheDir);

      for (const file of files) {
        if (file === 'cache-metadata.json') continue;
        await fs.unlink(path.join(this.cacheDir, file));
      }

      this.metadata.clear();
      await this.saveMetadata();

    } catch (error) {
      console.error('[FileCache] Failed to clear cache:', error);
      throw error;
    }
  }

  async getCacheStats() {
    if (!this.initialized) {
      await this.init();
    }

    const totalSize = await this.getTotalSize();
    const fileCount = this.metadata.size;
    const usagePercent = (totalSize / this.maxSize) * 100;

    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      fileCount,
      maxSize: this.maxSize,
      maxSizeFormatted: this.formatBytes(this.maxSize),
      usagePercent: Math.min(100, usagePercent),
      cacheDir: this.cacheDir,
    };
  }

  async clearByMimePrefix(prefix) {
    if (!this.initialized) {
      await this.init();
    }

    let cleared = 0;
    const toDelete = [];

    for (const [key, meta] of this.metadata.entries()) {
      if (meta.mimeType && meta.mimeType.startsWith(prefix)) {
        toDelete.push({ key, meta });
      }
    }

    for (const { key, meta } of toDelete) {
      try {
        await fs.unlink(path.join(this.cacheDir, meta.filename));
        this.metadata.delete(key);
        cleared++;
      } catch (err) {
        // File may already be deleted
        this.metadata.delete(key);
      }
    }

    if (cleared > 0) {
      await this.saveMetadata();
    }

    return { cleared };
  }

  async getStatsByMimePrefix(prefix) {
    if (!this.initialized) {
      await this.init();
    }

    let totalSize = 0;
    let fileCount = 0;

    for (const meta of this.metadata.values()) {
      if (meta.mimeType && meta.mimeType.startsWith(prefix)) {
        totalSize += meta.size;
        fileCount++;
      }
    }

    return { totalSize, fileCount };
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

module.exports = FileCache;
