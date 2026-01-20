import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ScheduleEntryRow } from './ScheduleEntryRow';
import {
  getWeekDays,
  getEntriesForDate,
  getDayLabel,
  isToday,
} from '../utils/scheduleHelpers';
import type { ScheduleEntry } from '../types/schedule.types';

interface ScheduleWeekViewProps {
  entries: ScheduleEntry[];
  baseDate?: Date;
  onEntryPress?: (entry: ScheduleEntry) => void;
  onUserPress?: (userId: number) => void;
}

export const ScheduleWeekView: React.FC<ScheduleWeekViewProps> = ({
  entries,
  baseDate = new Date(),
  onEntryPress,
  onUserPress,
}) => {
  const { theme } = useTheme();

  const weekDays = useMemo(() => getWeekDays(baseDate), [baseDate]);

  const renderDay = (date: Date) => {
    const dayEntries = getEntriesForDate(entries, date);
    const isTodayDate = isToday(date);

    return (
      <View
        key={date.toISOString()}
        style={[
          styles.dayContainer,
          { borderBottomColor: theme.border },
          isTodayDate && { backgroundColor: theme.primaryLight + '20' },
        ]}
      >
        <View style={styles.dayHeader}>
          <Text
            style={[
              styles.dayLabel,
              { color: isTodayDate ? theme.primary : theme.textSecondary },
            ]}
          >
            {getDayLabel(date)}
          </Text>
          <Text
            style={[
              styles.dayNumber,
              { color: isTodayDate ? theme.primary : theme.text },
            ]}
          >
            {date.getDate()}
          </Text>
          {isTodayDate && (
            <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.todayText}>Сегодня</Text>
            </View>
          )}
        </View>

        <View style={styles.entriesContainer}>
          {dayEntries.length > 0 ? (
            dayEntries.map((entry) => (
              <ScheduleEntryRow
                key={entry.id}
                entry={entry}
                showUser
                onPress={onEntryPress ? () => onEntryPress(entry) : undefined}
                onUserPress={onUserPress}
              />
            ))
          ) : (
            <Text style={[styles.noEntriesText, { color: theme.textSecondary }]}>
              Нет записей
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {weekDays.map(renderDay)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayContainer: {
    padding: 16,
    borderBottomWidth: 1,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '700',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  todayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  entriesContainer: {
    gap: 8,
  },
  noEntriesText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
