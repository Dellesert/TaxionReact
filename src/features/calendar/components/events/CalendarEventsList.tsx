import React from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../types/calendar.types';
import { EventSection } from '../../utils/calendarHelpers';
import { EventItem } from './EventItem';
import { useTheme } from '@shared/hooks/useTheme';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';

interface CalendarEventsListProps {
  sections: EventSection[];
  refreshing: boolean;
  onRefresh: () => void;
  onEventPress: (event: Event) => void;
}

export const CalendarEventsList: React.FC<CalendarEventsListProps> = ({
  sections,
  refreshing,
  onRefresh,
  onEventPress,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => <EventItem event={item} onPress={onEventPress} />}
        renderSectionHeader={({ section: { title, data } }) => {
          // Try to get holiday name from the first event's date in this section
          const sectionDate = data.length > 0 ? new Date(data[0].start_time) : null;
          const holiday = sectionDate ? getHoliday(sectionDate) : null;

          return (
            <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
              {holiday && (
                <View style={[styles.holidayTag, { backgroundColor: theme.error + '12' }]} pointerEvents="none">
                  <Ionicons name="gift-outline" size={10} color={theme.error} />
                  <Text style={[styles.holidayTagText, { color: theme.error }]} numberOfLines={1}>
                    {holiday.name}
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  list: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  holidayTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  holidayTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
