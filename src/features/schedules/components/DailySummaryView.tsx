import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import {
  AbsenceTypeIcon,
  ABSENCE_TYPE_LABELS,
  type AbsenceType,
} from '@features/absences';
import { ShiftTypeBadge } from './ShiftTypeBadge';
import { formatTimeRange } from '../utils/scheduleHelpers';
import { SCHEDULE_TYPE_LABELS } from '../types/schedule.types';
import type {
  DailySummary,
  DailySummarySchedule,
  DailySummaryUser,
  DailySummaryAbsence,
} from '../types/schedule.types';

interface DailySummaryViewProps {
  summary: DailySummary | null;
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const UserRow: React.FC<{
  entry: DailySummaryUser;
}> = ({ entry }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.userRow, { borderBottomColor: theme.border }]}>
      <Avatar
        name={entry.user.name}
        imageUrl={entry.user.avatar}
        size={32}
      />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
          {entry.user.name}
        </Text>
        <View style={styles.userMeta}>
          <ShiftTypeBadge shiftType={entry.shift_type} size="small" />
          {entry.start_time && entry.end_time && (
            <Text style={[styles.timeText, { color: theme.textSecondary }]}>
              {formatTimeRange(entry.start_time, entry.end_time)}
            </Text>
          )}
        </View>
        {entry.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={theme.textTertiary} />
            <Text style={[styles.locationText, { color: theme.textTertiary }]} numberOfLines={1}>
              {entry.location}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const ScheduleSection: React.FC<{
  schedule: DailySummarySchedule;
}> = ({ schedule }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.scheduleCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      <View style={[styles.colorIndicator, { backgroundColor: schedule.color }]} />
      <View style={styles.scheduleContent}>
        <View style={styles.scheduleHeader}>
          <Text style={[styles.scheduleTitle, { color: theme.text }]} numberOfLines={1}>
            {schedule.schedule_title}
          </Text>
          <Text style={[styles.scheduleType, { color: theme.textSecondary }]}>
            {SCHEDULE_TYPE_LABELS[schedule.schedule_type] || schedule.schedule_type}
          </Text>
        </View>
        {schedule.users.length > 0 ? (
          <View style={styles.usersList}>
            {schedule.users.map((user, index) => (
              <UserRow key={`${user.user_id}-${index}`} entry={user} />
            ))}
          </View>
        ) : (
          <Text style={[styles.noUsersText, { color: theme.textTertiary }]}>
            Нет назначений
          </Text>
        )}
      </View>
    </View>
  );
};

const AbsenceRow: React.FC<{
  absence: DailySummaryAbsence;
}> = ({ absence }) => {
  const { theme } = useTheme();
  const typeLabel = ABSENCE_TYPE_LABELS[absence.type as AbsenceType] || absence.type;

  return (
    <View style={[styles.absenceRow, { borderBottomColor: theme.border }]}>
      <AbsenceTypeIcon type={absence.type as AbsenceType} size="small" />
      <View style={styles.absenceInfo}>
        <Text style={[styles.absenceName, { color: theme.text }]} numberOfLines={1}>
          {absence.user.name}
        </Text>
        <Text style={[styles.absenceType, { color: theme.textSecondary }]}>
          {typeLabel}
          {absence.reason ? ` — ${absence.reason}` : ''}
        </Text>
      </View>
    </View>
  );
};

export const DailySummaryView: React.FC<DailySummaryViewProps> = ({
  summary,
  isLoading,
  error,
  onRefresh,
}) => {
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsRefreshing(false);
    }
  }, [isLoading]);

  const handleManualRefresh = useCallback(() => {
    setIsRefreshing(true);
    onRefresh();
  }, [onRefresh]);

  if (isLoading && !summary) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const hasSchedules = summary && summary.schedules.length > 0;
  const hasAbsences = summary && summary.absences.length > 0;
  const isEmpty = !hasSchedules && !hasAbsences;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleManualRefresh}
          tintColor={theme.primary}
        />
      }
    >
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.error + '20' }]}>
          <Ionicons name="alert-circle" size={20} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}

      {isEmpty && !error && (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            Нет данных за этот день
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            Выберите другую дату для просмотра сводки
          </Text>
        </View>
      )}

      {hasSchedules && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Графики
          </Text>
          {summary!.schedules.map((schedule) => (
            <ScheduleSection key={schedule.schedule_id} schedule={schedule} />
          ))}
        </View>
      )}

      {hasAbsences && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Отсутствующие
          </Text>
          <View style={[styles.absencesCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
            {summary!.absences.map((absence) => (
              <AbsenceRow key={absence.user_id} absence={absence} />
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
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
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  scheduleCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  colorIndicator: {
    width: 4,
  },
  scheduleContent: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  scheduleType: {
    fontSize: 12,
  },
  usersList: {
    gap: 0,
  },
  noUsersText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    flex: 1,
  },
  absencesCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  absenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  absenceInfo: {
    flex: 1,
    gap: 2,
  },
  absenceName: {
    fontSize: 14,
    fontWeight: '500',
  },
  absenceType: {
    fontSize: 12,
  },
});
