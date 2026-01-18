/**
 * Dashboard Screen
 * Экран сводки (главная страница)
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { DashboardStackParamList } from '@/navigation/types';

import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardHeader } from '../components/DashboardHeader';
import { SummaryCard } from '../components/SummaryCard';
import { NavigationCard } from '../components/NavigationCard';

type NavigationProp = NativeStackNavigationProp<DashboardStackParamList>;

export const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading, refresh } = useDashboardData();

  // Навигация к списку задач
  const navigateToTaskList = useCallback(() => {
    navigation.navigate('TaskList', undefined);
  }, [navigation]);

  // Навигация к списку опросов
  const navigateToPollList = useCallback(() => {
    navigation.navigate('PollList');
  }, [navigation]);

  // Навигация к аналитике
  const navigateToAnalytics = useCallback(() => {
    navigation.navigate('Analytics');
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DashboardHeader onRefresh={refresh} />

      <View style={styles.content}>
        {/* Сводка */}
        <SummaryCard
          counts={data?.counts || null}
          isLoading={isLoading}
          onPressNewTasks={() => navigation.navigate('TaskList', { filterCategory: 'new' })}
          onPressOverdue={() => navigation.navigate('TaskList', { filterCategory: 'overdue' })}
          onPressPolls={navigateToPollList}
        />

        {/* Навигационные карточки */}
        <View style={styles.navigationCards}>
          <NavigationCard
            title="Задачи"
            description="Управление задачами и проектами"
            icon="checkbox"
            color="#3B82F6"
            onPress={navigateToTaskList}
          />
          <NavigationCard
            title="Опросы"
            description="Голосования и опросы"
            icon="bar-chart"
            color="#8B5CF6"
            onPress={navigateToPollList}
          />
          <NavigationCard
            title="Аналитика"
            description="Статистика и графики"
            icon="analytics"
            color="#10B981"
            onPress={navigateToAnalytics}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 20,
  },
  navigationCards: {
    gap: 12,
  },
});

export default DashboardScreen;
