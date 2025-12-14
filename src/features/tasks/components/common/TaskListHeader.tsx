import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { NotificationBell } from '@shared/components/common/NotificationBell';
import { useTheme } from '@shared/hooks/useTheme';
import type { TaskFilter, StatusTab } from '../../utils/taskListHelpers';
import type { TotalsByStatus } from '../../hooks/useTaskListData';
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
  isDesktop?: boolean;
}

export const TaskListHeader: React.FC<TaskListHeaderProps> = React.memo(({
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
  isDesktop = false,
}) => {
  const { theme } = useTheme();
  const filterButtonRef = React.useRef<View>(null);

  const handleFilterToggle = () => {
    if (onFilterButtonLayout && filterButtonRef.current) {
      filterButtonRef.current.measure((_x, _y, width, height, pageX, pageY) => {
        onFilterButtonLayout({ x: pageX, y: pageY, width, height });
      });
    }
    onFilterToggle();
  };

  // Desktop header content
  if (isDesktop) {
    // Check if running in Electron
    const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

    return (
      <View style={[styles.desktopHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={styles.desktopHeaderContent}>
          {/* Left side - Title */}
          <View style={styles.desktopLeft}>
            <Text style={[styles.desktopTitle, { color: theme.text }]}>Задачи</Text>
          </View>

          {/* Center - Search (только для браузера, не Electron) */}
          {!isElectron && (
            <View style={styles.desktopCenter}>
              <View style={[styles.desktopSearchContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
                <TextInput
                  style={[styles.desktopSearchInput, { color: theme.text }]}
                  placeholder="Поиск задач..."
                  placeholderTextColor={theme.textSecondary}
                  value={searchQuery}
                  onChangeText={onSearchChange}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => onSearchChange('')} style={styles.clearButton}>
                    <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Right side - Actions */}
          <View style={styles.desktopRight}>
            {/* Filter Button */}
            <View ref={filterButtonRef} collapsable={false}>
              <TouchableOpacity
                onPress={handleFilterToggle}
                style={[styles.desktopButton, { borderColor: theme.border }]}
              >
                <Ionicons name="filter" size={20} color={theme.text} />
                <Text style={[styles.desktopButtonText, { color: theme.text }]}>
                  Фильтры
                </Text>
                {filter !== 'all' && <View style={[styles.desktopFilterIndicator, { backgroundColor: theme.primary }]} />}
              </TouchableOpacity>
            </View>

            {/* Create Task Button */}
            {canCreateTask && (
              <TouchableOpacity
                onPress={onNewTask}
                style={[styles.desktopButtonPrimary, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.desktopButtonPrimaryText}>Создать задачу</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  // Mobile header content
  return (
    <ScreenHeader
      title="Задачи"
      customContent={
        <>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <NotificationBell />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>Задачи</Text>

            <View style={[styles.headerRight, styles.headerActions]}>
              {/* Filter Button with indicator */}
              <View ref={filterButtonRef} collapsable={false}>
                <TouchableOpacity
                  onPress={handleFilterToggle}
                  style={styles.iconButton}
                >
                  <Ionicons name="filter" size={24} color={theme.error} />
                  {filter !== 'all' && <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />}
                </TouchableOpacity>
              </View>

              {/* Search Button */}
              <TouchableOpacity
                onPress={onSearchToggle}
                style={[styles.iconButton, styles.searchButton]}
              >
                <Ionicons
                  name={isSearchVisible ? 'close' : 'search'}
                  size={22}
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
});

const styles = StyleSheet.create({
  // Mobile styles
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
  searchButton: {
    marginLeft: 4,
  },
  filterIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Desktop styles
  desktopHeader: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  desktopHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
  },
  desktopLeft: {
    flexShrink: 0,
    minWidth: 100,
  },
  desktopTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  desktopCenter: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -300 }], // Half of maxWidth (600/2)
    width: 600,
    maxWidth: 600,
    ...Platform.select({
      web: {
        // @ts-ignore - web only
        transform: 'translateX(-50%)',
        left: '50%',
      },
    }),
  },
  desktopSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 18,
    borderWidth: 2,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
        transitionProperty: 'border-color, box-shadow',
        transitionDuration: '0.2s',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  desktopSearchInput: {
    flex: 1,
    fontSize: 15,
    height: 44,
    ...(Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }) as any),
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
      },
    }),
  },
  desktopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 0,
  },
  desktopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'background-color, border-color, transform',
        transitionDuration: '0.15s',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  desktopButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  desktopFilterIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  desktopButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.15s',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  desktopButtonPrimaryText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});
