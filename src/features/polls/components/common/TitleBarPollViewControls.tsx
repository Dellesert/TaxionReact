/**
 * TitleBarPollViewControls
 * Компактный переключатель видов для отображения опросов в Electron TitleBar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export type PollViewMode = 'grid' | 'table';

interface TitleBarPollViewControlsProps {
  viewMode: PollViewMode;
  onViewModeChange: (mode: PollViewMode) => void;
}

export const TitleBarPollViewControls: React.FC<TitleBarPollViewControlsProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundTertiary }]}>
      {/* Grid View Button */}
      <View
        style={[
          styles.button,
          viewMode === 'grid' && [styles.activeButton, { backgroundColor: theme.backgroundSecondary }],
        ]}
        // @ts-ignore - Web-only event handlers
        onClick={() => onViewModeChange('grid')}
        onMouseEnter={(e: any) => {
          if (viewMode !== 'grid' && e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = theme.border;
          }
        }}
        onMouseLeave={(e: any) => {
          if (viewMode !== 'grid' && e.currentTarget?.style) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        <Ionicons
          name="grid-outline"
          size={12}
          color={viewMode === 'grid' ? theme.primary : theme.textSecondary}
        />
        <Text
          style={[
            styles.buttonText,
            { color: viewMode === 'grid' ? theme.text : theme.textSecondary },
          ]}
        >
          Сетка
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
});
