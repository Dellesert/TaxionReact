/**
 * React Hook for cached media in Electron
 * Downloads and caches images/files for offline access
 */

import { useState, useEffect, useRef } from 'react';
import { isElectron, getElectronAPI } from '../utils/platform';

interface CachedMediaResult {
  localPath: string | null;
  loading: boolean;
  error: Error | null;
  reload: () => void;
}

export function useCachedMedia(url: string | null | undefined): CachedMediaResult {
  const [localPath, setLocalPath] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);
  const loadCountRef = useRef(0);

  const loadMedia = async (mediaUrl: string) => {
    try {
      setLoading(true);
      setError(null);

      if (!isElectron()) {
        // Not in Electron - just use the original URL
        if (mountedRef.current) {
          setLocalPath(mediaUrl);
          setLoading(false);
        }
        return;
      }

      const electron = getElectronAPI();
      if (!electron?.cache) {
        throw new Error('Electron cache API not available');
      }

      // Check cache first
      let filepath = await electron.cache.get(mediaUrl);

      if (!filepath) {
        // Download and cache
        console.log('[useCachedMedia] Downloading:', mediaUrl);
        const response = await fetch(mediaUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const buffer = await response.arrayBuffer();
        const mimeType = response.headers.get('content-type') || 'application/octet-stream';

        filepath = await electron.cache.put(mediaUrl, buffer, mimeType);
        console.log('[useCachedMedia] Cached:', filepath);
      } else {
        console.log('[useCachedMedia] Cache hit:', filepath);
      }

      if (mountedRef.current) {
        // Convert to file:// URL for use in img/video tags
        setLocalPath(`file://${filepath}`);
        setLoading(false);
      }
    } catch (err) {
      console.error('[useCachedMedia] Error:', err);
      if (mountedRef.current) {
        setError(err as Error);
        setLoading(false);
        // Fallback to original URL on error
        setLocalPath(mediaUrl);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    if (!url) {
      setLocalPath(null);
      setLoading(false);
      setError(null);
      return;
    }

    loadMedia(url);

    return () => {
      mountedRef.current = false;
    };
  }, [url]);

  const reload = () => {
    if (url) {
      loadCountRef.current += 1;
      loadMedia(url);
    }
  };

  return {
    localPath,
    loading,
    error,
    reload,
  };
}

/**
 * Hook specifically for images with loading/error states
 */
export function useCachedImage(url: string | null | undefined) {
  return useCachedMedia(url);
}

/**
 * Hook for documents/files
 */
export function useCachedFile(url: string | null | undefined) {
  return useCachedMedia(url);
}
