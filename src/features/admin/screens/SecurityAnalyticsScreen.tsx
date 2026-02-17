/**
 * Security Analytics Screen
 * Безопасность и подозрительная активность
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { setStatusBarStyle } from 'expo-status-bar';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { TitleBarBackButton } from '@features/tasks/components/common/TitleBarBackButton';
import {
  getSecurityDashboard,
  type SecurityDashboardData,
} from '@api/analytics.api';

const SecurityAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { showError } = useNotification();

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'ios') {
        setStatusBarStyle(isDark ? 'light' : 'dark');
      }
    }, [isDark])
  );

  // На мобильных экранах показываем одну карточку в ряд
  const isSmallScreen = width < 600;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [securityData, setSecurityData] = useState<SecurityDashboardData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

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
    pageTitle: 'Безопасность',
    leftControls: titleBarLeftControls,
    rightControls: null,
    enabled: isElectron,
  });

  useEffect(() => {
    loadSecurityData();
  }, [selectedPeriod]);

  const loadSecurityData = async () => {
    try {
      setIsLoading(true);
      const data = await getSecurityDashboard(selectedPeriod);
      setSecurityData(data);
    } catch (error: any) {
      console.error('Failed to load security data:', error);
      showError('Не удалось загрузить данные безопасности');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadSecurityData();
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

  const getSeverityIcon = (severity: string): string => {
    switch (severity) {
      case 'critical':
      case 'high':
        return 'alert-circle';
      case 'medium':
        return 'warning';
      case 'low':
        return 'information-circle';
      default:
        return 'shield-checkmark';
    }
  };

  const periods = [
    { key: '1d', label: '24ч' },
    { key: '7d', label: '7д' },
    { key: '30d', label: '30д' },
    { key: '90d', label: '90д' },
  ];

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
      maxWidth: 1400,
      width: '100%',
      alignSelf: 'center',
    },
    sectionHeader: {
      marginBottom: 20,
    },
    sectionHeaderTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      letterSpacing: -0.4,
    },
    sectionHeaderDescription: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    periodSelector: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 24,
      padding: 4,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
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
      fontSize: 15,
      fontWeight: '600',
      color: theme.textSecondary,
    },
    periodButtonTextActive: {
      color: '#FFFFFF',
      fontWeight: '700',
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
      marginBottom: 24,
    },
    statsCardWrapper: {
      width: isSmallScreen ? '100%' : '50%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    statsCard: {
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
    statsTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
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
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
      letterSpacing: -0.3,
    },
    activityList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
    },
    activityCardWrapper: {
      width: isSmallScreen ? '100%' : '50%',
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    activityCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 20,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 6,
      elevation: 2,
      ...(Platform.OS === 'web' && { height: '100%' }),
    },
    activityHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    activityTypeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    activityType: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      letterSpacing: -0.2,
    },
    severityBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    severityText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    activityDescription: {
      fontSize: 15,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 22,
    },
    activityMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    metaText: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    metaValue: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
    },
    timestamp: {
      fontSize: 11,
      color: theme.textTertiary,
      marginTop: 8,
    },
    resolvedBadge: {
      marginTop: 8,
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: 4,
    },
    resolvedText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#10B981',
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
    ipListCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 3,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    ipItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    ipItemLast: {
      borderBottomWidth: 0,
    },
    ipAddress: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    ipCount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#EF4444',
    },
  });

  if (isLoading && !securityData) {
    return (
      <View style={dynamicStyles.container}>
        {!isElectron && (
          <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
            <View style={dynamicStyles.header}>
              <TouchableOpacity style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <Text style={dynamicStyles.headerTitle}>Безопасность</Text>
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
            <Text style={dynamicStyles.headerTitle}>Безопасность</Text>
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
            <Text style={dynamicStyles.sectionHeaderTitle}>Безопасность</Text>
            <Text style={dynamicStyles.sectionHeaderDescription}>
              Мониторинг безопасности и подозрительной активности
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

        {securityData ? (
          <>
            {/* Stats Grid */}
            <View style={dynamicStyles.statsGrid}>
              {/* Login Statistics */}
              <View style={dynamicStyles.statsCardWrapper}>
                <View style={dynamicStyles.statsCard}>
                  <Text style={dynamicStyles.statsTitle}>Статистика входов</Text>
                  <View style={dynamicStyles.statsRow}>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#10B981' }]}>
                        {securityData.login_stats?.successful || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Успешных</Text>
                    </View>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#EF4444' }]}>
                        {securityData.login_stats?.failed || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Неудачных</Text>
                    </View>
                    <View style={dynamicStyles.statBox}>
                      <Text style={dynamicStyles.statValue}>
                        {(securityData.login_stats?.success_rate || 0).toFixed(0)}%
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Успешность</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Security Overview */}
              <View style={dynamicStyles.statsCardWrapper}>
                <View style={dynamicStyles.statsCard}>
                  <Text style={dynamicStyles.statsTitle}>Обзор безопасности</Text>
                  <View style={dynamicStyles.statsRow}>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#EF4444' }]}>
                        {securityData.unresolved_activities_count || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Не решено</Text>
                    </View>
                    <View style={dynamicStyles.statBox}>
                      <Text style={[dynamicStyles.statValue, { color: '#10B981' }]}>
                        {securityData.active_sessions_count || 0}
                      </Text>
                      <Text style={dynamicStyles.statLabel}>Активных сессий</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Top Failed IPs */}
            {securityData.top_failed_ips && securityData.top_failed_ips.length > 0 && (
              <View style={dynamicStyles.ipListCard}>
                <Text style={dynamicStyles.sectionTitle}>
                  IP с неудачными попытками входа
                </Text>
                {securityData.top_failed_ips.slice(0, 5).map((ip, index) => (
                  <View
                    key={ip.ip_address}
                    style={[
                      dynamicStyles.ipItem,
                      index === securityData.top_failed_ips!.length - 1 && dynamicStyles.ipItemLast,
                    ]}
                  >
                    <Text style={dynamicStyles.ipAddress}>{ip.ip_address}</Text>
                    <Text style={dynamicStyles.ipCount}>{ip.count} попыток</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Suspicious Activities */}
            {securityData.suspicious_activities && securityData.suspicious_activities.length > 0 && (
              <>
                <Text style={dynamicStyles.sectionTitle}>Подозрительная активность</Text>
                <View style={dynamicStyles.activityList}>
                  {securityData.suspicious_activities.map((activity) => (
                    <View key={activity.id} style={dynamicStyles.activityCardWrapper}>
                    <View
                      style={[
                        dynamicStyles.activityCard,
                        { borderLeftColor: getSeverityColor(activity.severity) },
                      ]}
                    >
                      <View style={dynamicStyles.activityHeader}>
                        <View style={dynamicStyles.activityTypeRow}>
                          <Ionicons
                            name={getSeverityIcon(activity.severity) as any}
                            size={20}
                            color={getSeverityColor(activity.severity)}
                          />
                          <Text style={dynamicStyles.activityType} numberOfLines={1}>
                            {activity.activity_type}
                          </Text>
                        </View>
                        <View
                          style={[
                            dynamicStyles.severityBadge,
                            { backgroundColor: getSeverityColor(activity.severity) },
                          ]}
                        >
                          <Text style={dynamicStyles.severityText}>
                            {getSeverityLabel(activity.severity)}
                          </Text>
                        </View>
                      </View>

                      <Text style={dynamicStyles.activityDescription}>
                        {activity.description}
                      </Text>

                      <View style={dynamicStyles.activityMeta}>
                        <View style={dynamicStyles.metaItem}>
                          <Ionicons name="globe-outline" size={14} color={theme.textTertiary} />
                          <Text style={dynamicStyles.metaValue}>{activity.ip_address}</Text>
                        </View>
                        {activity.email && (
                          <View style={dynamicStyles.metaItem}>
                            <Ionicons name="mail-outline" size={14} color={theme.textTertiary} />
                            <Text style={dynamicStyles.metaValue}>{activity.email}</Text>
                          </View>
                        )}
                      </View>

                      <Text style={dynamicStyles.timestamp}>
                        {new Date(activity.timestamp).toLocaleString('ru-RU')}
                      </Text>

                      {activity.is_resolved && (
                        <View style={dynamicStyles.resolvedBadge}>
                          <Text style={dynamicStyles.resolvedText}>✓ Решено</Text>
                        </View>
                      )}
                    </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {(!securityData.suspicious_activities || securityData.suspicious_activities.length === 0) && (
              <View style={dynamicStyles.emptyState}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={80}
                  color={theme.textTertiary}
                  style={dynamicStyles.emptyStateIcon}
                />
                <Text style={dynamicStyles.emptyStateText}>
                  Подозрительная активность не обнаружена
                </Text>
                <Text style={dynamicStyles.emptyStateSubtext}>
                  Система не выявила потенциальных угроз безопасности за выбранный период
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={dynamicStyles.emptyState}>
            <Ionicons
              name="shield-outline"
              size={80}
              color={theme.textTertiary}
              style={dynamicStyles.emptyStateIcon}
            />
            <Text style={dynamicStyles.emptyStateText}>Нет данных для отображения</Text>
            <Text style={dynamicStyles.emptyStateSubtext}>
              Данные безопасности временно недоступны
            </Text>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
};

export default SecurityAnalyticsScreen;
