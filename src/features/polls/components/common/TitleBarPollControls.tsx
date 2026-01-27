/**
 * TitleBarPollControls
 * Компактные контролы опросов для Electron TitleBar
 * Объединяет переключатель видов, фильтры и создание
 */

import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type PollViewMode = 'grid' | 'table';

interface TitleBarPollControlsProps {
  viewMode: PollViewMode;
  onViewModeChange: (mode: PollViewMode) => void;
  hasActiveFilters: boolean;
  onFilterToggle: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  canCreatePoll: boolean;
  onNewPoll: () => void;
}

// Иконки для видов
const VIEW_OPTIONS: { value: PollViewMode; icon: keyof typeof Ionicons.glyphMap; tooltip: string }[] = [
  { value: 'grid', icon: 'grid-outline', tooltip: 'Сетка' },
  { value: 'table', icon: 'list-outline', tooltip: 'Таблица' },
];

export const TitleBarPollControls: React.FC<TitleBarPollControlsProps> = ({
  viewMode,
  onViewModeChange,
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
