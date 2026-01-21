/**
 * Schedule Entries List
 * Отображает записи графика сгруппированные по датам
 * Показывает только дни с записями (без пустых дней)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
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
        { backgroundColor: theme.background },
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
      <Text style={[styles.entryCount, { color: theme.textSecondary }]}>
        {section.data.length} {section.data.length === 1 ? 'запись' :
          section.data.length < 5 ? 'записи' : 'записей'}
      </Text>
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
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id.toString()}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      stickySectionHeadersEnabled
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
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
  entryCount: {
    fontSize: 13,
    marginLeft: 'auto',
  },
  itemContainer: {
    paddingHorizontal: 16,
  },
  separator: {
    height: 8,
  },
  sectionSeparator: {
    height: 8,
  },
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
