import React from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, StyleSheet, Dimensions, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { TaskItem } from '../components/TaskItem';
import { TaskSkeleton } from '../components/TaskSkeleton';
import { useTheme } from '@hooks/useTheme';
import type { Task } from '../types/task.types';
import type { StatusTab, TasksByStatus, TotalsByStatus, LoadingByStatus, CanLoadMoreByStatus } from '../../../hooks/useTaskListData';
import { TaskListEmptyState } from './TaskListEmptyState';
import { ExpandAllSubtasksButton } from './ExpandAllSubtasksButton';
import { getTasksWithSubtasks, STATUS_TABS_ORDER } from '../../../utils/taskListHelpers';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface TaskListContentProps {
  activeTab: StatusTab;
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  canLoadMore: CanLoadMoreByStatus;
  isInitialLoading: boolean;
  subtasksCache: Record<number, Task[]>;
  expandAllSubtasks: boolean;
  refreshing: boolean;
  searchQuery: string;
  onTaskPress: (task: Task) => void;
  onLoadMore: (status: StatusTab) => void;
  onRefresh: () => void;
  onExpandAllToggle: () => void;
  onTabChange: (tab: StatusTab) => void;
}

export const TaskListContent: React.FC<TaskListContentProps> = ({
  activeTab,
  tasks,
  totals,
  loading,
  canLoadMore,
  isInitialLoading,
  subtasksCache,
  expandAllSubtasks,
  refreshing,
  searchQuery,
  onTaskPress,
  onLoadMore,
  onRefresh,
  onExpandAllToggle,
  onTabChange,
}) => {
  const { theme } = useTheme();

  // Animation for tab transitions (slide with Reanimated)
  const translateX = useSharedValue(0);
  const isSwipingHorizontally = useSharedValue(false);
  const currentTabIndex = useSharedValue(STATUS_TABS_ORDER.indexOf(activeTab));

  const resetSwipeFlag = () => {
    setTimeout(() => {
      isSwipingHorizontally.value = false;
    }, 100);
  };

  // Initialize translateX based on active tab
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      const currentIndex = STATUS_TABS_ORDER.indexOf(activeTab);
      currentTabIndex.value = currentIndex;
      translateX.value = -currentIndex * SCREEN_WIDTH;
    }
  }, [activeTab]);

  const swipeGesture = Gesture.Pan()
    .enabled(Platform.OS === 'ios')
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      isSwipingHorizontally.value = false;
    })
    .onUpdate((event) => {
      'worklet';
      const absX = Math.abs(event.translationX);
      const absY = Math.abs(event.translationY);

      if (absX > absY || absX > 3) {
        isSwipingHorizontally.value = true;
        const baseOffset = -currentTabIndex.value * SCREEN_WIDTH;
        translateX.value = baseOffset + event.translationX;
      }
    })
    .onEnd((event) => {
      'worklet';
      const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
      const VELOCITY_THRESHOLD = 500;
      const currentIndex = currentTabIndex.value;

      const shouldSwitchTab = Math.abs(event.translationX) > SWIPE_THRESHOLD || Math.abs(event.velocityX) > VELOCITY_THRESHOLD;

      let targetIndex = currentIndex;

      if (shouldSwitchTab && event.translationX > 0 && currentIndex > 0) {
        targetIndex = currentIndex - 1;
      } else if (shouldSwitchTab && event.translationX < 0 && currentIndex < 3) {
        targetIndex = currentIndex + 1;
      }

      const targetOffset = -targetIndex * SCREEN_WIDTH;
      translateX.value = withTiming(targetOffset, {
        duration: 250,
      }, () => {
        currentTabIndex.value = targetIndex;
      });

      if (targetIndex !== currentIndex) {
        runOnJS(onTabChange)(STATUS_TABS_ORDER[targetIndex]);
      }

      runOnJS(resetSwipeFlag)();
    });

  const animatedContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const totalAllTasks = totals.new + totals.in_progress + totals.review + totals.done;

  const renderTabContent = (tab: StatusTab) => {
    const tabTasks = tasks[tab];
    const tabTotal = totals[tab];
    const tabHasMore = tabTasks.length < tabTotal;
    const tabLoading = loading[tab];
    const tasksWithSubtasksCount = getTasksWithSubtasks(tabTasks).length;

    return (
      <View key={tab} style={{ width: SCREEN_WIDTH, height: '100%' }}>
        {/* Expand All Subtasks Button */}
        {!isInitialLoading && tabTotal > 0 && (
          <ExpandAllSubtasksButton
            expanded={expandAllSubtasks}
            count={tasksWithSubtasksCount}
            onToggle={onExpandAllToggle}
          />
        )}

        {isInitialLoading ? (
          <View style={{ flex: 1, paddingTop: 12 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <TaskSkeleton key={i} />
            ))}
          </View>
        ) : totalAllTasks === 0 ? (
          <TaskListEmptyState searchQuery={searchQuery} isAllEmpty={true} />
        ) : tabTotal === 0 ? (
          <TaskListEmptyState searchQuery={searchQuery} isAllEmpty={false} />
        ) : (
          <FlatList
            data={tabTasks}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const subtasks = subtasksCache[item.id];

              return (
                <View style={styles.taskItem}>
                  <TaskItem
                    task={item}
                    onPress={onTaskPress}
                    subtasks={subtasks}
                    onSubtaskPress={onTaskPress}
                    forceExpanded={expandAllSubtasks}
                  />
                </View>
              );
            }}
            contentContainerStyle={styles.taskList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={() => {
              if (canLoadMore[tab] && tabHasMore && !tabLoading) {
                onLoadMore(tab);
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              tabLoading && tabHasMore ? (
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
    taskList: {
      paddingTop: 12,
      paddingBottom: 120,
    },
    taskItem: {
      marginBottom: 12,
    },
    loadMoreContainer: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    horizontalTabsContainer: {
      flexDirection: 'row',
      width: SCREEN_WIDTH * 4,
      height: '100%',
    },
  });

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={[styles.horizontalTabsContainer, animatedContentStyle]}>
        {Platform.OS === 'ios' ? (
          STATUS_TABS_ORDER.map((tab) => renderTabContent(tab))
        ) : (
          renderTabContent(activeTab)
        )}
      </Animated.View>
    </GestureDetector>
  );
};
