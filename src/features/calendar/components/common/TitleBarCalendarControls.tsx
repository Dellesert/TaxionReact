/**
 * TitleBarCalendarControls
 * Компактные контролы календаря для Electron TitleBar (правая часть)
 * Содержит переключатель режима недели и создание события
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { CalendarView, WeekDisplayMode } from '../../types/calendar.types';

interface TitleBarCalendarControlsProps {
  selectedView: CalendarView;
  onAddPress?: () => void;
  weekDisplayMode?: WeekDisplayMode;
  onWeekDisplayModeChange?: (mode: WeekDisplayMode) => void;
  /** Show only create button (for right controls) */
  showCreateOnly?: boolean;
}

export const TitleBarCalendarControls: React.FC<TitleBarCalendarControlsProps> = ({
  selectedView,
  onAddPress,
  weekDisplayMode,
  onWeekDisplayModeChange,
  showCreateOnly = false,
}) => {
  const { theme } = useTheme();

  const toggleWeekMode = () => {
    if (onWeekDisplayModeChange && weekDisplayMode) {
      onWeekDisplayModeChange(weekDisplayMode === 'timeline' ? 'list' : 'timeline');
    }
  };

  // Show only create button (for right controls)
  if (showCreateOnly) {
    return (
      <View style={styles.container}>
        {onAddPress && (
          <View
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            // @ts-ignore - Web-only
            onClick={onAddPress}
            title="Создать событие"
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.9')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addButtonLabel}>Создать</Text>
          </View>
        )}
      </View>
    );
  }

  // Show week mode toggle (for left controls)
  return (
    <View style={styles.container}>
      {/* Week Mode Toggle - only when week view is selected */}
      {selectedView === 'week' && weekDisplayMode && onWeekDisplayModeChange && (
        <View
          style={[styles.weekModeButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={toggleWeekMode}
          title={weekDisplayMode === 'timeline' ? 'Шкала времени' : 'Список'}
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        >
          <Ionicons
            name={weekDisplayMode === 'timeline' ? 'time-outline' : 'list-outline'}
            size={14}
            color={theme.text}
          />
          <Text style={[styles.buttonLabel, { color: theme.text }]}>
            {weekDisplayMode === 'timeline' ? 'Шкала' : 'Список'}
          </Text>
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
  weekModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    gap: 6,
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
