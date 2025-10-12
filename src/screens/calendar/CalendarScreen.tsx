import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '@types/calendar.types';
import { EventItem } from '@components/calendar/EventItem';
import { mockGetEvents, isMockMode } from '@utils/mockData';

interface EventSection {
  title: string;
  data: Event[];
}

const CalendarScreen: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      if (isMockMode()) {
        const mockEvents = await mockGetEvents();
        setEvents(mockEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleEventPress = (event: Event) => {
    console.log('Event pressed:', event.id);
    // TODO: Navigate to event detail
  };

  const handleAddEvent = () => {
    console.log('Add new event');
    // TODO: Navigate to create event screen
  };

  // Group events by date
  const groupEventsByDate = (): EventSection[] => {
    const sections: { [key: string]: Event[] } = {};

    events.forEach((event) => {
      const date = new Date(event.start_time);
      const dateKey = date.toISOString().split('T')[0];

      if (!sections[dateKey]) {
        sections[dateKey] = [];
      }
      sections[dateKey].push(event);
    });

    // Sort sections by date
    const sortedSections = Object.keys(sections)
      .sort()
      .map((dateKey) => {
        const date = new Date(dateKey);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let title = '';
        if (dateKey === today.toISOString().split('T')[0]) {
          title = 'Сегодня';
        } else if (dateKey === tomorrow.toISOString().split('T')[0]) {
          title = 'Завтра';
        } else {
          title = date.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          });
        }

        return {
          title,
          data: sections[dateKey].sort(
            (a, b) =>
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
          ),
        };
      });

    return sortedSections;
  };

  const sections = groupEventsByDate();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Календарь</Text>
        <TouchableOpacity onPress={handleAddEvent} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Events List */}
      {sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Нет событий</Text>
          <Text style={styles.emptySubtitle}>
            Создайте новое событие, чтобы начать планирование
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <EventItem event={item} onPress={handleEventPress} />
          )}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{title}</Text>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#E94444',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default CalendarScreen;
