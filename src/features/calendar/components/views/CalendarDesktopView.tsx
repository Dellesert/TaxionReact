import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, RefreshControl, TouchableOpacity, Animated } from 'react-native';
import { Event, CalendarView, WeekDisplayMode } from '../../types/calendar.types';
import { EventSection, getViewLabel } from '../../utils/calendarHelpers';
import { useTheme } from '@shared/hooks/useTheme';
import { useMonthEvents } from '../../hooks/useMonthEvents';
import { addMonths, subMonths } from 'date-fns';
import { MonthCalendarView } from './MonthCalendarView';
import { CalendarEventsList } from '../events/CalendarEventsList';
import { CalendarEmptyState } from '../states/CalendarEmptyState';
import { EventDetailsPanel } from '../panels/EventDetailsPanel';
import { EventListSkeleton } from '../states/EventListSkeleton';
import { LeftSidebarSkeleton } from '../states/LeftSidebarSkeleton';
import { CalendarStatsPanel } from '../panels/CalendarStatsPanel';
import { CompactCalendarToolbar } from '../navigation/CompactCalendarToolbar';
import { MonthNavigator } from '../navigation/MonthNavigator';
import { WeekTimelineView } from './WeekTimelineView';
import { UpcomingEventsCard } from '../panels/UpcomingEventsCard';
import { HolidayBanner } from '../common/HolidayBanner';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
import { useNavigation } from '@react-navigation/native';
import { useNotification } from '@shared/contexts/NotificationContext';


