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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Event, EventType, CalendarView } from '../../types/calendar.types';
import { EventItem } from '@components/calendar/EventItem';
import CreateEventModal from '@components/calendar/CreateEventModal';
import { EventDetailModal } from '@components/calendar/EventDetailModal';
import { ScreenHeader } from '@components/common/ScreenHeader';
import { MonthCalendarView } from '@components/calendar/MonthCalendarView';
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

        const response = await calendarApi.getEvents(filters, 100, 0);
        console.log('📅 Fetched events count:', response.events?.length || 0);
        console.log('📅 Total events in period:', response.total);
        setEvents(response.events);
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

  const handleDatePress = (date: Date) => {
    setSelectedDate(date);
    // Switch to day view when clicking on a date in month view
    if (selectedView === 'month') {
      setSelectedView('day');
    }
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
      // Get local date string (YYYY-MM-DD) without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;

      if (!sections[dateKey]) {
        sections[dateKey] = [];
      }
      sections[dateKey].push(event);
    });

    // Get today's date in local timezone
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = String(today.getMonth() + 1).padStart(2, '0');
    const todayDay = String(today.getDate()).padStart(2, '0');
    const todayKey = `${todayYear}-${todayMonth}-${todayDay}`;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowYear = tomorrow.getFullYear();
    const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowKey = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

    // Sort sections by date
    const sortedSections = Object.keys(sections)
      .sort()
      .map((dateKey) => {
        const date = new Date(dateKey + 'T00:00:00');

        let title = '';
        if (dateKey === todayKey) {
          title = 'Сегодня';
        } else if (dateKey === tomorrowKey) {
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Календарь"
        showDivider={true}
        customContent={
          <>
            {/* Title Row with Add Button */}
            <View style={styles.headerTop}>
              <View style={styles.headerLeft} />
              <Text style={[styles.headerTitle, { color: theme.text }]}>Календарь</Text>

              {/* Add Button */}
              <TouchableOpacity onPress={handleAddEvent} style={styles.addButton}>
                <Ionicons name="add" size={30} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </>
        }
      />

      {/* Content container with background */}
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {/* Date Navigation */}
        <View style={[styles.dateNav, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
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

        {/* View Selector Pills */}
        <View style={styles.viewSelectorContainer}>
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
                  {view === 'day' ? 'День' : view === 'week' ? 'Неделя' : 'Месяц'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Events List or Month Calendar */}
        {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : selectedView === 'month' ? (
        <MonthCalendarView
          selectedDate={selectedDate}
          events={events}
          onDatePress={handleDatePress}
          onEventPress={handleEventPress}
        />
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
            <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
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
      </View>
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
    width: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSelectorContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewPills: {
    flexDirection: 'row',
    gap: 8,
  },
  viewPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewPillActive: {
    // backgroundColor set dynamically
  },
  viewPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewPillTextActive: {
    color: '#FFFFFF',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
});

export default CalendarScreen;
