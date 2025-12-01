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
import * as FileSystem from 'expo-file-system';
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

interface CacheInfo {
  mmkv: StorageInfo;
  imageCache: number;
  documentCache: number;
  totalCache: number;
  cacheLimit: number;
  usagePercent: number;
}

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
    try {
      const mmkvInfo = await getStorageSize();
      let documentCacheSize = 0;

      // Get document cache size (expo-file-system cache)
      if (isNative && FileSystem.cacheDirectory) {
        try {
          const cacheDir = await FileSystem.getInfoAsync(FileSystem.cacheDirectory);
          if (cacheDir.exists && 'size' in cacheDir) {
            documentCacheSize = cacheDir.size || 0;
          }
        } catch (e) {
          // Cache directory might not exist
        }
      }

      // expo-image cache size is not directly accessible, estimate based on usage
      const imageCacheEstimate = 0; // Will show as "Управляется системой"

      const [cacheLimit, usagePercent] = await Promise.all([
        getCacheLimit(),
        getCacheUsagePercent(),
      ]);

      setCacheInfo({
        mmkv: mmkvInfo,
        imageCache: imageCacheEstimate,
        documentCache: documentCacheSize,
        totalCache: mmkvInfo.totalSize + documentCacheSize,
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

              // Clear file cache
              if (isNative && FileSystem.cacheDirectory) {
                try {
                  const files = await FileSystem.readDirectoryAsync(FileSystem.cacheDirectory);
                  for (const file of files) {
                    await FileSystem.deleteAsync(`${FileSystem.cacheDirectory}${file}`, { idempotent: true });
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
            <Text style={styles.headerTitle}>Хранилище</Text>
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
          <Text style={styles.headerTitle}>Хранилище</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

        {/* Data Cache Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Кэш данных</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="chatbubbles" size={20} color="#3B82F6" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Чаты и сообщения</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{formatBytes(cacheInfo?.mmkv.chatSize || 0)}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="checkbox" size={20} color="#10B981" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Задачи</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{formatBytes(cacheInfo?.mmkv.taskSize || 0)}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Ionicons name="calendar" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Календарь</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{formatBytes(cacheInfo?.mmkv.calendarSize || 0)}</Text>
            </View>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#EC489920' }]}>
                  <Ionicons name="bar-chart" size={20} color="#EC4899" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Опросы</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{formatBytes(cacheInfo?.mmkv.pollSize || 0)}</Text>
            </View>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#6366F120' }]}>
                  <Ionicons name="people" size={20} color="#6366F1" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Профили</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>{formatBytes(cacheInfo?.mmkv.userSize || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Media Cache Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Медиа</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowLast]}>
              <View style={styles.rowLeft}>
                <View style={[styles.rowIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="image" size={20} color="#F59E0B" />
                </View>
                <View style={styles.rowTextContainer}>
                  <Text style={styles.rowTitle}>Изображения</Text>
                  <Text style={styles.rowSubtitle}>Аватарки и фото в чатах</Text>
                </View>
              </View>
              <Text style={styles.rowValue}>Системный</Text>
            </View>
          </View>
        </View>

        {/* Total with progress bar */}
        <View style={styles.totalContainer}>
          <View style={styles.totalHeader}>
            <Text style={styles.totalLabel}>Использовано</Text>
            <Text style={styles.totalValue}>
              {formatBytes(cacheInfo?.mmkv.totalSize || 0)} / {getCurrentLimitLabel()}
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
                  style={[styles.row, styles.rowLast]}
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
