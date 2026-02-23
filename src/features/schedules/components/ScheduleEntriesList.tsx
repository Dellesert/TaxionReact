/**
 * Schedule Entries List
 * Отображает записи графика сгруппированные по датам
 * Показывает только дни с записями (без пустых дней)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { ScheduleEntryRow } from './ScheduleEntryRow';
import { formatScheduleDate, isToday, groupEntriesByDate } from '../utils/scheduleHelpers';
import type { ScheduleEntry } from '../types/schedule.types';

interface ScheduleEntriesListProps {
  entries: ScheduleEntry[];
  onEntryPress?: (entry: ScheduleEntry) => void;
}

interface SectionData {
  title: string;
  dateKey: string;
  isToday: boolean;
  data: ScheduleEntry[];
}

export const ScheduleEntriesList: React.FC<ScheduleEntriesListProps> = ({
  entries,
  onEntryPress,
}) => {
  const { theme } = useTheme();

  const sections = useMemo((): SectionData[] => {
    const grouped = groupEntriesByDate(entries);

    // Sort dates
    const sortedDateKeys = Object.keys(grouped).sort();

    return sortedDateKeys.map((dateKey) => {
      const dateEntries = grouped[dateKey];
      const date = new Date(dateKey);

      return {
        title: formatScheduleDate(date, 'EEEE, d MMMM'),
        dateKey,
        isToday: isToday(date),
        data: dateEntries.sort((a, b) => {
          // Sort by start time
          return a.start_time.localeCompare(b.start_time);
        }),
      };
    });
  }, [entries]);

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View
      style={[
        styles.sectionHeader,
        { backgroundColor: 'transparent' },
        section.isToday && { backgroundColor: theme.primaryLight + '15' },
      ]}
    >
      <Text
        style={[
          styles.sectionTitle,
          { color: section.isToday ? theme.primary : theme.text },
        ]}
      >
        {section.title}
      </Text>
      {section.isToday && (
        <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
          <Text style={styles.todayBadgeText}>Сегодня</Text>
        </View>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: ScheduleEntry }) => (
    <View style={styles.itemContainer}>
      <ScheduleEntryRow
        entry={item}
        showUser
        onPress={onEntryPress ? () => onEntryPress(item) : undefined}
      />
    </View>
  );

  if (entries.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Нет записей в графике
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContent}>
      {sections.map((section, sectionIndex) => (
        <View
          key={section.dateKey}
          style={[
            styles.sectionCard,
            { borderColor: theme.border },
            section.isToday && { borderColor: theme.primary + '40' },
            sectionIndex > 0 && { marginTop: 10 },
          ]}
        >
          <View
            style={[
              styles.sectionHeader,
              { borderBottomColor: theme.border, backgroundColor: theme.background },
              section.isToday && { backgroundColor: theme.primaryLight + '15' },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: section.isToday ? theme.primary : theme.text },
              ]}
            >
              {section.title}
            </Text>
            {section.isToday && (
              <View style={[styles.todayBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.todayBadgeText}>Сегодня</Text>
              </View>
            )}
          </View>
          <View style={styles.sectionItems}>
            {section.data.map((item, itemIndex) => (
              <View key={item.id} style={[styles.itemContainer, itemIndex > 0 && { marginTop: 8 }]}>
                <ScheduleEntryRow
                  entry={item}
                  showUser
                  onPress={onEntryPress ? () => onEntryPress(item) : undefined}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  sectionItems: {
    padding: 10,
  },
  itemContainer: {},
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});

export default ScheduleEntriesList;
