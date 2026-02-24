/**
 * TitleBarCalendarControls
 * Компактные контролы календаря для Electron TitleBar (правая часть)
 * Содержит переключатель режима недели и создание события
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ExpandableCreateButton } from '@shared/components/common';
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
          <ExpandableCreateButton
            label="Создать"
            title="Создать событие"
            onPress={onAddPress}
          />
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
            size={18}
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
    paddingHorizontal: 12,
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    gap: 8,
  } as any,
  buttonLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  } as any,
});
