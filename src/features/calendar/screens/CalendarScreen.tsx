import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { endOfWeek, addMonths, subMonths } from 'date-fns';
import { Event, CalendarView } from '../types/calendar.types';
import { EventListSkeleton } from '../components/states/EventListSkeleton';
import { CalendarSkeleton } from '../components/states/CalendarSkeleton';
import CreateEventModal from '../components/modals/CreateEventModal';
import { InfiniteMonthCalendar } from '../components/views/InfiniteMonthCalendar';
import { CalendarHeader } from '../components/navigation/CalendarHeader';
import { WeekDayStrip } from '../components/navigation/WeekDayStrip';
import { CalendarEventsList } from '../components/events/CalendarEventsList';
import { CalendarEmptyState } from '../components/states/CalendarEmptyState';
import { CalendarDesktopView } from '../components/views/CalendarDesktopView';
import { TitleBarCalendarControls } from '../components/common/TitleBarCalendarControls';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarSearchIntegration } from '@shared/hooks/useTitleBarSearchIntegration';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useCalendarData } from '../hooks/useCalendarData';
import { useCalendarNavigation } from '../hooks/useCalendarNavigation';
import { useMobileCalendarState } from '../hooks/useMobileCalendarState';
import { useMobileCalendarData } from '../hooks/useMobileCalendarData';
import { useWeekDisplayMode } from '../hooks/useWeekDisplayMode';
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
  refreshTrigger?: number;
}

const MobileCalendarContent: React.FC<MobileCalendarContentProps> = ({
  onAddPress,
  onEventPress,
  searchQuery,
  refreshTrigger,
}) => {
  const { showError } = useNotification();

  // Mobile calendar state
  const {
    weekStartDate,
    selectedDate,
    viewMode,
    weekDays,
    isViewModeLoaded,
    handleDayPress,
    handlePrevWeek,
    handleNextWeek,
    handleMonthDateSelect,
    toggleViewMode,
    getEventsDateRange,
  } = useMobileCalendarState();

  // Get date range for data fetching (may be single day or whole week)
  const { startDate, endDate } = getEventsDateRange();

  // Calculate week end for fetching week events (for dot indicators)
  const weekEndDate = useMemo(
    () => endOfWeek(weekStartDate, { weekStartsOn: 1 }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStartDate.getTime()]
  );

  // Fetch events for the display range (selected day or week)
  const { events, isLoading, refreshing, loadEvents, handleRefresh } = useMobileCalendarData(
    startDate,
    endDate
  );

  // Fetch events for the whole week (for dot indicators on WeekDayStrip)
  const { events: weekEvents, loadEvents: loadWeekEvents } = useMobileCalendarData(weekStartDate, weekEndDate);

  // Load events when date range changes
  useEffect(() => {
    loadEvents().catch(() => showError('Не удалось загрузить события'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate.getTime(), endDate.getTime()]);

  // Load week events for dot indicators
  useEffect(() => {
    loadWeekEvents().catch(() => console.error('Failed to load week events for dots'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStartDate.getTime(), weekEndDate.getTime()]);

  // Reload events when refreshTrigger changes (after event creation)
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadEvents().catch(() => console.error('Failed to reload events after creation'));
      loadWeekEvents().catch(() => console.error('Failed to reload week events'));
      // InfiniteMonthCalendar handles its own refresh via refreshTrigger prop
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Reload events when screen gains focus (e.g., returning from event detail)
  useFocusEffect(
    useCallback(() => {
      // Load fresh data in background when screen is focused
      loadEvents().catch(() => console.error('Failed to reload events on focus'));
      loadWeekEvents().catch(() => console.error('Failed to reload week events on focus'));
    }, [loadEvents, loadWeekEvents])
  );

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

  // Show skeleton while viewMode is loading from AsyncStorage
  if (!isViewModeLoaded) {
    return (
      <>
        <CalendarHeader
          onAddPress={onAddPress}
          viewMode={viewMode}
          onViewModeToggle={toggleViewMode}
        />
        <CalendarSkeleton />
      </>
    );
  }

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
          events={weekEvents}
          onDayPress={handleDayPress}
          onSwipeLeft={handleNextWeek}
          onSwipeRight={handlePrevWeek}
        />
      )}

      {/* Content: Month calendar or Events list */}
      {viewMode === 'month' ? (
        <InfiniteMonthCalendar
          onDatePress={handleMonthDateSelect}
          refreshTrigger={refreshTrigger}
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
  const { theme, isDark } = useTheme();
  const { showError } = useNotification();
  const isWideScreen = useIsWideScreen();
  const navigation = useNavigation<CalendarNavigationProp>();
  const route = useRoute<CalendarRouteProp>();

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;
  const isDesktop = isWideScreen;

  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileRefreshTrigger, setMobileRefreshTrigger] = useState(0);

  // Week display mode (lifted from CalendarDesktopView for TitleBar integration)
  const { weekDisplayMode, setWeekDisplayMode } = useWeekDisplayMode();

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

  const handleAddEvent = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  const handleEventCreated = () => {
    setShowCreateModal(false);
    loadEvents();
    // Trigger refresh for mobile view
    setMobileRefreshTrigger(prev => prev + 1);
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
  const handleDesktopViewChange = useCallback((view: CalendarView) => {
    setSelectedView(view);
  }, [setSelectedView]);

  // Navigation handlers for TitleBar
  const handleMonthNavigate = useCallback((direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      handleDatePress(new Date());
    } else if (direction === 'prev') {
      handleDatePress(subMonths(selectedDate, 1));
    } else if (direction === 'next') {
      handleDatePress(addMonths(selectedDate, 1));
    }
  }, [selectedDate, handleDatePress]);

  // TitleBar controls for Electron desktop (unified compact component)
  const titleBarLeftControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarCalendarControls
        selectedDate={selectedDate}
        selectedView={selectedView}
        onViewChange={handleDesktopViewChange}
        onPrevious={() => handleMonthNavigate('prev')}
        onNext={() => handleMonthNavigate('next')}
        onToday={() => handleMonthNavigate('today')}
        onAddPress={handleAddEvent}
        weekDisplayMode={weekDisplayMode}
        onWeekDisplayModeChange={setWeekDisplayMode}
      />
    );
  }, [isElectron, isDesktop, selectedDate, selectedView, handleDesktopViewChange, handleMonthNavigate, handleAddEvent, weekDisplayMode, setWeekDisplayMode]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Календарь',
    leftControls: titleBarLeftControls,
    rightControls: null,
    enabled: isElectron && isDesktop,
  });

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
      {Platform.OS === 'ios' && <StatusBar style={isDark ? 'light' : 'dark'} />}
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
            weekDisplayMode={weekDisplayMode}
            onWeekDisplayModeChange={setWeekDisplayMode}
            hideToolbar={isElectron && isDesktop}
          />
        ) : (
          /* Mobile View - New Week Strip Layout */
          <MobileCalendarContent
            onAddPress={handleAddEvent}
            onEventPress={handleEventPress}
            searchQuery={searchQuery}
            refreshTrigger={mobileRefreshTrigger}
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
