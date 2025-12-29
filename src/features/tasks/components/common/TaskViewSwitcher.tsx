import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  viewMode?: ViewMode;
}

export const TaskViewSwitcher: React.FC<TaskViewSwitcherProps> = (props) => {
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('board');

  // Use viewMode from props if provided, otherwise use internal state
  const viewMode = props.viewMode ?? internalViewMode;

  // Load saved view mode on mount (only if viewMode not provided via props)
  useEffect(() => {
    if (props.viewMode === undefined) {
      loadViewMode();
    }
  }, [props.viewMode]);

  const loadViewMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'board' || saved === 'table')) {
        setInternalViewMode(saved as ViewMode);
        props.onViewModeChange?.(saved as ViewMode);
      }
    } catch (error) {
      console.error('Failed to load view mode:', error);
    }
  };

  // Save to AsyncStorage when viewMode changes
  useEffect(() => {
    const saveViewMode = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, viewMode);
      } catch (error) {
        console.error('Failed to save view mode:', error);
      }
    };
    saveViewMode();
  }, [viewMode]);

  return (
    <View style={styles.container}>
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
  content: {
    flex: 1,
  },
});
