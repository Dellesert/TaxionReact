import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { Event, CalendarView } from '../../types/calendar.types';
import { EventSection } from '../../utils/calendarHelpers';
import { useTheme } from '@shared/hooks/useTheme';
import { useMonthEvents } from '../../hooks/useMonthEvents';
import { useWeekDisplayMode } from '../../hooks/useWeekDisplayMode';
import { addMonths, subMonths } from 'date-fns';
import { MonthCalendarView } from './MonthCalendarView';
import { CalendarEventsList } from '../events/CalendarEventsList';
import { CalendarEmptyState } from '../states/CalendarEmptyState';
import { EventDetailsPanel } from '../panels/EventDetailsPanel';
import { EventListSkeleton } from '../states/EventListSkeleton';
import { CalendarStatsPanel } from '../panels/CalendarStatsPanel';
import { CalendarHeader } from '../navigation/CalendarHeader';
import { CalendarToolbar } from '../navigation/CalendarToolbar';
import { WeekTimelineView } from './WeekTimelineView';
import { WeekViewModeSelector } from '../navigation/WeekViewModeSelector';
import { UpcomingEventsCard } from '../panels/UpcomingEventsCard';

interface CalendarDesktopViewProps {
  selectedDate: Date;
  events: Event[];
  sections: EventSection[];
  isLoading: boolean;
  refreshing: boolean;
  initialView?: CalendarView;
  onDatePress: (date: Date, view?: CalendarView) => void;
  onEventPress: (event: Event) => void;
  onRefresh: () => void;
  onEventUpdated: () => void;
  onViewChange?: (view: CalendarView) => void;
  onAddPress: () => void;
}

export const CalendarDesktopView: React.FC<CalendarDesktopViewProps> = ({
  selectedDate,
  events,
  sections,
  isLoading,
  refreshing,
  initialView = 'day',
  onDatePress,
  onEventPress,
  onRefresh,
  onEventUpdated,
  onViewChange,
  onAddPress,
}) => {
  const { theme } = useTheme();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [viewMode, setViewMode] = useState<CalendarView>(initialView);
  const { weekDisplayMode, setWeekDisplayMode } = useWeekDisplayMode();
  const [searchQuery, setSearchQuery] = useState('');

  // Load events for the entire month for the mini calendar
  const { monthEvents } = useMonthEvents(selectedDate);

  const handleDayPress = (date: Date) => {
    setSelectedEvent(null);
    // Keep current view mode when clicking on mini calendar
    onDatePress(date, viewMode);
  };

  const handleViewModeChange = (mode: CalendarView) => {
    setViewMode(mode);
    setSelectedEvent(null);
    onViewChange?.(mode);
    onDatePress(selectedDate, mode);
  };

  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
    onEventPress(event);
  };

  const handleCloseDetails = () => {
    setSelectedEvent(null);
  };

  const handleEventUpdate = () => {
    setSelectedEvent(null);
    onEventUpdated();
  };

  // Navigation for mini calendar - always navigate by months
  const handleMonthNavigate = (direction: 'prev' | 'next' | 'today') => {
    setSelectedEvent(null);
    if (direction === 'today') {
      onDatePress(new Date(), viewMode);
    } else if (direction === 'prev') {
      onDatePress(subMonths(selectedDate, 1), viewMode);
    } else if (direction === 'next') {
      onDatePress(addMonths(selectedDate, 1), viewMode);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Header - Search and Actions */}
      <CalendarHeader
        isDesktop={true}
        searchQuery={searchQuery}
        onAddPress={onAddPress}
        onSearchChange={handleSearchChange}
        onSearchClear={handleSearchClear}
      />

      {/* Toolbar - Navigation and View Selector */}
      <CalendarToolbar
        selectedDate={selectedDate}
        selectedView={viewMode}
        onViewChange={handleViewModeChange}
        onDateChange={handleDayPress}
        onToday={() => handleMonthNavigate('today')}
        onPrevious={() => handleMonthNavigate('prev')}
        onNext={() => handleMonthNavigate('next')}
      />

      {/* Main Content Area - 3 Column Layout */}
      <View style={styles.contentContainer}>
        {/* Left Sidebar - Mini Calendar & Stats */}
        <View style={[styles.leftSidebar, { backgroundColor: theme.card, borderRightColor: theme.border }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.leftSidebarContent}
          >
            {/* Upcoming Events Card */}
            <UpcomingEventsCard
              events={monthEvents}
              onEventPress={handleEventPress}
            />

            <MonthCalendarView
              selectedDate={selectedDate}
              events={monthEvents}
              onDatePress={handleDayPress}
              onEventPress={handleEventPress}
              isCompact={true}
              viewMode={viewMode}
            />

            <CalendarStatsPanel
              selectedDate={selectedDate}
              events={monthEvents}
              viewMode={viewMode as 'day' | 'week'}
              isCompact={false}
            />
          </ScrollView>
        </View>

        {/* Center Panel - Main Calendar View */}
        <View style={[styles.centerPanel, { backgroundColor: theme.background }]}>
          {/* Week View Mode Selector - Only shown when week view is active */}
          {viewMode === 'week' && (
            <View style={[styles.weekModeSelectorContainer, { borderBottomColor: theme.border }]}>
              <WeekViewModeSelector
                selectedMode={weekDisplayMode}
                onModeChange={setWeekDisplayMode}
              />
            </View>
          )}

          {isLoading ? (
            <EventListSkeleton />
          ) : viewMode === 'week' ? (
            weekDisplayMode === 'timeline' ? (
              <WeekTimelineView
                selectedDate={selectedDate}
                events={events}
                onEventPress={handleEventPress}
              />
            ) : (
              sections.length === 0 ? (
                <CalendarEmptyState />
              ) : (
                <CalendarEventsList
                  sections={sections}
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  onEventPress={handleEventPress}
                />
              )
            )
          ) : sections.length === 0 ? (
            <CalendarEmptyState />
          ) : (
            <CalendarEventsList
              sections={sections}
              refreshing={refreshing}
              onRefresh={onRefresh}
              onEventPress={handleEventPress}
            />
          )}
        </View>

        {/* Right Sidebar - Event Details (only when event selected) */}
        {selectedEvent && (
          <View
            style={[
              styles.rightSidebar,
              { backgroundColor: theme.card, borderLeftColor: theme.border },
            ]}
          >
            <EventDetailsPanel
              event={selectedEvent}
              onClose={handleCloseDetails}
              onEventUpdated={handleEventUpdate}
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  leftSidebar: {
    width: 350,
    borderRightWidth: 1,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 3,
    }),
  },
  leftSidebarContent: {
    padding: 16,
  },
  centerPanel: {
    flex: 1,
    minWidth: 0, // Important for flex shrinking
  },
  weekModeSelectorContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSidebar: {
    width: 480,
    borderLeftWidth: 1,
    height: '100%',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '-2px 0 12px rgba(0,0,0,0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: -2, height: 0 },
      shadowOpacity: 0.04,
      shadowRadius: 12,
      elevation: 3,
    }),
  },
  rightSidebarContent: {
    padding: 16,
  },
});
