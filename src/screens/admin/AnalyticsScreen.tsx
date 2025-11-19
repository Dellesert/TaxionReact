import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import {
  getDashboardAnalytics,
  getTopPerformers,
  getDepartmentTaskStats,
  getSecurityDashboard,
  formatBytes,
  formatNumber,
  getPeriodValue,
  type PeriodType,
  type DashboardResponse,
  type EmployeePerformance,
  type DepartmentTaskStats,
  type SecurityDashboardData,
} from '@api/analytics.api';

const AnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(null);
  const [topPerformers, setTopPerformers] = useState<EmployeePerformance[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentTaskStats[]>([]);
  const [securityData, setSecurityData] = useState<SecurityDashboardData | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);

      const [dashboard, performers, departments, security] = await Promise.all([
        getDashboardAnalytics(selectedPeriod),
        getTopPerformers(3).catch(err => {
          console.warn('Failed to load top performers:', err);
          return [];
        }),
        getDepartmentTaskStats(selectedPeriod).catch(err => {
          console.warn('Failed to load department stats:', err);
          return [];
        }),
        getSecurityDashboard('7d').catch(err => {
          console.warn('Failed to load security data:', err);
          return null;
        }),
      ]);

      console.log('📊 Dashboard data:', dashboard);
      console.log('🏆 Top performers:', performers);
      console.log('📈 Department stats:', departments);
      console.log('🔒 Security data:', security);

      setDashboardData(dashboard);
      setTopPerformers(performers || []);
      setDepartmentStats(departments || []);
      setSecurityData(security);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      showError('Не удалось загрузить аналитику');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAnalytics();
  };

  const getPeriodLabel = (period: PeriodType): string => {
    switch (period) {
      case 'today':
        return 'Сегодня';
      case 'week':
        return 'Неделя';
      case 'month':
        return 'Месяц';
      case 'year':
        return 'Год';
      default:
        return 'Неделя';
    }
  };

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

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EF4444';
      case 'medium':
        return '#F59E0B';
      case 'low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getSeverityLabel = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'Критический';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return severity;
    }
  };

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
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    backButton: {
      padding: 4,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
      flex: 1,
    },
    refreshButton: {
      padding: 4,
    },
    scrollContent: {
      padding: 12,
      paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 80 : 32,
    },
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 4,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
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
    section: {
      marginBottom: 24,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottomWidth: 2,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
    },
    sectionSubtitle: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
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
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    metricIcon: {
      width: 36,
      height: 36,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    metricLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    metricValue: {
      fontSize: 24,
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
      height: 6,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
      borderRadius: 3,
      marginTop: 8,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 3,
    },
    performersList: {
      gap: 12,
    },
    performerCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    medal: {
      fontSize: 32,
      marginRight: 12,
    },
    performerInfo: {
      flex: 1,
    },
    performerName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    performerDepartment: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 6,
    },
    performerStats: {
      flexDirection: 'row',
      gap: 12,
    },
    performerStat: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    performerStatValue: {
      fontWeight: '600',
      color: theme.text,
    },
    departmentList: {
      gap: 12,
    },
    departmentCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    departmentHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    departmentTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    departmentName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    departmentCompletionText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.primary,
    },
    departmentProgressContainer: {
      marginBottom: 16,
    },
    departmentProgressBar: {
      height: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    departmentProgressFill: {
      height: '100%',
      borderRadius: 4,
    },
    departmentStatsGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    departmentStatBox: {
      flex: 1,
      alignItems: 'center',
      gap: 4,
    },
    departmentStatIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    departmentStatBoxValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
    },
    departmentStatBoxLabel: {
      fontSize: 11,
      color: theme.textTertiary,
      textAlign: 'center',
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
      padding: 32,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    divider: {
      height: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      marginVertical: 16,
    },
    securityCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    securityStatsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    securityStatBox: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
    },
    securityStatValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    securityStatLabel: {
      fontSize: 11,
      color: theme.textTertiary,
      textAlign: 'center',
    },
    activityList: {
      gap: 8,
    },
    activityItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
      borderRadius: 8,
      borderLeftWidth: 3,
    },
    activityContent: {
      flex: 1,
      marginLeft: 12,
    },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    activityType: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    severityBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    severityText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
    },
    activityDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    activityMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    activityMetaText: {
      fontSize: 11,
      color: theme.textTertiary,
    },
  });

  if (isLoading && !dashboardData) {
    return (
      <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Аналитика</Text>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={dynamicStyles.loadingText}>Загрузка аналитики...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity
          style={dynamicStyles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Аналитика</Text>
        <TouchableOpacity
          style={dynamicStyles.refreshButton}
          onPress={handleRefresh}
          disabled={isRefreshing}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="refresh" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={dynamicStyles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      >
        {/* Period Selector */}
        <View style={dynamicStyles.periodSelector}>
          {(['today', 'week', 'month', 'year'] as PeriodType[]).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                dynamicStyles.periodButton,
                selectedPeriod === period && dynamicStyles.periodButtonActive,
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  dynamicStyles.periodButtonText,
                  selectedPeriod === period && dynamicStyles.periodButtonTextActive,
                ]}
              >
                {getPeriodLabel(period)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {dashboardData && (
          <>
            {/* Main Metrics */}
            <View style={dynamicStyles.section}>
              <View style={dynamicStyles.sectionHeader}>
                <View>
                  <Text style={dynamicStyles.sectionTitle}>📊 Основные показатели</Text>
                  <Text style={dynamicStyles.sectionSubtitle}>Ключевые метрики системы</Text>
                </View>
              </View>
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
                    {formatNumber(getPeriodValue(dashboardData.stats.active_users, selectedPeriod))}
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
                  <Text style={dynamicStyles.metricLabel}>Сообщений</Text>
                  <Text style={dynamicStyles.metricValue}>
                    {formatNumber(getPeriodValue(dashboardData.stats.messages, selectedPeriod))}
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
              </View>
            </View>

            {/* Divider */}
            <View style={dynamicStyles.divider} />

            {/* Top Performers */}
            <View style={dynamicStyles.section}>
              <View style={dynamicStyles.sectionHeader}>
                <View>
                  <Text style={dynamicStyles.sectionTitle}>🏆 Топ сотрудников</Text>
                  <Text style={dynamicStyles.sectionSubtitle}>Лучшие по производительности</Text>
                </View>
              </View>
              {topPerformers.length > 0 ? (
                <View style={dynamicStyles.performersList}>
                  {topPerformers.map((performer, index) => (
                    <View key={performer.user_id} style={dynamicStyles.performerCard}>
                      <Text style={dynamicStyles.medal}>{getMedalEmoji(index)}</Text>
                      <View style={dynamicStyles.performerInfo}>
                        <Text style={dynamicStyles.performerName}>{performer.user_name}</Text>
                        {performer.department_name && (
                          <Text style={dynamicStyles.performerDepartment}>
                            {performer.department_name}
                          </Text>
                        )}
                        <View style={dynamicStyles.performerStats}>
                          <Text style={dynamicStyles.performerStat}>
                            Завершено:{' '}
                            <Text style={dynamicStyles.performerStatValue}>
                              {performer.tasks_completed || 0}
                            </Text>
                          </Text>
                          <Text style={dynamicStyles.performerStat}>
                            Качество:{' '}
                            <Text style={dynamicStyles.performerStatValue}>
                              {(performer.quality_score || 0).toFixed(0)}%
                            </Text>
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={dynamicStyles.emptyState}>
                  <Ionicons name="trophy-outline" size={48} color={theme.textTertiary} />
                  <Text style={dynamicStyles.emptyStateText}>
                    Нет данных о сотрудниках
                  </Text>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={dynamicStyles.divider} />

            {/* Security Section */}
            {securityData && (
              <>
                <View style={dynamicStyles.section}>
                  <View style={dynamicStyles.sectionHeader}>
                    <View>
                      <Text style={dynamicStyles.sectionTitle}>🔒 Безопасность</Text>
                      <Text style={dynamicStyles.sectionSubtitle}>Подозрительная активность</Text>
                    </View>
                  </View>

                  <View style={dynamicStyles.securityCard}>
                    {/* Security Stats */}
                    <View style={dynamicStyles.securityStatsRow}>
                      <View style={dynamicStyles.securityStatBox}>
                        <Text style={[dynamicStyles.securityStatValue, { color: '#EF4444' }]}>
                          {securityData.unresolved_activities_count || 0}
                        </Text>
                        <Text style={dynamicStyles.securityStatLabel}>Не решено</Text>
                      </View>
                      <View style={dynamicStyles.securityStatBox}>
                        <Text style={[dynamicStyles.securityStatValue, { color: '#F59E0B' }]}>
                          {securityData.login_stats?.failed || 0}
                        </Text>
                        <Text style={dynamicStyles.securityStatLabel}>Неудачных входов</Text>
                      </View>
                      <View style={dynamicStyles.securityStatBox}>
                        <Text style={[dynamicStyles.securityStatValue, { color: '#10B981' }]}>
                          {securityData.active_sessions_count || 0}
                        </Text>
                        <Text style={dynamicStyles.securityStatLabel}>Активных сессий</Text>
                      </View>
                    </View>

                    {/* Recent Suspicious Activities */}
                    {securityData.suspicious_activities && securityData.suspicious_activities.length > 0 && (
                      <>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.text, marginBottom: 8 }}>
                          Последние инциденты
                        </Text>
                        <View style={dynamicStyles.activityList}>
                          {securityData.suspicious_activities.slice(0, 3).map((activity) => (
                            <View
                              key={activity.id}
                              style={[
                                dynamicStyles.activityItem,
                                { borderLeftColor: getSeverityColor(activity.severity) },
                              ]}
                            >
                              <Ionicons
                                name="shield-checkmark"
                                size={20}
                                color={getSeverityColor(activity.severity)}
                              />
                              <View style={dynamicStyles.activityContent}>
                                <View style={dynamicStyles.activityHeader}>
                                  <Text style={dynamicStyles.activityType} numberOfLines={1}>
                                    {activity.activity_type}
                                  </Text>
                                  <View style={[dynamicStyles.severityBadge, { backgroundColor: getSeverityColor(activity.severity) }]}>
                                    <Text style={dynamicStyles.severityText}>
                                      {getSeverityLabel(activity.severity)}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={dynamicStyles.activityDescription} numberOfLines={2}>
                                  {activity.description}
                                </Text>
                                <View style={dynamicStyles.activityMeta}>
                                  <Text style={dynamicStyles.activityMetaText}>
                                    IP: {activity.ip_address}
                                  </Text>
                                  {activity.email && (
                                    <Text style={dynamicStyles.activityMetaText}>
                                      • {activity.email}
                                    </Text>
                                  )}
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* Divider */}
                <View style={dynamicStyles.divider} />
              </>
            )}

            {/* Department Statistics */}
            <View style={dynamicStyles.section}>
              <View style={dynamicStyles.sectionHeader}>
                <View>
                  <Text style={dynamicStyles.sectionTitle}>🏢 Статистика по отделам</Text>
                  <Text style={dynamicStyles.sectionSubtitle}>Эффективность работы отделов</Text>
                </View>
              </View>
              {departmentStats.length > 0 ? (
                <View style={dynamicStyles.departmentList}>
                  {departmentStats.map((dept) => (
                    <View key={dept.department_id} style={dynamicStyles.departmentCard}>
                      {/* Header with name and completion rate */}
                      <View style={dynamicStyles.departmentHeader}>
                        <View style={dynamicStyles.departmentTitleRow}>
                          <Ionicons name="business" size={18} color={theme.primary} />
                          <Text style={dynamicStyles.departmentName}>{dept.department_name}</Text>
                        </View>
                        <Text style={dynamicStyles.departmentCompletionText}>
                          {(dept.completion_rate || 0).toFixed(0)}%
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View style={dynamicStyles.departmentProgressContainer}>
                        <View style={dynamicStyles.departmentProgressBar}>
                          <View
                            style={[
                              dynamicStyles.departmentProgressFill,
                              {
                                width: `${dept.completion_rate || 0}%`,
                                backgroundColor:
                                  (dept.completion_rate || 0) >= 80
                                    ? '#10B981'
                                    : (dept.completion_rate || 0) >= 50
                                    ? '#F59E0B'
                                    : '#EF4444',
                              },
                            ]}
                          />
                        </View>
                      </View>

                      {/* Stats grid */}
                      <View style={dynamicStyles.departmentStatsGrid}>
                        <View style={dynamicStyles.departmentStatBox}>
                          <View style={dynamicStyles.departmentStatIconContainer}>
                            <Ionicons name="layers-outline" size={16} color="#6B7280" />
                          </View>
                          <Text style={dynamicStyles.departmentStatBoxValue}>
                            {dept.total_tasks || 0}
                          </Text>
                          <Text style={dynamicStyles.departmentStatBoxLabel}>Всего</Text>
                        </View>

                        <View style={dynamicStyles.departmentStatBox}>
                          <View style={[dynamicStyles.departmentStatIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                          </View>
                          <Text style={[dynamicStyles.departmentStatBoxValue, { color: '#10B981' }]}>
                            {dept.completed_tasks || 0}
                          </Text>
                          <Text style={dynamicStyles.departmentStatBoxLabel}>Готово</Text>
                        </View>

                        <View style={dynamicStyles.departmentStatBox}>
                          <View style={[dynamicStyles.departmentStatIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                            <Ionicons name="time-outline" size={16} color="#F59E0B" />
                          </View>
                          <Text style={[dynamicStyles.departmentStatBoxValue, { color: '#F59E0B' }]}>
                            {dept.in_progress_tasks || 0}
                          </Text>
                          <Text style={dynamicStyles.departmentStatBoxLabel}>В работе</Text>
                        </View>

                        <View style={dynamicStyles.departmentStatBox}>
                          <View style={[dynamicStyles.departmentStatIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                            <Ionicons name="alert-circle" size={16} color="#EF4444" />
                          </View>
                          <Text style={[dynamicStyles.departmentStatBoxValue, { color: '#EF4444' }]}>
                            {dept.overdue_tasks || 0}
                          </Text>
                          <Text style={dynamicStyles.departmentStatBoxLabel}>Просрочено</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={dynamicStyles.emptyState}>
                  <Ionicons name="business-outline" size={48} color={theme.textTertiary} />
                  <Text style={dynamicStyles.emptyStateText}>
                    Нет данных по отделам
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        {!dashboardData && !isLoading && (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="bar-chart-outline" size={64} color={theme.textTertiary} />
            <Text style={dynamicStyles.emptyStateText}>
              Нет данных для отображения
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AnalyticsScreen;
