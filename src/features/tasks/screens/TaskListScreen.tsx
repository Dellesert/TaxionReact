import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Task } from '../types/task.types';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { TaskStackParamList } from '@navigation/types';
import CreateTaskModal from '../components/modals/CreateTaskModal';
import { useTaskListData } from '../hooks/useTaskListData';
import { useTaskListFilters } from '../hooks/useTaskListFilters';
import { useTaskSwipeGesture } from '../hooks/useTaskSwipeGesture';
import { TaskListHeader } from '../components/common/TaskListHeader';
import { TaskListContent } from '../components/lists/TaskListContent';
import { AdvancedTaskFilterMenu } from '../components/filters/AdvancedTaskFilterMenu';
import { BoardFilterMenu } from '../components/filters/BoardFilterMenu';
import { MobileFilterMenu } from '../components/filters/MobileFilterMenu';
import { TaskViewSwitcher, ViewMode } from '../components/common/TaskViewSwitcher';
import { TitleBarTaskControls } from '../components/common/TitleBarTaskControls';
import { TitleBarViewSwitcher, ViewOption } from '@shared/components/common/TitleBarViewSwitcher';
import type { StatusTab, AdvancedTaskFilters, TaskFilter } from '../utils/taskListHelpers';
import { TASKS_PER_PAGE, buildAdvancedTaskFilters, getTasksWithSubtasks, STATUS_TABS_ORDER } from '../utils/taskListHelpers';

