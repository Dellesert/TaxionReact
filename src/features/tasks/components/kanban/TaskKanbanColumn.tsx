import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task } from '../../types/task.types';
import type { StatusTab } from '../../hooks/useTaskListData';
import { TaskItem } from '../lists/TaskItem';
import { TaskListEmptyState } from '../states/TaskListEmptyState';
import { STATUS_TABS } from '../../utils/taskListHelpers';

interface TaskKanbanColumnProps {
  status: StatusTab;
  tasks: Task[];
  total: number;
  loading: boolean;
  canLoadMore: boolean;
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
  expandAllSubtasks,
  onTaskPress,
  onLoadMore,
  searchQuery,
  columnWidth,
}) => {
  const { theme } = useTheme();

  const statusInfo = STATUS_TABS.find(tab => tab.key === status);
  const hasMore = tasks.length < total;

  // Generate gradient colors based on status color
  const getGradientColors = (baseColor: string): [string, string] => {
    // Add alpha to make gradient more subtle
    const lightColor = `${baseColor}15`; // 15 = ~8% opacity
    const darkColor = `${baseColor}05`;  // 05 = ~2% opacity
    return [lightColor, darkColor];
  };

  const gradientColors = statusInfo ? getGradientColors(statusInfo.color) : ['transparent', 'transparent'];

  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;

    if (isCloseToBottom && canLoadMore && hasMore && !loading) {
      onLoadMore();
    }
  }, [canLoadMore, hasMore, loading, onLoadMore]);

  return (
    <View style={[styles.column, { width: columnWidth }]}>
      {/* Gradient Background */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Column Container */}
      <View style={[styles.columnContainer, { backgroundColor: theme.card }]}>
        {/* Column Header */}
        <View style={[styles.columnHeader, { borderBottomColor: `${statusInfo?.color || theme.border}30` }]}>
          <View style={styles.columnHeaderContent}>
            <Text style={[styles.columnTitle, { color: theme.text }]}>
              {statusInfo?.label || status}
            </Text>
            {total > 0 && (
              <View style={[styles.countBadge, {
                backgroundColor: statusInfo?.color || theme.primary,
                shadowColor: statusInfo?.color || theme.primary,
              }]}>
                <Text style={styles.countText}>{total}</Text>
              </View>
            )}
          </View>
          {/* Subtle status indicator line */}
          <View style={[styles.statusLine, { backgroundColor: statusInfo?.color || theme.primary }]} />
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
            {tasks.map((item) => (
              <View key={item.id} style={styles.taskItem}>
                <TaskItem
                  task={item}
                  onPress={onTaskPress}
                  subtasks={item.subtasks}
                  onSubtaskPress={onTaskPress}
                  forceExpanded={expandAllSubtasks}
                  isKanbanMode={true}
                />
              </View>
            ))}
            {loading && hasMore && (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size="small" color={theme.primary} />
              </View>
            )}
          </View>
        )}
      </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  column: {
    borderRadius: 12,
    marginHorizontal: 6,
    marginBottom: 24,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06), 0 1px 4px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  columnContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  columnHeader: {
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    position: 'relative',
  },
  columnHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28, // Fixed height to match countBadge height
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  statusLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 1.5,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 13,
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
