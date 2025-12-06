import React from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { Event } from '../../types/calendar.types';
import { EventSection } from '../../utils/calendarHelpers';
import { EventItem } from './EventItem';
import { useTheme } from '@shared/hooks/useTheme';

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
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => <EventItem event={item} onPress={onEventPress} />}
      renderSectionHeader={({ section: { title } }) => (
        <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
        </View>
      )}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
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
});
