import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Task } from '../types/task.types';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { TaskStackParamList } from '@navigation/types';
import CreateTaskModal from '../components/CreateTaskModal';
import { useTaskListData } from '../hooks/useTaskListData';
import { useTaskListFilters } from '../hooks/useTaskListFilters';
import { useSubtasksCache } from '../hooks/useSubtasksCache';
import { TaskListHeader } from '../components/TaskListHeader';
import { TaskStatusTabs } from '../components/TaskStatusTabs';
import { TaskListContent } from '../components/TaskListContent';
import { TaskFilterMenu } from '../components/TaskFilterMenu';
import type { StatusTab } from '../../utils/taskListHelpers';
import { TASKS_PER_PAGE } from '../../utils/taskListHelpers';

type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'TaskList'>;

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<StatusTab>('new');
  const [expandAllSubtasks, setExpandAllSubtasks] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isFirstRender = useRef(true);

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

  const { subtasksCache, loadSubtasksForMultipleTasks } = useSubtasksCache();

  const handleFilterChangeRef = useRef<() => void>();

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
    buildFilters,
  } = useTaskListFilters(() => {
    if (handleFilterChangeRef.current) {
      handleFilterChangeRef.current();
    }
  });

  // Store the actual filter change handler in ref
  handleFilterChangeRef.current = () => {
    loadAllTasks(true, buildFilters(user?.id), loadSubtasksForMultipleTasks);
  };

  // Initial load on mount
  useEffect(() => {
    loadAllTasks(false, buildFilters(user?.id), loadSubtasksForMultipleTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when screen focused (skip first render)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      loadAllTasks(true, buildFilters(user?.id), loadSubtasksForMultipleTasks);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    resetCanLoadMore();
    await loadAllTasks(true, buildFilters(user?.id), loadSubtasksForMultipleTasks);
    setRefreshing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMore = useCallback(async (status: StatusTab) => {
    const currentTasks = tasks[status];
    const total = totals[status];

    if (currentTasks.length >= total) return;

    await loadTasksByStatus(
      status,
      TASKS_PER_PAGE,
      currentTasks.length,
      true,
      buildFilters(user?.id),
      loadSubtasksForMultipleTasks
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, totals]);

  const handleTaskPress = useCallback((task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  }, [navigation]);

  const handleNewTask = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleTaskCreated = useCallback(() => {
    loadAllTasks(true, buildFilters(user?.id), loadSubtasksForMultipleTasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExpandAllToggle = useCallback(() => {
    setExpandAllSubtasks(prev => !prev);
  }, []);

  const handleFilterChange2 = useCallback((newFilter: typeof filter) => {
    setFilter(newFilter);
    closeFilterMenu();
  }, [setFilter, closeFilterMenu]);

  const canCreateTask = user?.role !== 'employee';

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    contentContainer: {
      flex: 1,
      backgroundColor: theme.background,
      overflow: 'hidden',
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <TaskListHeader
        filter={filter}
        isSearchVisible={isSearchVisible}
        searchQuery={searchQuery}
        onSearchToggle={toggleSearch}
        onFilterToggle={toggleFilterMenu}
        onSearchChange={setSearchQuery}
        onNewTask={handleNewTask}
        canCreateTask={canCreateTask}
      />

      {/* Status Tabs */}
      <TaskStatusTabs
        activeTab={activeTab}
        totals={totals}
        onTabChange={setActiveTab}
      />

      {/* Content with swipe navigation */}
      <View style={styles.contentContainer}>
        <TaskListContent
          activeTab={activeTab}
          tasks={tasks}
          totals={totals}
          loading={loading}
          canLoadMore={canLoadMore}
          isInitialLoading={isInitialLoading}
          subtasksCache={subtasksCache}
          expandAllSubtasks={expandAllSubtasks}
          refreshing={refreshing}
          searchQuery={searchQuery}
          onTaskPress={handleTaskPress}
          onLoadMore={handleLoadMore}
          onRefresh={handleRefresh}
          onExpandAllToggle={handleExpandAllToggle}
          onTabChange={setActiveTab}
        />
      </View>

      {/* Filter Menu Dropdown */}
      <TaskFilterMenu
        visible={isFilterMenuVisible}
        currentFilter={filter}
        onFilterChange={handleFilterChange2}
        onClose={closeFilterMenu}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onTaskCreated={handleTaskCreated}
      />
    </SafeAreaView>
  );
};

export default TaskListScreen;
