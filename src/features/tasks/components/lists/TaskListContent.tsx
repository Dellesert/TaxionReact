import React from 'react';
import { View, ActivityIndicator, RefreshControl, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { TaskItem } from './TaskItem';
import { TaskListSkeleton } from '../states/TaskListSkeleton';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task } from '../../types/task.types';
import type { StatusTab, TasksByStatus, TotalsByStatus, LoadingByStatus, CanLoadMoreByStatus } from '../../hooks/useTaskListData';
import { TaskListEmptyState } from '../states/TaskListEmptyState';
import { ExpandAllSubtasksButton } from '../common/ExpandAllSubtasksButton';
import { getTasksWithSubtasks, STATUS_TABS_ORDER } from '../../utils/taskListHelpers';

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
  translateX: SharedValue<number>;
  swipeGesture: any;
  onTaskPress: (task: Task) => void;
  onLoadMore: (status: StatusTab) => void;
  onRefresh: () => void;
  onExpandAllToggle: () => void;
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
  translateX,
  swipeGesture,
  onTaskPress,
  onLoadMore,
  onRefresh,
  onExpandAllToggle,
}) => {
  const { theme } = useTheme();

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
        {isInitialLoading ? (
          <TaskListSkeleton />
        ) : (
          <>
            {/* Expand All Subtasks Button */}
            {tabTotal > 0 && (
              <ExpandAllSubtasksButton
                expanded={expandAllSubtasks}
                count={tasksWithSubtasksCount}
                onToggle={onExpandAllToggle}
              />
            )}

            {totalAllTasks === 0 ? (
              <ScrollView
                contentContainerStyle={styles.emptyStateContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              >
                <TaskListEmptyState searchQuery={searchQuery} isAllEmpty={true} />
              </ScrollView>
            ) : tabTotal === 0 ? (
              <ScrollView
                contentContainerStyle={styles.emptyStateContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              >
                <TaskListEmptyState searchQuery={searchQuery} isAllEmpty={false} />
              </ScrollView>
            ) : (
          <FlashList
            data={tabTasks}
            keyExtractor={(item) => item.id.toString()}
            estimatedItemSize={100}
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
          </>
        )}
      </View>
    );
  };

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
  emptyStateContainer: {
    flexGrow: 1,
  },
});
