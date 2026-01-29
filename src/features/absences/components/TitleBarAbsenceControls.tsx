/**
 * TitleBarAbsenceControls
 * Компактные контролы нерабочих дней для Electron TitleBar
 * Включает переключатель года, фильтр и кнопку создания
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { AbsenceType } from '../types/absence.types';

export type AbsenceViewMode = 'list' | 'calendar';

interface TitleBarAbsenceControlsProps {
  selectedYear: number;
  onYearChange: (year: number) => void;
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
}

export const TitleBarAbsenceControls: React.FC<TitleBarAbsenceControlsProps> = ({
  selectedYear,
  onYearChange,
  onFilterPress,
  selectedTypeFilter,
  onCreatePress,
  showYearPickerOnly = false,
  showActionsOnly = false,
  viewMode = 'list',
  onViewModeChange,
  filterButtonRef,
}) => {
  const { theme } = useTheme();

  const handlePrevYear = () => {
    onYearChange(selectedYear - 1);
  };

  const handleNextYear = () => {
    onYearChange(selectedYear + 1);
  };

  const handleToday = () => {
    onYearChange(new Date().getFullYear());
  };

  const isCurrentYear = useMemo(() => {
    return selectedYear === new Date().getFullYear();
  }, [selectedYear]);

  const hasActiveFilters = !!selectedTypeFilter;

  // Show only action buttons (for right controls)
  if (showActionsOnly) {
    return (
      <View style={styles.container}>
        {/* Filter Button */}
        {onFilterPress && (
          <View
            ref={filterButtonRef}
            collapsable={false}
            style={[styles.filterButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={onFilterPress}
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
        )}

        {/* Create Button */}
        {onCreatePress && (
          <View
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            // @ts-ignore - Web-only
            onClick={onCreatePress}
            title="Добавить нерабочий день"
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

  // Show only year picker and view toggle (for left controls)
  if (showYearPickerOnly) {
    return (
      <View style={styles.container}>
        <View style={[styles.yearPicker, { backgroundColor: theme.card }]}>
          <View
            style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={handlePrevYear}
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Ionicons name="chevron-back" size={14} color={theme.text} />
          </View>

          <View
            style={styles.yearButton}
            // @ts-ignore - Web-only
            onClick={isCurrentYear ? undefined : handleToday}
            onMouseEnter={(e: any) => !isCurrentYear && e.currentTarget?.style && (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Text style={[styles.yearText, { color: theme.text }]}>
              {selectedYear}
            </Text>
          </View>

          <View
            style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={handleNextYear}
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Ionicons name="chevron-forward" size={14} color={theme.text} />
          </View>
        </View>

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
              title="Список"
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
            <Text style={[styles.viewLabel, { color: theme.text }]}>
              {viewMode === 'list' ? 'Список' : 'Календарь'}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // Default: show all controls
  return (
    <View style={styles.container}>
      {/* Year Picker */}
      <View style={[styles.yearPicker, { backgroundColor: theme.card }]}>
        <View
          style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={handlePrevYear}
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
        >
          <Ionicons name="chevron-back" size={14} color={theme.text} />
        </View>

        <View
          style={styles.yearButton}
          // @ts-ignore - Web-only
          onClick={isCurrentYear ? undefined : handleToday}
          onMouseEnter={(e: any) => !isCurrentYear && e.currentTarget?.style && (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
        >
          <Text style={[styles.yearText, { color: theme.text }]}>
            {selectedYear}
          </Text>
        </View>

        <View
          style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={handleNextYear}
          onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
          onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
        >
          <Ionicons name="chevron-forward" size={14} color={theme.text} />
        </View>
      </View>

      {/* Filter Button */}
      {onFilterPress && (
        <View
          style={[styles.filterButton, { backgroundColor: theme.backgroundTertiary }]}
          // @ts-ignore - Web-only
          onClick={onFilterPress}
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
      )}

      {/* Create Button */}
      {onCreatePress && (
        <View
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only
          onClick={onCreatePress}
          title="Добавить нерабочий день"
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
    gap: 12,
  } as any,
  yearPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  } as any,
  arrowButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
  } as any,
  yearButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
    cursor: 'pointer',
  } as any,
  yearText: {
    fontSize: 13,
    fontWeight: '600',
  },
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
  buttonLabel: {
    fontSize: 13,
    fontWeight: '500',
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
  addButtonLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
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
