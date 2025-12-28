import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Event, CalendarView } from '../types/calendar.types';
import { EventListSkeleton } from '../components/states/EventListSkeleton';
import CreateEventModal from '../components/modals/CreateEventModal';
import { MonthCalendarView } from '../components/views/MonthCalendarView';
import { CalendarHeader } from '../components/navigation/CalendarHeader';
import { WeekDayStrip } from '../components/navigation/WeekDayStrip';
import { CalendarEventsList } from '../components/events/CalendarEventsList';
import { CalendarEmptyState } from '../components/states/CalendarEmptyState';
import { CalendarDesktopView } from '../components/views/CalendarDesktopView';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarSearchIntegration } from '@shared/hooks/useTitleBarSearchIntegration';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useCalendarData } from '../hooks/useCalendarData';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import { useMobileCalendarState } from '../hooks/useMobileCalendarState';
import { useMobileCalendarData } from '../hooks/useMobileCalendarData';
import { groupEventsByDate } from '../utils/calendarHelpers';

type CalendarStackParamList = {
  CalendarMain: {
    eventId?: number;
  } | undefined;
  EventDetail: { eventId: number };
};

type CalendarNavigationProp = NativeStackNavigationProp<CalendarStackParamList, 'CalendarMain'>;
type CalendarRouteProp = RouteProp<CalendarStackParamList, 'CalendarMain'>;

// Mobile Calendar Content Component
interface MobileCalendarContentProps {
  onAddPress: () => void;
  onEventPress: (event: Event) => void;
  searchQuery: string;
}

const MobileCalendarContent: React.FC<MobileCalendarContentProps> = ({
  onAddPress,
  onEventPress,
  searchQuery,
}) => {
  const { showError } = useNotification();

  // Mobile calendar state
  const {
    weekStartDate,
    selectedDate,
    viewMode,
    weekDays,
    handleDayPress,
    handlePrevWeek,
    handleNextWeek,
    handleMonthDateSelect,
    toggleViewMode,
    getEventsDateRange,
  } = useMobileCalendarState();

  // Get date range for data fetching
  const { startDate, endDate } = getEventsDateRange();

  // Fetch events for the current range
  const { events, isLoading, refreshing, loadEvents, handleRefresh } = useMobileCalendarData(
    startDate,
    endDate
  );

  // Load events when date range changes
  useEffect(() => {
    loadEvents().catch(() => showError('Не удалось загрузить события'));
  }, [startDate, endDate]);

  // Filter events by search query
  const filteredEvents = searchQuery
    ? events.filter(
        (event) =>
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  // Group events for list display
  const sections = groupEventsByDate(filteredEvents);

  return (
    <>
      {/* Header with view mode toggle */}
      <CalendarHeader
        onAddPress={onAddPress}
        viewMode={viewMode}
        onViewModeToggle={toggleViewMode}
      />

      {/* Week day strip (only in week mode) */}
      {viewMode === 'week' && (
        <WeekDayStrip
          weekDays={weekDays}
          selectedDate={selectedDate}
          onDayPress={handleDayPress}
          onSwipeLeft={handleNextWeek}
          onSwipeRight={handlePrevWeek}
        />
      )}

      {/* Content: Month calendar or Events list */}
      {viewMode === 'month' ? (
        <MonthCalendarView
          selectedDate={weekStartDate}
          events={filteredEvents}
          onDatePress={handleMonthDateSelect}
          onEventPress={onEventPress}
        />
      ) : isLoading ? (
        <EventListSkeleton />
      ) : sections.length === 0 ? (
        <ScrollView
          contentContainerStyle={styles.emptyStateContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <CalendarEmptyState />
        </ScrollView>
      ) : (
        <CalendarEventsList
          sections={sections}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEventPress={onEventPress}
        />
      )}
    </>
  );
};

const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const isWideScreen = useIsWideScreen();
  const navigation = useNavigation<CalendarNavigationProp>();
  const route = useRoute<CalendarRouteProp>();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Handle navigation from notification (with eventId parameter)
  useEffect(() => {
    const eventId = route.params?.eventId;
    if (eventId) {
      console.log('[Calendar] Opening event from notification:', eventId);
      // Navigate to event detail immediately
      setTimeout(() => {
        navigation.navigate('EventDetail', { eventId });
      }, 100);
    }
  }, [route.params?.eventId, navigation]);

  // Integrate with TitleBar search in Electron
  useTitleBarSearchIntegration({
    searchQuery,
    onSearchChange: setSearchQuery,
    placeholder: 'Поиск событий...',
    enabled: true,
  });

  // Custom hooks for desktop
  const {
    selectedDate,
    selectedView,
    setSelectedView,
    handleDatePress,
  } = useCalendarNavigation();

  const { events, isLoading, refreshing, loadEvents, handleRefresh } = useCalendarData(
    selectedDate,
    selectedView
  );

  // Load events on mount and when dependencies change
  useEffect(() => {
    loadEvents().catch(() => showError('Не удалось загрузить события'));
  }, [selectedDate, selectedView]);

  // Handlers
  const handleEventPress = (event: Event) => {
    // Navigate to event detail screen
    navigation.navigate('EventDetail', { eventId: event.id });
  };

  const handleAddEvent = () => {
    setShowCreateModal(true);
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    loadEvents();
  };

  const handleEventUpdated = () => {
    loadEvents();
  };

  // Desktop-specific handler that can change view
  const handleDesktopDatePress = (date: Date, view?: CalendarView) => {
    // Set the date and optionally change the view
    handleDatePress(date);
    if (view && selectedView !== view) {
      setSelectedView(view);
    }
  };


  // Handle desktop view change
  const handleDesktopViewChange = (view: CalendarView) => {
    setSelectedView(view);
  };

  // Filter events by search query (for desktop)
  const filteredEvents = searchQuery
    ? events.filter((event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  // Computed values (for desktop)
  const sections = groupEventsByDate(filteredEvents);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['left', 'right']}>
      {/* Content container with background */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
        {isWideScreen ? (
          /* Desktop View - Three Panel Layout */
          <CalendarDesktopView
            selectedDate={selectedDate}
            events={filteredEvents}
            sections={sections}
            isLoading={isLoading}
            refreshing={refreshing}
            initialView={selectedView}
            onDatePress={handleDesktopDatePress}
            onEventPress={handleEventPress}
            onRefresh={handleRefresh}
            onEventUpdated={handleEventUpdated}
            onViewChange={handleDesktopViewChange}
            onAddPress={handleAddEvent}
          />
        ) : (
          /* Mobile View - New Week Strip Layout */
          <MobileCalendarContent
            onAddPress={handleAddEvent}
            onEventPress={handleEventPress}
            searchQuery={searchQuery}
          />
        )}
      </View>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  emptyStateContainer: {
    flexGrow: 1,
  },
});

export default CalendarScreen;
