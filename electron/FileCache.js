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
      this.initialized = true;
      console.log('[FileCache] Initialized successfully');
      console.log('[FileCache] Cache directory:', this.cacheDir);
      console.log('[FileCache] Max size:', this.formatBytes(this.maxSize));
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

      console.log('[FileCache] Cached file:', filename, this.formatBytes(buffer.length));
      return filepath;
    } catch (error) {
      console.error('[FileCache] Failed to cache file:', error);
      throw error;
    }
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

      console.log('[FileCache] Cache hit:', meta.filename);
      return filepath;
    } catch {
      // File doesn't exist - remove from metadata
      console.log('[FileCache] Cache miss (file deleted):', meta.filename);
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

    console.log('[FileCache] Enforcing size limit...');
    console.log('[FileCache] Current:', this.formatBytes(currentSize));
    console.log('[FileCache] New file:', this.formatBytes(newFileSize));
    console.log('[FileCache] Max:', this.formatBytes(this.maxSize));

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
        console.log('[FileCache] Evicted:', meta.filename, this.formatBytes(meta.size));
      } catch (err) {
        console.error('[FileCache] Failed to delete file:', err);
      }
    }

    await this.saveMetadata();
    console.log('[FileCache] Freed:', this.formatBytes(freedSpace));
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
      console.log('[FileCache] Loaded metadata:', this.metadata.size, 'entries');
    } catch (error) {
      // File doesn't exist or is corrupted - start fresh
      this.metadata = new Map();
      console.log('[FileCache] Starting with empty metadata');
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

      console.log('[FileCache] Cache cleared successfully');
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

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

module.exports = FileCache;
