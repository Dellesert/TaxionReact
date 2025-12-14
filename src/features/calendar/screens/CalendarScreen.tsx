import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Event, CalendarView } from '../types/calendar.types';
import { EventListSkeleton } from '../components/states/EventListSkeleton';
import CreateEventModal from '../components/modals/CreateEventModal';
import { EventDetailModal } from '../components/modals/EventDetailModal';
import { MonthCalendarView } from '../components/views/MonthCalendarView';
import { CalendarHeader } from '../components/navigation/CalendarHeader';
import { CalendarDateNavigation } from '../components/navigation/CalendarDateNavigation';
import { CalendarViewSelector } from '../components/navigation/CalendarViewSelector';
import { CalendarEventsList } from '../components/events/CalendarEventsList';
import { CalendarEmptyState } from '../components/states/CalendarEmptyState';
import { CalendarDesktopView } from '../components/views/CalendarDesktopView';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarSearchIntegration } from '@shared/hooks/useTitleBarSearchIntegration';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useCalendarData } from '../hooks/useCalendarData';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import { formatDateRangeText, groupEventsByDate } from '../utils/calendarHelpers';
import * as calendarApi from '../api/calendar.api';

const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showError } = useNotification();
  const isWideScreen = useIsWideScreen();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Integrate with TitleBar search in Electron
  useTitleBarSearchIntegration({
    searchQuery,
    onSearchChange: setSearchQuery,
    placeholder: 'Поиск событий...',
    enabled: true,
  });

  // Custom hooks
  const {
    selectedDate,
    selectedView,
    setSelectedView,
    handlePrevious,
    handleNext,
    handleToday,
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
    setShowCreateModal(true);
  };

  const handleEventCreated = () => {
    setShowCreateModal(false);
    loadEvents();
  };

  const handleEventUpdated = () => {
    setSelectedEvent(null);
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

  // Filter events by search query
  const filteredEvents = searchQuery
    ? events.filter((event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : events;

  // Computed values
  const dateRangeText = formatDateRangeText(selectedDate, selectedView);
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
          /* Mobile View - Original Layout */
          <>
            {/* Header */}
            <CalendarHeader onAddPress={handleAddEvent} />

            {/* Date Navigation */}
            <CalendarDateNavigation
              dateRangeText={dateRangeText}
              onPrevious={handlePrevious}
              onNext={handleNext}
              onToday={handleToday}
            />

            {/* View Selector Pills */}
            <CalendarViewSelector selectedView={selectedView} onViewChange={setSelectedView} />

            {/* Events List or Month Calendar */}
            {isLoading ? (
              <EventListSkeleton />
            ) : selectedView === 'month' ? (
              <MonthCalendarView
                selectedDate={selectedDate}
                events={filteredEvents}
                onDatePress={handleDatePress}
                onEventPress={handleEventPress}
              />
            ) : sections.length === 0 ? (
              <CalendarEmptyState />
            ) : (
              <CalendarEventsList
                sections={sections}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                onEventPress={handleEventPress}
              />
            )}
          </>
        )}
      </View>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
      />

      {/* Event Detail Modal - Only for mobile */}
      {!isWideScreen && (
        <EventDetailModal
          visible={!!selectedEvent}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEventUpdated={handleEventUpdated}
        />
      )}
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
});

export default CalendarScreen;
