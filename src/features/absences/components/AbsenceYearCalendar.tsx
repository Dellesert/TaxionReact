/**
 * AbsenceYearCalendar
 * Yearly calendar view displaying all absences with color-coded date highlighting
 */

import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import {
  Absence,
  AbsenceType,
  AbsenceColorMode,
  ABSENCE_TYPE_COLORS,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPES,
} from '../types/absence.types';
import { getUserColorById } from '../constants/userColors.constants';
import { useRussianHolidays } from '../hooks/useRussianHolidays';

interface AbsenceYearCalendarProps {
  year: number;
  absences: Absence[];
  selectedTypeFilter?: AbsenceType | null;
  colorMode?: AbsenceColorMode;
  onDayPress?: (date: Date, absences: Absence[]) => void;
  onAbsencePress?: (absence: Absence) => void;
}

// Day abbreviations in Russian
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Month names in Russian
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

interface DayAbsence {
  type: AbsenceType;
  color: string;
  absence: Absence;
}

interface CalendarDay {
  day: number;
  date: Date;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  absences: DayAbsence[];
}

// Helper to get days in month
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

// Helper to get first day of month (0 = Sunday, convert to Monday-first)
const getFirstDayOfMonth = (year: number, month: number): number => {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday-first (0 = Monday)
};

// Helper to format date as YYYY-MM-DD (using local date, not UTC)
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse date string as local date (not UTC)
// Handles both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats
const parseLocalDate = (dateStr: string): Date => {
  // Take only the date part (first 10 characters: YYYY-MM-DD)
  const datePart = dateStr.substring(0, 10);
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Helper to blend colors when multiple absences overlap
const blendColors = (colors: string[]): string => {
  if (colors.length === 0) return 'transparent';
  if (colors.length === 1) return colors[0];
  // For multiple colors, use the first one with reduced opacity effect
  return colors[0];
};

export const AbsenceYearCalendar: React.FC<AbsenceYearCalendarProps> = ({
  year,
  absences,
  selectedTypeFilter,
  colorMode = 'by_type',
  onDayPress,
  onAbsencePress,
}) => {
  const { theme } = useTheme();
  const { holidayMap } = useRussianHolidays(year);

  // Get unique users from absences (for legend)
  const users = useMemo(() => {
    const userMap = new Map<number, { id: number; name: string; color?: string }>();
    for (const absence of absences) {
      if (absence.user && !userMap.has(absence.user.id)) {
        userMap.set(absence.user.id, { id: absence.user.id, name: absence.user.name, color: absence.user.color });
      }
    }
    return Array.from(userMap.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [absences]);

  // Absences are already filtered by parent
  const filteredAbsences = absences;

  // Get color based on colorMode
  const getAbsenceColor = useCallback((absence: Absence): string => {
    if (colorMode === 'by_user') {
      return absence.user?.color || getUserColorById(absence.user_id);
    }
    return ABSENCE_TYPE_COLORS[absence.type];
  }, [colorMode]);

  // Build a map of date -> absences for quick lookup
  const absenceMap = useMemo(() => {
    const map = new Map<string, DayAbsence[]>();

    for (const absence of filteredAbsences) {
      const startDate = parseLocalDate(absence.start_date);
      const endDate = parseLocalDate(absence.end_date);

      // Iterate through each day of the absence
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = formatDate(currentDate);
        const dayAbsences = map.get(dateKey) || [];
        dayAbsences.push({
          type: absence.type,
          color: getAbsenceColor(absence),
          absence,
        });
        map.set(dateKey, dayAbsences);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return map;
  }, [filteredAbsences, getAbsenceColor]);

  // Get today's date string for comparison
  const today = useMemo(() => formatDate(new Date()), []);

  // Generate calendar data for a month
  const getMonthData = useCallback((month: number): CalendarDay[][] => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const weeks: CalendarDay[][] = [];
    let currentWeek: CalendarDay[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push({
        day: 0,
        date: new Date(),
        isToday: false,
        isWeekend: false,
        isHoliday: false,
        absences: [],
      });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateKey = formatDate(date);
      const dayOfWeek = (firstDay + day - 1) % 7;
      const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // Saturday or Sunday
      const holiday = holidayMap.get(dateKey);

      currentWeek.push({
        day,
        date,
        isToday: dateKey === today,
        isWeekend,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        absences: absenceMap.get(dateKey) || [],
      });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add empty cells for remaining days in the last week
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({
        day: 0,
        date: new Date(),
        isToday: false,
        isWeekend: false,
        isHoliday: false,
        absences: [],
      });
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, absenceMap, today, holidayMap]);

  // Handle day press
  const handleDayPress = useCallback((calendarDay: CalendarDay) => {
    if (calendarDay.day === 0) return;

    if (calendarDay.absences.length > 0 && onAbsencePress) {
      // If there's only one absence, open it directly
      if (calendarDay.absences.length === 1) {
        onAbsencePress(calendarDay.absences[0].absence);
        return;
      }
    }

    if (onDayPress) {
      onDayPress(calendarDay.date, calendarDay.absences.map(a => a.absence));
    }
  }, [onDayPress, onAbsencePress]);

  // Render a single month
  const renderMonth = useCallback((month: number) => {
    const weeks = getMonthData(month);

    return (
      <View
        key={month}
        style={[styles.monthContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <Text style={[styles.monthTitle, { color: theme.text }]}>
          {MONTH_NAMES[month]}
        </Text>

        {/* Weekday headers */}
        <View style={styles.weekdaysRow}>
          {WEEKDAYS.map((day, index) => (
            <View key={day} style={styles.weekdayCell}>
              <Text
                style={[
                  styles.weekdayText,
                  { color: index >= 5 ? theme.error : theme.textSecondary }
                ]}
              >
                {day}
              </Text>
            </View>
          ))}
        </View>

        {/* Calendar grid */}
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((calendarDay, dayIndex) => {
              const hasAbsences = calendarDay.absences.length > 0;
              const bgColor = hasAbsences
                ? blendColors(calendarDay.absences.map(a => a.color))
                : 'transparent';

              // Build tooltip text for hover
              let tooltipText = '';
              if (calendarDay.isHoliday && calendarDay.holidayName) {
                tooltipText = calendarDay.holidayName;
              }
              if (hasAbsences) {
                const absenceTooltip = calendarDay.absences
                  .map(a => `${a.absence.user?.name || 'Неизвестно'}: ${ABSENCE_TYPE_LABELS[a.type]}`)
                  .join('\n');
                tooltipText = tooltipText ? `${tooltipText}\n\n${absenceTooltip}` : absenceTooltip;
              }

              return (
                <View
                  key={dayIndex}
                  style={[
                    styles.dayCell,
                    calendarDay.isHoliday && !hasAbsences && [styles.holidayCell, { backgroundColor: theme.error + '20' }],
                    hasAbsences && [styles.dayCellWithAbsence, { backgroundColor: bgColor + '30' }],
                    calendarDay.isToday && [styles.todayCell, { borderColor: theme.primary }],
                  ]}
                  // @ts-ignore - Web-only
                  onClick={() => calendarDay.day > 0 && handleDayPress(calendarDay)}
                  title={tooltipText}
                >
                  {calendarDay.day > 0 && (
                    <>
                      <Text
                        style={[
                          styles.dayText,
                          { color: (calendarDay.isWeekend || calendarDay.isHoliday) ? theme.error : theme.text },
                          calendarDay.isToday && { color: theme.primary, fontWeight: '700' },
                          hasAbsences && styles.dayTextWithAbsence,
                        ]}
                      >
                        {calendarDay.day}
                      </Text>

                      {/* Color bar indicator for multiple types */}
                      {hasAbsences && (
                        <View style={styles.colorBarContainer}>
                          {calendarDay.absences.slice(0, 3).map((absence, i) => (
                            <View
                              key={i}
                              style={[styles.colorBar, { backgroundColor: absence.color }]}
                            />
                          ))}
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    );
  }, [theme, getMonthData, handleDayPress]);

  // Render legend based on colorMode
  const renderLegend = useCallback(() => {
    if (colorMode === 'by_user') {
      // Show users with their colors
      const usersWithColors = users.map(user => ({
        ...user,
        color: user.color || getUserColorById(user.id),
      }));

      if (usersWithColors.length === 0) return null;

      return (
        <View style={styles.legendItems}>
          {usersWithColors.map(user => (
            <View key={user.id} style={styles.legendItem}>
              <View style={[styles.legendColorBar, { backgroundColor: user.color }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]} numberOfLines={1}>
                {user.name}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    // Default: Show types with their colors
    const activeTypes = ABSENCE_TYPES.filter(type =>
      filteredAbsences.some(a => a.type === type)
    );

    if (activeTypes.length === 0) return null;

    return (
      <View style={styles.legendItems}>
        {activeTypes.map(type => (
          <View key={type} style={styles.legendItem}>
            <View style={[styles.legendColorBar, { backgroundColor: ABSENCE_TYPE_COLORS[type] }]} />
            <Text style={[styles.legendText, { color: theme.textSecondary }]}>
              {ABSENCE_TYPE_LABELS[type]}
            </Text>
          </View>
        ))}
      </View>
    );
  }, [filteredAbsences, theme, colorMode, users]);

  return (
    <ScrollView
      style={styles.calendarContainer}
      contentContainerStyle={styles.calendarContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Months Grid */}
      <View style={styles.monthsGrid}>
        {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
      </View>

      {/* Legend */}
      {renderLegend() && (
        <View style={[styles.legendContainer, { borderColor: theme.border }]}>
          {renderLegend()}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    flex: 1,
  },
  calendarContent: {
    padding: 16,
  },
  legendContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    borderTopWidth: 1,
    marginTop: 16,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColorBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  monthsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  monthContainer: {
    width: 260,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  monthTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: '500',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    margin: 1,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'pointer',
      transition: 'background-color 0.15s ease',
    } : {}),
  },
  dayCellWithAbsence: {
    borderRadius: 8,
  },
  holidayCell: {
    borderRadius: 8,
  },
  todayCell: {
    borderWidth: 1.5,
    borderRadius: 8,
  },
  dayText: {
    fontSize: 11,
    fontWeight: '500',
  },
  dayTextWithAbsence: {
    fontWeight: '600',
  },
  colorBarContainer: {
    flexDirection: 'row',
    gap: 1,
    marginTop: 2,
  },
  colorBar: {
    width: 6,
    height: 3,
    borderRadius: 1,
  },
});

export default AbsenceYearCalendar;
