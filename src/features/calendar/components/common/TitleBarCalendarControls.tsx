/**
 * TitleBarCalendarControls
 * Компактные контролы календаря для Electron TitleBar
 * Объединяет навигацию, переключатель видов и создание события
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { CalendarView, WeekDisplayMode } from '../../types/calendar.types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TitleBarCalendarControlsProps {
  selectedDate: Date;
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onAddPress: () => void;
  weekDisplayMode?: WeekDisplayMode;
  onWeekDisplayModeChange?: (mode: WeekDisplayMode) => void;
}

// Иконки для каждого вида
const VIEW_OPTIONS: { value: CalendarView; icon: keyof typeof Ionicons.glyphMap; tooltip: string }[] = [
  { value: 'day', icon: 'today-outline', tooltip: 'День' },
  { value: 'week', icon: 'calendar-outline', tooltip: 'Неделя' },
  { value: 'month', icon: 'grid-outline', tooltip: 'Месяц' },
];

export const TitleBarCalendarControls: React.FC<TitleBarCalendarControlsProps> = ({
  selectedDate,
  selectedView,
  onViewChange,
  onPrevious,
  onNext,
  onToday,
  onAddPress,
  weekDisplayMode,
  onWeekDisplayModeChange,
}) => {
  const { theme } = useTheme();

  const dateText = format(selectedDate, 'LLLL yyyy', { locale: ru });

  const toggleWeekMode = () => {
    if (onWeekDisplayModeChange && weekDisplayMode) {
      onWeekDisplayModeChange(weekDisplayMode === 'timeline' ? 'list' : 'timeline');
    }
  };

  return (
    <View style={styles.container}>
      {/* Date Navigation */}
      <View style={[styles.navGroup, { backgroundColor: theme.backgroundTertiary }]}>
        <View
          style={styles.navButton}
          // @ts-ignore - Web-only
          onClick={onPrevious}
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Ionicons name="chevron-back" size={14} color={theme.text} />
        </View>

        <View
          style={styles.dateButton}
          // @ts-ignore - Web-only
          onClick={onToday}
          title="Перейти к сегодня"
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Text style={[styles.dateText, { color: theme.text }]}>{dateText}</Text>
        </View>

        <View
          style={styles.navButton}
          // @ts-ignore - Web-only
          onClick={onNext}
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <Ionicons name="chevron-forward" size={14} color={theme.text} />
        </View>
      </View>

      {/* View Switcher */}
      <View style={[styles.viewGroup, { backgroundColor: theme.backgroundTertiary }]}>
        {VIEW_OPTIONS.map((option) => (
          <View
            key={option.value}
            style={[
              styles.viewButton,
              selectedView === option.value && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
            ]}
            // @ts-ignore - Web-only
            onClick={() => onViewChange(option.value)}
            title={option.tooltip}
            onMouseEnter={(e: any) => {
              if (selectedView !== option.value && e.currentTarget?.style) {
                e.currentTarget.style.backgroundColor = theme.border;
              }
            }}
            onMouseLeave={(e: any) => {
              if (selectedView !== option.value && e.currentTarget?.style) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Ionicons
              name={option.icon}
              size={14}
              color={selectedView === option.value ? theme.primary : theme.textSecondary}
            />
          </View>
        ))}
      </View>

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
        </View>
      )}

      {/* Create Button */}
      <View
        style={[styles.addButton, { backgroundColor: theme.primary }]}
        // @ts-ignore - Web-only
        onClick={onAddPress}
        onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
      >
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  } as any,
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    padding: 2,
  } as any,
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  dateButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    height: 26,
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
  weekModeButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
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
