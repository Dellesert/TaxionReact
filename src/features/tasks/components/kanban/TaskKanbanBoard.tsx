import React from 'react';
import { StyleSheet, useWindowDimensions, View, ScrollView, Platform } from 'react-native';
import type { Task } from '../../types/task.types';
import type { StatusTab, TasksByStatus, TotalsByStatus, LoadingByStatus, CanLoadMoreByStatus } from '../../hooks/useTaskListData';
import { TaskKanbanColumn } from './TaskKanbanColumn';
import { STATUS_TABS_ORDER } from '../../utils/taskListHelpers';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useSidebar } from '@shared/contexts/SidebarContext';

interface TaskKanbanBoardProps {
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  canLoadMore: CanLoadMoreByStatus;
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
  expandAllSubtasks,
  searchQuery,
  onTaskPress,
  onLoadMore,
}) => {
  const { width } = useWindowDimensions();
  const isWideScreen = useIsWideScreen();
  const { sidebarWidth } = useSidebar();

  // Minimum column width to ensure all content fits
  const MIN_COLUMN_WIDTH = 330;

  let columnWidth: number;

  if (isWideScreen) {
    // Desktop: Calculate column width for 4 columns accounting for all gaps and sidebar
    // Each column has marginHorizontal: 6 (12px total per column)
    // Container has paddingHorizontal: 12 (24px total)
    const CONTAINER_PADDING = 24;
    const COLUMN_MARGINS = 48;
    // Use dynamic sidebar width from context
    const calculatedColumnWidth = (width - sidebarWidth - CONTAINER_PADDING - COLUMN_MARGINS) / 4;

    // Use minimum width if calculated width is too small
    columnWidth = Math.max(calculatedColumnWidth, MIN_COLUMN_WIDTH);
  } else {
    // Mobile: use full width minus padding and margins
    const CONTAINER_PADDING = 24;
    const COLUMN_MARGINS = 12; // marginHorizontal: 6 per column * 2
    columnWidth = width - CONTAINER_PADDING - COLUMN_MARGINS;
  }

  return (
    <View style={styles.container}>
      {/* Kanban Columns */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.scrollContainer}
        contentContainerStyle={styles.columnsContainer}
      >
        {STATUS_TABS_ORDER.map((status) => (
          <TaskKanbanColumn
            key={status}
            status={status}
            tasks={tasks[status]}
            total={totals[status]}
            loading={loading[status]}
            canLoadMore={canLoadMore[status]}
            expandAllSubtasks={expandAllSubtasks}
            onTaskPress={onTaskPress}
            onLoadMore={() => onLoadMore(status)}
            searchQuery={searchQuery}
            columnWidth={columnWidth}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  columnsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
});
