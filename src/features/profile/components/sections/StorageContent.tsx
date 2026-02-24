/**
 * Storage Content
 * Полная логика экрана хранилища без header
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import { Image } from 'expo-image';
import { useTheme } from '@shared/hooks/useTheme';
import {
  getStorageSize,
  clearAllStorages,
  isNative,
  StorageInfo,
  getCacheLimit,
  setCacheLimit,
  getCacheUsagePercent,
} from '@shared/storage';
import { isElectron, getElectronAPI } from '@shared/utils/platform';
import { getVideoCacheSize, clearVideoCache } from '@shared/utils/videoCache';

interface CacheInfo {
  mmkv: StorageInfo;
  imageCache: number;
  imageCacheFileCount: number;
  videoCache: number;
  videoCacheFileCount: number;
  documentCache: number;
  totalCache: number;
  cacheLimit: number;
  usagePercent: number;
  electronMediaCache?: {
    totalSize: number;
    fileCount: number;
  };
  electronVideoCache?: {
    totalSize: number;
    fileCount: number;
  };
}

/**
 * Recursively calculate directory size on native platforms
 */
const getDirectorySize = async (dirPath: string): Promise<{ size: number; fileCount: number }> => {
  if (!isNative) return { size: 0, fileCount: 0 };

  try {
    // Ensure path ends without trailing slash for getInfoAsync
    const normalizedPath = dirPath.endsWith('/') ? dirPath.slice(0, -1) : dirPath;
    const dirInfo = await FileSystem.getInfoAsync(normalizedPath);
    if (!dirInfo.exists) return { size: 0, fileCount: 0 };

    // If it's a file, return its size
    if (!('isDirectory' in dirInfo) || !dirInfo.isDirectory) {
      return { size: 'size' in dirInfo ? (dirInfo.size || 0) : 0, fileCount: 1 };
    }

    // List directory contents
    const files = await FileSystem.readDirectoryAsync(normalizedPath);
    let totalSize = 0;
    let totalFiles = 0;

    for (const file of files) {
      // Use proper path separator
      const filePath = `${normalizedPath}/${file}`;
      const result = await getDirectorySize(filePath);
      totalSize += result.size;
      totalFiles += result.fileCount;
    }

    return { size: totalSize, fileCount: totalFiles };
  } catch (e) {
    return { size: 0, fileCount: 0 };
  }
};

