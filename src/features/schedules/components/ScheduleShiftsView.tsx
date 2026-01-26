import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { Schedule, ScheduleEntry } from '../types/schedule.types';

interface ScheduleShiftsViewProps {
  schedule: Schedule;
  entries: ScheduleEntry[];
}

interface DateRow {
  date: Date;
  dateKey: string;
  morningEntries: ScheduleEntry[];
  eveningEntries: ScheduleEntry[];
}

// Generate dates array for the schedule period
const generateDates = (startDate: string, endDate: string): Date[] => {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  const current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

// Format date for display (dd.MM.yy)
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}.${month}.${year}`;
};

// Format date as key (YYYY-MM-DD)
const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Check if date is weekend
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

// Check if date is today
const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
};

// Get user display name with initials (Фамилия И.О.)
const getUserDisplayName = (entry: ScheduleEntry): string => {
  if (!entry.user) return `#${entry.user_id}`;

  const user = entry.user;

  // If we have separate name parts
  if (user.last_name) {
    let displayName = user.last_name;
    if (user.first_name) {
      displayName += ` ${user.first_name.charAt(0)}.`;
    }
    if (user.middle_name) {
      displayName += `${user.middle_name.charAt(0)}.`;
    }
    return displayName;
  }

  // Fall back to full name, try to parse it (Фамилия Имя Отчество)
  const name = user.name || '';
  const parts = name.split(' ').filter(p => p.length > 0);

  if (parts.length >= 3) {
    // Фамилия И.О.
    return `${parts[0]} ${parts[1].charAt(0)}.${parts[2].charAt(0)}.`;
  } else if (parts.length === 2) {
    // Фамилия И.
    return `${parts[0]} ${parts[1].charAt(0)}.`;
  } else if (parts.length === 1) {
    return parts[0];
  }

  return name || `#${entry.user_id}`;
};

// Get full name for avatar
const getUserFullName = (entry: ScheduleEntry): string => {
  if (!entry.user) return `#${entry.user_id}`;
  return entry.user.name || entry.user.last_name || `#${entry.user_id}`;
};

export const ScheduleShiftsView: React.FC<ScheduleShiftsViewProps> = ({
  schedule,
  entries,
}) => {
  const { theme } = useTheme();

  // Generate dates and group entries by date and shift
  const dateRows = useMemo((): DateRow[] => {
    const dates = generateDates(schedule.start_date, schedule.end_date);

    // Create a map of entries by date
    const entriesByDate = new Map<string, ScheduleEntry[]>();
    for (const entry of entries) {
      const dateKey = entry.date.split('T')[0];
      const existing = entriesByDate.get(dateKey) || [];
      existing.push(entry);
      entriesByDate.set(dateKey, existing);
    }

    return dates.map(date => {
      const dateKey = formatDateKey(date);
      const dateEntries = entriesByDate.get(dateKey) || [];

      // Split by shift type
      const morningEntries = dateEntries.filter(e =>
        e.shift_type === 'morning' || e.shift_type === 'full_day'
      );
      const eveningEntries = dateEntries.filter(e =>
        e.shift_type === 'evening' || e.shift_type === 'full_day'
      );

      return {
        date,
        dateKey,
        morningEntries,
        eveningEntries,
      };
    });
  }, [schedule.start_date, schedule.end_date, entries]);

  const DATE_COLUMN_WIDTH = 80;
  const SHIFT_COLUMN_WIDTH = 200;

  const renderEntry = (entry: ScheduleEntry) => (
    <View key={entry.id} style={styles.entryItem}>
      <Avatar
        name={getUserFullName(entry)}
        imageUrl={entry.user?.avatar}
        size={24}
      />
      <Text style={[styles.nameText, { color: theme.text }]} numberOfLines={1}>
        {getUserDisplayName(entry)}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.tableWrapper, { borderColor: theme.border }]}>
          {/* Header row */}
          <View style={[styles.headerRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <View style={[styles.dateHeaderCell, { width: DATE_COLUMN_WIDTH, borderRightColor: theme.border }]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Дата</Text>
            </View>
            <View style={[styles.shiftHeaderCell, { width: SHIFT_COLUMN_WIDTH, borderRightColor: theme.border }]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Утро</Text>
              {schedule.morning_start && schedule.morning_end && (
                <Text style={[styles.headerSubtext, { color: theme.textSecondary }]}>
                  {schedule.morning_start?.slice(0, 5)} — {schedule.morning_end?.slice(0, 5)}
                </Text>
              )}
            </View>
            <View style={[styles.shiftHeaderCell, styles.lastColumn, { width: SHIFT_COLUMN_WIDTH }]}>
              <Text style={[styles.headerText, { color: theme.text }]}>Вечер</Text>
              {schedule.evening_start && schedule.evening_end && (
                <Text style={[styles.headerSubtext, { color: theme.textSecondary }]}>
                  {schedule.evening_start?.slice(0, 5)} — {schedule.evening_end?.slice(0, 5)}
                </Text>
              )}
            </View>
          </View>

          {/* Data rows */}
          {dateRows.map((row) => {
            const weekend = isWeekend(row.date);
            const today = isToday(row.date);
            const hasEntries = row.morningEntries.length > 0 || row.eveningEntries.length > 0;

            return (
              <View
                key={row.dateKey}
                style={[
                  styles.dataRow,
                  { borderBottomColor: theme.border },
                  weekend && { backgroundColor: theme.backgroundSecondary + '50' },
                  today && { backgroundColor: theme.primary + '10' },
                  !hasEntries && { opacity: 0.5 },
                ]}
              >
                {/* Date cell */}
                <View style={[styles.dateCell, { width: DATE_COLUMN_WIDTH, borderRightColor: theme.border }]}>
                  <Text style={[
                    styles.dateText,
                    { color: theme.text },
                    weekend && { color: theme.error },
                    today && { color: theme.primary, fontWeight: '700' },
                  ]}>
                    {formatDate(row.date)}
                  </Text>
                </View>

                {/* Morning cell */}
                <View style={[styles.shiftCell, { width: SHIFT_COLUMN_WIDTH, borderRightColor: theme.border }]}>
                  {row.morningEntries.length > 0 && (
                    <View style={styles.namesContainer}>
                      {row.morningEntries.map(renderEntry)}
                    </View>
                  )}
                </View>

                {/* Evening cell */}
                <View style={[styles.shiftCell, styles.lastColumn, { width: SHIFT_COLUMN_WIDTH }]}>
                  {row.eveningEntries.length > 0 && (
                    <View style={styles.namesContainer}>
                      {row.eveningEntries.map(renderEntry)}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  tableWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }),
  },
  dateHeaderCell: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftHeaderCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastColumn: {
    borderRightWidth: 0,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    minHeight: 44,
  },
  dateCell: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    fontWeight: '500',
  },
  shiftCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    justifyContent: 'center',
  },
  namesContainer: {
    gap: 6,
  },
  entryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 13,
    flex: 1,
  },
});
