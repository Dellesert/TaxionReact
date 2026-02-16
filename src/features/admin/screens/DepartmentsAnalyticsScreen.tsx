/**
 * Departments Analytics Screen
 * Статистика по отделам
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
  getDepartmentTaskStats,
  type PeriodType,
  type DepartmentTaskStats,
} from '@api/analytics.api';

const DepartmentsAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const { showError } = useNotification();

  // Адаптивная ширина карточек: 1 на мобильных, 2 на планшетах, 3 на десктопе
  const getCardWidth = () => {
    if (width < 600) return '100%';
    if (width < 900) return '50%';
    return '33.333%';
  };

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [departmentStats, setDepartmentStats] = useState<DepartmentTaskStats[]>([]);

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
    pageTitle: 'Статистика отделов',
    leftControls: titleBarLeftControls,
    rightControls: null,
    enabled: isElectron,
  });

  useEffect(() => {
    loadDepartments();
  }, [selectedPeriod]);

  const loadDepartments = async () => {
    try {
      setIsLoading(true);
      const departments = await getDepartmentTaskStats(selectedPeriod);
      setDepartmentStats(departments || []);
    } catch (error: any) {
      console.error('Failed to load department stats:', error);
      showError('Не удалось загрузить статистику отделов');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    setIsRefreshing(true);
    loadDepartments();
  };

  const periods: { key: PeriodType; label: string }[] = [
    { key: 'today', label: 'Сегодня' },
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'year', label: 'Год' },
  ];

  const getCompletionColor = (rate: number): string => {
    if (rate >= 80) return '#10B981';
    if (rate >= 50) return '#F59E0B';
    return '#EF4444';
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
      maxWidth: 1400,
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
    departmentList: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -8,
    },
    departmentCardWrapper: {
      width: getCardWidth(),
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    departmentCard: {
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
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      letterSpacing: -0.3,
    },
    departmentCompletionText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.primary,
    },
    departmentProgressContainer: {
      marginBottom: 16,
    },
    departmentProgressBar: {
      height: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
      borderRadius: 5,
      overflow: 'hidden',
    },
    departmentProgressFill: {
      height: '100%',
      borderRadius: 5,
    },
    departmentStatsGrid: {
      flexDirection: 'row',
      gap: 12,
    },
    departmentStatBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    },
    departmentStatIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 6,
    },
    departmentStatBoxValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    departmentStatBoxLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    additionalInfo: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    infoItem: {
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
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

  if (isLoading && departmentStats.length === 0) {
    return (
      <View style={dynamicStyles.container}>
        {!isElectron && (
          <SafeAreaView style={{ backgroundColor: theme.backgroundSecondary }} edges={['top']}>
            <View style={dynamicStyles.header}>
              <TouchableOpacity style={dynamicStyles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={theme.primary} />
              </TouchableOpacity>
              <Text style={dynamicStyles.headerTitle}>Статистика отделов</Text>
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
            <Text style={dynamicStyles.headerTitle}>Статистика отделов</Text>
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
            <Text style={dynamicStyles.sectionTitle}>Статистика отделов</Text>
            <Text style={dynamicStyles.sectionDescription}>
              Показатели эффективности и производительности по отделам
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

        {departmentStats.length > 0 ? (
          <View style={dynamicStyles.departmentList}>
            {departmentStats.map((dept) => (
              <View key={dept.department_id} style={dynamicStyles.departmentCardWrapper}>
              <View style={dynamicStyles.departmentCard}>
                {/* Header with name and completion rate */}
                <View style={dynamicStyles.departmentHeader}>
                  <View style={dynamicStyles.departmentTitleRow}>
                    <Ionicons name="business" size={20} color={theme.primary} />
                    <Text style={dynamicStyles.departmentName}>{dept.department_name}</Text>
                  </View>
                  <Text
                    style={[
                      dynamicStyles.departmentCompletionText,
                      { color: getCompletionColor(dept.completion_rate || 0) },
                    ]}
                  >
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
                          backgroundColor: getCompletionColor(dept.completion_rate || 0),
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Stats grid */}
                <View style={dynamicStyles.departmentStatsGrid}>
                  <View style={dynamicStyles.departmentStatBox}>
                    <View style={dynamicStyles.departmentStatIconContainer}>
                      <Ionicons name="layers-outline" size={20} color="#6B7280" />
                    </View>
                    <Text style={dynamicStyles.departmentStatBoxValue}>
                      {dept.total_tasks || 0}
                    </Text>
                    <Text style={dynamicStyles.departmentStatBoxLabel}>Всего</Text>
                  </View>

                  <View style={dynamicStyles.departmentStatBox}>
                    <View
                      style={[
                        dynamicStyles.departmentStatIconContainer,
                        { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                      ]}
                    >
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <Text style={[dynamicStyles.departmentStatBoxValue, { color: '#10B981' }]}>
                      {dept.completed_tasks || 0}
                    </Text>
                    <Text style={dynamicStyles.departmentStatBoxLabel}>Готово</Text>
                  </View>

                  <View style={dynamicStyles.departmentStatBox}>
                    <View
                      style={[
                        dynamicStyles.departmentStatIconContainer,
                        { backgroundColor: 'rgba(245, 158, 11, 0.1)' },
                      ]}
                    >
                      <Ionicons name="time-outline" size={20} color="#F59E0B" />
                    </View>
                    <Text style={[dynamicStyles.departmentStatBoxValue, { color: '#F59E0B' }]}>
                      {dept.in_progress_tasks || 0}
                    </Text>
                    <Text style={dynamicStyles.departmentStatBoxLabel}>В работе</Text>
                  </View>

                  <View style={dynamicStyles.departmentStatBox}>
                    <View
                      style={[
                        dynamicStyles.departmentStatIconContainer,
                        { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                      ]}
                    >
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    </View>
                    <Text style={[dynamicStyles.departmentStatBoxValue, { color: '#EF4444' }]}>
                      {dept.overdue_tasks || 0}
                    </Text>
                    <Text style={dynamicStyles.departmentStatBoxLabel}>Просрочено</Text>
                  </View>
                </View>

                {/* Additional Info */}
                <View style={dynamicStyles.additionalInfo}>
                  <View style={dynamicStyles.infoItem}>
                    <Text style={dynamicStyles.infoLabel}>Сотрудников</Text>
                    <Text style={dynamicStyles.infoValue}>{dept.employee_count || 0}</Text>
                  </View>
                  <View style={dynamicStyles.infoItem}>
                    <Text style={dynamicStyles.infoLabel}>Среднее время</Text>
                    <Text style={dynamicStyles.infoValue}>
                      {(dept.avg_completion_time || 0).toFixed(1)}ч
                    </Text>
                  </View>
                  <View style={dynamicStyles.infoItem}>
                    <Text style={dynamicStyles.infoLabel}>Эффективность</Text>
                    <Text
                      style={[
                        dynamicStyles.infoValue,
                        { color: getCompletionColor(dept.completion_rate || 0) },
                      ]}
                    >
                      {(dept.completion_rate || 0).toFixed(0)}%
                    </Text>
                  </View>
                </View>
              </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={dynamicStyles.emptyState}>
            <Ionicons
              name="business-outline"
              size={80}
              color={theme.textTertiary}
              style={dynamicStyles.emptyStateIcon}
            />
            <Text style={dynamicStyles.emptyStateText}>Нет данных за выбранный период</Text>
            <Text style={dynamicStyles.emptyStateSubtext}>
              Попробуйте выбрать другой период или дождитесь появления активности в отделах
            </Text>
          </View>
        )}
        </View>
      </ScrollView>
    </View>
  );
};

export default DepartmentsAnalyticsScreen;
