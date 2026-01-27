/**
 * TitleBarTaskControls
 * Компактные контролы задач для Electron TitleBar
 * Объединяет переключатель видов, подзадачи, фильтры и создание
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { ViewMode } from './TaskViewSwitcher';

interface TitleBarTaskControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  expandedAll: boolean;
  onExpandToggle: () => void;
  subtaskCount: number;
  hasActiveFilters: boolean;
  onFilterToggle: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  canCreateTask: boolean;
  onNewTask: () => void;
}

// Иконки для видов
const VIEW_OPTIONS: { value: ViewMode; icon: keyof typeof Ionicons.glyphMap; tooltip: string }[] = [
  { value: 'board', icon: 'grid-outline', tooltip: 'Доска' },
  { value: 'table', icon: 'list-outline', tooltip: 'Таблица' },
];

export const TitleBarTaskControls: React.FC<TitleBarTaskControlsProps> = ({
  viewMode,
  onViewModeChange,
  expandedAll,
  onExpandToggle,
  subtaskCount,
  hasActiveFilters,
  onFilterToggle,
  onFilterButtonLayout,
  canCreateTask,
  onNewTask,
}) => {
  const { theme } = useTheme();
  const filterButtonRef = useRef<View>(null);

  const handleFilterToggle = () => {
    if (onFilterButtonLayout && filterButtonRef.current) {
      // @ts-ignore - Web-only method
      const rect = filterButtonRef.current.getBoundingClientRect?.();
      if (rect) {
        onFilterButtonLayout({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        });
      }
    }
    onFilterToggle();
  };

  return (
    <View style={styles.container}>
      {/* View Switcher */}
      <View style={[styles.viewGroup, { backgroundColor: theme.backgroundTertiary }]}>
        {VIEW_OPTIONS.map((option) => (
          <View
            key={option.value}
            style={[
              styles.viewButton,
              viewMode === option.value && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
            ]}
            // @ts-ignore - Web-only
            onClick={() => onViewModeChange(option.value)}
            title={option.tooltip}
            onMouseEnter={(e: any) => {
              if (viewMode !== option.value && e.currentTarget?.style) {
                e.currentTarget.style.backgroundColor = theme.border;
              }
            }}
            onMouseLeave={(e: any) => {
              if (viewMode !== option.value && e.currentTarget?.style) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Ionicons
              name={option.icon}
              size={14}
              color={viewMode === option.value ? theme.primary : theme.textSecondary}
            />
          </View>
        ))}
      </View>

      {/* Expand/Collapse Subtasks */}
      {subtaskCount > 0 && (
        <View
          style={[styles.expandButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={onExpandToggle}
          title={expandedAll ? 'Свернуть подзадачи' : 'Развернуть подзадачи'}
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Ionicons
            name={expandedAll ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={theme.textSecondary}
          />
          <View style={[styles.badge, { backgroundColor: theme.border }]}>
            <Ionicons name="layers-outline" size={10} color={theme.textSecondary} style={{ marginRight: 2 }} />
            <View style={styles.badgeText}>
              <Ionicons name="ellipse" size={4} color={theme.textSecondary} />
            </View>
          </View>
        </View>
      )}

      {/* Filter Button */}
      <View
        // @ts-ignore - ref type
        ref={filterButtonRef}
        style={[styles.filterButton, { backgroundColor: theme.backgroundTertiary }]}
        // @ts-ignore - Web-only
        onClick={handleFilterToggle}
        title="Фильтры"
        onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
        onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
      >
        <Ionicons name="funnel-outline" size={14} color={theme.text} />
        {hasActiveFilters && (
          <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />
        )}
      </View>

      {/* Create Button */}
      {canCreateTask && (
        <View
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only
          onClick={onNewTask}
          title="Создать задачу"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as any,
  viewGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 2,
    gap: 2,
  } as any,
  viewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 26,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as any,
  activeViewButton: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  } as any,
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  } as any,
  badgeText: {
    flexDirection: 'row',
    alignItems: 'center',
  } as any,
  filterButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    position: 'relative',
  } as any,
  filterIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  } as any,
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
});
