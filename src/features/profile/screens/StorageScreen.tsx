/**
 * Storage Screen
 * Экран "Хранилище и память" с информацией о кэше и возможностью очистки
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
} from '@shared/storage';
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
    console.log('[Storage] getDirectorySize error:', dirPath, e);
    return { size: 0, fileCount: 0 };
  }
};

// Варианты лимита кэша
const CACHE_LIMIT_OPTIONS = [
  { label: '1 ГБ', value: 1 * 1024 * 1024 * 1024 },
  { label: '2 ГБ', value: 2 * 1024 * 1024 * 1024 },
  { label: '5 ГБ', value: 5 * 1024 * 1024 * 1024 },
  { label: '10 ГБ', value: 10 * 1024 * 1024 * 1024 },
  { label: 'Без лимита', value: 100 * 1024 * 1024 * 1024 }, // 100GB = практически без лимита
];

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Б';
  const k = 1024;
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export default function StorageScreen() {
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);

  const loadCacheInfo = useCallback(async () => {
    setIsLoading(true);
    console.log('[Storage] loadCacheInfo called, isNative:', isNative, 'Platform:', Platform.OS);
    try {
      const mmkvInfo = await getStorageSize();
      let documentCacheSize = 0;
      let imageCacheSize = 0;
      let imageCacheFileCount = 0;

      // Get cache directory from legacy expo-file-system
      const cacheDir = FileSystem.cacheDirectory;
      console.log('[Storage] cacheDir:', cacheDir);

      if (isNative && cacheDir) {
        console.log('[Storage] Cache directory:', cacheDir);

        // Known image cache directory names used by expo-image/SDWebImage/Coil
        const imageCacheDirs = [
          'image_manager_disk_cache',  // expo-image default
          'image_cache',               // alternative name
          'ImageCache',                // iOS SDWebImage
          'coil_disk_cache',           // Android Coil (used by expo-image)
          'image_disk_cache',          // Coil alternative
          'http-cache',                // HTTP cache
        ];

        // Scan cacheDirectory
        try {
          const allFiles = await FileSystem.readDirectoryAsync(cacheDir);
          console.log('[Storage] Cache contents:', allFiles);

          for (const file of allFiles) {
            const filePath = `${cacheDir}${file}`;
            const isImageCache = imageCacheDirs.some(
              dir => file.toLowerCase().includes(dir.toLowerCase())
            );

            const stats = await getDirectorySize(filePath);
            console.log('[Storage] Item:', file, 'isImage:', isImageCache, stats);

            if (isImageCache) {
              imageCacheSize += stats.size;
              imageCacheFileCount += stats.fileCount;
            } else {
              documentCacheSize += stats.size;
            }
          }
        } catch (e) {
          console.log('[Storage] Error reading cache directory:', e);
        }

        // Also check documentDirectory for Android Coil cache
        const docDir = FileSystem.documentDirectory;
        if (docDir) {
          console.log('[Storage] Document directory:', docDir);
          try {
            const docFiles = await FileSystem.readDirectoryAsync(docDir);
            console.log('[Storage] Document contents:', docFiles);

            for (const file of docFiles) {
              const isImageCache = imageCacheDirs.some(
                dir => file.toLowerCase().includes(dir.toLowerCase())
              );
              if (isImageCache) {
                const filePath = `${docDir}${file}`;
                const stats = await getDirectorySize(filePath);
                imageCacheSize += stats.size;
                imageCacheFileCount += stats.fileCount;
                console.log('[Storage] Image cache in docs:', file, stats);
              }
            }
          } catch (e) {
            // Document directory scan failed
          }
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
          console.log('[Storage] Error getting video cache size:', e);
        }
      }

      const cacheLimit = await getCacheLimit();

      // Общий размер = данные (MMKV) + изображения + видео
      // documentCache не включаем - это системный кэш Expo/Metro
      const totalCache = mmkvInfo.totalSize + imageCacheSize + videoCacheSize;

      // Считаем процент от данных + изображений + видео
      const usagePercent = cacheLimit > 0 ? Math.min(100, (totalCache / cacheLimit) * 100) : 0;

      setCacheInfo({
        mmkv: mmkvInfo,
        imageCache: imageCacheSize,
        imageCacheFileCount,
        videoCache: videoCacheSize,
        videoCacheFileCount,
        documentCache: documentCacheSize,
        totalCache,
        cacheLimit,
        usagePercent,
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

              // Clear file cache
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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      backgroundColor: theme.backgroundSecondary,
      borderBottomColor: theme.border,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
    },
    headerRight: {
      width: 40,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'web' ? 100 : 140,
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
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
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
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    rowTextContainer: {
      flex: 1,
    },
    rowTitle: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.text,
    },
    rowSubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    rowValue: {
      fontSize: 15,
      color: theme.textSecondary,
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
      fontSize: 16,
      fontWeight: '600',
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
    clearButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    clearButtonText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#EF4444',
      marginLeft: 8,
    },
    clearAllButton: {
      backgroundColor: '#EF4444',
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 24,
      marginHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearAllButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    webNotice: {
      backgroundColor: isDark ? theme.backgroundSecondary : '#FEF3C7',
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
      marginHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    webNoticeText: {
      flex: 1,
      fontSize: 14,
      color: isDark ? theme.textSecondary : '#92400E',
      marginLeft: 12,
    },
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Данные и память</Text>
            <View style={styles.headerRight} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Данные и память</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

        {/* Storage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Хранилище</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="server-outline" size={20} color="#3B82F6" />
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
                  <Ionicons name="image" size={20} color="#F59E0B" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Изображения</Text>
                  <Text style={styles.rowSubtitle}>
                    {isNative && cacheInfo?.imageCacheFileCount !== undefined
                      ? `${cacheInfo.imageCacheFileCount} файлов`
                      : 'Аватарки и фото в чатах'}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowValue}>
                {isNative
                  ? formatBytes(cacheInfo?.imageCache || 0)
                  : 'Системный'}
              </Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#EF444420' }]}>
                  <Ionicons name="videocam" size={20} color="#EF4444" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Видео</Text>
                  <Text style={styles.rowSubtitle}>
                    {isNative && cacheInfo?.videoCacheFileCount
                      ? `${cacheInfo.videoCacheFileCount} файлов`
                      : 'Кэш видеозаписей'}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowValue}>
                {isNative ? formatBytes(cacheInfo?.videoCache || 0) : 'Системный'}
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
        {isNative && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Настройки</Text>
            <View style={styles.card}>
              <TouchableOpacity style={[styles.row, styles.rowLast]} onPress={handleChangeCacheLimit}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rowIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Ionicons name="server-outline" size={20} color="#8B5CF6" />
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
        {isNative && (
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
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
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
                      <Ionicons name="images-outline" size={20} color="#EF4444" />
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
                      <Ionicons name="videocam-outline" size={20} color="#EF4444" />
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
}
