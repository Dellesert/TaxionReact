/**
 * Dashboard Screen
 * Экран сводки (главная страница)
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { DashboardStackParamList, MainTabParamList } from '@/navigation/types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useDashboardData } from '../hooks/useDashboardData';
import { DashboardHeader } from '../components/DashboardHeader';
import { SummaryCard } from '../components/SummaryCard';
import { NavigationCard } from '../components/NavigationCard';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export const DashboardScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading, refresh, isRefreshing } = useDashboardData();

  // Навигация к списку задач
  const navigateToTaskList = useCallback(() => {
    navigation.navigate('TaskList', undefined);
  }, [navigation]);

  // Навигация к списку опросов
  const navigateToPollList = useCallback(() => {
    navigation.navigate('PollList');
  }, [navigation]);

  // Навигация к расписанию (список графиков)
  const navigateToSchedule = useCallback(() => {
    navigation.navigate('ScheduleList');
  }, [navigation]);

  // Навигация к календарю (события)
  const navigateToCalendar = useCallback(() => {
    navigation.navigate('Calendar', { screen: 'CalendarMain' });
  }, [navigation]);

  // Навигация к отсутствиям
  const navigateToAbsences = useCallback(() => {
    navigation.navigate('AbsenceList');
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <DashboardHeader />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* Сводка */}
        <SummaryCard
          counts={data?.counts || null}
          isLoading={isLoading}
          onPressNewTasks={() => navigation.navigate('TaskList', { filterCategory: 'new' })}
          onPressOverdue={() => navigation.navigate('TaskList', { filterCategory: 'overdue' })}
          onPressPolls={navigateToPollList}
          onPressEvents={navigateToCalendar}
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
            title="Расписание"
            description="График работы"
            icon="time"
            color="#10B981"
            onPress={navigateToSchedule}
          />
          <NavigationCard
            title="Отпуска"
            description="Отпуска и больничные"
            icon="calendar-clear"
            color="#F59E0B"
            onPress={navigateToAbsences}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 120,
    gap: 20,
  },
  navigationCards: {
    gap: 12,
  },
});

export default DashboardScreen;
