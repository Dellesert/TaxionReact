/**
 * Security Analytics Screen
 * Безопасность и подозрительная активность
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
  getSecurityDashboard,
  type SecurityDashboardData,
} from '@api/analytics.api';

const SecurityAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [securityData, setSecurityData] = useState<SecurityDashboardData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

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
      paddingBottom: Platform.OS === 'web' ? 100 : Platform.OS === 'ios' ? 80 : 32,
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
    statsCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    statsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statBox: {
      flex: 1,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
    },
    statValue: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 11,
      color: theme.textTertiary,
      textAlign: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },
    activityList: {
      gap: 12,
    },
    activityCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      padding: 16,
      borderLeftWidth: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.2 : 0.05,
      shadowRadius: 2,
      elevation: 1,
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
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      flex: 1,
    },
    severityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    severityText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    activityDescription: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 20,
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
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    ipListCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
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
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    ipCount: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#EF4444',
    },
  });

  if (isLoading && !securityData) {
    return (
      <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Безопасность</Text>
        </View>
        <View style={dynamicStyles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={dynamicStyles.loadingText}>Загрузка данных...</Text>
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
        >
          <Ionicons name="chevron-back" size={24} color={theme.primary} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>🔒 Безопасность</Text>
      </View>

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

        {securityData ? (
          <>
            {/* Login Statistics */}
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

            {/* Security Overview */}
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
                    <View
                      key={activity.id}
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
                  ))}
                </View>
              </>
            )}

            {(!securityData.suspicious_activities || securityData.suspicious_activities.length === 0) && (
              <View style={dynamicStyles.emptyState}>
                <Ionicons name="shield-checkmark-outline" size={64} color={theme.textTertiary} />
                <Text style={dynamicStyles.emptyStateText}>
                  Подозрительная активность не обнаружена
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="shield-outline" size={64} color={theme.textTertiary} />
            <Text style={dynamicStyles.emptyStateText}>Нет данных для отображения</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default SecurityAnalyticsScreen;
