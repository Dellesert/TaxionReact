import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task } from '../../types/task.types';
import type { TasksByStatus, TotalsByStatus, LoadingByStatus, CanLoadMoreByStatus, StatusTab } from '../../hooks/useTaskListData';
import type { AdvancedTaskFilters } from '../../utils/taskListHelpers';
import { TaskKanbanBoard } from '../kanban/TaskKanbanBoard';
import { TaskTableView } from '../lists/TaskTableView';
import { TaskListSkeleton } from '../states/TaskListSkeleton';

const STORAGE_KEY = '@task_view_mode';

export type ViewMode = 'board' | 'table';

interface TaskViewSwitcherProps {
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  canLoadMore: CanLoadMoreByStatus;
  isInitialLoading?: boolean;
  subtasksCache: Record<number, Task[]>;
  expandAllSubtasks: boolean;
  refreshing?: boolean;
  searchQuery: string;
  advancedFilters: AdvancedTaskFilters;
  onTaskPress: (task: Task) => void;
  onLoadMore: (status: StatusTab) => void;
  onRefresh?: () => void;
  onExpandAllToggle: () => void;
  onTaskUpdated?: () => void;
  onViewModeChange?: (mode: ViewMode) => void;
}

export const TaskViewSwitcher: React.FC<TaskViewSwitcherProps> = (props) => {
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  // Load saved view mode on mount
  useEffect(() => {
    loadViewMode();
  }, []);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'board' || saved === 'table')) {
        setViewMode(saved as ViewMode);
      }
    } catch (error) {
      console.error('Failed to load view mode:', error);
    }
  };

  const saveViewMode = async (mode: ViewMode) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, mode);
      setViewMode(mode);
      props.onViewModeChange?.(mode);
    } catch (error) {
      console.error('Failed to save view mode:', error);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    saveViewMode(mode);
  };

  // Notify parent when viewMode is loaded
  useEffect(() => {
    props.onViewModeChange?.(viewMode);
  }, [viewMode]);

  const tabs = [
    { id: 'board' as ViewMode, label: 'Доска', icon: 'grid-outline' },
    { id: 'table' as ViewMode, label: 'Таблица', icon: 'reorder-four-outline' },
  ];

  return (
    <View style={styles.container}>
      {/* View Mode Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              viewMode === tab.id && [styles.activeTab, { borderBottomColor: theme.primary }],
            ]}
            onPress={() => handleViewModeChange(tab.id)}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={viewMode === tab.id ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: viewMode === tab.id ? theme.primary : theme.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content based on view mode */}
      <View style={styles.content}>
        {props.isInitialLoading ? (
          <TaskListSkeleton />
        ) : (
          <>
            {viewMode === 'board' && (
              <TaskKanbanBoard
                tasks={props.tasks}
                totals={props.totals}
                loading={props.loading}
                canLoadMore={props.canLoadMore}
                subtasksCache={props.subtasksCache}
                expandAllSubtasks={props.expandAllSubtasks}
                refreshing={props.refreshing}
                searchQuery={props.searchQuery}
                onTaskPress={props.onTaskPress}
                onLoadMore={props.onLoadMore}
                onRefresh={props.onRefresh}
                onExpandAllToggle={props.onExpandAllToggle}
              />
            )}

            {viewMode === 'table' && (
              <TaskTableView
                tasks={props.tasks}
                totals={props.totals}
                loading={props.loading}
                subtasksCache={props.subtasksCache}
                searchQuery={props.searchQuery}
                advancedFilters={props.advancedFilters}
                onTaskPress={props.onTaskPress}
                onTaskUpdated={props.onTaskUpdated}
              />
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
});
