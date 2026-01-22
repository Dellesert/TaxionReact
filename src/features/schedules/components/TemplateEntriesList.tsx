/**
 * Template Entries List
 * Отображает записи шаблона повторяющегося графика сгруппированные по дням недели
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import type { ScheduleTemplateEntry } from '../types/schedule.types';

interface TemplateEntriesListProps {
  entries: ScheduleTemplateEntry[];
  onEntryPress?: (entry: ScheduleTemplateEntry) => void;
}

const DAYS_OF_WEEK: { value: number; label: string }[] = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' },
];

export const TemplateEntriesList: React.FC<TemplateEntriesListProps> = ({
  entries,
  onEntryPress,
}) => {
  const { theme } = useTheme();

  // Group entries by day of week
  const groupedEntries = useMemo(() => {
    const groups: Record<number, ScheduleTemplateEntry[]> = {};

    entries.forEach((entry) => {
      const day = entry.day_of_week;
      if (!groups[day]) {
        groups[day] = [];
      }
      groups[day].push(entry);
    });

    // Sort entries within each day by start_time
    Object.keys(groups).forEach((day) => {
      groups[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
    });

    return groups;
  }, [entries]);

  // Get days that have entries, in order
  const daysWithEntries = useMemo(() => {
    return DAYS_OF_WEEK.filter((day) => groupedEntries[day.value]?.length > 0);
  }, [groupedEntries]);

  const formatTime = (time: string) => {
    // Extract HH:MM from time string
    const match = time.match(/(\d{2}:\d{2})/);
    return match ? match[1] : time;
  };

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={36} color={theme.textSecondary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Нет записей в шаблоне
        </Text>
        <Text style={[styles.emptyHint, { color: theme.textSecondary }]}>
          Добавьте записи для дней недели
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {daysWithEntries.map((day) => (
        <View key={day.value} style={styles.daySection}>
          {/* Day Header */}
          <View style={styles.dayHeader}>
            <Ionicons name="calendar-outline" size={18} color={theme.primary} />
            <Text style={[styles.dayTitle, { color: theme.text }]}>
              {day.label}
            </Text>
          </View>

          {/* Entries for this day */}
          <View style={styles.entriesContainer}>
            {groupedEntries[day.value].map((entry, index) => (
              <TouchableOpacity
                key={entry.id}
                style={[
                  styles.entryCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  index > 0 && styles.entryCardMargin,
                ]}
                onPress={() => onEntryPress?.(entry)}
                activeOpacity={0.7}
              >
                {/* Time */}
                <View style={styles.timeContainer}>
                  <Text style={[styles.timeText, { color: theme.primary }]}>
                    {formatTime(entry.start_time)}
                  </Text>
                  <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>
                    —
                  </Text>
                  <Text style={[styles.timeText, { color: theme.primary }]}>
                    {formatTime(entry.end_time)}
                  </Text>
                </View>

                {/* Title if exists */}
                {entry.title && (
                  <Text style={[styles.entryTitle, { color: theme.text }]}>
                    {entry.title}
                  </Text>
                )}

                {/* User if assigned */}
                {entry.user ? (
                  <View style={styles.userContainer}>
                    <Avatar
                      name={entry.user.name}
                      imageUrl={entry.user.avatar}
                      size={24}
                    />
                    <Text style={[styles.userName, { color: theme.textSecondary }]}>
                      {entry.user.name}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.userContainer}>
                    <Ionicons name="people-outline" size={18} color={theme.textSecondary} />
                    <Text style={[styles.userName, { color: theme.textSecondary }]}>
                      Все сотрудники
                    </Text>
                  </View>
                )}

                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.textSecondary}
                  style={styles.chevron}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 20,
  },
  daySection: {
    marginBottom: 16,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  dayTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  entriesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  entryCardMargin: {
    marginTop: 8,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeSeparator: {
    fontSize: 12,
  },
  entryTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  userName: {
    fontSize: 13,
  },
  chevron: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
  },
});

export default TemplateEntriesList;
