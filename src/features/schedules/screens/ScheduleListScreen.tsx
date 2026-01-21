import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@shared/hooks/useTheme';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useSchedules } from '../hooks/useSchedules';
import { ScheduleCard } from '../components/ScheduleCard';
import CreateScheduleModal from '../components/CreateScheduleModal';
import { MonthPicker } from '../components/MonthPicker';
import { SCHEDULE_TYPE_LABELS, type Schedule, type ScheduleType } from '../types/schedule.types';
import type { ScheduleStackParamList } from '../navigation/types';

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
const SCHEDULE_TYPE_ORDER: ScheduleType[] = ['work', 'paid_services', 'on_duty', 'shift', 'custom'];

type NavigationProp = NativeStackNavigationProp<ScheduleStackParamList>;

interface ScheduleSection {
  title: string;
  data: Schedule[];
}

export const ScheduleListScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  // Get initial month range for filters
  const initialMonthRange = getMonthRange(new Date());

  const { schedules, isLoading, error, hasMore, refresh, loadMore, updateFilters } =
    useSchedules({ start_date: initialMonthRange.start, end_date: initialMonthRange.end });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

  // Group schedules by type
  const sections = useMemo((): ScheduleSection[] => {
    const grouped = new Map<ScheduleType, Schedule[]>();

    // Initialize groups
    for (const type of SCHEDULE_TYPE_ORDER) {
      grouped.set(type, []);
    }

    // Group schedules
    for (const schedule of schedules) {
      const typeSchedules = grouped.get(schedule.type);
      if (typeSchedules) {
        typeSchedules.push(schedule);
      }
    }

    // Convert to sections, filtering out empty groups
    return SCHEDULE_TYPE_ORDER
      .filter(type => (grouped.get(type)?.length ?? 0) > 0)
      .map(type => ({
        title: SCHEDULE_TYPE_LABELS[type],
        data: grouped.get(type) ?? [],
      }));
  }, [schedules]);

  // Handle month change - update filters and reload
  const handleMonthChange = useCallback((date: Date) => {
    setSelectedMonth(date);
    const { start, end } = getMonthRange(date);
    updateFilters({ start_date: start, end_date: end });
  }, [updateFilters]);

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
      <ScheduleCard
        schedule={item}
        onPress={() => handleSchedulePress(item)}
      />
    ),
    [handleSchedulePress]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: ScheduleSection }) => (
      <View style={[styles.sectionHeader, { backgroundColor: theme.card }]}>
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
          Выберите другой месяц или создайте новый график
        </Text>

        <TouchableOpacity
          style={[styles.importEmptyButton, { borderColor: theme.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
          <Text style={[styles.importEmptyButtonText, { color: theme.primary }]}>
            Создать график
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [isLoading, theme]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.card }]} edges={['left', 'right']}>
      {/* Header */}
      <ScreenHeader
        title="Графики работы"
        customContent={
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
              {/* Add button */}
              <TouchableOpacity
                onPress={() => setShowCreateModal(true)}
                style={styles.iconButton}
              >
                <Ionicons name="add" size={30} color={theme.primary} />
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      {/* Month Picker */}
      <MonthPicker
        selectedDate={selectedMonth}
        onMonthChange={handleMonthChange}
      />

      {/* Error message */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '20' }]}>
          <Ionicons name="alert-circle" size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {/* List */}
      <SectionList
        sections={sections}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={theme.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
      />

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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
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
  },
  emptySubtext: {
    fontSize: 13,
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
