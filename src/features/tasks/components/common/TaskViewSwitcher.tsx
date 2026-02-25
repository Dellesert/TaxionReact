import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '../../types/task.types';
import type { TasksByStatus, TotalsByStatus, LoadingByStatus, CanLoadMoreByStatus, StatusTab } from '../../hooks/useTaskListData';
import type { AdvancedTaskFilters } from '../../utils/taskListHelpers';
import { TaskKanbanBoard } from '../kanban/TaskKanbanBoard';
import { TaskTableView } from '../lists/TaskTableView';
import { TaskBoardSkeleton } from '../states/TaskBoardSkeleton';

const FadeIn: React.FC<{ children: React.ReactNode; style?: any; enabled?: boolean }> = ({ children, style, enabled = true }) => {
  const opacity = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  useEffect(() => {
    if (enabled) {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [opacity, enabled]);
  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
};

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
  const mountTime = useRef(Date.now());
  const [internalViewMode, setInternalViewMode] = useState<ViewMode>('table');

  // Use viewMode from props if provided, otherwise use internal state
  const viewMode = props.viewMode ?? internalViewMode;

  // Smooth view transition state
  const [displayedViewMode, setDisplayedViewMode] = useState<ViewMode>(viewMode);
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const skipTransition = useRef(true);

  // Enable transitions after initial load
  useEffect(() => {
    const timer = setTimeout(() => { skipTransition.current = false; }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Animate view mode change on web
  useEffect(() => {
    if (viewMode === displayedViewMode) return;
    if (Platform.OS === 'web' && !skipTransition.current) {
      setViewTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayedViewMode(viewMode);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setViewTransitioning(false);
          });
        });
      }, 150);
      return () => clearTimeout(timer);
    } else {
      setDisplayedViewMode(viewMode);
    }
  }, [viewMode, displayedViewMode]);

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
      <View style={[
        styles.content,
        Platform.OS === 'web' && styles.viewTransition,
        viewTransitioning && styles.viewTransitionFadeOut,
      ]}>
        {props.isInitialLoading ? (
          <TaskBoardSkeleton />
        ) : (
          <FadeIn enabled={Date.now() - mountTime.current > 150}>
            {displayedViewMode === 'board' && (
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

            {displayedViewMode === 'table' && (
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
          </FadeIn>
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
  viewTransition: {
    ...Platform.select({
      web: {
        transition: 'opacity 0.15s ease-in-out',
      },
    }),
  } as any,
  viewTransitionFadeOut: {
    opacity: 0,
  },
});