type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'TaskList'>;

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const isWideScreen = useIsWideScreen();

  // Reset status bar style when screen gains focus (fixes white status bar after visiting Profile)
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  // Use the same logic as MainNavigator
  const isDesktop = isWideScreen;
  // Determine if narrow screen (mobile)
  const isMobile = !isWideScreen;

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>('new');
  const [expandAllSubtasks, setExpandAllSubtasks] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterButtonPosition, setFilterButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const viewModeInitialized = useRef(false);

  // Advanced filters state
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedTaskFilters>({
    baseFilter: 'all',
    statuses: [],
    priorities: [],
    hasSubtasks: null,
    hasOverdueDeadline: false,
    isDelegated: false,
    sortBy: 'updated_at',
    sortDirection: 'desc',
  });

  const isFirstRender = useRef(true);
  const navigatedToDetail = useRef(false);

  // Custom hooks
  const {
    tasks,
    totals,
    loading,
    canLoadMore,
    isInitialLoading,
    loadTasksByStatus,
    loadAllTasks,
    resetCanLoadMore,
  } = useTaskListData();

  const handleFilterChangeRef = useRef<(() => void) | undefined>(undefined);

  const {
    searchQuery,
    filter,
    isSearchVisible,
    isFilterMenuVisible,
    setSearchQuery,
    setFilter,
    toggleSearch,
    toggleFilterMenu,
    closeFilterMenu,
  } = useTaskListFilters(() => {
    if (handleFilterChangeRef.current) {
      handleFilterChangeRef.current();
    }
  });

  // Handler for tab change
  const handleTabChange = useCallback((tab: StatusTab) => {
    setActiveTab(tab);
  }, []);

  // Swipe gesture hook
  const { translateX, swipeGesture, updateTranslateX } = useTaskSwipeGesture(
    activeTab,
    handleTabChange
  );

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // Load saved view mode from localStorage (Electron only)
  useEffect(() => {
    if (isElectron && typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('task_view_mode');
      if (saved === 'board' || saved === 'table') {
        setViewMode(saved);
      }
      viewModeInitialized.current = true;
    }
  }, [isElectron]);

  // Save view mode to localStorage when it changes (Electron only)
  useEffect(() => {
    if (isElectron && viewModeInitialized.current && typeof localStorage !== 'undefined') {
      localStorage.setItem('task_view_mode', viewMode);
    }
  }, [isElectron, viewMode]);

  // Store the actual filter change handler in ref (inside useEffect to avoid setState during render)
  useEffect(() => {
    handleFilterChangeRef.current = () => {
      const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
      loadAllTasks(true, apiFilters);
    };
  }, [loadAllTasks, advancedFilters, searchQuery, user?.id]);

  // Initial load on mount
  useEffect(() => {
    const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
    loadAllTasks(false, apiFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when screen focused (skip first render and return from detail)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      // When returning from TaskDetail, keep cached data and scroll position
      if (navigatedToDetail.current) {
        navigatedToDetail.current = false;
        return;
      }
      const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
      loadAllTasks(true, apiFilters);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Update translateX when activeTab changes (for smooth animation on tab click)
  useEffect(() => {
    updateTranslateX(activeTab);
  }, [activeTab, updateTranslateX]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    resetCanLoadMore();
    const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
    await loadAllTasks(true, apiFilters);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedFilters, searchQuery, user?.id]);

  const handleLoadMore = useCallback(async (status: StatusTab) => {
    const currentTasks = tasks[status];
    const total = totals[status];

    if (currentTasks.length >= total) return;

    const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
    await loadTasksByStatus(
      status,
      TASKS_PER_PAGE,
      currentTasks.length,
      true,
      apiFilters
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, totals, advancedFilters, searchQuery, user?.id]);

  const handleTaskPress = useCallback((task: Task) => {
    navigatedToDetail.current = true;
    navigation.navigate('TaskDetail', { taskId: task.id });
  }, [navigation]);

  const handleNewTask = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleTaskCreated = useCallback(() => {
    const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
    loadAllTasks(true, apiFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advancedFilters, searchQuery, user?.id]);

  const handleExpandAllToggle = useCallback(() => {
    setExpandAllSubtasks(prev => !prev);
  }, []);

  const handleAdvancedFiltersChange = useCallback((newFilters: AdvancedTaskFilters) => {
    setAdvancedFilters(newFilters);
    // Update the old filter for backward compatibility
    setFilter(newFilters.baseFilter);
    closeFilterMenu();

    // Immediately reload data with new filters
    const apiFilters = buildAdvancedTaskFilters(newFilters, searchQuery, user?.id);
    loadAllTasks(true, apiFilters);
  }, [setFilter, closeFilterMenu, searchQuery, user?.id, loadAllTasks]);

  // Handler for simple filter change (mobile/board)
  const handleSimpleFilterChange = useCallback((newFilter: TaskFilter) => {
    const newFilters: AdvancedTaskFilters = {
      ...advancedFilters,
      baseFilter: newFilter,
    };
    setAdvancedFilters(newFilters);
    setFilter(newFilter);
    closeFilterMenu();

    // Immediately reload data with new filters
    const apiFilters = buildAdvancedTaskFilters(newFilters, searchQuery, user?.id);
    loadAllTasks(true, apiFilters);
  }, [advancedFilters, setFilter, closeFilterMenu, searchQuery, user?.id, loadAllTasks]);

  // Sync advancedFilters.baseFilter when old filter changes (for backward compatibility)
  useEffect(() => {
    if (advancedFilters.baseFilter !== filter) {
      setAdvancedFilters(prev => ({ ...prev, baseFilter: filter }));
    }
  }, [filter, advancedFilters.baseFilter]);

  // Clear status filters when switching to board view (since board has columns by status)
  useEffect(() => {
    if (isDesktop && viewMode === 'board' && advancedFilters.statuses.length > 0) {
      const clearedFilters: AdvancedTaskFilters = {
        ...advancedFilters,
        statuses: [], // Clear status filters for board view
      };
      setAdvancedFilters(clearedFilters);

      // Reload data with cleared status filters
      const apiFilters = buildAdvancedTaskFilters(clearedFilters, searchQuery, user?.id);
      loadAllTasks(true, apiFilters);
    }
  }, [viewMode, isDesktop, advancedFilters.statuses.length, searchQuery, user?.id, loadAllTasks]);

  // Check if any advanced filters are active
  const hasActiveFilters =
    advancedFilters.baseFilter !== 'all' ||
    advancedFilters.statuses.length > 0 ||
    advancedFilters.priorities.length > 0 ||
    advancedFilters.hasSubtasks !== null ||
    advancedFilters.hasOverdueDeadline ||
    advancedFilters.isDelegated;

  // Update filter for header indicator (backward compatibility)
  const displayFilter = hasActiveFilters ? 'my' : 'all'; // Use 'my' as non-'all' to show indicator

  const canCreateTask = user?.role !== 'employee';

  // Handler for back navigation
  const handleGoBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // Count total tasks with subtasks across all columns (for expand all button)
  const totalTasksWithSubtasks = STATUS_TABS_ORDER.reduce((count, status) => {
    return count + getTasksWithSubtasks(tasks[status]).length;
  }, 0);

  // View options for TitleBar switcher
  const taskViewOptions: ViewOption<ViewMode>[] = useMemo(() => [
    { value: 'table', icon: 'list-outline', label: 'Таблица' },
    { value: 'board', icon: 'grid-outline', label: 'Доска' },
  ], []);

  // TitleBar left controls - view switcher
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarViewSwitcher
        options={taskViewOptions}
        value={viewMode}
        onChange={setViewMode}
      />
    );
  }, [isElectron, isDesktop, taskViewOptions, viewMode]);

  // TitleBar right controls - filters, create, etc.
  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarTaskControls
        expandedAll={expandAllSubtasks}
        onExpandToggle={handleExpandAllToggle}
        subtaskCount={totalTasksWithSubtasks}
        hasActiveFilters={hasActiveFilters ?? false}
        onFilterToggle={toggleFilterMenu}
        onFilterButtonLayout={setFilterButtonPosition}
        canCreateTask={canCreateTask}
        onNewTask={handleNewTask}
      />
    );
  }, [isElectron, isDesktop, expandAllSubtasks, totalTasksWithSubtasks, handleExpandAllToggle, hasActiveFilters, toggleFilterMenu, canCreateTask, handleNewTask]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Задачи',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
    enabled: isElectron && isDesktop,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* Header - hide on Electron desktop since controls are in TitleBar */}
      {!(isElectron && isDesktop) && (
        <TaskListHeader
          filter={displayFilter}
          isSearchVisible={isSearchVisible}
          searchQuery={searchQuery}
          onSearchToggle={toggleSearch}
          onFilterToggle={toggleFilterMenu}
          onSearchChange={setSearchQuery}
          onNewTask={handleNewTask}
          canCreateTask={canCreateTask}
          activeTab={activeTab}
          totals={totals}
          onTabChange={setActiveTab}
          onFilterButtonLayout={setFilterButtonPosition}
          isDesktop={isDesktop}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          expandAllSubtasks={expandAllSubtasks}
          onExpandAllToggle={handleExpandAllToggle}
          subtaskCount={totalTasksWithSubtasks}
          onGoBack={navigation.canGoBack() ? handleGoBack : undefined}
        />
      )}

      {/* Content - TaskViewSwitcher for Desktop, Swipe Navigation for Mobile */}
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {isDesktop ? (
          <TaskViewSwitcher
            tasks={tasks}
            totals={totals}
            loading={loading}
            canLoadMore={canLoadMore}
            isInitialLoading={isInitialLoading}
            expandAllSubtasks={expandAllSubtasks}
            refreshing={refreshing}
            searchQuery={searchQuery}
            advancedFilters={advancedFilters}
            onTaskPress={handleTaskPress}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            onExpandAllToggle={handleExpandAllToggle}
            onTaskUpdated={() => {
              const apiFilters = buildAdvancedTaskFilters(advancedFilters, searchQuery, user?.id);
              loadAllTasks(true, apiFilters);
            }}
            onViewModeChange={setViewMode}
            viewMode={viewMode}
          />
        ) : (
          <TaskListContent
            activeTab={activeTab}
            tasks={tasks}
            totals={totals}
            loading={loading}
            canLoadMore={canLoadMore}
            isInitialLoading={isInitialLoading}
            expandAllSubtasks={expandAllSubtasks}
            refreshing={refreshing}
            searchQuery={searchQuery}
            translateX={translateX}
            swipeGesture={swipeGesture}
            onTaskPress={handleTaskPress}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            onExpandAllToggle={handleExpandAllToggle}
          />
        )}
      </View>

      {/* Filter Menus - Different for mobile/board/table */}
      {isMobile ? (
        // Mobile: only base filter (Все/Мои/Назначенные)
        <MobileFilterMenu
          visible={isFilterMenuVisible}
          currentFilter={advancedFilters.baseFilter}
          onFilterChange={handleSimpleFilterChange}
          onClose={closeFilterMenu}
          buttonPosition={filterButtonPosition}
        />
      ) : isDesktop && viewMode === 'table' ? (
        // Desktop Table: full advanced filters
        <AdvancedTaskFilterMenu
          visible={isFilterMenuVisible}
          currentFilters={advancedFilters}
          onFiltersChange={handleAdvancedFiltersChange}
          onClose={closeFilterMenu}
          buttonPosition={filterButtonPosition}
          isDesktop={isDesktop}
        />
      ) : (
        // Desktop Board: base filter + sorting (without statuses)
        <BoardFilterMenu
          visible={isFilterMenuVisible}
          currentFilters={{
            ...advancedFilters,
            statuses: [], // Never show status filters for board
          }}
          onFiltersChange={handleAdvancedFiltersChange}
          onClose={closeFilterMenu}
          buttonPosition={filterButtonPosition}
          isDesktop={isDesktop}
        />
      )}

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

export default TaskListScreen;
