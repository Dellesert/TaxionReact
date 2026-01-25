/**
 * Dashboard Screen
 * Экран сводки (главная страница)
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@shared/hooks/useTheme';
import { DashboardStackParamList, MainTabParamList } from '@/navigation/types';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useDashboardData } from '../hooks/useDashboardData';
import { SummaryCard } from '../components/SummaryCard';
import { NavigationCard } from '../components/NavigationCard';

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<MainTabParamList>
>;

export const DashboardScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { data, isLoading, refresh, isRefreshing } = useDashboardData();

  // Тихое обновление данных при возврате на экран (без дёргания ScrollView)
  useFocusEffect(
    useCallback(() => {
      refresh(true);
    }, [refresh])
  );

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
        <View style={styles.summarySection}>
          <SummaryCard
            counts={data?.counts || null}
            isLoading={isLoading}
            onPressNewTasks={() => navigation.navigate('TaskList', { filterCategory: 'new' })}
            onPressOverdue={() => navigation.navigate('TaskList', { filterCategory: 'overdue' })}
            onPressPolls={navigateToPollList}
            onPressEvents={navigateToCalendar}
          />
        </View>

        {/* Навигационные карточки в общей карточке */}
        <View
          style={[
            styles.navigationWrapper,
            {
              backgroundColor: isDark ? theme.backgroundSecondary : '#FFFFFF',
            },
          ]}
        >
          <View style={styles.navigationCards}>
            <View style={styles.cardRow}>
              <NavigationCard
                title="Расписание"
                description="График работы"
                icon="time"
                color="#10B981"
                onPress={navigateToSchedule}
              />
              <NavigationCard
                title="Нерабочие дни"
                description="Отпуска и больничные"
                icon="calendar-clear"
                color="#F59E0B"
                onPress={navigateToAbsences}
              />
            </View>
            <View style={styles.cardRow}>
              <NavigationCard
                title="Задачи"
                description="Управление задачами"
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
            </View>
          </View>
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
    // без отступов - карточки впритык
  },
  summarySection: {
    // без отступов - карточка на всю ширину
  },
  navigationWrapper: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 140,
    marginTop: -24, // перекрытие для плавного перехода
  },
  navigationCards: {
    gap: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default DashboardScreen;
