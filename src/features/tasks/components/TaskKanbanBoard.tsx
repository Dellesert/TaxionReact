import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import type { Task } from '../types/task.types';
import type { StatusTab, TasksByStatus, TotalsByStatus, LoadingByStatus, CanLoadMoreByStatus } from '../hooks/useTaskListData';
import { TaskKanbanColumn } from './TaskKanbanColumn';
import { ExpandAllSubtasksButton } from './ExpandAllSubtasksButton';
import { getTasksWithSubtasks, STATUS_TABS_ORDER } from '../utils/taskListHelpers';

interface TaskKanbanBoardProps {
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  canLoadMore: CanLoadMoreByStatus;
  subtasksCache: Record<number, Task[]>;
  expandAllSubtasks: boolean;
  refreshing?: boolean;
  searchQuery: string;
  onTaskPress: (task: Task) => void;
  onLoadMore: (status: StatusTab) => void;
  onRefresh?: () => void;
  onExpandAllToggle: () => void;
}

export const TaskKanbanBoard: React.FC<TaskKanbanBoardProps> = ({
  tasks,
  totals,
  loading,
  canLoadMore,
  subtasksCache,
  expandAllSubtasks,
  searchQuery,
  onTaskPress,
  onLoadMore,
  onExpandAllToggle,
}) => {
  const { width } = useWindowDimensions();

  // Calculate column width: divide by 4 columns accounting for all gaps and sidebar
  // SideNavBar width: 80px
  // Each column has marginHorizontal: 6 (12px total per column)
  // Container has paddingHorizontal: 12 (24px total)
  // Total to subtract: 80 (sidebar) + 24 (container padding) + 48 (4 columns * 12px margin) = 152px
  const SIDEBAR_WIDTH = 80;
  const CONTAINER_PADDING = 24;
  const COLUMN_MARGINS = 48;
  const columnWidth = (width - SIDEBAR_WIDTH - CONTAINER_PADDING - COLUMN_MARGINS) / 4;

  // Count total tasks with subtasks across all columns
  const totalTasksWithSubtasks = STATUS_TABS_ORDER.reduce((count, status) => {
    return count + getTasksWithSubtasks(tasks[status]).length;
  }, 0);

  const totalAllTasks = totals.new + totals.in_progress + totals.review + totals.done;

  return (
    <View style={styles.container}>
      {/* Expand All Subtasks Button */}
      {totalAllTasks > 0 && totalTasksWithSubtasks > 0 && (
        <ExpandAllSubtasksButton
          expanded={expandAllSubtasks}
          count={totalTasksWithSubtasks}
          onToggle={onExpandAllToggle}
        />
      )}

      {/* Kanban Columns */}
      <View style={styles.columnsContainer}>
        {STATUS_TABS_ORDER.map((status) => (
          <TaskKanbanColumn
            key={status}
            status={status}
            tasks={tasks[status]}
            total={totals[status]}
            loading={loading[status]}
            canLoadMore={canLoadMore[status]}
            subtasksCache={subtasksCache}
            expandAllSubtasks={expandAllSubtasks}
            onTaskPress={onTaskPress}
            onLoadMore={() => onLoadMore(status)}
            searchQuery={searchQuery}
            columnWidth={columnWidth}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  columnsContainer: {
    flexDirection: 'row',
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});
