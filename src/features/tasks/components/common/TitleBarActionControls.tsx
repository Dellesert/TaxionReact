/**
 * TitleBarActionControls
 * Компактные кнопки действий для отображения в Electron TitleBar
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface TitleBarActionControlsProps {
  hasActiveFilters: boolean;
  onFilterToggle: () => void;
  onFilterButtonLayout?: (layout: { x: number; y: number; width: number; height: number }) => void;
  canCreateTask: boolean;
  onNewTask: () => void;
}

export const TitleBarActionControls: React.FC<TitleBarActionControlsProps> = ({
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
      {/* Filter Button */}
      <View
        // @ts-ignore - ref type
        ref={filterButtonRef}
        style={[styles.button, { borderColor: theme.border }]}
        // @ts-ignore - Web-only event handlers
        onClick={handleFilterToggle}
        onMouseEnter={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
          }
        }}
        onMouseLeave={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Ionicons name="filter" size={12} color={theme.text} />
        <Text style={[styles.buttonText, { color: theme.text }]}>Фильтры</Text>
        {hasActiveFilters && (
          <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />
        )}
      </View>

      {/* Create Task Button */}
      {canCreateTask && (
        <View
          style={[styles.primaryButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only event handlers
          onClick={onNewTask}
          onMouseEnter={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e: any) => {
            if (e.currentTarget?.style) {
              e.currentTarget.style.opacity = '1';
            }
          }}
        >
          <Ionicons name="add" size={12} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Создать</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as any,
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
    position: 'relative',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  filterIndicator: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  primaryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
