/**
 * TitleBarScheduleControls
 * Компактные контролы графиков для Electron TitleBar
 * Включает переключатель месяца и кнопку создания
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface TitleBarScheduleControlsProps {
  canCreate?: boolean;
  onNewSchedule?: () => void;
  selectedMonth?: Date;
  onMonthChange?: (date: Date) => void;
  /** Show only month picker (for left controls) */
  showMonthPickerOnly?: boolean;
  /** Show only create button (for right controls) */
  showCreateOnly?: boolean;
}

export const TitleBarScheduleControls: React.FC<TitleBarScheduleControlsProps> = ({
  canCreate,
  onNewSchedule,
  selectedMonth,
  onMonthChange,
  showMonthPickerOnly = false,
  showCreateOnly = false,
}) => {
  const { theme } = useTheme();

  const monthLabel = useMemo(() => {
    if (!selectedMonth) return '';
    const month = MONTH_NAMES[selectedMonth.getMonth()];
    const year = selectedMonth.getFullYear();
    return `${month} ${year}`;
  }, [selectedMonth]);

  const handlePrevMonth = () => {
    if (!selectedMonth || !onMonthChange) return;
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    if (!selectedMonth || !onMonthChange) return;
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const handleToday = () => {
    if (!onMonthChange) return;
    onMonthChange(new Date());
  };

  const isCurrentMonth = useMemo(() => {
    if (!selectedMonth) return false;
    const now = new Date();
    return (
      selectedMonth.getMonth() === now.getMonth() &&
      selectedMonth.getFullYear() === now.getFullYear()
    );
  }, [selectedMonth]);

  // Show only create button (for right controls)
  if (showCreateOnly) {
    return (
      <View style={styles.container}>
        {canCreate && onNewSchedule && (
          <View
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            // @ts-ignore - Web-only
            onClick={onNewSchedule}
            title="Создать график"
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

  // Show only month picker (for left controls)
  if (showMonthPickerOnly) {
    return (
      <View style={styles.container}>
        {selectedMonth && onMonthChange && (
          <View style={[styles.monthPicker, { backgroundColor: theme.card }]}>
            <View
              style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
              // @ts-ignore - Web-only
              onClick={handlePrevMonth}
              onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
            >
              <Ionicons name="chevron-back" size={14} color={theme.text} />
            </View>

            <View
              style={styles.monthButton}
              // @ts-ignore - Web-only
              onClick={isCurrentMonth ? undefined : handleToday}
              onMouseEnter={(e: any) => !isCurrentMonth && e.currentTarget?.style && (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
            >
              <Text style={[styles.monthText, { color: theme.text }]}>
                {monthLabel}
              </Text>
            </View>

            <View
              style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
              // @ts-ignore - Web-only
              onClick={handleNextMonth}
              onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
              onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
            >
              <Ionicons name="chevron-forward" size={14} color={theme.text} />
            </View>
          </View>
        )}
      </View>
    );
  }

  // Default: show all controls (backwards compatibility)
  return (
    <View style={styles.container}>
      {/* Month Picker */}
      {selectedMonth && onMonthChange && (
        <View style={[styles.monthPicker, { backgroundColor: theme.card }]}>
          <View
            style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={handlePrevMonth}
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Ionicons name="chevron-back" size={14} color={theme.text} />
          </View>

          <View
            style={styles.monthButton}
            // @ts-ignore - Web-only
            onClick={isCurrentMonth ? undefined : handleToday}
            onMouseEnter={(e: any) => !isCurrentMonth && e.currentTarget?.style && (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Text style={[styles.monthText, { color: theme.text }]}>
              {monthLabel}
            </Text>
          </View>

          <View
            style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
            // @ts-ignore - Web-only
            onClick={handleNextMonth}
            onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.opacity = '1')}
          >
            <Ionicons name="chevron-forward" size={14} color={theme.text} />
          </View>
        </View>
      )}

      {/* Create Button */}
      {canCreate && onNewSchedule && (
        <View
          style={[styles.addButton, { backgroundColor: theme.primary }]}
          // @ts-ignore - Web-only
          onClick={onNewSchedule}
          title="Создать график"
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
  monthPicker: {
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
  monthButton: {
    alignItems: 'center',
    paddingHorizontal: 8,
    cursor: 'pointer',
  } as any,
  monthText: {
    fontSize: 13,
    fontWeight: '600',
  },
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
});