const CACHE_LIMIT_OPTIONS = [
  { label: '1 ГБ', value: 1 * 1024 * 1024 * 1024 },
  { label: '2 ГБ', value: 2 * 1024 * 1024 * 1024 },
  { label: '5 ГБ', value: 5 * 1024 * 1024 * 1024 },
  { label: '10 ГБ', value: 10 * 1024 * 1024 * 1024 },
  { label: 'Без лимита', value: 100 * 1024 * 1024 * 1024 },
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const StorageContent: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const loadCacheInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const mmkvInfo = await getStorageSize();
      let documentCacheSize = 0;
      let imageCacheSize = 0;
      let imageCacheFileCount = 0;
      let electronMediaCache: { totalSize: number; fileCount: number } | undefined;

      // Get cache directory from legacy expo-file-system
      const cacheDir = FileSystem.cacheDirectory;

      if (isNative && cacheDir) {

        // List all cache directories to find image cache
        try {
          const allFiles = await FileSystem.readDirectoryAsync(cacheDir);

          // Known image cache directory names used by expo-image/SDWebImage/Glide
          const imageCacheDirs = [
            'image_manager_disk_cache',  // expo-image default
            'image_cache',               // alternative name
            'ImageCache',                // iOS SDWebImage
            'com.bumptech.glide',        // Android Glide
            'http-cache',                // HTTP cache
          ];

          for (const file of allFiles) {
            const filePath = `${cacheDir}${file}`;
            const isImageCache = imageCacheDirs.some(
              dir => file.toLowerCase().includes(dir.toLowerCase())
            );

            const stats = await getDirectorySize(filePath);

            if (isImageCache) {
              imageCacheSize += stats.size;
              imageCacheFileCount += stats.fileCount;
            } else {
              documentCacheSize += stats.size;
            }
          }
        } catch (e) {
        }
      }

      // Get video cache size
      let videoCacheSize = 0;
      let videoCacheFileCount = 0;
      if (isNative) {
        try {
          const videoStats = await getVideoCacheSize();
          videoCacheSize = videoStats.totalSize;
          videoCacheFileCount = videoStats.fileCount;
        } catch (e) {
        }
      }

      // Get Electron media cache stats
      let electronVideoCache: { totalSize: number; fileCount: number } | undefined;
      if (isElectron()) {
        try {
          const electron = getElectronAPI();
          if (electron?.cache?.stats) {
            electronMediaCache = await electron.cache.stats();
          }
          if (electron?.cache?.videoStats) {
            electronVideoCache = await electron.cache.videoStats();
          }
        } catch (e) {
          console.error('[Storage] Failed to get Electron cache stats:', e);
        }
      }

      const [cacheLimit, usagePercent] = await Promise.all([
        getCacheLimit(),
        getCacheUsagePercent(),
      ]);

      // Calculate total including Electron media cache
      const totalMediaSize = isElectron()
        ? (electronMediaCache?.totalSize || 0) // Electron: all media is in FileCache (video stats are subset of total)
        : imageCacheSize + videoCacheSize;
      const totalCache = mmkvInfo.totalSize + totalMediaSize;
      const finalUsagePercent = cacheLimit > 0 ? Math.min(100, (totalCache / cacheLimit) * 100) : usagePercent;

      setCacheInfo({
        mmkv: mmkvInfo,
        imageCache: imageCacheSize,
        imageCacheFileCount,
        videoCache: videoCacheSize,
        videoCacheFileCount,
        documentCache: documentCacheSize,
        totalCache,
        cacheLimit,
        usagePercent: finalUsagePercent,
        electronMediaCache,
        electronVideoCache,
      });
    } catch (error) {
      console.error('Failed to load cache info:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCacheInfo();
  }, [loadCacheInfo]);

  const handleClearDataCache = async () => {
    Alert.alert(
      'Очистить кэш данных',
      'Будут удалены кэшированные чаты, задачи, события календаря, опросы и профили пользователей. Данные будут загружены заново при следующем открытии.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAllStorages();
              await loadCacheInfo();
              Alert.alert('Готово', 'Кэш данных очищен');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearImageCache = async () => {
    Alert.alert(
      'Очистить кэш изображений',
      'Все кэшированные изображения будут удалены. Изображения будут загружены заново при просмотре.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await Image.clearDiskCache();
              await Image.clearMemoryCache();

              // Clear Electron media cache
              if (isElectron()) {
                try {
                  const electron = getElectronAPI();
                  if (electron?.cache?.clear) {
                    await electron.cache.clear();
                  }
                } catch (e) {
                  console.error('[Storage] Failed to clear Electron cache:', e);
                }
              }

              await loadCacheInfo();
              Alert.alert('Готово', 'Кэш изображений очищен');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш изображений');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearVideoCache = async () => {
    Alert.alert(
      'Очистить кэш видео',
      'Все кэшированные видео будут удалены. Видео будут загружены заново при просмотре.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearVideoCache();

              // Clear Electron video cache
              if (isElectron()) {
                try {
                  const electron = getElectronAPI();
                  if (electron?.cache?.clearVideos) {
                    await electron.cache.clearVideos();
                  }
                } catch (e) {
                  console.error('[Storage] Failed to clear Electron video cache:', e);
                }
              }

              await loadCacheInfo();
              Alert.alert('Готово', 'Кэш видео очищен');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш видео');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllCache = async () => {
    Alert.alert(
      'Очистить весь кэш',
      'Будут удалены все кэшированные данные и изображения. Приложение может работать медленнее, пока данные не будут загружены заново.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить всё',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearAllStorages();
              await Image.clearDiskCache();
              await Image.clearMemoryCache();
              await clearVideoCache();

              const clearCacheDir = FileSystem.cacheDirectory;
              if (isNative && clearCacheDir) {
                try {
                  const files = await FileSystem.readDirectoryAsync(clearCacheDir);
                  for (const file of files) {
                    await FileSystem.deleteAsync(`${clearCacheDir}${file}`, { idempotent: true });
                  }
                } catch (e) {
                  // Some files might not be deletable
                }
              }

              // Clear Electron media cache
              if (isElectron()) {
                try {
                  const electron = getElectronAPI();
                  if (electron?.cache?.clear) {
                    await electron.cache.clear();
                  }
                } catch (e) {
                  console.error('[Storage] Failed to clear Electron cache:', e);
                }
              }

              await loadCacheInfo();
              Alert.alert('Готово', 'Весь кэш очищен');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось очистить кэш');
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  };

  const handleChangeCacheLimit = () => {
    const currentLimit = cacheInfo?.cacheLimit;
    const currentOption = CACHE_LIMIT_OPTIONS.find(opt => opt.value === currentLimit);

    Alert.alert(
      'Лимит кэша',
      `Текущий лимит: ${currentOption?.label || formatBytes(currentLimit || 0)}`,
      CACHE_LIMIT_OPTIONS.map(option => ({
        text: option.label,
        onPress: async () => {
          await setCacheLimit(option.value);
          await loadCacheInfo();
        },
      }))
    );
  };

  const getCurrentLimitLabel = (): string => {
    const limit = cacheInfo?.cacheLimit;
    const option = CACHE_LIMIT_OPTIONS.find(opt => opt.value === limit);
    return option?.label || formatBytes(limit || 0);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 100,
    },
    section: {
      marginTop: 24,
      marginHorizontal: 16,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      marginLeft: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    card: {
      backgroundColor: isDark ? theme.backgroundSecondary : '#FFFFFF',
      borderRadius: 12,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      // @ts-ignore
      cursor: 'pointer',
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    rowIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rowTextContainer: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: theme.text,
    },
    rowSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
      marginLeft: 8,
    },
    totalContainer: {
      padding: 16,
      backgroundColor: isDark ? theme.backgroundSecondary : '#FFFFFF',
      borderRadius: 12,
      marginTop: 24,
      marginHorizontal: 16,
    },
    totalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    totalLabel: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
      color: theme.text,
    },
    totalValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    progressBarContainer: {
      height: 8,
      backgroundColor: theme.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressBar: {
      height: '100%',
      borderRadius: 4,
    },
    usageHint: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 8,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clearAllButton: {
      backgroundColor: '#EF4444',
      borderRadius: 10,
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 16,
      marginTop: 24,
      marginHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      // @ts-ignore
      cursor: 'pointer',
    },
    clearAllButtonText: {
      fontSize: 13,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Storage Section - like mobile */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Хранилище</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="server-outline" size={18} color="#3B82F6" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Данные</Text>
                  <Text style={styles.rowSubtitle}>Чаты, задачи, календарь, опросы, профили</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{formatBytes(cacheInfo?.mmkv.totalSize || 0)}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="image" size={18} color="#F59E0B" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Изображения</Text>
                  <Text style={styles.rowSubtitle}>
                    {(() => {
                      if (isElectron() && cacheInfo?.electronMediaCache) {
                        return `${cacheInfo.electronMediaCache.fileCount} файлов`;
                      }
                      if (isNative && cacheInfo?.imageCacheFileCount) {
                        return `${cacheInfo.imageCacheFileCount} файлов`;
                      }
                      return 'Аватарки и фото в чатах';
                    })()}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowValue}>
                {(() => {
                  if (isElectron() && cacheInfo?.electronMediaCache) {
                    return formatBytes(cacheInfo.electronMediaCache.totalSize);
                  }
                  if (isNative) {
                    return formatBytes(cacheInfo?.imageCache || 0);
                  }
                  return 'Системный';
                })()}
              </Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="videocam" size={18} color="#EF4444" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Видео</Text>
                  <Text style={styles.rowSubtitle}>
                    {(() => {
                      if (isElectron() && cacheInfo?.electronVideoCache) {
                        return `${cacheInfo.electronVideoCache.fileCount} файлов`;
                      }
                      if (isNative && cacheInfo?.videoCacheFileCount) {
                        return `${cacheInfo.videoCacheFileCount} файлов`;
                      }
                      return 'Кэш видеозаписей';
                    })()}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowValue}>
                {(() => {
                  if (isElectron() && cacheInfo?.electronVideoCache) {
                    return formatBytes(cacheInfo.electronVideoCache.totalSize);
                  }
                  if (isNative) {
                    return formatBytes(cacheInfo?.videoCache || 0);
                  }
                  return 'Системный';
                })()}
              </Text>
            </View>
          </View>
        </View>

        {/* Total with progress bar */}
        <View style={styles.totalContainer}>
          <View style={styles.totalHeader}>
            <Text style={styles.totalLabel}>Использовано</Text>
            <Text style={styles.totalValue}>
              {formatBytes(cacheInfo?.totalCache || 0)} / {getCurrentLimitLabel()}
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${Math.min(100, cacheInfo?.usagePercent || 0)}%`,
                  backgroundColor: (cacheInfo?.usagePercent || 0) > 90 ? '#EF4444' : theme.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.usageHint}>
            {(cacheInfo?.usagePercent || 0) > 90
              ? 'Кэш почти заполнен'
              : `Использовано ${(cacheInfo?.usagePercent || 0).toFixed(1)}%`}
          </Text>
        </View>

        {/* Cache Limit Settings */}
        {(isNative || isElectron()) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Настройки</Text>
            <View style={styles.card}>
              <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={handleChangeCacheLimit}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="server-outline" size={18} color="#8B5CF6" />
                  </View>
                  <View style={styles.rowTextContainer}>
                    <Text style={styles.rowTitle}>Лимит кэша</Text>
                    <Text style={styles.rowSubtitle}>Максимальный размер локального кэша</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{getCurrentLimitLabel()}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Clear Actions */}
        {(isNative || isElectron()) && (
          <>
            <View style={[styles.section, { marginTop: 32 }]}>
              <Text style={styles.sectionTitle}>Действия</Text>
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.row}
                  onPress={handleClearDataCache}
                  disabled={isClearing}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.rowTextContainer}>
                      <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Очистить кэш данных</Text>
                      <Text style={styles.rowSubtitle}>Чаты, задачи, календарь, опросы, профили</Text>
                    </View>
                  </View>
                  {isClearing && <ActivityIndicator size="small" color="#EF4444" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.row}
                  onPress={handleClearImageCache}
                  disabled={isClearing}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="images-outline" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.rowTextContainer}>
                      <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Очистить кэш изображений</Text>
                      <Text style={styles.rowSubtitle}>Аватарки и медиа</Text>
                    </View>
                  </View>
                  {isClearing && <ActivityIndicator size="small" color="#EF4444" />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.row, styles.rowLast]}
                  onPress={handleClearVideoCache}
                  disabled={isClearing}
                >
                  <View style={styles.rowLeft}>
                    <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="videocam-outline" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.rowTextContainer}>
                      <Text style={[styles.rowTitle, { color: '#EF4444' }]}>Очистить кэш видео</Text>
                      <Text style={styles.rowSubtitle}>Кэшированные видеозаписи</Text>
                    </View>
                  </View>
                  {isClearing && <ActivityIndicator size="small" color="#EF4444" />}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.clearAllButton}
              onPress={handleClearAllCache}
              disabled={isClearing}
            >
              {isClearing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.clearAllButtonText}>Очистить весь кэш</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default StorageContent;
