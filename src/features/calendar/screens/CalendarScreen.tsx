import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Event } from '../types/calendar.types';
import { EventListSkeleton } from '../components/EventListSkeleton';
import CreateEventModal from '../components/CreateEventModal';
import { EventDetailModal } from '../components/EventDetailModal';
import { ScreenHeader } from '@components/common/ScreenHeader';
import { MonthCalendarView } from '../components/MonthCalendarView';
import { CalendarHeader } from '../components/CalendarHeader';
import { CalendarDateNavigation } from '../components/CalendarDateNavigation';
import { CalendarViewSelector } from '../components/CalendarViewSelector';
import { CalendarEventsList } from '../components/CalendarEventsList';
import { CalendarEmptyState } from '../components/CalendarEmptyState';
import { useTheme } from '@shared/hooks/useTheme';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useCalendarData } from '../hooks/useCalendarData';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import { formatDateRangeText, groupEventsByDate } from '../utils/calendarHelpers';
import * as calendarApi from '../api/calendar.api';

const CalendarScreen: React.FC = () => {
  const { theme } = useTheme();
  const { showError } = useNotification();

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

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

  // Computed values
  const dateRangeText = formatDateRangeText(selectedDate, selectedView);
  const sections = groupEventsByDate(events);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Календарь"
        showDivider={true}
        customContent={<CalendarHeader onAddPress={handleAddEvent} />}
      />

      {/* Content container with background */}
      <View style={[styles.content, { backgroundColor: theme.background }]}>
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
            events={events}
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
      </View>

      {/* Create Event Modal */}
      <CreateEventModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onEventCreated={handleEventCreated}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        visible={!!selectedEvent}
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEventUpdated={handleEventUpdated}
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
});

export default CalendarScreen;
