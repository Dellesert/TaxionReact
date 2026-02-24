import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { StatusBar, setStatusBarStyle } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSharedValue, withTiming } from 'react-native-reanimated';

import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useTitleBarControlsIntegration } from '@shared/hooks/useTitleBarControlsIntegration';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useSchedules } from '../hooks/useSchedules';
import { useDailySummary } from '../hooks/useDailySummary';
import { useSchedulePermissions } from '../hooks/useSchedulePermissions';
import { ScheduleCard } from '../components/ScheduleCard';
import { ScheduleListHeader } from '../components/ScheduleListHeader';
import CreateScheduleModal from '../components/CreateScheduleModal';
import { MonthPicker } from '../components/MonthPicker';
import { ScheduleTabs } from '../components/ScheduleTabs';
import { DayStrip } from '../components/DayStrip';
import { DailySummaryView } from '../components/DailySummaryView';
import { TitleBarScheduleControls } from '../components/TitleBarScheduleControls';
import { ScheduleSidebarSkeleton } from '../components/states/ScheduleSidebarSkeleton';
import { ScheduleListContentSkeleton } from '../components/states/ScheduleListContentSkeleton';
import { SCHEDULE_TYPE_LABELS, SCHEDULE_MODE_LABELS, type Schedule, type ScheduleType, type ScheduleListTab } from '../types/schedule.types';
import { getScheduleTypeColor } from '../utils/shiftColors';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import type { ScheduleStackParamList } from '../navigation/types';

const ContentPane: React.FC<{ children: React.ReactNode; style?: any }> = ({ children, style }) => {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

// Helper to format date as YYYY-MM-DD
const formatDateForApi = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get first and last day of a month
const getMonthRange = (date: Date): { start: string; end: string } => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    start: formatDateForApi(firstDay),
    end: formatDateForApi(lastDay),
  };
};

// Order of schedule types for display
const SCHEDULE_TYPE_ORDER: ScheduleType[] = ['paid_services', 'on_duty', 'vk', 'trips', 'work'];

type NavigationProp = NativeStackNavigationProp<ScheduleStackParamList>;

interface ScheduleSection {
  title: string;
  data: Schedule[];
}

