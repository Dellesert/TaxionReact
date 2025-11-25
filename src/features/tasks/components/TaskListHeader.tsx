import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@components/common/ScreenHeader';
import { NotificationBell } from '@components/common/NotificationBell';
import { useTheme } from '@shared/hooks/useTheme';
import type { TaskFilter } from '../../../utils/taskListHelpers';
import { TaskSearchBar } from './TaskSearchBar';

interface TaskListHeaderProps {
  filter: TaskFilter;
  isSearchVisible: boolean;
  searchQuery: string;
  onSearchToggle: () => void;
  onFilterToggle: () => void;
  onSearchChange: (query: string) => void;
  onNewTask: () => void;
  canCreateTask: boolean;
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
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
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
              <TouchableOpacity
                onPress={onFilterToggle}
                style={styles.iconButton}
              >
                <Ionicons name="filter" size={24} color={theme.error} />
                {filter !== 'all' && <View style={styles.filterIndicator} />}
              </TouchableOpacity>

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
        </>
      }
    />
  );
};
