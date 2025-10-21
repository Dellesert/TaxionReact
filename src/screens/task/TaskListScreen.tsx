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

const TASKS_PER_PAGE = 3;

const TaskListScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('all');
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

  // Loading states for each section
  const [loadingNew, setLoadingNew] = useState(false);
  const [loadingInProgress, setLoadingInProgress] = useState(false);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    loadAllTasks();
  }, [filter]);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      if (searchQuery) {
        loadAllTasks();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reload tasks when screen comes into focus (e.g., when returning from task details)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Skip the first render (initial load already handled by filter effect)
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      console.log('🔄 TaskListScreen focused - reloading tasks');
      loadAllTasks();
    });

    return unsubscribe;
  }, [navigation]);

  const buildFilters = useCallback(() => {
    const filters: any = {};

    // Apply filter type
    if (filter === 'my') {
      filters.created_by = user?.id;
    } else if (filter === 'assigned') {
      filters.assigned_to = user?.id;
    }

    // Apply search
    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    return filters;
  }, [filter, searchQuery, user?.id]);

  const loadTasksByStatus = async (
    status: 'new' | 'in_progress' | 'review' | 'done',
    limit: number = TASKS_PER_PAGE,
    offset: number = 0,
    append: boolean = false
  ) => {
    const filters = buildFilters();

    try {
      const response = await taskApi.getTasksByStatus(status, limit, offset, filters);
      const tasks = response.data;

      console.log(`📋 Loaded ${status} tasks:`, {
        count: tasks.length,
        total: response.total,
        limit,
        offset,
        append,
      });

      // Update state based on status
      switch (status) {
        case 'new':
          setNewTasks(append ? [...newTasks, ...tasks] : tasks);
          setNewTasksTotal(response.total);
          console.log(`✅ Set new tasks: ${append ? newTasks.length + tasks.length : tasks.length} / ${response.total}`);
          break;
        case 'in_progress':
          setInProgressTasks(append ? [...inProgressTasks, ...tasks] : tasks);
          setInProgressTotal(response.total);
          console.log(`✅ Set in_progress tasks: ${append ? inProgressTasks.length + tasks.length : tasks.length} / ${response.total}`);
          break;
        case 'review':
          setReviewTasks(append ? [...reviewTasks, ...tasks] : tasks);
          setReviewTotal(response.total);
          console.log(`✅ Set review tasks: ${append ? reviewTasks.length + tasks.length : tasks.length} / ${response.total}`);
          break;
        case 'done':
          setDoneTasks(append ? [...doneTasks, ...tasks] : tasks);
          setDoneTotal(response.total);
          console.log(`✅ Set done tasks: ${append ? doneTasks.length + tasks.length : tasks.length} / ${response.total}`);
          break;
      }
    } catch (error) {
      console.error(`❌ Failed to load ${status} tasks:`, error);
    }
  };

  const loadAllTasks = async () => {
    try {
      setIsInitialLoading(true);

      // Load first page of each status in parallel
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

  const handleLoadMore = async (status: 'new' | 'in_progress' | 'review' | 'done') => {
    // Set loading state for this section
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

  const handleTaskPress = (task: Task) => {
    console.log('Task pressed:', task.id);
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const handleNewTask = () => {
    console.log('Create new task');
    navigation.navigate('CreateTask');
  };

  const filterButtons: { key: TaskFilter; label: string; icon: string }[] = [
    { key: 'all', label: 'Все', icon: 'apps-outline' },
    { key: 'my', label: 'Мои', icon: 'person-outline' },
    { key: 'assigned', label: 'Назначенные', icon: 'people-outline' },
  ];

  // Get section color based on status
  const getSectionColor = (status: 'new' | 'in_progress' | 'review' | 'done') => {
    switch (status) {
      case 'new':
        return '#F59E0B';
      case 'in_progress':
        return '#3B82F6';
      case 'review':
        return '#8B5CF6';
      case 'done':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  // Get section icon based on status
  const getSectionIcon = (status: 'new' | 'in_progress' | 'review' | 'done') => {
    switch (status) {
      case 'new':
        return 'sparkles-outline';
      case 'in_progress':
        return 'play-circle-outline';
      case 'review':
        return 'glasses-outline';
      case 'done':
        return 'checkmark-circle-outline';
      default:
        return 'folder-outline';
    }
  };

  // Render section with tasks and "Load More" button
  const renderSection = (
    title: string,
    tasks: Task[],
    total: number,
    loading: boolean,
    status: 'new' | 'in_progress' | 'review' | 'done'
  ) => {
    if (tasks.length === 0 && !isInitialLoading) return null;

    const hasMore = tasks.length < total;
    const sectionColor = getSectionColor(status);
    const sectionIcon = getSectionIcon(status);

    return (
      <View style={styles.section}>
        {/* Одна большая карточка для всей секции */}
        <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Заголовок секции */}
          <View style={styles.sectionHeaderContent}>
            <View style={[styles.sectionIconContainer, { backgroundColor: sectionColor }]}>
              <Ionicons name={sectionIcon as any} size={20} color="#FFFFFF" />
            </View>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {title}
              </Text>
              <View style={[styles.sectionBadge, { backgroundColor: sectionColor + '20' }]}>
                <Text style={[styles.sectionBadgeText, { color: sectionColor }]}>
                  {total}
                </Text>
              </View>
            </View>
          </View>
          <View style={[styles.sectionDivider, { backgroundColor: sectionColor, opacity: 0.3 }]} />

          {/* Задачи внутри карточки */}
          <View style={styles.tasksContainer}>
            {tasks.map((task) => (
              <View key={task.id} style={styles.taskWrapper}>
                <View style={[styles.taskCard, { backgroundColor: theme.backgroundTertiary }]}>
                  <TaskItem task={task} onPress={handleTaskPress} />
                </View>
              </View>
            ))}
            {hasMore && (
              <TouchableOpacity
                style={[styles.loadMoreButton, { borderColor: sectionColor }]}
                onPress={() => handleLoadMore(status)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={sectionColor} />
                ) : (
                  <>
                    <Ionicons name="chevron-down-outline" size={20} color={sectionColor} />
                    <Text style={[styles.loadMoreText, { color: sectionColor }]}>
                      Загрузить еще ({total - tasks.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isInitialLoading) {
    return <Loading text="Загрузка задач..." fullScreen />;
  }

  const totalTasks = newTasksTotal + inProgressTotal + reviewTotal + doneTotal;

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingBottom: 8,
      paddingTop: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.input,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      fontSize: 16,
      color: theme.text,
    },
    filterButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 8,
      backgroundColor: theme.backgroundTertiary,
    },
    filterButtonActive: {
      backgroundColor: theme.primary,
    },
    filterButtonText: {
      fontSize: 12,
      color: theme.textSecondary,
      marginLeft: 4,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.textSecondary,
      marginTop: 16,
    },
    emptySubtitle: {
      fontSize: 14,
      color: theme.textTertiary,
      textAlign: 'center',
      marginTop: 8,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container} edges={['top', 'left', 'right']}>
      <View style={dynamicStyles.header}>
        <View style={styles.headerTop}>
          <Text style={dynamicStyles.title}>Задачи</Text>
          <TouchableOpacity onPress={handleNewTask} style={styles.addButton}>
            <Ionicons name="add" size={26} color={theme.primary} />
          </TouchableOpacity>
        </View>

        <View style={dynamicStyles.searchContainer}>
          <Ionicons name="search" size={20} color={theme.textTertiary} />
          <TextInput
            style={dynamicStyles.searchInput}
            placeholder="Поиск задач..."
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

        <View style={styles.filterContainer}>
          {filterButtons.map((btn, index) => (
            <TouchableOpacity
              key={btn.key}
              onPress={() => setFilter(btn.key)}
              style={[
                dynamicStyles.filterButton,
                filter === btn.key && dynamicStyles.filterButtonActive,
                index > 0 && styles.filterButtonMargin,
              ]}
            >
              <Ionicons
                name={btn.icon as any}
                size={16}
                color={filter === btn.key ? 'white' : theme.textSecondary}
              />
              <Text
                style={[
                  dynamicStyles.filterButtonText,
                  filter === btn.key && styles.filterButtonTextActive,
                ]}
              >
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {totalTasks === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-done-outline" size={64} color={theme.borderLight} />
          <Text style={dynamicStyles.emptyTitle}>
            {searchQuery ? 'Задачи не найдены' : 'Нет задач'}
          </Text>
          <Text style={dynamicStyles.emptySubtitle}>
            {searchQuery
              ? 'Попробуйте изменить поисковый запрос'
              : 'Создайте новую задачу для начала работы'}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {renderSection('Новые', newTasks, newTasksTotal, loadingNew, 'new')}
          {renderSection('В работе', inProgressTasks, inProgressTotal, loadingInProgress, 'in_progress')}
          {renderSection('На проверке', reviewTasks, reviewTotal, loadingReview, 'review')}
          {renderSection('Готовые', doneTasks, doneTotal, loadingDone, 'done')}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterButtonMargin: {
    marginLeft: 8,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionBadge: {
    minWidth: 32,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  sectionBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionDivider: {
    height: 3,
    width: '100%',
    marginBottom: 8,
  },
  tasksContainer: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  taskWrapper: {
    marginBottom: 12,
  },
  taskCard: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default TaskListScreen;
