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
  Modal,
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
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedClear, setSelectedClear] = useState({
    data: true,
    images: true,
    video: true,
  });

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

  const toggleClearItem = (key: keyof typeof selectedClear) => {
    setSelectedClear(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasSelection = Object.values(selectedClear).some(Boolean);

  const handleClearSelected = async () => {
    const labels: string[] = [];
    if (selectedClear.data) labels.push('системные данные');
    if (selectedClear.images) labels.push('изображения');
    if (selectedClear.video) labels.push('видео');

    Alert.alert(
      'Очистить кэш',
      `Будут удалены: ${labels.join(', ')}. Данные будут загружены заново.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Очистить',
          style: 'destructive',
          onPress: async () => {
            setShowClearModal(false);
            setIsClearing(true);
            try {
              if (selectedClear.data) await clearAllStorages();
              if (selectedClear.images) {
                await Image.clearDiskCache();
                await Image.clearMemoryCache();
                if (isElectron()) {
                  try {
                    const electron = getElectronAPI();
                    if (electron?.cache?.clear) await electron.cache.clear();
                  } catch (e) {}
                }
              }
              if (selectedClear.video) {
                await clearVideoCache();
                if (isElectron()) {
                  try {
                    const electron = getElectronAPI();
                    if (electron?.cache?.clearVideos) await electron.cache.clearVideos();
                  } catch (e) {}
                }
              }

              await loadCacheInfo();
              Alert.alert('Готово', 'Кэш очищен');
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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: isDark ? theme.backgroundSecondary : '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 20,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      // @ts-ignore
      cursor: 'pointer',
    },
    checkRowText: {
      flex: 1,
      marginLeft: 12,
    },
    checkRowTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    checkRowSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    checkRowSize: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 8,
    },
    modalButtons: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 12,
    },
    modalCancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: isDark ? theme.border : '#F3F4F6',
      // @ts-ignore
      cursor: 'pointer',
    },
    modalCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    modalClearButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: '#EF4444',
      // @ts-ignore
      cursor: 'pointer',
    },
    modalClearText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
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
                  <Text style={styles.rowTitle}>Системные данные</Text>
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

        {/* Clear Action */}
        {(isNative || isElectron()) && (
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={() => setShowClearModal(true)}
            disabled={isClearing}
          >
            {isClearing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.clearAllButtonText}>Очистить кэш</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Clear Cache Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowClearModal(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Очистить кэш</Text>
            <Text style={styles.modalSubtitle}>Выберите, что очистить</Text>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleClearItem('data')}>
              <Ionicons
                name={selectedClear.data ? 'checkbox' : 'square-outline'}
                size={24}
                color={selectedClear.data ? theme.primary : theme.textSecondary}
              />
              <View style={styles.checkRowText}>
                <Text style={styles.checkRowTitle}>Системные данные</Text>
              </View>
              <Text style={styles.checkRowSize}>{formatBytes(cacheInfo?.mmkv.totalSize || 0)}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleClearItem('images')}>
              <Ionicons
                name={selectedClear.images ? 'checkbox' : 'square-outline'}
                size={24}
                color={selectedClear.images ? theme.primary : theme.textSecondary}
              />
              <View style={styles.checkRowText}>
                <Text style={styles.checkRowTitle}>Изображения</Text>
                <Text style={styles.checkRowSubtitle}>Аватарки и фото в чатах</Text>
              </View>
              <Text style={styles.checkRowSize}>
                {isElectron() && cacheInfo?.electronMediaCache
                  ? formatBytes(cacheInfo.electronMediaCache.totalSize)
                  : formatBytes(cacheInfo?.imageCache || 0)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.checkRow} onPress={() => toggleClearItem('video')}>
              <Ionicons
                name={selectedClear.video ? 'checkbox' : 'square-outline'}
                size={24}
                color={selectedClear.video ? theme.primary : theme.textSecondary}
              />
              <View style={styles.checkRowText}>
                <Text style={styles.checkRowTitle}>Видео</Text>
                <Text style={styles.checkRowSubtitle}>Кэш видеозаписей</Text>
              </View>
              <Text style={styles.checkRowSize}>
                {isElectron() && cacheInfo?.electronVideoCache
                  ? formatBytes(cacheInfo.electronVideoCache.totalSize)
                  : formatBytes(cacheInfo?.videoCache || 0)}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={styles.modalCancelText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalClearButton, !hasSelection && { opacity: 0.4 }]}
                onPress={handleClearSelected}
                disabled={!hasSelection}
              >
                <Text style={styles.modalClearText}>Очистить</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default StorageContent;
