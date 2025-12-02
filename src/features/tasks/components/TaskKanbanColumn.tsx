import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task } from '../types/task.types';
import type { StatusTab } from '../hooks/useTaskListData';
import { TaskItem } from './TaskItem';
import { TaskListEmptyState } from './TaskListEmptyState';
import { STATUS_TABS } from '../utils/taskListHelpers';

interface TaskKanbanColumnProps {
  status: StatusTab;
  tasks: Task[];
  total: number;
  loading: boolean;
  canLoadMore: boolean;
  subtasksCache: Record<number, Task[]>;
  expandAllSubtasks: boolean;
  onTaskPress: (task: Task) => void;
  onLoadMore: () => void;
  searchQuery: string;
  columnWidth: number;
}

export const TaskKanbanColumn: React.FC<TaskKanbanColumnProps> = ({
  status,
  tasks,
  total,
  loading,
  canLoadMore,
  subtasksCache,
  expandAllSubtasks,
  onTaskPress,
  onLoadMore,
  searchQuery,
  columnWidth,
}) => {
  const { theme } = useTheme();

  const statusInfo = STATUS_TABS.find(tab => tab.key === status);
  const hasMore = tasks.length < total;

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;

    if (isCloseToBottom && canLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  }, [canLoadMore, hasMore, loading, onLoadMore]);

  return (
    <View style={[styles.column, { backgroundColor: theme.card, width: columnWidth }]}>
      {/* Column Header */}
      <View style={[styles.columnHeader, { borderBottomColor: theme.border }]}>
        <View style={styles.columnHeaderContent}>
          <Text style={[styles.columnTitle, { color: statusInfo?.color || theme.text }]}>
            {statusInfo?.label || status}
          </Text>
          {total > 0 && (
            <View style={[styles.countBadge, { backgroundColor: statusInfo?.color || theme.primary }]}>
              <Text style={styles.countText}>{total}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Column Content */}
      <ScrollView
        style={styles.columnContent}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        {total === 0 ? (
          <View style={styles.emptyContainer}>
            <TaskListEmptyState searchQuery={searchQuery} isAllEmpty={false} />
          </View>
        ) : (
          <View style={styles.taskList}>
            {tasks.map((item) => {
              const subtasks = subtasksCache[item.id];
              return (
                <View key={item.id} style={styles.taskItem}>
                  <TaskItem
                    task={item}
                    onPress={onTaskPress}
                    subtasks={subtasks}
                    onSubtaskPress={onTaskPress}
                    forceExpanded={expandAllSubtasks}
                    isKanbanMode={true}
                  />
                </View>
              );
            })}
            {loading && hasMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    borderRadius: 8,
    marginHorizontal: 6,
    overflow: 'hidden',
  },
  columnHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
  },
  columnHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  columnContent: {
    flex: 1,
  },
  taskList: {
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 8,
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
});
