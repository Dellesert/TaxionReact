/**
 * TitleBarAbsenceControls
 * Компактные контролы нерабочих дней для Electron TitleBar
 * Включает переключатель года, фильтр и кнопку создания
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { ExpandableCreateButton, ExpandableFilterButton, MonthRangePicker } from '@shared/components/common';
import type { AbsenceType, AbsenceColorMode } from '../types/absence.types';

export type AbsenceViewMode = 'list' | 'calendar' | 'timeline';

interface TitleBarAbsenceControlsProps {
  startMonth: Date;
  endMonth: Date;
  onMonthRangeChange: (start: Date, end: Date) => void;
  onFilterPress?: () => void;
  selectedTypeFilter?: AbsenceType | null;
  onCreatePress?: () => void;
  /** Show only year picker (for left controls) */
  showYearPickerOnly?: boolean;
  /** Show only action buttons (for right controls) */
  showActionsOnly?: boolean;
  /** Current view mode */
  viewMode?: AbsenceViewMode;
  /** Callback when view mode changes */
  onViewModeChange?: (mode: AbsenceViewMode) => void;
  /** Ref for filter button (for positioning dropdown) */
  filterButtonRef?: React.RefObject<View>;
  /** Current color mode (by_type or by_user) */
  colorMode?: AbsenceColorMode;
  /** Callback when color mode changes */
  onColorModeChange?: (mode: AbsenceColorMode) => void;
  /** Hide month range picker (e.g. when it's shown in card header instead) */
  hideYearPicker?: boolean;
}

export const TitleBarAbsenceControls: React.FC<TitleBarAbsenceControlsProps> = ({
  startMonth,
  endMonth,
  onMonthRangeChange,
  onFilterPress,
  selectedTypeFilter,
  onCreatePress,
  showYearPickerOnly = false,
  showActionsOnly = false,
  viewMode = 'list',
  onViewModeChange,
  filterButtonRef,
  colorMode = 'by_type',
  onColorModeChange,
  hideYearPicker = false,
}) => {
  const { theme } = useTheme();

  const hasActiveFilters = !!selectedTypeFilter;

  // Show only action buttons (for right controls)
  if (showActionsOnly) {
    return (
      <View style={styles.container}>
        {/* Filter Button */}
        {onFilterPress && (
          <ExpandableFilterButton
            label="Фильтры"
            title="Фильтры"
            onPress={onFilterPress}
            hasActiveFilters={hasActiveFilters}
            buttonRef={filterButtonRef}
          />
        )}

        {/* Create Button */}
        {onCreatePress && (
          <ExpandableCreateButton
            label="Создать"
            title="Добавить нерабочий день"
            onPress={onCreatePress}
          />
        )}
      </View>
    );
  }

  // Show only year picker and view toggle (for left controls)
  if (showYearPickerOnly) {
    return (
      <View style={styles.container}>
        {/* View Mode Toggle */}
        {onViewModeChange && (
          <View style={[styles.viewGroup, { backgroundColor: theme.backgroundTertiary }]}>
            <View
              style={[
                styles.viewButton,
                viewMode === 'list' && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
              ]}
              // @ts-ignore - Web-only
              onClick={() => onViewModeChange('list')}
              title="Таблица"
              onMouseEnter={(e: any) => {
                if (viewMode !== 'list' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = theme.border;
                }
              }}
              onMouseLeave={(e: any) => {
                if (viewMode !== 'list' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ionicons
                name="list-outline"
                size={14}
                color={viewMode === 'list' ? theme.primary : theme.textSecondary}
              />
            </View>
            <View
              style={[
                styles.viewButton,
                viewMode === 'calendar' && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
              ]}
              // @ts-ignore - Web-only
              onClick={() => onViewModeChange('calendar')}
              title="Календарь"
              onMouseEnter={(e: any) => {
                if (viewMode !== 'calendar' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = theme.border;
                }
              }}
              onMouseLeave={(e: any) => {
                if (viewMode !== 'calendar' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={14}
                color={viewMode === 'calendar' ? theme.primary : theme.textSecondary}
              />
            </View>
            <View
              style={[
                styles.viewButton,
                viewMode === 'timeline' && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
              ]}
              // @ts-ignore - Web-only
              onClick={() => onViewModeChange('timeline')}
              title="График"
              onMouseEnter={(e: any) => {
                if (viewMode !== 'timeline' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = theme.border;
                }
              }}
              onMouseLeave={(e: any) => {
                if (viewMode !== 'timeline' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ionicons
                name="git-compare-outline"
                size={14}
                color={viewMode === 'timeline' ? theme.primary : theme.textSecondary}
              />
            </View>
            <Text style={[styles.viewLabel, { color: theme.text }]}>
              {viewMode === 'list' ? 'Таблица' : viewMode === 'calendar' ? 'Календарь' : 'График'}
            </Text>
          </View>
        )}

        {/* Color Mode Toggle */}
        {onColorModeChange && (viewMode === 'calendar' || viewMode === 'timeline') && (
          <View style={[styles.viewGroup, { backgroundColor: theme.backgroundTertiary }]}>
            <View
              style={[
                styles.viewButton,
                colorMode === 'by_type' && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
              ]}
              // @ts-ignore - Web-only
              onClick={() => onColorModeChange('by_type')}
              title="По типу отпуска"
              onMouseEnter={(e: any) => {
                if (colorMode !== 'by_type' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = theme.border;
                }
              }}
              onMouseLeave={(e: any) => {
                if (colorMode !== 'by_type' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ionicons
                name="albums-outline"
                size={14}
                color={colorMode === 'by_type' ? theme.primary : theme.textSecondary}
              />
            </View>
            <View
              style={[
                styles.viewButton,
                colorMode === 'by_user' && [styles.activeViewButton, { backgroundColor: theme.backgroundSecondary }],
              ]}
              // @ts-ignore - Web-only
              onClick={() => onColorModeChange('by_user')}
              title="По сотруднику"
              onMouseEnter={(e: any) => {
                if (colorMode !== 'by_user' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = theme.border;
                }
              }}
              onMouseLeave={(e: any) => {
                if (colorMode !== 'by_user' && e.currentTarget?.style) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <Ionicons
                name="people-outline"
                size={14}
                color={colorMode === 'by_user' ? theme.primary : theme.textSecondary}
              />
            </View>
            <Text style={[styles.viewLabel, { color: theme.text }]}>
              {colorMode === 'by_type' ? 'Тип' : 'Сотрудник'}
            </Text>
          </View>
        )}

        {/* Month Range Picker */}
        {!hideYearPicker && (
          <MonthRangePicker
            startMonth={startMonth}
            endMonth={endMonth}
            onChange={onMonthRangeChange}
            compact
          />
        )}
      </View>
    );
  }

  // Default: show all controls
  return (
    <View style={styles.container}>
      {/* Month Range Picker */}
      <MonthRangePicker
        startMonth={startMonth}
        endMonth={endMonth}
        onChange={onMonthRangeChange}
        compact
      />

      {/* Filter Button */}
      {onFilterPress && (
        <ExpandableFilterButton
          label="Фильтры"
          title="Фильтры"
          onPress={onFilterPress}
          hasActiveFilters={hasActiveFilters}
          buttonRef={filterButtonRef}
        />
      )}

      {/* Create Button */}
      {onCreatePress && (
        <ExpandableCreateButton
          label="Создать"
          title="Добавить нерабочий день"
          onPress={onCreatePress}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  viewLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 6,
  } as any,
});

export default TitleBarAbsenceControls;
