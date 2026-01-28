/**
 * TitleBarTaskControls
 * Компактные контролы задач для Electron TitleBar (правая часть)
 * Содержит подзадачи, фильтры и создание
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TitleBarTaskControlsProps {
  expandedAll: boolean;
  onExpandToggle: () => void;
  subtaskCount: number;
  hasActiveFilters: boolean;
  onFilterToggle: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  canCreateTask: boolean;
  onNewTask: () => void;
}

export const TitleBarTaskControls: React.FC<TitleBarTaskControlsProps> = ({
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
        <Text style={[styles.buttonLabel, { color: theme.text }]}>Фильтры</Text>
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
          <Text style={styles.addButtonLabel}>Создать</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    position: 'relative',
    gap: 6,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 10,
    paddingRight: 15,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    gap: 6,
  } as any,
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
  } as any,
  addButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  } as any,
});