const FadeIn: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return <Animated.View style={[{ flex: 1, opacity }, style]}>{children}</Animated.View>;
};

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
  /** Week display mode passed from parent (for TitleBar integration) */
  weekDisplayMode?: WeekDisplayMode;
  /** Callback when week display mode changes */
  onWeekDisplayModeChange?: (mode: WeekDisplayMode) => void;
  /** Hide toolbar when controls are in TitleBar (Electron) */
  hideToolbar?: boolean;
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
  weekDisplayMode: externalWeekDisplayMode,
  onWeekDisplayModeChange,
  hideToolbar = false,
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const { showError } = useNotification();
  // Card background - white for light mode to stand out from gray background
  const cardBgColor = isDark ? theme.card : '#FFFFFF';
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<CalendarView>(initialView);
  // Use external weekDisplayMode if provided (from TitleBar), otherwise use internal state
  const [internalWeekDisplayMode, setInternalWeekDisplayMode] = useState<WeekDisplayMode>('timeline');
  const weekDisplayMode = externalWeekDisplayMode ?? internalWeekDisplayMode;
  const setWeekDisplayMode = onWeekDisplayModeChange ?? setInternalWeekDisplayMode;
  const [searchQuery, setSearchQuery] = useState('');

  // Sync viewMode with initialView when it changes externally (e.g., from TitleBar)
  React.useEffect(() => {
    setViewMode(initialView);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialView]);

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
    if (event.type === 'birthday') {
      setProfileUserId(event.created_by);
      setShowProfileModal(true);
      return;
    }
    // На десктопе открываем только панель справа, без навигации на полноэкранный детальный экран
    setSelectedEvent(event);
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
      {/* Compact Toolbar - Combines header, navigation, and week mode selector */}
      {/* Hidden when controls are moved to TitleBar (Electron) */}
      {!hideToolbar && (
        <CompactCalendarToolbar
          selectedDate={selectedDate}
          selectedView={viewMode}
          weekDisplayMode={weekDisplayMode}
          onViewChange={handleViewModeChange}
          onWeekModeChange={setWeekDisplayMode}
          onToday={() => handleMonthNavigate('today')}
          onPrevious={() => handleMonthNavigate('prev')}
          onNext={() => handleMonthNavigate('next')}
          onAddPress={onAddPress}
        />
      )}

      {/* Main Content Area - 3 Column Layout */}
      <View style={styles.contentContainer}>
        {/* Left Sidebar - Mini Calendar & Stats */}
        <View style={[styles.leftSidebar, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
          {/* Month Navigator Header - only when toolbar is hidden (Electron) */}
          {hideToolbar && (
            <View style={[styles.centerPanelHeader, { borderColor: theme.border }]}>
              <Text style={[styles.centerPanelTitle, { color: theme.text }]}>Обзор</Text>
              <MonthNavigator
                selectedDate={selectedDate}
                onPrevious={() => handleMonthNavigate('prev')}
                onNext={() => handleMonthNavigate('next')}
                onToday={() => handleMonthNavigate('today')}
                compact
              />
            </View>
          )}
          {isLoading ? (
            <LeftSidebarSkeleton />
          ) : (
            <FadeIn>
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.leftSidebarContent}
                style={{ backgroundColor: theme.background }}
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
            </FadeIn>
          )}
        </View>

        {/* Center Panel - Main Calendar View */}
        <View style={[styles.centerPanel, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
          <View style={[styles.centerPanelHeader, { borderColor: theme.border }]}>
            <Text style={[styles.centerPanelTitle, { color: theme.text }]}>
              {viewMode === 'week' && weekDisplayMode === 'timeline' ? 'Шкала времени' : 'Список событий'}
            </Text>
            <View style={[styles.viewSwitcher, { borderColor: theme.border }]}>
              {(['day', 'week', 'month'] as CalendarView[]).map((view, index) => (
                <React.Fragment key={view}>
                  {index > 0 && (
                    <View style={[styles.viewSwitcherDivider, { backgroundColor: theme.border }]} />
                  )}
                  <TouchableOpacity
                    style={[
                      styles.viewSwitcherSegment,
                      viewMode === view && [styles.viewSwitcherSegmentActive, { backgroundColor: theme.primary }],
                    ]}
                    onPress={() => handleViewModeChange(view)}
                  >
                    <Text
                      style={[
                        styles.viewSwitcherText,
                        { color: theme.textSecondary },
                        viewMode === view && { color: '#FFFFFF' },
                      ]}
                    >
                      {getViewLabel(view)}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              ))}
            </View>
          </View>
          <View style={{ flex: 1, backgroundColor: theme.background }}>
            {/* Holiday banner for day view */}
            {viewMode === 'day' && (() => {
              const holiday = getHoliday(selectedDate);
              return holiday ? <HolidayBanner holidayName={holiday.name} /> : null;
            })()}

            {isLoading ? (
              <EventListSkeleton />
            ) : (
              <FadeIn>
                {viewMode === 'week' ? (
                  weekDisplayMode === 'timeline' ? (
                    <WeekTimelineView
                      selectedDate={selectedDate}
                      events={events}
                      onEventPress={handleEventPress}
                    />
                  ) : (
                    sections.length === 0 ? (
                      <ScrollView
                        contentContainerStyle={styles.emptyStateContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                      >
                        <CalendarEmptyState />
                      </ScrollView>
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
                  <ScrollView
                    contentContainerStyle={styles.emptyStateContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                  >
                    <CalendarEmptyState />
                  </ScrollView>
                ) : (
                  <CalendarEventsList
                    sections={sections}
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    onEventPress={handleEventPress}
                  />
                )}
              </FadeIn>
            )}
          </View>
        </View>

        {/* Right Sidebar - Event Details (only when event selected) */}
        {selectedEvent && (
          <View
            style={[
              styles.rightSidebar,
              { backgroundColor: cardBgColor, borderColor: theme.border },
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

      {/* Birthday Profile Modal */}
      <UserProfileModal
        visible={showProfileModal}
        userId={profileUserId}
        onClose={() => {
          setShowProfileModal(false);
          setProfileUserId(null);
        }}
        onOpenChat={async (userId) => {
          try {
            const chat = await getOrCreateDirectChat(userId);
            setShowProfileModal(false);
            setProfileUserId(null);
            const rootNavigation = navigation.getParent();
            if (rootNavigation) {
              rootNavigation.navigate('Chats' as never, {
                screen: 'Chat',
                params: { chatId: chat.id },
              } as never);
            }
          } catch (error: any) {
            showError(error.message || 'Не удалось открыть чат');
          }
        }}
      />
    </View>
  );
};

const sidebarShadow = Platform.OS === 'web' ? {
  // @ts-ignore - web only
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
} : {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 3,
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
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
    marginLeft: 16,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  leftSidebarContent: {
    padding: 16,
  },
  centerPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
    marginLeft: 16,
    marginRight: 16,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  centerPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  centerPanelTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  viewSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 3,
  },
  viewSwitcherDivider: {
    width: 1,
    height: 18,
  },
  viewSwitcherSegment: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitcherSegmentActive: {
    // backgroundColor set dynamically
  },
  viewSwitcherText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rightSidebar: {
    width: 380,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
    marginBottom: 16,
    marginRight: 16,
    overflow: 'hidden',
    ...sidebarShadow,
  },
  emptyStateContainer: {
    flexGrow: 1,
  },
});
