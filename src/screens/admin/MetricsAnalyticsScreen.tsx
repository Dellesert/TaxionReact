/**
 * Metrics Analytics Screen
 * Основные показатели системы
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import {
  getDashboardAnalytics,
  formatBytes,
  getPeriodValue,
  type PeriodType,
  type DashboardResponse,
} from '@api/analytics.api';

const MetricsAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
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

  const periods: { key: PeriodType; label: string }[] = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'year', label: 'Год' },
  ];

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? theme.background : '#F3F4F6',
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    backButton: {
      position: 'absolute',
      left: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    backButtonText: {
      fontSize: 16,
      color: theme.primary,
      fontWeight: '600',
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 120 : 32,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      alignItems: 'center',
    },
    periodButtonActive: {
      backgroundColor: theme.primary,
    },
    periodButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metricCard: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    metricHeader: {
      marginBottom: 12,
    },
    metricIcon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    metricLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    metricSubtext: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    growthPositive: {
      color: '#10B981',
    },
    growthNegative: {
      color: '#EF4444',
    },
    progressBar: {
      height: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      borderRadius: 2,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 2,
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
      paddingVertical: 40,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  if (isLoading && !dashboardData) {
    return (
      <View style={dynamicStyles.container}>
        <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
          <View style={dynamicStyles.header}>
            <TouchableOpacity
              style={dynamicStyles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color={theme.primary} />
            </TouchableOpacity>
            <Text style={dynamicStyles.headerTitle}>Основные показатели</Text>
          </View>
        </SafeAreaView>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={dynamicStyles.loadingText}>Загрузка показателей...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={dynamicStyles.container}>
      <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>📊 Основные показатели</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
      >
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

        {dashboardData ? (
          <View style={dynamicStyles.metricsGrid}>
            {/* Active Users */}
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#3B82F6' }]}>
                  <Ionicons name="people" size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Активные пользователи</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.active_users, selectedPeriod)}
              </Text>
              {dashboardData.stats.active_users.growth_percent !== undefined && (
                <Text
                  style={[
                    dynamicStyles.metricSubtext,
                    dashboardData.stats.active_users.growth_percent > 0
                      ? dynamicStyles.growthPositive
                      : dynamicStyles.growthNegative,
                  ]}
                >
                  {dashboardData.stats.active_users.growth_percent > 0 ? '↑' : '↓'}{' '}
                  {Math.abs(dashboardData.stats.active_users.growth_percent || 0).toFixed(1)}%
                </Text>
              )}
            </View>

            {/* Messages */}
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name="chatbubbles" size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Сообщения</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.messages, selectedPeriod)}
              </Text>
            </View>

            {/* Tasks */}
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="checkbox" size={20} color="#FFFFFF" />
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

            {/* Storage */}
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#F59E0B' }]}>
                  <Ionicons name="server" size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Хранилище</Text>
              <Text style={dynamicStyles.metricValue}>
                {(dashboardData.stats.files.storage_used || 0).toFixed(0)}%
              </Text>
              <Text style={dynamicStyles.metricSubtext}>
                {formatBytes(dashboardData.stats.files.total_size || 0)}
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

            {/* Calendar Events */}
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#EC4899' }]}>
                  <Ionicons name="calendar" size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>События календаря</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.calendar, selectedPeriod)}
              </Text>
            </View>

            {/* Polls */}
            <View style={dynamicStyles.metricCard}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#06B6D4' }]}>
                  <Ionicons name="pie-chart" size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Опросы</Text>
              <Text style={dynamicStyles.metricValue}>
                {getPeriodValue(dashboardData.stats.polls, selectedPeriod)}
              </Text>
            </View>

            {/* Task Stats Details */}
            <View style={[dynamicStyles.metricCard, { minWidth: '100%' }]}>
              <View style={dynamicStyles.metricHeader}>
                <View style={[dynamicStyles.metricIcon, { backgroundColor: '#6366F1' }]}>
                  <Ionicons name="stats-chart" size={20} color="#FFFFFF" />
                </View>
              </View>
              <Text style={dynamicStyles.metricLabel}>Детальная статистика задач</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
                <View>
                  <Text style={[dynamicStyles.metricValue, { fontSize: 20 }]}>
                    {dashboardData.stats.tasks.in_progress || 0}
                  </Text>
                  <Text style={dynamicStyles.metricSubtext}>В работе</Text>
                </View>
                <View>
                  <Text style={[dynamicStyles.metricValue, { fontSize: 20, color: '#EF4444' }]}>
                    {dashboardData.stats.tasks.overdue || 0}
                  </Text>
                  <Text style={dynamicStyles.metricSubtext}>Просрочено</Text>
                </View>
                <View>
                  <Text style={[dynamicStyles.metricValue, { fontSize: 20, color: '#10B981' }]}>
                    {(dashboardData.stats.tasks.completion_rate || 0).toFixed(0)}%
                  </Text>
                  <Text style={dynamicStyles.metricSubtext}>Выполнение</Text>
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
    </View>
  );
};

export default MetricsAnalyticsScreen;
