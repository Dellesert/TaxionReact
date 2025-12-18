import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { CalendarView, WeekDisplayMode } from '../../types/calendar.types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CalendarDateNavigationGroup } from './CalendarDateNavigationGroup';
import { CalendarViewControlGroup } from './CalendarViewControlGroup';

interface CompactCalendarToolbarProps {
  selectedDate: Date;
  selectedView: CalendarView;
  weekDisplayMode?: WeekDisplayMode;
  onViewChange: (view: CalendarView) => void;
  onWeekModeChange?: (mode: WeekDisplayMode) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAddPress: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
}

export const CompactCalendarToolbar: React.FC<CompactCalendarToolbarProps> = ({
  selectedDate,
  selectedView,
  weekDisplayMode,
  onViewChange,
  onWeekModeChange,
  onToday,
  onPrevious,
  onNext,
  onAddPress,
  onFilterPress,
  hasActiveFilters = false,
}) => {
  const { theme } = useTheme();

  const toggleWeekMode = () => {
    if (onWeekModeChange && weekDisplayMode) {
      onWeekModeChange(weekDisplayMode === 'timeline' ? 'list' : 'timeline');
    }
  };

  const getDateRangeText = () => {
    return format(selectedDate, 'MMMM yyyy', { locale: ru });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.content}>
        {/* Left Section - Date Navigation */}
        <View style={styles.leftSection}>
          <CalendarDateNavigationGroup
            dateText={getDateRangeText()}
            onPrevious={onPrevious}
            onNext={onNext}
            onToday={onToday}
          />
        </View>

        {/* Center Section - View Mode Selector */}
        <CalendarViewControlGroup
          selectedView={selectedView}
          onViewChange={onViewChange}
        />

        {/* Right Section - Actions */}
        <View style={styles.rightSection}>
          {/* Week Mode Toggle - Only shown when week view is active */}
          {selectedView === 'week' && weekDisplayMode && onWeekModeChange && (
            <TouchableOpacity
              onPress={toggleWeekMode}
              style={[styles.actionButton, { borderColor: theme.border }]}
            >
              <Ionicons
                name={weekDisplayMode === 'timeline' ? 'time-outline' : 'list-outline'}
                size={18}
                color={theme.text}
              />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                {weekDisplayMode === 'timeline' ? 'Шкала' : 'Список'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Filter Button */}
          {onFilterPress && (
            <TouchableOpacity
              onPress={onFilterPress}
              style={[styles.actionButton, { borderColor: theme.border }]}
            >
              <Ionicons name="filter" size={18} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Фильтры
              </Text>
              {hasActiveFilters && (
                <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          )}

          {/* Create Event Button */}
          <TouchableOpacity
            onPress={onAddPress}
            style={[styles.actionButtonPrimary, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Создать событие</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
    minHeight: 60, // Increased to accommodate 44px buttons with padding
  },
  leftSection: {
    flexShrink: 0,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Accessibility: minimum touch target
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  filterIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // Accessibility: minimum touch target
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