export const ScheduleListScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { canCreate } = useSchedulePermissions();
  const isDesktop = useIsWideScreen();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';

  // Reset status bar style when screen gains focus (fixes white status bar after visiting Profile)
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(isDark ? 'light' : 'dark');
    }, [isDark])
  );

  // Get initial month range for filters
  const initialMonthRange = getMonthRange(new Date());

  const { schedules, isLoading, error, hasMore, refresh, loadMore, updateFilters } =
    useSchedules({ start_date: initialMonthRange.start, end_date: initialMonthRange.end });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  // Check if running in Electron
  const isElectron = Platform.OS === 'web' && typeof window !== 'undefined' && window.electron;

  // Daily summary (mobile only)
  const [activeTab, setActiveTab] = useState<ScheduleListTab>('summary');
  const [tabContainerWidth, setTabContainerWidth] = useState(0);
  const currentTabIndex = useSharedValue(0);

  const {
    selectedDate: summaryDate,
    summary,
    isLoading: isSummaryLoading,
    error: summaryError,
    changeDate: changeSummaryDate,
    refresh: refreshSummary,
  } = useDailySummary({ enabled: true });

  // Tab change handler (mobile only)
  const handleTabChange = useCallback((tab: ScheduleListTab) => {
    setActiveTab(tab);
    currentTabIndex.value = withTiming(tab === 'summary' ? 0 : 1, { duration: 250 });
  }, [currentTabIndex]);

  const handleTabLayout = useCallback((event: any) => {
    setTabContainerWidth(event.nativeEvent.layout.width);
  }, []);

  // Handler for creating schedule (defined early for TitleBar integration)
  const handleCreateSchedule = useCallback(() => {
    setShowCreateModal(true);
  }, []);

  // Handle month change - update filters and reload (defined early for TitleBar integration)
  const handleMonthChange = useCallback((date: Date) => {
    setSelectedMonth(date);
    const { start, end } = getMonthRange(date);
    updateFilters({ start_date: start, end_date: end });
  }, [updateFilters]);


  // TitleBar left controls - no longer used (month picker moved to content area)
  const titleBarLeftControls = useMemo(() => {
    return null;
  }, []);

  // TitleBar right controls - create button only
  const titleBarRightControls = useMemo(() => {
    if (!isElectron || !isDesktop) return null;
    return (
      <TitleBarScheduleControls
        canCreate={canCreate}
        onNewSchedule={handleCreateSchedule}
        showCreateOnly
      />
    );
  }, [isElectron, isDesktop, canCreate, handleCreateSchedule]);

  // Integrate controls with TitleBar in Electron
  useTitleBarControlsIntegration({
    pageTitle: 'Графики',
    leftControls: titleBarLeftControls,
    rightControls: titleBarRightControls,
    enabled: isElectron && isDesktop,
  });

  // Filter schedules by search query
  const filteredSchedules = useMemo(() => {
    if (!searchQuery.trim()) return schedules;
    const query = searchQuery.toLowerCase();
    return schedules.filter(schedule =>
      schedule.title.toLowerCase().includes(query) ||
      SCHEDULE_TYPE_LABELS[schedule.type].toLowerCase().includes(query)
    );
  }, [schedules, searchQuery]);

  // Group schedules by mode first (monthly before recurring), then by type
  const sections = useMemo((): ScheduleSection[] => {
    const sorted = [...filteredSchedules].sort((a, b) => {
      // Monthly first, recurring second
      if (a.mode !== b.mode) {
        return a.mode === 'monthly' ? -1 : 1;
      }
      // Within same mode, sort by type order
      return SCHEDULE_TYPE_ORDER.indexOf(a.type) - SCHEDULE_TYPE_ORDER.indexOf(b.type);
    });

    // Group sorted schedules into sections by type, preserving mode-based order
    const sectionList: ScheduleSection[] = [];
    let currentKey = '';

    for (const schedule of sorted) {
      const key = `${schedule.mode}_${schedule.type}`;
      if (key !== currentKey) {
        currentKey = key;
        sectionList.push({
          title: SCHEDULE_TYPE_LABELS[schedule.type],
          data: [schedule],
        });
      } else {
        sectionList[sectionList.length - 1].data.push(schedule);
      }
    }

    return sectionList;
  }, [filteredSchedules]);

  // Flat sorted list for desktop table view
  const sortedSchedules = useMemo(() => {
    return [...filteredSchedules].sort((a, b) => {
      if (a.mode !== b.mode) return a.mode === 'monthly' ? -1 : 1;
      return SCHEDULE_TYPE_ORDER.indexOf(a.type) - SCHEDULE_TYPE_ORDER.indexOf(b.type);
    });
  }, [filteredSchedules]);

  // Handle manual pull-to-refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  }, [refresh]);

  const handleSchedulePress = useCallback(
    (schedule: Schedule) => {
      navigation.navigate('ScheduleDetail', { scheduleId: schedule.id });
    },
    [navigation]
  );

  const handleCreateSuccess = useCallback(
    (scheduleId: number) => {
      refresh();
      navigation.navigate('ScheduleDetail', { scheduleId });
    },
    [refresh, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Schedule }) => (
      <View style={isDesktop ? styles.cardWrapper : undefined}>
        <ScheduleCard
          schedule={item}
          onPress={() => handleSchedulePress(item)}
        />
      </View>
    ),
    [handleSchedulePress, isDesktop]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ScheduleSection }) => (
      <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
          {section.data.length}
        </Text>
      </View>
    ),
    [theme]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }, [hasMore, theme.primary]);

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="calendar-outline"
          size={48}
          color={theme.textSecondary}
        />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Нет графиков за этот месяц
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
          {canCreate ? 'Выберите другой месяц или создайте новый график' : 'Выберите другой месяц'}
        </Text>
      </View>
    );
  }, [isLoading, theme, canCreate]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: (isElectron && isDesktop) ? theme.background : (isDesktop ? theme.card : theme.background) }]} edges={['left', 'right']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header - hide on Electron desktop since controls are in TitleBar */}
      {!(isElectron && isDesktop) && (
        isDesktop ? (
          <ScheduleListHeader
            canCreate={canCreate}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSearchClear={() => setSearchQuery('')}
            onCreatePress={handleCreateSchedule}
            isDesktop={isDesktop}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
        ) : (
          <ScreenHeader
            title="Графики работы"
            customContent={
              <>
                <View style={styles.headerRow}>
                  <View style={styles.headerLeft}>
                    {navigation.canGoBack() && (
                      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={[styles.title, { color: theme.text }]}>Графики работы</Text>

                  <View style={styles.headerRight}>
                    {canCreate && (
                      <TouchableOpacity
                        onPress={handleCreateSchedule}
                        style={styles.iconButton}
                      >
                        <Ionicons name="add" size={30} color={theme.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <ScheduleTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabContainerWidth={tabContainerWidth}
                  currentTabIndex={currentTabIndex}
                  onLayout={handleTabLayout}
                />
              </>
            }
          />
        )
      )}

      {/* Error message (show on desktop or on list tab) */}
      {error && (isDesktop || activeTab === 'list') && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '20' }]}>
          <Ionicons name="alert-circle" size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {/* Content */}
      <View style={[styles.contentContainer, { backgroundColor: theme.background }]}>
        {isElectron && isDesktop ? (
          // Desktop layout - columns + daily summary sidebar
          <View style={styles.desktopRow}>
            {/* Left Sidebar - Daily Summary */}
            <View style={[styles.summarySidebar, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
              {isSummaryLoading && !summary ? (
                <ScheduleSidebarSkeleton />
              ) : (
                <ContentPane>
                  <DayStrip
                    selectedDate={summaryDate}
                    onDateChange={changeSummaryDate}
                  />
                  <View style={{ flex: 1, backgroundColor: theme.background }}>
                    <DailySummaryView
                      summary={summary}
                      isLoading={isSummaryLoading}
                      error={summaryError}
                      onRefresh={refreshSummary}
                    />
                  </View>
                </ContentPane>
              )}
            </View>

            {/* Main Panel - Schedule table */}
            <View style={[styles.listCard, { backgroundColor: cardBgColor, borderColor: theme.border }]}>
              {/* Card Header */}
              <View style={[styles.listCardHeader, { borderColor: theme.border }]}>
                <View style={styles.listCardHeaderLeft}>
                  <TouchableOpacity
                    onPress={() => {
                      const d = new Date(selectedMonth);
                      d.setMonth(d.getMonth() - 1);
                      handleMonthChange(d);
                    }}
                    style={styles.listHeaderArrow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMonthChange(new Date())}
                    activeOpacity={
                      selectedMonth.getMonth() === new Date().getMonth() &&
                      selectedMonth.getFullYear() === new Date().getFullYear() ? 1 : 0.6
                    }
                    disabled={
                      selectedMonth.getMonth() === new Date().getMonth() &&
                      selectedMonth.getFullYear() === new Date().getFullYear()
                    }
                  >
                    <Text style={[styles.listHeaderMonthText, { color: theme.text }]}>
                      {['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'][selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      const d = new Date(selectedMonth);
                      d.setMonth(d.getMonth() + 1);
                      handleMonthChange(d);
                    }}
                    style={styles.listHeaderArrow}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
              {/* Table Header */}
              <View style={[styles.tableHeaderRow, { borderColor: theme.border }]}>
                <Text style={[styles.tableHeaderCell, styles.tableCellName, { color: theme.textSecondary }]}>Название</Text>
                <Text style={[styles.tableHeaderCell, styles.tableCellType, { color: theme.textSecondary }]}>Тип</Text>
                <Text style={[styles.tableHeaderCell, styles.tableCellPeriod, { color: theme.textSecondary }]}>Период</Text>
                <Text style={[styles.tableHeaderCell, styles.tableCellMode, { color: theme.textSecondary }]}>Режим</Text>
                <Text style={[styles.tableHeaderCell, styles.tableCellStatus, { color: theme.textSecondary }]}>Статус</Text>
              </View>
              {/* Table Body */}
              {isLoading ? (
                <ScheduleListContentSkeleton />
              ) : (
                <ContentPane>
                  <ScrollView
                    style={{ backgroundColor: theme.background }}
                    contentContainerStyle={styles.tableScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {sortedSchedules.length === 0 ? (
                      <View style={styles.emptyContainerDesktop}>
                        {renderEmpty()}
                      </View>
                    ) : (
                      sortedSchedules.map((schedule) => {
                        const typeColor = schedule.color || getScheduleTypeColor(schedule.type);
                        const isDraft = schedule.status === 'draft';
                        return (
                          <TouchableOpacity
                            key={schedule.id}
                            style={[
                              styles.tableRow,
                              { borderColor: theme.border, backgroundColor: cardBgColor },
                              hoveredRowId === schedule.id && { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' },
                              !schedule.is_active && { opacity: 0.45 },
                            ]}
                            onPress={() => handleSchedulePress(schedule)}
                            activeOpacity={0.7}
                            // @ts-ignore - web only
                            onMouseEnter={Platform.OS === 'web' ? () => setHoveredRowId(schedule.id) : undefined}
                            // @ts-ignore - web only
                            onMouseLeave={Platform.OS === 'web' ? () => setHoveredRowId(null) : undefined}
                          >
                            {/* Name */}
                            <View style={[styles.tableCell, styles.tableCellName]}>
                              <Text style={[styles.tableCellText, { color: theme.text, fontWeight: '500' }]} numberOfLines={1}>
                                {schedule.title}
                              </Text>
                            </View>

                            {/* Type */}
                            <View style={[styles.tableCell, styles.tableCellType]}>
                              <View style={[styles.tableTypeDot, { backgroundColor: typeColor }]} />
                              <Text style={[styles.tableCellText, { color: theme.text }]} numberOfLines={1}>
                                {SCHEDULE_TYPE_LABELS[schedule.type]}
                              </Text>
                            </View>

                            {/* Period */}
                            <View style={[styles.tableCell, styles.tableCellPeriod]}>
                              <Text style={[styles.tableCellText, { color: theme.text }]}>
                                {formatScheduleDate(schedule.start_date, 'dd MMM')} — {formatScheduleDate(schedule.end_date, 'dd MMM yyyy')}
                              </Text>
                            </View>

                            {/* Mode */}
                            <View style={[styles.tableCell, styles.tableCellMode]}>
                              <Text style={[styles.tableCellText, { color: theme.textSecondary }]}>
                                {SCHEDULE_MODE_LABELS[schedule.mode]}
                              </Text>
                            </View>

                            {/* Status */}
                            <View style={[styles.tableCell, styles.tableCellStatus]}>
                              <View style={[styles.tableStatusDot, { backgroundColor: isDraft ? '#F59E0B' : '#10B981' }]} />
                              <Text style={[styles.tableCellText, { color: isDraft ? '#F59E0B' : '#10B981' }]}>
                                {isDraft ? 'Черновик' : 'Опубликован'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>
                </ContentPane>
              )}
            </View>
          </View>
        ) : activeTab === 'summary' ? (
          // Mobile daily summary tab
          <>
            <DayStrip
              selectedDate={summaryDate}
              onDateChange={changeSummaryDate}
            />
            <DailySummaryView
              summary={summary}
              isLoading={isSummaryLoading}
              error={summaryError}
              onRefresh={refreshSummary}
            />
          </>
        ) : (
          // Mobile schedule list tab
          <>
            <MonthPicker
              selectedDate={selectedMonth}
              onMonthChange={handleMonthChange}
            />
            <SectionList
              sections={sections}
              renderItem={renderItem}
              renderSectionHeader={renderSectionHeader}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContent}
              stickySectionHeadersEnabled={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  tintColor={theme.primary}
                />
              }
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={renderEmpty}
            />
          </>
        )}
      </View>

      {/* Create Modal */}
      <CreateScheduleModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onScheduleCreated={handleCreateSuccess}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    width: 100,
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  iconButton: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  listContentDesktop: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  cardWrapper: {
    maxWidth: 500,
  },
  // Desktop row layout (schedule columns + summary sidebar)
  desktopRow: {
    flex: 1,
    flexDirection: 'row',
  },
  // Desktop list card layout (matches absence list style)
  listCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    margin: 16,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  listCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  listCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  listHeaderArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
    } : {}),
  },
  listHeaderMonthText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 4,
  },
  summarySidebar: {
    width: 380,
    borderRadius: 16,
    borderWidth: 1,
    margin: 16,
    marginRight: 0,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }),
  },
  // Desktop flat table layout (matches absence list)
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  tableScrollContent: {
    flexGrow: 1,
  },
  emptyContainerDesktop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    minWidth: '100%',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transitionProperty: 'background-color',
      transitionDuration: '0.2s',
    } : {}),
  },
  tableCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 12,
  },
  tableCellText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  tableCellName: {
    flex: 2.5,
  },
  tableCellType: {
    flex: 1.3,
  },
  tableCellPeriod: {
    flex: 1.8,
  },
  tableCellMode: {
    flex: 1,
  },
  tableCellStatus: {
    flex: 1,
  },
  tableTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tableStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  sectionCount: {
    fontSize: 14,
    marginLeft: 8,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  emptySubtext: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 250,
    marginBottom: 16,
  },
  importEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  importEmptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
