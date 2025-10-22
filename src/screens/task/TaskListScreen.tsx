import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TaskItem } from '@components/task/TaskItem';
import { Loading } from '@components/common/Loading';
import type { Task, TaskStatus } from '../../types/task.types';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { TaskStackParamList } from '@navigation/types';
import * as taskApi from '@api/task.api';

type TaskFilter = 'all' | 'my' | 'assigned';
type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'TaskList'>;
type StatusTab = 'new' | 'in_progress' | 'review' | 'done';

const TASKS_PER_PAGE = 10;

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [activeTab, setActiveTab] = useState<StatusTab>('new');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const isFirstRender = useRef(true);

  // Tasks by status
  const [newTasks, setNewTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [reviewTasks, setReviewTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);

  // Total counts for each status
  const [newTasksTotal, setNewTasksTotal] = useState(0);
  const [inProgressTotal, setInProgressTotal] = useState(0);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [doneTotal, setDoneTotal] = useState(0);

  // Loading states
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingInProgress, setLoadingInProgress] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    loadAllTasks();
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        loadAllTasks();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      loadAllTasks();
    });
    return unsubscribe;
  }, [navigation]);

  const buildFilters = useCallback(() => {
    const filters: any = {};
    if (filter === 'my') {
      filters.created_by = user?.id;
    } else if (filter === 'assigned') {
      filters.assigned_to = user?.id;
    }
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }
    return filters;
  }, [filter, searchQuery, user?.id]);

  const loadTasksByStatus = async (
    status: StatusTab,
    limit: number = TASKS_PER_PAGE,
    offset: number = 0,
    append: boolean = false
  ) => {
    const filters = buildFilters();

    try {
      const response = await taskApi.getTasksByStatus(status, limit, offset, filters);
      const tasks = response.data;

      switch (status) {
        case 'new':
          setNewTasks(append ? [...newTasks, ...tasks] : tasks);
          setNewTasksTotal(response.total);
          break;
        case 'in_progress':
          setInProgressTasks(append ? [...inProgressTasks, ...tasks] : tasks);
          setInProgressTotal(response.total);
          break;
        case 'review':
          setReviewTasks(append ? [...reviewTasks, ...tasks] : tasks);
          setReviewTotal(response.total);
          break;
        case 'done':
          setDoneTasks(append ? [...doneTasks, ...tasks] : tasks);
          setDoneTotal(response.total);
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${status} tasks:`, error);
    }
  };

  const loadAllTasks = async () => {
    try {
      setIsInitialLoading(true);
      await Promise.all([
        loadTasksByStatus('new', TASKS_PER_PAGE, 0),
        loadTasksByStatus('in_progress', TASKS_PER_PAGE, 0),
        loadTasksByStatus('review', TASKS_PER_PAGE, 0),
        loadTasksByStatus('done', TASKS_PER_PAGE, 0),
      ]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsInitialLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllTasks();
    setRefreshing(false);
  };

  const handleLoadMore = async (status: StatusTab) => {
    const currentTasks = getCurrentTasks(status);
    const total = getTotalForStatus(status);

    if (currentTasks.length >= total) return;

    switch (status) {
      case 'new':
        setLoadingNew(true);
        await loadTasksByStatus(status, TASKS_PER_PAGE, newTasks.length, true);
        setLoadingNew(false);
        break;
      case 'in_progress':
        setLoadingInProgress(true);
        await loadTasksByStatus(status, TASKS_PER_PAGE, inProgressTasks.length, true);
        setLoadingInProgress(false);
        break;
      case 'review':
        setLoadingReview(true);
        await loadTasksByStatus(status, TASKS_PER_PAGE, reviewTasks.length, true);
        setLoadingReview(false);
        break;
      case 'done':
        setLoadingDone(true);
        await loadTasksByStatus(status, TASKS_PER_PAGE, doneTasks.length, true);
        setLoadingDone(false);
        break;
    }
  };

  const getCurrentTasks = (status: StatusTab): Task[] => {
    switch (status) {
      case 'new': return newTasks;
      case 'in_progress': return inProgressTasks;
      case 'review': return reviewTasks;
      case 'done': return doneTasks;
    }
  };

  const getTotalForStatus = (status: StatusTab): number => {
    switch (status) {
      case 'new': return newTasksTotal;
      case 'in_progress': return inProgressTotal;
      case 'review': return reviewTotal;
      case 'done': return doneTotal;
    }
  };

  const getLoadingForStatus = (status: StatusTab): boolean => {
    switch (status) {
      case 'new': return loadingNew;
      case 'in_progress': return loadingInProgress;
      case 'review': return loadingReview;
      case 'done': return loadingDone;
    }
  };

  const handleTaskPress = (task: Task) => {
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const handleNewTask = () => {
    navigation.navigate('CreateTask');
  };

  const statusTabs: { key: StatusTab; label: string; color: string }[] = [
    { key: 'new', label: 'Новые', color: '#F59E0B' },
    { key: 'in_progress', label: 'В работе', color: '#3B82F6' },
    { key: 'review', label: 'Проверка', color: '#8B5CF6' },
    { key: 'done', label: 'Готово', color: '#10B981' },
  ];

  const filterChips: { key: TaskFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'my', label: 'Мои' },
    { key: 'assigned', label: 'Назначенные' },
  ];

  if (isInitialLoading) {
    return <Loading text="Загрузка задач..." fullScreen />;
  }

  const currentTasks = getCurrentTasks(activeTab);
  const currentTotal = getTotalForStatus(activeTab);
  const isLoading = getLoadingForStatus(activeTab);
  const hasMore = currentTasks.length < currentTotal;
  const totalTasks = newTasksTotal + inProgressTotal + reviewTotal + doneTotal;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 0,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    editButton: {
      paddingHorizontal: 4,
    },
    editButtonText: {
      fontSize: 16,
      fontWeight: '400',
      color: theme.error,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: theme.text,
      flex: 1,
      textAlign: 'center',
    },
    addButton: {
      paddingHorizontal: 4,
    },
    addButtonText: {
      fontSize: 38,
      fontWeight: '200',
      color: theme.primary,
      lineHeight: 38,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 15,
      color: theme.text,
    },
    filtersRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: theme.backgroundTertiary,
    },
    filterChipActive: {
      backgroundColor: theme.primary + '15',
    },
    filterChipText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    filterChipTextActive: {
      color: theme.primary,
      fontWeight: '600',
    },
    tabsContainer: {
      flexDirection: 'row',
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: 'transparent',
    },
    tabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tabLabel: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    tabLabelActive: {
      fontWeight: '700',
    },
    tabCount: {
      fontSize: 12,
      fontWeight: '700',
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 22,
      textAlign: 'center',
    },
    content: {
      flex: 1,
    },
    taskList: {
      paddingHorizontal: 16,
      paddingTop: 12,
    },
    taskItem: {
      backgroundColor: theme.card,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    loadMoreContainer: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    loadMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.backgroundTertiary,
    },
    loadMoreText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 6,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    emptyIcon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textTertiary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Изм.</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Задачи</Text>
          <TouchableOpacity onPress={handleNewTask} style={styles.addButton}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск..."
            placeholderTextColor={theme.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filtersRow}>
          {filterChips.map((chip) => (
            <TouchableOpacity
              key={chip.key}
              onPress={() => setFilter(chip.key)}
              style={[
                styles.filterChip,
                filter === chip.key && styles.filterChipActive,
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === chip.key && styles.filterChipTextActive,
                ]}
              >
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status Tabs */}
        <View style={styles.tabsContainer}>
          {statusTabs.map((tab) => {
            const count = getTotalForStatus(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && { ...styles.tabActive, borderBottomColor: tab.color },
                ]}
                onPress={() => setActiveTab(tab.key)}
              >
                <View style={styles.tabContent}>
                  <Text
                    style={[
                      styles.tabLabel,
                      isActive && { ...styles.tabLabelActive, color: tab.color },
                    ]}
                  >
                    {tab.label}
                  </Text>
                  {count > 0 && (
                    <Text
                      style={[
                        styles.tabCount,
                        {
                          backgroundColor: isActive ? tab.color : theme.backgroundTertiary,
                          color: isActive ? '#FFFFFF' : theme.textTertiary,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      {totalTasks === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-done" size={40} color={theme.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>
            {searchQuery ? 'Ничего не найдено' : 'Нет задач'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? 'Попробуйте изменить фильтры или поисковый запрос'
              : 'Нажмите + чтобы создать первую задачу'}
          </Text>
        </View>
      ) : currentTotal === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-done" size={40} color={theme.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>Нет задач</Text>
          <Text style={styles.emptySubtitle}>
            В этом статусе пока нет задач
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.taskList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {currentTasks.map((task) => (
            <View key={task.id} style={styles.taskItem}>
              <TaskItem task={task} onPress={handleTaskPress} />
            </View>
          ))}

          {/* Load More */}
          {hasMore && (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity
                style={styles.loadMoreButton}
                onPress={() => handleLoadMore(activeTab)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <>
                    <Ionicons name="chevron-down" size={18} color={theme.text} />
                    <Text style={styles.loadMoreText}>
                      Ещё {currentTotal - currentTasks.length}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default TaskListScreen;
