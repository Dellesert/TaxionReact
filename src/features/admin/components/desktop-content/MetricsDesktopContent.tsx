/**
 * Metrics Desktop Content
 * Адаптированная версия основных показателей для desktop
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { TitleBarBackButton } from '@features/tasks/components/common/TitleBarBackButton';
import { TitleBarMetricsControls } from '../common/TitleBarMetricsControls';
import {
  getDashboardAnalytics,
  formatBytes,
  getPeriodValue,
  type PeriodType,
  type DashboardResponse,
} from '@api/analytics.api';

const MetricsDesktopContent: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const isNarrow = windowWidth < 700;
  const isMedium = windowWidth >= 700 && windowWidth < 1000;
  const gridColumns = isNarrow ? 1 : isMedium ? 2 : 3;
  const cardMaxWidth = `${(100 / gridColumns).toFixed(3)}%` as `${number}%`;
  const { showError } = useNotification();

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && !!window.electron;

  // Handle back navigation
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');

  const handlePeriodChange = useCallback((period: PeriodType) => {
    setSelectedPeriod(period);
  }, []);

  // TitleBar controls for Electron
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron) return null;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TitleBarBackButton onGoBack={handleGoBack} />
        <TitleBarMetricsControls
          selectedPeriod={selectedPeriod}
          onPeriodChange={handlePeriodChange}
        />
      </View>
    );
  }, [isElectron, handleGoBack, selectedPeriod, handlePeriodChange]);

  // Integrate with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Основные показатели',
    leftControls: titleBarLeftControls,
    rightControls: null,
    enabled: isElectron,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      const dashboard = await getDashboardAnalytics(selectedPeriod);
      setDashboardData(dashboard);
    } catch (error: any) {
      console.error('Failed to load metrics analytics:', error);
      showError('Не удалось загрузить показатели');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
  };

  const dynamicStyles = StyleSheet.create({
    contentWrapper: {
      padding: 16,
    },
    metricsGrid: {
      flexDirection: isNarrow ? 'column' : 'row',
      flexWrap: isNarrow ? undefined : 'wrap',
      marginHorizontal: isNarrow ? 0 : -10,
    },
    metricCardWrapper: {
      width: isNarrow ? '100%' : cardMaxWidth,
      paddingHorizontal: isNarrow ? 0 : 10,
      marginBottom: isNarrow ? 12 : 20,
    },
    metricCardWrapperFull: {
      width: '100%',
      paddingHorizontal: isNarrow ? 0 : 10,
      marginBottom: isNarrow ? 12 : 20,
    },
    metricCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 24,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.08,
      shadowRadius: 12,
      elevation: 4,
      height: '100%',
    },
    metricHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    metricIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 3,
    },
    metricLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 8,
      letterSpacing: 0.3,
    },
    metricValue: {
      fontSize: isNarrow ? 24 : 32,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 6,
      letterSpacing: -0.5,
    },
    metricSubtext: {
      fontSize: 13,
      color: theme.textTertiary,
      lineHeight: 18,
    },
    growthBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      gap: 4,
    },
    growthPositive: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    growthNegative: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    growthText: {
      fontSize: 12,
      fontWeight: '600',
    },
    growthTextPositive: {
      color: '#10B981',
    },
    growthTextNegative: {
      color: '#EF4444',
    },
    progressBar: {
      height: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      borderRadius: 3,
      marginTop: 12,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
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
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 12,
    },
    detailedStatsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-around',
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: isNarrow ? 12 : 0,
    },
    detailedStatItem: {
      alignItems: 'center',
    },
    detailedStatValue: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 4,
    },
    detailedStatLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
  });

  if (isLoading && !dashboardData) {
    return (
      <View style={dynamicStyles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={dynamicStyles.loadingText}>Загрузка показателей...</Text>
      </View>
    );
  }

  return (
    <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.contentWrapper}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
      {dashboardData ? (
        <View style={dynamicStyles.metricsGrid}>
          {/* Active Users */}
          <View style={dynamicStyles.metricCardWrapper}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="people" size={24} color="#FFFFFF" />
                </View>
                {dashboardData.stats.active_users.growth_percent !== undefined && (
                  <View
                    style={[
                      dynamicStyles.growthBadge,
                      dashboardData.stats.active_users.growth_percent > 0
                        ? dynamicStyles.growthPositive
                        : dynamicStyles.growthNegative,
                    ]}
                  >
                    <Ionicons
                      name={dashboardData.stats.active_users.growth_percent > 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={dashboardData.stats.active_users.growth_percent > 0 ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        dynamicStyles.growthText,
                        dashboardData.stats.active_users.growth_percent > 0
                          ? dynamicStyles.growthTextPositive
                          : dynamicStyles.growthTextNegative,
                      ]}
                    >
                      {Math.abs(dashboardData.stats.active_users.growth_percent || 0).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={dynamicStyles.metricLabel}>Активные пользователи</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.active_users, selectedPeriod)}
              </Text>
              <Text style={dynamicStyles.metricSubtext}>За выбранный период</Text>
            </View>
          </View>

          {/* Messages */}
          <View style={dynamicStyles.metricCardWrapper}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="chatbubbles" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Сообщения</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.messages, selectedPeriod)}
              </Text>
              <Text style={dynamicStyles.metricSubtext}>Отправлено сообщений</Text>
            </View>
          </View>

          {/* Tasks */}
          <View style={dynamicStyles.metricCardWrapper}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkbox" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Задачи</Text>
              <Text style={dynamicStyles.metricValue}>
                {dashboardData.stats.tasks.completed || 0}/{dashboardData.stats.tasks.created || 0}
              </Text>
              <Text style={dynamicStyles.metricSubtext}>
                {(dashboardData.stats.tasks.completion_rate || 0).toFixed(0)}% завершено
              </Text>
              <View style={dynamicStyles.progressBar}>
                <View
                  style={[
                    dynamicStyles.progressFill,
                    {
                      width: `${dashboardData.stats.tasks.completion_rate || 0}%`,
                      backgroundColor: '#10B981',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Storage */}
          <View style={dynamicStyles.metricCardWrapper}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="server" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Хранилище</Text>
              <Text style={dynamicStyles.metricValue}>
                {(dashboardData.stats.files.storage_used || 0).toFixed(0)}%
              </Text>
              <Text style={dynamicStyles.metricSubtext}>
                {formatBytes(dashboardData.stats.files.total_size || 0)} использовано
              </Text>
              <View style={dynamicStyles.progressBar}>
                <View
                  style={[
                    dynamicStyles.progressFill,
                    {
                      width: `${dashboardData.stats.files.storage_used || 0}%`,
                      backgroundColor: '#F59E0B',
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Calendar Events */}
          <View style={dynamicStyles.metricCardWrapper}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="calendar" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>События календаря</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.calendar, selectedPeriod)}
              </Text>
              <Text style={dynamicStyles.metricSubtext}>Запланировано событий</Text>
            </View>
          </View>

          {/* Polls */}
          <View style={dynamicStyles.metricCardWrapper}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#06B6D4' }]}>
                  <Ionicons name="pie-chart" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Опросы</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.polls, selectedPeriod)}
              </Text>
              <Text style={dynamicStyles.metricSubtext}>Активных опросов</Text>
            </View>
          </View>

          {/* Task Stats Details - Full Width */}
          <View style={dynamicStyles.metricCardWrapperFull}>
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Детальная статистика задач</Text>
              <View style={dynamicStyles.detailedStatsContainer}>
                <View style={dynamicStyles.detailedStatItem}>
                  <Text style={[dynamicStyles.detailedStatValue, { color: '#3B82F6' }]}>
                    {dashboardData.stats.tasks.created || 0}
                  </Text>
                  <Text style={dynamicStyles.detailedStatLabel}>Создано</Text>
                </View>
                <View style={dynamicStyles.detailedStatItem}>
                  <Text style={[dynamicStyles.detailedStatValue, { color: '#F59E0B' }]}>
                    {dashboardData.stats.tasks.in_progress || 0}
                  </Text>
                  <Text style={dynamicStyles.detailedStatLabel}>В работе</Text>
                </View>
                <View style={dynamicStyles.detailedStatItem}>
                  <Text style={[dynamicStyles.detailedStatValue, { color: '#EF4444' }]}>
                    {dashboardData.stats.tasks.overdue || 0}
                  </Text>
                  <Text style={dynamicStyles.detailedStatLabel}>Просрочено</Text>
                </View>
                <View style={dynamicStyles.detailedStatItem}>
                  <Text style={[dynamicStyles.detailedStatValue, { color: '#10B981' }]}>
                    {dashboardData.stats.tasks.completed || 0}
                  </Text>
                  <Text style={dynamicStyles.detailedStatLabel}>Завершено</Text>
                </View>
                <View style={dynamicStyles.detailedStatItem}>
                  <Text style={[dynamicStyles.detailedStatValue, { color: '#8B5CF6' }]}>
                    {(dashboardData.stats.tasks.completion_rate || 0).toFixed(0)}%
                  </Text>
                  <Text style={dynamicStyles.detailedStatLabel}>Выполнение</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View style={dynamicStyles.emptyState}>
          <Ionicons name="bar-chart-outline" size={64} color={theme.textTertiary} />
          <Text style={dynamicStyles.emptyStateText}>Нет данных для отображения</Text>
        </View>
      )}
      </ScrollView>
  );
};

export default MetricsDesktopContent;
