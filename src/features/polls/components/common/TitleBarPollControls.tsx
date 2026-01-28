/**
 * TitleBarPollControls
 * Компактные контролы опросов для Electron TitleBar (правая часть)
 * Содержит фильтры и создание
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type PollViewMode = 'grid' | 'table';

interface TitleBarPollControlsProps {
  hasActiveFilters: boolean;
  onFilterToggle: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  canCreatePoll: boolean;
  onNewPoll: () => void;
}

export const TitleBarPollControls: React.FC<TitleBarPollControlsProps> = ({
  hasActiveFilters,
  onFilterToggle,
  onFilterButtonLayout,
  canCreatePoll,
  onNewPoll,
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
      {canCreatePoll && (
        <View
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only
          onClick={onNewPoll}
          title="Создать опрос"
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
