/**
 * Dashboard Counts Row
 * Ряд карточек со счетчиками
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardCountCard } from './DashboardCountCard';
import { DashboardCounts } from '../types/dashboard.types';

interface DashboardCountsRowProps {
  counts: DashboardCounts;
  onPressNewTasks?: () => void;
  onPressActiveTasks?: () => void;
  onPressOverdueTasks?: () => void;
  onPressPendingPolls?: () => void;
}

export const DashboardCountsRow: React.FC<DashboardCountsRowProps> = ({
  counts,
  onPressNewTasks,
  onPressActiveTasks,
  onPressOverdueTasks,
  onPressPendingPolls,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <DashboardCountCard
          count={counts.new_tasks_count}
          label="Новых"
          icon="document-text"
          color="#F59E0B"
          onPress={onPressNewTasks}
        />
        <DashboardCountCard
          count={counts.active_tasks_count}
          label="В работе"
          icon="time"
          color="#3B82F6"
          onPress={onPressActiveTasks}
        />
      </View>
      <View style={styles.row}>
        <DashboardCountCard
          count={counts.overdue_tasks_count}
          label="Просрочено"
          icon="alert-circle"
          color="#EF4444"
          onPress={onPressOverdueTasks}
        />
        <DashboardCountCard
          count={counts.pending_polls_count}
          label="Опросов"
          icon="bar-chart"
          color="#8B5CF6"
          onPress={onPressPendingPolls}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});

export default DashboardCountsRow;
