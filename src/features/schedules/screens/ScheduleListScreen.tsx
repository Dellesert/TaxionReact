import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '@shared/hooks/useTheme';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { useSchedules } from '../hooks/useSchedules';
import { useScheduleStore } from '../store/scheduleStore';
import { ScheduleCard } from '../components/ScheduleCard';
import { ImportScheduleModal } from '../components/ImportScheduleModal';
import { MonthPicker } from '../components/MonthPicker';
import type { Schedule } from '../types/schedule.types';
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

type NavigationProp = NativeStackNavigationProp<ScheduleStackParamList>;

export const ScheduleListScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();
  // Get initial month range for filters
  const initialMonthRange = getMonthRange(new Date());

  const { schedules, isLoading, error, hasMore, refresh, loadMore, updateFilters } =
    useSchedules({ start_date: initialMonthRange.start, end_date: initialMonthRange.end });
  const deleteSchedule = useScheduleStore((state) => state.deleteSchedule);

  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());

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

  const handleEditSchedule = useCallback(
    (schedule: Schedule) => {
      navigation.navigate('ScheduleDetail', { scheduleId: schedule.id });
    },
    [navigation]
  );

  const handleDeleteSchedule = useCallback(
    (schedule: Schedule) => {
      showConfirm(
        'Удалить график?',
        `Вы уверены, что хотите удалить "${schedule.title}"? Это действие нельзя отменить.`,
        async () => {
          try {
            await deleteSchedule(schedule.id);
            showSuccess('График удалён');
          } catch (err) {
            showError('Не удалось удалить график');
          }
        },
        undefined,
        { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
      );
    },
    [deleteSchedule, showConfirm, showSuccess, showError]
  );

  const handleImportSuccess = useCallback(
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
        onEdit={() => handleEditSchedule(item)}
        onDelete={() => handleDeleteSchedule(item)}
      />
    ),
    [handleSchedulePress, handleEditSchedule, handleDeleteSchedule]
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
          onPress={() => setShowImportModal(true)}
        >
          <Ionicons name="document-text" size={20} color={theme.primary} />
          <Text style={[styles.importEmptyButtonText, { color: theme.primary }]}>
            Импорт из Word
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
              {/* Import from Word button */}
              <TouchableOpacity
                onPress={() => setShowImportModal(true)}
                style={styles.iconButton}
              >
                <Ionicons name="document-text-outline" size={24} color={theme.primary} />
              </TouchableOpacity>

              {/* Add button */}
              <TouchableOpacity
                onPress={() => {
                  // TODO: Navigate to create schedule
                }}
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
      <FlatList
        data={schedules}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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

      {/* Import Modal */}
      <ImportScheduleModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleImportSuccess}
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
