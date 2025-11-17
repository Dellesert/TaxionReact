import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Animated as RNAnimated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { TaskItem } from '@components/task/TaskItem';
import { TaskSkeleton } from '@components/task/TaskSkeleton';
import { ScreenHeader } from '@components/common/ScreenHeader';
import type { Task, TaskStatus } from '../../types/task.types';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { TaskStackParamList } from '@navigation/types';
import * as taskApi from '@api/task.api';
import CreateTaskModal from '@components/task/CreateTaskModal';

type TaskFilter = 'all' | 'my' | 'assigned';
type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'TaskList'>;
type StatusTab = 'new' | 'in_progress' | 'review' | 'done';

const TASKS_PER_PAGE = 10;
const SCREEN_WIDTH = Dimensions.get('window').width;

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
  const isFirstMount = useRef(true);

  // Animation for tab transitions (slide with Reanimated)
  const translateX = useSharedValue(0);
  const isSwipingHorizontally = useSharedValue(false);
  const currentTabIndex = useSharedValue(0); // Track current tab index

  // Tasks by status
  const [newTasks, setNewTasks] = useState<Task[]>([]);
  const [inProgressTasks, setInProgressTasks] = useState<Task[]>([]);
  const [reviewTasks, setReviewTasks] = useState<Task[]>([]);
  const [doneTasks, setDoneTasks] = useState<Task[]>([]);

  // Subtasks cache
  const [subtasksCache, setSubtasksCache] = useState<Record<number, Task[]>>({});

  // Expand all subtasks state
  const [expandAllSubtasks, setExpandAllSubtasks] = useState(false);

  // Search modal state
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Filter menu state
  const [isFilterMenuVisible, setIsFilterMenuVisible] = useState(false);

  // Create task modal state
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Animation for search
  const searchAnimation = useRef(new RNAnimated.Value(0)).current;

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

  // Can load more states for infinite scroll
  const [canLoadMoreNew, setCanLoadMoreNew] = useState(false);
  const [canLoadMoreInProgress, setCanLoadMoreInProgress] = useState(false);
  const [canLoadMoreReview, setCanLoadMoreReview] = useState(false);
  const [canLoadMoreDone, setCanLoadMoreDone] = useState(false);

  useEffect(() => {
    RNAnimated.timing(searchAnimation, {
      toValue: isSearchVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSearchVisible]);

  useEffect(() => {
    // Пропускаем первый рендер, чтобы не было двойной загрузки
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      loadAllTasks(true); // true = silent update without skeleton
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, filter]);

  // Swipe gesture to switch tabs (iOS only)
  const statusTabsOrder: StatusTab[] = ['new', 'in_progress', 'review', 'done'];

  const switchToTab = (newTab: StatusTab) => {
    setActiveTab(newTab);
    // Animate to the new tab position on iOS
    if (Platform.OS === 'ios') {
      const newIndex = statusTabsOrder.indexOf(newTab);
      currentTabIndex.value = newIndex;
      translateX.value = withTiming(-newIndex * SCREEN_WIDTH, { duration: 300 });
    }
  };

  const resetSwipeFlag = () => {
    setTimeout(() => {
      isSwipingHorizontally.value = false;
    }, 100);
  };

  // Initialize translateX based on active tab
  useEffect(() => {
    if (Platform.OS === 'ios') {
      const currentIndex = statusTabsOrder.indexOf(activeTab);
      currentTabIndex.value = currentIndex;
      translateX.value = -currentIndex * SCREEN_WIDTH;
    }
  }, []);

  const swipeGesture = Gesture.Pan()
    .enabled(Platform.OS === 'ios')
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      isSwipingHorizontally.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      // Detect if this is a horizontal swipe
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      // If horizontal movement is dominant, follow it
      if (absX > absY || absX > 3) {
        isSwipingHorizontally.value = true;
        // Calculate base position for current tab using shared value
        const baseOffset = -currentTabIndex.value * SCREEN_WIDTH;
        // Follow finger movement from base position
        translateX.value = baseOffset + event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3; // 30% of screen width
      const VELOCITY_THRESHOLD = 500;
      const currentIndex = currentTabIndex.value;

      const shouldSwitchTab = Math.abs(event.translationX) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      let targetIndex = currentIndex;

      if (shouldSwitchTab && event.translationX > 0 && currentIndex > 0) {
        // Swipe right - go to previous tab
        targetIndex = currentIndex - 1;
      } else if (shouldSwitchTab && event.translationX < 0 && currentIndex < 3) {
        // Swipe left - go to next tab (max index is 3)
        targetIndex = currentIndex + 1;
      }

      // Animate to target tab
      const targetOffset = -targetIndex * SCREEN_WIDTH;
      translateX.value = withTiming(targetOffset, {
        duration: 250,
      }, () => {
        // Update current tab index after animation completes
        currentTabIndex.value = targetIndex;
      });

      // Update active tab if changed (just update state, animation already done above)
      if (targetIndex !== currentIndex) {
        runOnJS(setActiveTab)(statusTabsOrder[targetIndex]);
      }

      // Reset swipe flag
      runOnJS(resetSwipeFlag)();
    });

  // Animated style for content - horizontal container with all tabs
  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }
      // Тихое обновление - данные обновляются в фоне без показа skeleton
      loadAllTasks(true);
    });
    return unsubscribe;
  }, [navigation]);

  // Начальная загрузка при монтировании компонента
  useEffect(() => {
    loadAllTasks();
  }, []);

  const buildFilters = () => {
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
  };

  const loadTasksByStatus = async (
    status: StatusTab,
    limit: number = TASKS_PER_PAGE,
    offset: number = 0,
    append: boolean = false
  ) => {
    const filters = buildFilters();

    try {
      const response = await taskApi.getTasksByStatus(status, limit, offset, filters);
      const tasks = response.data || [];

      // Load subtasks for tasks that have them
      const tasksWithSubtasks = tasks.filter(t => t.subtask_count && t.subtask_count > 0);
      if (tasksWithSubtasks.length > 0) {
        // Load subtasks in parallel
        await Promise.all(
          tasksWithSubtasks.map(task => loadSubtasksForTask(task.id))
        );
      }

      switch (status) {
        case 'new':
          if (append) {
            const existingIds = new Set(newTasks.map(t => t.id));
            const uniqueTasks = tasks.filter(t => !existingIds.has(t.id));
            const updatedTasks = [...newTasks, ...uniqueTasks];
            setNewTasks(updatedTasks);
            setNewTasksTotal(response.total);
            // Если все дубликаты - просто ждем следующего скролла
            if (uniqueTasks.length === 0 && updatedTasks.length < response.total && tasks.length > 0) {
              console.log('⚠️ All new tasks were duplicates, user needs to scroll more');
            }
          } else {
            setNewTasks(tasks);
            setNewTasksTotal(response.total);
            setTimeout(() => setCanLoadMoreNew(true), 500);
          }
          break;
        case 'in_progress':
          if (append) {
            const existingIds = new Set(inProgressTasks.map(t => t.id));
            const uniqueTasks = tasks.filter(t => !existingIds.has(t.id));
            const updatedTasks = [...inProgressTasks, ...uniqueTasks];
            setInProgressTasks(updatedTasks);
            setInProgressTotal(response.total);
            if (uniqueTasks.length === 0 && updatedTasks.length < response.total && tasks.length > 0) {
              console.log('⚠️ All in_progress tasks were duplicates, user needs to scroll more');
            }
          } else {
            setInProgressTasks(tasks);
            setInProgressTotal(response.total);
            setTimeout(() => setCanLoadMoreInProgress(true), 500);
          }
          break;
        case 'review':
          if (append) {
            const existingIds = new Set(reviewTasks.map(t => t.id));
            const uniqueTasks = tasks.filter(t => !existingIds.has(t.id));
            const updatedTasks = [...reviewTasks, ...uniqueTasks];
            setReviewTasks(updatedTasks);
            setReviewTotal(response.total);
            if (uniqueTasks.length === 0 && updatedTasks.length < response.total && tasks.length > 0) {
              console.log('⚠️ All review tasks were duplicates, user needs to scroll more');
            }
          } else {
            setReviewTasks(tasks);
            setReviewTotal(response.total);
            setTimeout(() => setCanLoadMoreReview(true), 500);
          }
          break;
        case 'done':
          if (append) {
            const existingIds = new Set(doneTasks.map(t => t.id));
            const uniqueTasks = tasks.filter(t => !existingIds.has(t.id));
            const updatedTasks = [...doneTasks, ...uniqueTasks];
            setDoneTasks(updatedTasks);
            setDoneTotal(response.total);
            if (uniqueTasks.length === 0 && updatedTasks.length < response.total && tasks.length > 0) {
              console.log('⚠️ All done tasks were duplicates, user needs to scroll more');
            }
          } else {
            setDoneTasks(tasks);
            setDoneTotal(response.total);
            setTimeout(() => setCanLoadMoreDone(true), 500);
          }
          break;
      }
    } catch (error) {
      console.error(`Failed to load ${status} tasks:`, error);
    }
  };

  const loadAllTasks = async (silentUpdate: boolean = false) => {
    try {
      // Показываем skeleton только при самой первой загрузке (когда нет данных)
      const hasTasksInCache = newTasks.length > 0 || inProgressTasks.length > 0 ||
                              reviewTasks.length > 0 || doneTasks.length > 0;

      // Skeleton показывается только если:
      // 1. Нет задач в кеше (первая загрузка)
      // 2. И это не тихое обновление в фоне
      if (!hasTasksInCache && !silentUpdate) {
        setIsInitialLoading(true);
      }

      await Promise.all([
        loadTasksByStatus('new', TASKS_PER_PAGE, 0),
        loadTasksByStatus('in_progress', TASKS_PER_PAGE, 0),
        loadTasksByStatus('review', TASKS_PER_PAGE, 0),
        loadTasksByStatus('done', TASKS_PER_PAGE, 0),
      ]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      // Всегда убираем skeleton после загрузки
      setIsInitialLoading(false);
    }
  };

  const loadSubtasksForTask = async (taskId: number) => {
    try {
      const subtasks = await taskApi.getSubtasks(taskId);
      setSubtasksCache(prev => ({ ...prev, [taskId]: subtasks }));
      return subtasks;
    } catch (error) {
      console.error(`Failed to load subtasks for task ${taskId}:`, error);
      return [];
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Сбрасываем флаги при обновлении
    setCanLoadMoreNew(false);
    setCanLoadMoreInProgress(false);
    setCanLoadMoreReview(false);
    setCanLoadMoreDone(false);
    await loadAllTasks(true); // Тихое обновление, так как используется RefreshControl
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

  const getCanLoadMoreForStatus = (status: StatusTab): boolean => {
    switch (status) {
      case 'new': return canLoadMoreNew;
      case 'in_progress': return canLoadMoreInProgress;
      case 'review': return canLoadMoreReview;
      case 'done': return canLoadMoreDone;
    }
  };

  const handleTaskPress = (task: Task) => {
    // Block task press if currently swiping horizontally
    if (isSwipingHorizontally.value) {
      return;
    }
    navigation.navigate('TaskDetail', { taskId: task.id });
  };

  const handleNewTask = () => {
    setShowCreateModal(true);
  };

  const handleTaskCreated = () => {
    loadAllTasks(true); // Тихое обновление после создания задачи
  };

  const statusTabs: { key: StatusTab; label: string; color: string; icon: string }[] = [
    { key: 'new', label: 'Новые', color: '#F59E0B', icon: 'document-text' },
    { key: 'in_progress', label: 'В работе', color: '#3B82F6', icon: 'time' },
    { key: 'review', label: 'Проверка', color: '#8B5CF6', icon: 'eye' },
    { key: 'done', label: 'Готово', color: '#10B981', icon: 'checkmark-circle' },
  ];

  const filterChips: { key: TaskFilter; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'my', label: 'Мои' },
    { key: 'assigned', label: 'Назначенные' },
  ];

  const currentTasks = getCurrentTasks(activeTab);
  const currentTotal = getTotalForStatus(activeTab);
  const isLoading = getLoadingForStatus(activeTab);
  const hasMore = currentTasks.length < currentTotal;
  const totalTasks = newTasksTotal + inProgressTotal + reviewTotal + doneTotal;

  // Render a single tab content
  const renderTabContent = (tab: StatusTab) => {
    const tabTasks = getCurrentTasks(tab);
    const tabTotal = getTotalForStatus(tab);
    const tabHasMore = tabTasks.length < tabTotal;

    return (
      <View key={tab} style={{ width: SCREEN_WIDTH, height: '100%' }}>
        {/* Expand All Subtasks Button */}
        {!isInitialLoading && tabTotal > 0 && (() => {
          const tasksWithSubtasks = tabTasks.filter(t => t.subtask_count && t.subtask_count > 0);
          if (tasksWithSubtasks.length === 0) return null;

          return (
            <TouchableOpacity
              style={styles.expandAllButton}
              onPress={() => setExpandAllSubtasks(!expandAllSubtasks)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={expandAllSubtasks ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#6b7280"
              />
              <Text style={styles.expandAllText}>
                {expandAllSubtasks ? 'Свернуть все подзадачи' : 'Развернуть все подзадачи'} ({tasksWithSubtasks.length})
              </Text>
            </TouchableOpacity>
          );
        })()}

        {isInitialLoading ? (
          <View style={{ flex: 1, paddingTop: 12 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <TaskSkeleton key={i} />
            ))}
          </View>
        ) : totalTasks === 0 ? (
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
        ) : tabTotal === 0 ? (
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
          <FlatList
            data={tabTasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const hasSubtaskCount = item.subtask_count && item.subtask_count > 0;
              const subtasks = subtasksCache[item.id];

              return (
                <View style={styles.taskItem}>
                  <TaskItem
                    task={item}
                    onPress={handleTaskPress}
                    subtasks={subtasks}
                    onSubtaskPress={handleTaskPress}
                    forceExpanded={expandAllSubtasks}
                  />
                </View>
              );
            }}
            contentContainerStyle={styles.taskList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            onEndReached={() => {
              if (getCanLoadMoreForStatus(tab) && tabHasMore && !getLoadingForStatus(tab)) {
                handleLoadMore(tab);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              getLoadingForStatus(tab) && tabHasMore ? (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                </View>
              ) : null
            }
          />
        )}
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    headerLeft: {
      width: 100,
    },
    title: {
      flex: 1,
      fontSize: 20,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    headerRight: {
      width: 100,
      justifyContent: 'flex-end',
    },
    addButton: {
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addButtonText: {
      fontSize: 38,
      fontWeight: '200',
      color: theme.primary,
      lineHeight: 32,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
    },
    tabsContainer: {
      flexDirection: 'row',
      marginTop: 0,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      borderBottomWidth: 0,
    },
    tab: {
      flex: 1,
      paddingTop: 4,
      paddingBottom: 5,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
      minHeight: 44,
    },
    tabActive: {
      borderBottomColor: 'transparent',
    },
    tabContent: {
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      width: '100%',
    },
    tabTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    tabIconWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
      textAlign: 'center',
    },
    tabCountContainer: {
      minWidth: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    tabCount: {
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 14,
    },
    taskList: {
      paddingTop: 12,
      paddingBottom: 120, // Для iOS с учетом tab bar
    },
    taskItem: {
      marginBottom: 12,
    },
    loadMoreContainer: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      backgroundColor: theme.background,
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
    expandAllButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: 'transparent',
    },
    expandAllText: {
      fontSize: 13,
      fontWeight: '500',
      color: '#6b7280',
    },
    horizontalTabsContainer: {
      flexDirection: 'row',
      width: SCREEN_WIDTH * 4, // 4 tabs
      height: '100%',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconButton: {
      padding: 4,
      position: 'relative',
      justifyContent: 'center',
      alignItems: 'center',
    },
    filterIndicator: {
      position: 'absolute',
      top: 2,
      right: 2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    searchContainer: {
      overflow: 'hidden',
    },
    searchInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      marginTop: 12,
      marginBottom: 8,
    },
    filterMenu: {
      position: 'absolute',
      top: 60,
      left: 16,
      minWidth: 180,
      borderRadius: 12,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 10,
    },
    filterMenuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 14,
      borderRadius: 8,
    },
    filterMenuItemActive: {
      backgroundColor: theme.backgroundSecondary,
    },
    filterMenuItemText: {
      fontSize: 15,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Задачи"
        customContent={
          <>
            {/* Header Row */}
            <View style={styles.headerRow}>
              <View style={[styles.headerLeft, styles.headerActions]}>
                {/* Filter Button with indicator */}
                <TouchableOpacity
                  onPress={() => setIsFilterMenuVisible(!isFilterMenuVisible)}
                  style={styles.iconButton}
                >
                  <Ionicons name="filter" size={24} color={theme.error} />
                  {filter !== 'all' && <View style={styles.filterIndicator} />}
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>Задачи</Text>

              <View style={[styles.headerRight, styles.headerActions]}>
                {/* Search Button */}
                <TouchableOpacity
                  onPress={() => setIsSearchVisible(!isSearchVisible)}
                  style={styles.iconButton}
                >
                  <Ionicons name={isSearchVisible ? "close" : "search"} size={24} color={theme.error} />
                </TouchableOpacity>

                {/* Add Button - Hidden for regular employees */}
                {user?.role !== 'employee' && (
                  <TouchableOpacity onPress={handleNewTask} style={styles.iconButton}>
                    <Ionicons name="add" size={30} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Animated Search Input */}
            <RNAnimated.View
              style={[
                styles.searchContainer,
                {
                  maxHeight: searchAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 60],
                  }),
                  opacity: searchAnimation,
                },
              ]}
            >
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={20} color={theme.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Поиск..."
                  placeholderTextColor={theme.inputPlaceholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus={isSearchVisible}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            </RNAnimated.View>

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
                    onPress={() => switchToTab(tab.key)}
                  >
                    <View style={styles.tabContent}>
                      {/* Текст всегда отображается */}
                      <Text
                        style={[
                          styles.tabLabel,
                          {
                            color: isActive ? tab.color : theme.textSecondary,
                            fontWeight: isActive ? '700' : '600',
                            fontSize: 11,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {tab.label}
                      </Text>

                      {/* Нижняя строка: иконка + число */}
                      <View style={styles.tabTopRow}>
                        <Ionicons
                          name={tab.icon as any}
                          size={isActive ? 22 : 20}
                          color={isActive ? tab.color : theme.textSecondary}
                        />

                        {count > 0 && (
                          <View
                            style={[
                              styles.tabCountContainer,
                              {
                                backgroundColor: isActive ? tab.color : theme.backgroundTertiary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tabCount,
                                {
                                  color: isActive ? '#FFFFFF' : theme.textTertiary,
                                },
                              ]}
                            >
                              {count}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
      />

      {/* Content container with horizontal tabs (iOS) or single tab (Android) */}
      <View style={{ flex: 1, backgroundColor: theme.background, overflow: 'hidden' }}>
      <GestureDetector gesture={swipeGesture}>
        <Animated.View style={[styles.horizontalTabsContainer, animatedContentStyle]}>
          {Platform.OS === 'ios' ? (
            // Render all tabs side by side for iOS swipe
            statusTabsOrder.map((tab) => renderTabContent(tab))
          ) : (
            // Render only active tab for Android
            renderTabContent(activeTab)
          )}
        </Animated.View>
      </GestureDetector>
      </View>

      {/* Filter Menu Dropdown */}
      {isFilterMenuVisible && (
        <Modal
          visible={isFilterMenuVisible}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsFilterMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsFilterMenuVisible(false)}
          >
            <View style={[styles.filterMenu, { backgroundColor: theme.card }]}>
              {filterChips.map((chip) => (
                <TouchableOpacity
                  key={chip.key}
                  style={[
                    styles.filterMenuItem,
                    filter === chip.key && styles.filterMenuItemActive,
                  ]}
                  onPress={() => {
                    setFilter(chip.key);
                    setIsFilterMenuVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.filterMenuItemText,
                      { color: theme.text },
                      filter === chip.key && { color: theme.primary, fontWeight: '600' },
                    ]}
                  >
                    {chip.label}
                  </Text>
                  {filter === chip.key && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
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

export default TaskListScreen;
