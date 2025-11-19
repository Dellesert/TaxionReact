/**
 * Departments Analytics Screen
 * Статистика по отделам
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
  getDepartmentTaskStats,
  type PeriodType,
  type DepartmentTaskStats,
} from '@api/analytics.api';

const DepartmentsAnalyticsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();

  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('week');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [departmentStats, setDepartmentStats] = useState<DepartmentTaskStats[]>([]);

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
    departmentList: {
      gap: 16,
    },
    departmentCard: {
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 16,
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
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
    },
    departmentCompletionText: {
      fontSize: 20,
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
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 4,
    },
    departmentStatBoxValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.text,
    },
    departmentStatBoxLabel: {
      fontSize: 11,
      color: theme.textTertiary,
      textAlign: 'center',
    },
    additionalInfo: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    infoItem: {
      alignItems: 'center',
    },
    infoLabel: {
      fontSize: 11,
      color: theme.textTertiary,
      marginBottom: 4,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: '600',
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
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  if (isLoading && departmentStats.length === 0) {
    return (
      <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
        <View style={dynamicStyles.header}>
          <TouchableOpacity
            style={dynamicStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text style={dynamicStyles.headerTitle}>Статистика отделов</Text>
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
        <Text style={dynamicStyles.headerTitle}>🏢 Статистика отделов</Text>
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

        {departmentStats.length > 0 ? (
          <View style={dynamicStyles.departmentList}>
            {departmentStats.map((dept) => (
              <View key={dept.department_id} style={dynamicStyles.departmentCard}>
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
                      <Ionicons name="layers-outline" size={18} color="#6B7280" />
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
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
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
                      <Ionicons name="time-outline" size={18} color="#F59E0B" />
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
                      <Ionicons name="alert-circle" size={18} color="#EF4444" />
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
            ))}
          </View>
        ) : (
          <View style={dynamicStyles.emptyState}>
            <Ionicons name="business-outline" size={64} color={theme.textTertiary} />
            <Text style={dynamicStyles.emptyStateText}>Нет данных по отделам</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DepartmentsAnalyticsScreen;
