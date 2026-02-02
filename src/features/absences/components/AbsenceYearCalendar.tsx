/**
 * AbsenceYearCalendar
 * Yearly calendar view displaying all absences with color-coded date highlighting
 * Includes a user list sidebar for filtering
 */

import React, { useMemo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import {
  Absence,
  AbsenceType,
  AbsenceUser,
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

  // Selected user filter
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Get unique users from absences
  const users = useMemo(() => {
    const userMap = new Map<number, AbsenceUser>();
    for (const absence of absences) {
      if (absence.user && !userMap.has(absence.user.id)) {
        userMap.set(absence.user.id, absence.user);
      }
    }
    return Array.from(userMap.values()).sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [absences]);

  // Filter absences by selected user and type
  const filteredAbsences = useMemo(() => {
    let filtered = absences;

    if (selectedUserId !== null) {
      filtered = filtered.filter(a => a.user_id === selectedUserId);
    }

    if (selectedTypeFilter) {
      filtered = filtered.filter(a => a.type === selectedTypeFilter);
    }

    return filtered;
  }, [absences, selectedUserId, selectedTypeFilter]);

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

  // Handle user selection
  const handleUserSelect = useCallback((userId: number | null) => {
    setSelectedUserId(prev => prev === userId ? null : userId);
  }, []);

  // Get user's absences for sidebar display
  const getUserAbsences = useCallback((userId: number) => {
    return absences.filter(a => a.user_id === userId);
  }, [absences]);

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
                    calendarDay.isHoliday && !hasAbsences && [styles.holidayCell, { backgroundColor: theme.error + '15' }],
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

  // Render user item in sidebar
  const renderUserItem = useCallback((user: AbsenceUser) => {
    const isSelected = selectedUserId === user.id;
    const userAbsences = getUserAbsences(user.id);
    const absenceCount = userAbsences.length;
    const userColor = user.color || getUserColorById(user.id);

    return (
      <TouchableOpacity
        key={user.id}
        style={[
          styles.userItem,
          { borderColor: theme.border },
          isSelected && [styles.userItemSelected, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }],
        ]}
        onPress={() => handleUserSelect(user.id)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarWithColor}>
          <Avatar
            name={user.name || ''}
            imageUrl={user.avatar}
            userId={user.id}
            size={36}
          />
          <View style={[styles.userColorDot, { backgroundColor: userColor }]} />
        </View>
        <View style={styles.userInfo}>
          <Text
            style={[styles.userName, { color: theme.text }]}
            numberOfLines={1}
          >
            {user.name}
          </Text>
          <Text style={[styles.userAbsenceCount, { color: theme.textSecondary }]}>
            {absenceCount} {absenceCount === 1 ? 'отсутствие' : absenceCount < 5 ? 'отсутствия' : 'отсутствий'}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
        )}
      </TouchableOpacity>
    );
  }, [selectedUserId, theme, getUserAbsences, handleUserSelect]);

  // Render selected user's absences list
  const renderSelectedUserAbsences = useCallback(() => {
    if (selectedUserId === null) return null;

    const userAbsences = getUserAbsences(selectedUserId);
    const selectedUser = users.find(u => u.id === selectedUserId);

    if (userAbsences.length === 0) return null;

    return (
      <View style={[styles.userAbsencesList, { borderColor: theme.border }]}>
        <Text style={[styles.userAbsencesTitle, { color: theme.textSecondary }]}>
          Отсутствия {selectedUser?.name}:
        </Text>
        {userAbsences.map(absence => (
          <TouchableOpacity
            key={absence.id}
            style={[styles.absenceItem, { backgroundColor: ABSENCE_TYPE_COLORS[absence.type] + '15' }]}
            onPress={() => onAbsencePress?.(absence)}
            activeOpacity={0.7}
          >
            <View style={[styles.absenceColorDot, { backgroundColor: ABSENCE_TYPE_COLORS[absence.type] }]} />
            <View style={styles.absenceInfo}>
              <Text style={[styles.absenceType, { color: theme.text }]}>
                {ABSENCE_TYPE_LABELS[absence.type]}
              </Text>
              <Text style={[styles.absenceDates, { color: theme.textSecondary }]}>
                {new Date(absence.start_date).toLocaleDateString('ru-RU')} — {new Date(absence.end_date).toLocaleDateString('ru-RU')}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  }, [selectedUserId, users, getUserAbsences, theme, onAbsencePress]);

  return (
    <View style={styles.container}>
      {/* Left Sidebar - Users List */}
      <View style={[styles.sidebar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: theme.text }]}>Сотрудники</Text>
          {selectedUserId !== null && (
            <TouchableOpacity
              onPress={() => setSelectedUserId(null)}
              style={[styles.clearButton, { backgroundColor: theme.backgroundSecondary }]}
            >
              <Text style={[styles.clearButtonText, { color: theme.primary }]}>Сбросить</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          style={styles.usersList}
          showsVerticalScrollIndicator={false}
        >
          {users.map(renderUserItem)}

          {/* Selected user's absences */}
          {renderSelectedUserAbsences()}
        </ScrollView>

        {/* Legend - at the bottom of sidebar */}
        {renderLegend() && (
          <View style={[styles.sidebarLegend, { borderColor: theme.border }]}>
            {renderLegend()}
          </View>
        )}
      </View>

      {/* Right Content - Calendar */}
      <ScrollView
        style={styles.calendarContainer}
        contentContainerStyle={styles.calendarContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Months Grid */}
        <View style={styles.monthsGrid}>
          {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  // Sidebar styles
  sidebar: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {}),
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sidebarTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  usersList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 6,
    gap: 10,
  },
  userItemSelected: {
    borderWidth: 1,
  },
  avatarWithColor: {
    position: 'relative',
  },
  userColorDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '500',
  },
  userAbsenceCount: {
    fontSize: 11,
    marginTop: 2,
  },
  userAbsencesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sidebarLegend: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  sidebarLegendTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
  },
  userAbsencesTitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  absenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    gap: 10,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore
      cursor: 'pointer',
    } : {}),
  },
  absenceColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  absenceInfo: {
    flex: 1,
  },
  absenceType: {
    fontSize: 12,
    fontWeight: '500',
  },
  absenceDates: {
    fontSize: 11,
    marginTop: 2,
  },
  // Calendar styles
  calendarContainer: {
    flex: 1,
  },
  calendarContent: {
    padding: 16,
  },
  calendarTitleContainer: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  calendarTitleText: {
    fontSize: 14,
    fontWeight: '600',
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
    borderRadius: 6,
  },
  holidayCell: {
    borderRadius: 6,
  },
  todayCell: {
    borderWidth: 1.5,
    borderRadius: 6,
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
