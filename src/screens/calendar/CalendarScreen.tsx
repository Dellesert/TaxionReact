import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventType, CalendarView } from '../../types/calendar.types';
import { EventItem } from '@components/calendar/EventItem';
import { CreateEventModal } from '@components/calendar/CreateEventModal';
import { EventDetailModal } from '@components/calendar/EventDetailModal';
import { ScreenHeader } from '@components/common/ScreenHeader';
import { mockGetEvents, isMockMode } from '@utils/mockData';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as calendarApi from '@api/calendar.api';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EventSection {
  title: string;
  data: Event[];
}

const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedView, setSelectedView] = useState<CalendarView>('week');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, [selectedDate, selectedView]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);

      if (isMockMode()) {
        const mockEvents = await mockGetEvents();
        setEvents(mockEvents);
      } else {
        // Calculate date range based on view
        let startDate: Date;
        let endDate: Date;

        if (selectedView === 'day') {
          startDate = new Date(selectedDate);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(selectedDate);
          endDate.setHours(23, 59, 59, 999);
        } else if (selectedView === 'week') {
          startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
          endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
        } else {
          startDate = startOfMonth(selectedDate);
          endDate = endOfMonth(selectedDate);
        }

        const filters = {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        };

        console.log('📅 Loading events with filters:', {
          view: selectedView,
          start: startDate,
          end: endDate,
        });

        const fetchedEvents = await calendarApi.getEvents(filters);
        console.log('📅 Fetched events count:', fetchedEvents?.length || 0);
        console.log('📅 Fetched events:', fetchedEvents);
        setEvents(fetchedEvents);
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить события');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleEventPress = async (event: Event) => {
    try {
      // Load full event details with participants
      const fullEvent = await calendarApi.getEvent(event.id);
      setSelectedEvent(fullEvent);
    } catch (error) {
      console.error('Failed to load event details:', error);
      // Fallback to showing event without full details
      setSelectedEvent(event);
    }
  };

  const handleAddEvent = () => {
    console.log('📅 Opening create event modal...');
    setShowCreateModal(true);
  };

  const handlePrevious = () => {
    if (selectedView === 'day') {
      setSelectedDate(subDays(selectedDate, 1));
    } else if (selectedView === 'week') {
      setSelectedDate(subWeeks(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (selectedView === 'day') {
      setSelectedDate(addDays(selectedDate, 1));
    } else if (selectedView === 'week') {
      setSelectedDate(addWeeks(selectedDate, 1));
    } else {
      setSelectedDate(addMonths(selectedDate, 1));
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getDateRangeText = () => {
    if (selectedView === 'day') {
      return format(selectedDate, 'd MMMM yyyy', { locale: ru });
    } else if (selectedView === 'week') {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM', { locale: ru })}`;
    } else {
      return format(selectedDate, 'LLLL yyyy', { locale: ru });
    }
  };

  // Check if user can create events for others
  const canCreateForOthers = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'department_head');

  // Group events by date
  const groupEventsByDate = (): EventSection[] => {
    if (!events || events.length === 0) {
      return [];
    }

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Календарь"
        showDivider={true}
        customContent={
          <>
            {/* Title Row */}
            <View style={styles.headerTop}>
              <View style={styles.headerLeft} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>Календарь</Text>

              {/* View Selector Pills */}
              <View style={styles.viewPills}>
                {(['day', 'week', 'month'] as CalendarView[]).map((view) => (
                  <TouchableOpacity
                    key={view}
                    style={[
                      styles.viewPill,
                      { backgroundColor: theme.backgroundSecondary },
                      selectedView === view && [styles.viewPillActive, { backgroundColor: theme.primary }],
                    ]}
                    onPress={() => setSelectedView(view)}
                  >
                    <Text
                      style={[
                        styles.viewPillText,
                        { color: theme.textSecondary },
                        selectedView === view && styles.viewPillTextActive,
                      ]}
                    >
                      {view === 'day' ? 'Д' : view === 'week' ? 'Н' : 'М'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* Date Navigation */}
            <View style={styles.dateNav}>
              <TouchableOpacity onPress={handlePrevious} style={styles.navButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-back" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity onPress={handleToday} style={styles.todayButton}>
                <Text style={[styles.dateText, { color: theme.text }]}>{getDateRangeText()}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleNext} style={styles.navButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </>
        }
      />

      {/* Events List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="calendar-outline" size={48} color={theme.textTertiary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Нет событий</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Нажмите + чтобы создать новое событие
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
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
            </View>
          )}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={handleAddEvent}
        style={[styles.fab, { backgroundColor: theme.primary }]}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Event Modal */}
      {console.log('📅 Rendering CreateEventModal, showCreateModal:', showCreateModal)}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => {
          console.log('📅 Closing modal');
          setShowCreateModal(false);
        }}
        onEventCreated={() => {
          console.log('📅 Event created');
          setShowCreateModal(false);
          loadEvents();
        }}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEventUpdated={() => {
          setSelectedEvent(null);
          loadEvents();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    width: 102, // Same width as viewPills (32*3 + 6*2)
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  viewPills: {
    flexDirection: 'row',
    gap: 6,
  },
  divider: {
    height: 1,
    marginVertical: 6,
    opacity: 0.5,
  },
  viewPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillActive: {
    // backgroundColor set dynamically
  },
  viewPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewPillTextActive: {
    color: '#FFFFFF',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});

export default CalendarScreen;
