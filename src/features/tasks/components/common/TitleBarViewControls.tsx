/**
 * TitleBarViewControls
 * Компактный переключатель видов для отображения в Electron TitleBar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { ViewMode } from './TaskViewSwitcher';

interface TitleBarViewControlsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  expandedAll: boolean;
  onExpandToggle: () => void;
  subtaskCount: number;
}

export const TitleBarViewControls: React.FC<TitleBarViewControlsProps> = ({
  viewMode,
  onViewModeChange,
  expandedAll,
  onExpandToggle,
  subtaskCount,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundTertiary }]}>
      {/* Board View Button */}
      <View
        style={[
          styles.button,
          viewMode === 'board' && [styles.activeButton, { backgroundColor: theme.backgroundSecondary }],
        ]}
        // @ts-ignore - Web-only event handlers
        onClick={() => onViewModeChange('board')}
        onMouseEnter={(e: any) => {
          if (viewMode !== 'board' && e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.border;
          }
        }}
        onMouseLeave={(e: any) => {
          if (viewMode !== 'board' && e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Ionicons
          name="grid-outline"
          size={12}
          color={viewMode === 'board' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.buttonText,
            { color: viewMode === 'board' ? theme.text : theme.textSecondary },
          ]}
        >
          Доска
        </Text>
      </View>

      {/* Table View Button */}
      <View
        style={[
          styles.button,
          viewMode === 'table' && [styles.activeButton, { backgroundColor: theme.backgroundSecondary }],
        ]}
        // @ts-ignore - Web-only event handlers
        onClick={() => onViewModeChange('table')}
        onMouseEnter={(e: any) => {
          if (viewMode !== 'table' && e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.border;
          }
        }}
        onMouseLeave={(e: any) => {
          if (viewMode !== 'table' && e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Ionicons
          name="list-outline"
          size={12}
          color={viewMode === 'table' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.buttonText,
            { color: viewMode === 'table' ? theme.text : theme.textSecondary },
          ]}
        >
          Таблица
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Expand All Button */}
      <View
        style={styles.button}
        // @ts-ignore - Web-only event handlers
        onClick={onExpandToggle}
        onMouseEnter={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.border;
          }
        }}
        onMouseLeave={(e: any) => {
          if (e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Ionicons
          name={expandedAll ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={theme.textSecondary}
        />
        <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
          {expandedAll ? 'Свернуть' : 'Все'} ({subtaskCount})
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 2,
    gap: 1,
  } as any,
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 4,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  } as any,
  activeButton: {
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
  } as any,
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
  } as any,
  divider: {
    width: 1,
    height: 16,
    marginHorizontal: 2,
  },
});
