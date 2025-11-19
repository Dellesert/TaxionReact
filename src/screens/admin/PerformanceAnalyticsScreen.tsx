/**
 * Performance Analytics Screen
 * Топ сотрудников по производительности
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
  getTopPerformers,
  type EmployeePerformance,
  type PeriodType,
} from '@api/analytics.api';

const PerformanceAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
    performersList: {
      gap: 12,
    },
    performerCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    rankContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    medal: {
      fontSize: 28,
    },
    rank: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    performerInfo: {
      flex: 1,
    },
    performerName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    performerDepartment: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    performerStats: {
      flexDirection: 'row',
      gap: 16,
    },
    performerStat: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    performerStatValue: {
      fontWeight: '600',
      color: theme.text,
    },
    scoreContainer: {
      alignItems: 'center',
      paddingLeft: 12,
      borderLeftWidth: 1,
      borderLeftColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
    },
    scoreLabel: {
      fontSize: 11,
      color: theme.textTertiary,
      marginBottom: 4,
    },
    scoreValue: {
      fontSize: 24,
      fontWeight: 'bold',
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
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    detailsGrid: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    detailLabel: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
    },
  });

  if (isLoading && topPerformers.length === 0) {
    return (
      <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Топ сотрудников</Text>
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
        <Text style={dynamicStyles.headerTitle}>🏆 Топ сотрудников</Text>
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

        {topPerformers.length > 0 ? (
          <View style={dynamicStyles.performersList}>
            {topPerformers.map((performer, index) => (
              <View key={performer.user_id} style={dynamicStyles.performerCard}>
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
                  <View style={dynamicStyles.performerStats}>
                    <Text style={dynamicStyles.performerStat}>
                      Завершено:{' '}
                      <Text style={dynamicStyles.performerStatValue}>
                        {performer.tasks_completed || 0}
                      </Text>
                    </Text>
                    <Text style={dynamicStyles.performerStat}>
                      В работе:{' '}
                      <Text style={dynamicStyles.performerStatValue}>
                        {performer.tasks_in_progress || 0}
                      </Text>
                    </Text>
                  </View>

                  {/* Additional Details */}
                  <View style={dynamicStyles.detailsGrid}>
                    <View style={dynamicStyles.detailRow}>
                      <Text style={dynamicStyles.detailLabel}>Создано задач:</Text>
                      <Text style={dynamicStyles.detailValue}>{performer.tasks_created || 0}</Text>
                    </View>
                    <View style={dynamicStyles.detailRow}>
                      <Text style={dynamicStyles.detailLabel}>Просрочено:</Text>
                      <Text style={[dynamicStyles.detailValue, { color: '#EF4444' }]}>
                        {performer.tasks_overdue || 0}
                      </Text>
                    </View>
                    <View style={dynamicStyles.detailRow}>
                      <Text style={dynamicStyles.detailLabel}>% выполнения:</Text>
                      <Text style={[dynamicStyles.detailValue, { color: '#10B981' }]}>
                        {(performer.completion_rate || 0).toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Quality Score */}
                <View style={dynamicStyles.scoreContainer}>
                  <Text style={dynamicStyles.scoreLabel}>Качество</Text>
                  <Text style={dynamicStyles.scoreValue}>
                    {(performer.quality_score || 0).toFixed(0)}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="trophy-outline" size={64} color={theme.textTertiary} />
            <Text style={dynamicStyles.emptyStateText}>
              Нет данных о сотрудниках
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PerformanceAnalyticsScreen;
