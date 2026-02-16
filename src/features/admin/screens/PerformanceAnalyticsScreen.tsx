/**
 * Performance Analytics Screen
 * Топ сотрудников по производительности
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { TitleBarBackButton } from '@features/tasks/components/common/TitleBarBackButton';
import {
  getTopPerformers,
  type EmployeePerformance,
  type PeriodType,
} from '@api/analytics.api';

const PerformanceAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();

  // На экранах меньше 600px показываем одну карточку в ряд
  const isSmallScreen = width < 600;
  const { showError } = useNotification();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // TitleBar controls for Electron
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron) return null;
    return <TitleBarBackButton onGoBack={handleGoBack} />;
  }, [isElectron, handleGoBack]);

  // Integrate with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Топ сотрудников',
    leftControls: titleBarLeftControls,
    rightControls: null,
    enabled: isElectron,
  });
  const [topPerformers, setTopPerformers] = useState<EmployeePerformance[]>([]);

  useEffect(() => {
    loadPerformers();
  }, [selectedPeriod]);

  const loadPerformers = async () => {
    try {
      setIsLoading(true);
      const performers = await getTopPerformers(20, selectedPeriod);
      setTopPerformers(performers || []);
    } catch (error: any) {
      console.error('Failed to load performers:', error);
      showError('Не удалось загрузить топ сотрудников');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadPerformers();
  };

  const periods: { key: PeriodType; label: string }[] = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'year', label: 'Год' },
  ];

  const getMedalEmoji = (index: number): string => {
    switch (index) {
      case 0:
        return '🥇';
      case 1:
        return '🥈';
      case 2:
        return '🥉';
      default:
        return '';
    }
  };

  const getRankColor = (index: number): string => {
    switch (index) {
      case 0:
        return '#F59E0B';
      case 1:
        return '#9CA3AF';
      case 2:
        return '#CD7F32';
      default:
        return theme.primary;
    }
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F3F4F6',
    },
    header: {
      paddingHorizontal: 16,
      paddingTop: Platform.OS === 'ios' ? 0 : 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.backgroundSecondary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    headerRight: {
      width: 40,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 120 : 32,
    },
    contentWrapper: {
      maxWidth: 1200,
      width: '100%',
      alignSelf: 'center',
    },
    sectionHeader: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      letterSpacing: -0.4,
    },
    sectionDescription: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 24,
      padding: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    periodButtonActive: {
      backgroundColor: theme.primary,
      shadowColor: theme.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 2,
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    performersList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
    },
    performerCardWrapper: {
      width: isSmallScreen ? '100%' : '50%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    performerCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 20,
      padding: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      ...(Platform.OS === 'web' && { height: '100%' }),
    },
    performerCardTop3: {
      borderWidth: 2,
      shadowOpacity: isDark ? 0.4 : 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
    performerCardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      marginBottom: 16,
    },
    rankContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
    },
    medal: {
      fontSize: 32,
    },
    rank: {
      fontSize: 22,
      fontWeight: 'bold',
    },
    performerInfo: {
      flex: 1,
    },
    performerName: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
      letterSpacing: -0.3,
    },
    performerDepartment: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    qualityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.primary + '20',
      alignSelf: 'flex-start',
    },
    qualityBadgeText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.primary,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 100,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 80,
      paddingHorizontal: 40,
    },
    emptyStateIcon: {
      marginBottom: 16,
      opacity: 0.3,
    },
    emptyStateText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  if (isLoading && topPerformers.length === 0) {
    return (
      <View style={dynamicStyles.container}>
        {!isElectron && (
          <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
            <View style={dynamicStyles.header}>
              <TouchableOpacity style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <Text style={dynamicStyles.headerTitle}>Топ сотрудников</Text>
              <View style={dynamicStyles.headerRight} />
            </View>
          </SafeAreaView>
        )}
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={dynamicStyles.loadingText}>Загрузка данных...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      {!isElectron && (
        <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Топ сотрудников</Text>
            <View style={dynamicStyles.headerRight} />
          </View>
        </SafeAreaView>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
        <View style={dynamicStyles.contentWrapper}>
          {/* Section Header */}
          <View style={dynamicStyles.sectionHeader}>
            <Text style={dynamicStyles.sectionTitle}>Топ сотрудников</Text>
            <Text style={dynamicStyles.sectionDescription}>
              Рейтинг лучших сотрудников по результатам работы
            </Text>
          </View>

          {/* Period Selector */}
          <View style={dynamicStyles.periodSelector}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.key}
                style={[
                  dynamicStyles.periodButton,
                  selectedPeriod === period.key && dynamicStyles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.key)}
              >
                <Text
                  style={[
                    dynamicStyles.periodButtonText,
                    selectedPeriod === period.key && dynamicStyles.periodButtonTextActive,
                  ]}
                >
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {topPerformers.length > 0 ? (
            <View style={dynamicStyles.performersList}>
              {topPerformers.map((performer, index) => (
                <View key={performer.user_id} style={dynamicStyles.performerCardWrapper}>
                <View
                  style={[
                    dynamicStyles.performerCard,
                    index < 3 && dynamicStyles.performerCardTop3,
                    index < 3 && { borderColor: getRankColor(index) + '40' },
                  ]}
                >
                  {/* Top Section: Rank + Info + Quality */}
                  <View style={dynamicStyles.performerCardTop}>
                    {/* Rank/Medal */}
                    <View
                      style={[
                        dynamicStyles.rankContainer,
                        index < 3 && { backgroundColor: `${getRankColor(index)}20` },
                      ]}
                    >
                      {index < 3 ? (
                        <Text style={dynamicStyles.medal}>{getMedalEmoji(index)}</Text>
                      ) : (
                        <Text style={[dynamicStyles.rank, { color: getRankColor(index) }]}>
                          #{index + 1}
                        </Text>
                      )}
                    </View>

                    {/* Info */}
                    <View style={dynamicStyles.performerInfo}>
                      <Text style={dynamicStyles.performerName}>{performer.user_name}</Text>
                      {performer.department_name && (
                        <Text style={dynamicStyles.performerDepartment}>
                          {performer.department_name}
                        </Text>
                      )}
                    </View>

                    {/* Quality Badge */}
                    <View style={dynamicStyles.qualityBadge}>
                      <Text style={dynamicStyles.qualityBadgeText}>
                        {(performer.quality_score || 0).toFixed(0)}%
                      </Text>
                    </View>
                  </View>

                  {/* Stats Row */}
                  <View style={dynamicStyles.statsRow}>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#10B981' }]}>
                        {performer.tasks_completed || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Завершено</Text>
                    </View>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#F59E0B' }]}>
                        {performer.tasks_in_progress || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>В работе</Text>
                    </View>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#EF4444' }]}>
                        {performer.tasks_overdue || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Просрочено</Text>
                    </View>
                  </View>
                </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={dynamicStyles.emptyState}>
              <Ionicons
                name="trophy-outline"
                size={80}
                color={theme.textTertiary}
                style={dynamicStyles.emptyStateIcon}
              />
              <Text style={dynamicStyles.emptyStateText}>Нет данных за выбранный период</Text>
              <Text style={dynamicStyles.emptyStateSubtext}>
                Попробуйте выбрать другой период или дождитесь появления активности сотрудников
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default PerformanceAnalyticsScreen;
