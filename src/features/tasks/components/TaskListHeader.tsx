import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { useTheme } from '@shared/hooks/useTheme';
import type { TaskFilter, StatusTab } from '../utils/taskListHelpers';
import type { TotalsByStatus } from '../hooks/useTaskListData';
import { TaskSearchBar } from './TaskSearchBar';
import { TaskStatusTabs } from './TaskStatusTabs';

interface TaskListHeaderProps {
  filter: TaskFilter;
  isSearchVisible: boolean;
  searchQuery: string;
  onSearchToggle: () => void;
  onFilterToggle: () => void;
  onSearchChange: (query: string) => void;
  onNewTask: () => void;
  canCreateTask: boolean;
  activeTab: StatusTab;
  totals: TotalsByStatus;
  onTabChange: (tab: StatusTab) => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
}

export const TaskListHeader: React.FC<TaskListHeaderProps> = ({
  filter,
  isSearchVisible,
  searchQuery,
  onSearchToggle,
  onFilterToggle,
  onSearchChange,
  onNewTask,
  canCreateTask,
  activeTab,
  totals,
  onTabChange,
  onFilterButtonLayout,
}) => {
  const { theme } = useTheme();
  const filterButtonRef = React.useRef<View>(null);

  const handleFilterToggle = () => {
    if (onFilterButtonLayout && filterButtonRef.current) {
      filterButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        onFilterButtonLayout({ x: pageX, y: pageY, width, height });
      });
    }
    onFilterToggle();
  };

  const styles = StyleSheet.create({
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconButton: {
      paddingHorizontal: 4,
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
  });

  return (
    <ScreenHeader
      title="Задачи"
      customContent={
        <>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <NotificationBell />
            </View>

            <Text style={styles.title}>Задачи</Text>

            <View style={[styles.headerRight, styles.headerActions]}>
              {/* Filter Button with indicator */}
              <View ref={filterButtonRef} collapsable={false}>
                <TouchableOpacity
                  onPress={handleFilterToggle}
                  style={styles.iconButton}
                >
                  <Ionicons name="filter" size={24} color={theme.error} />
                  {filter !== 'all' && <View style={styles.filterIndicator} />}
                </TouchableOpacity>
              </View>

              {/* Search Button */}
              <TouchableOpacity
                onPress={onSearchToggle}
                style={styles.iconButton}
              >
                <Ionicons
                  name={isSearchVisible ? 'close' : 'search'}
                  size={24}
                  color={theme.error}
                />
              </TouchableOpacity>

              {/* Add Button - Hidden for regular employees */}
              {canCreateTask && (
                <TouchableOpacity onPress={onNewTask} style={styles.iconButton}>
                  <Ionicons name="add" size={30} color={theme.primary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Animated Search Input */}
          <TaskSearchBar
            isVisible={isSearchVisible}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
          />

          {/* Status Tabs */}
          <TaskStatusTabs
            activeTab={activeTab}
            totals={totals}
            onTabChange={onTabChange}
          />
        </>
      }
    />
  );
};
