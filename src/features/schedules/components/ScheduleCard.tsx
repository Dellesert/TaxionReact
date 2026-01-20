import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import { getScheduleTypeColor } from '../utils/shiftColors';
import { SCHEDULE_TYPE_LABELS, type Schedule } from '../types/schedule.types';

interface ScheduleCardProps {
  schedule: Schedule;
  onPress?: () => void;
}

export const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onPress,
}) => {
  const { theme } = useTheme();
  const typeColor = schedule.color || getScheduleTypeColor(schedule.type);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.colorIndicator, { backgroundColor: typeColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {schedule.title}
          </Text>
          {!schedule.is_active && (
            <View
              style={[styles.inactiveBadge, { backgroundColor: theme.warning }]}
            >
              <Text style={styles.inactiveBadgeText}>Неактивен</Text>
            </View>
          )}
        </View>

        <Text style={[styles.type, { color: theme.textSecondary }]}>
          {SCHEDULE_TYPE_LABELS[schedule.type]}
        </Text>

        <View style={styles.dateRow}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={theme.textSecondary}
          />
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatScheduleDate(schedule.start_date, 'dd.MM.yyyy')} —{' '}
            {formatScheduleDate(schedule.end_date, 'dd.MM.yyyy')}
          </Text>
        </View>

        {schedule.entries_count !== undefined && (
          <View style={styles.entriesRow}>
            <Ionicons name="people-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.entriesText, { color: theme.textTertiary }]}>
              {schedule.entries_count} записей
            </Text>
          </View>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  colorIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    minHeight: 60,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  inactiveBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inactiveBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  type: {
    fontSize: 13,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  dateText: {
    fontSize: 12,
  },
  entriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entriesText: {
    fontSize: 12,
  },
});
