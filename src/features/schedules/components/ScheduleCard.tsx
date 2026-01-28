import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import { getScheduleTypeColor } from '../utils/shiftColors';
import type { Schedule } from '../types/schedule.types';
import { SCHEDULE_MODE_LABELS } from '../types/schedule.types';

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
          shadowColor: theme.shadow,
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
          {schedule.mode && (
            <View
              style={[
                styles.modeBadge,
                {
                  backgroundColor:
                    schedule.mode === 'recurring'
                      ? theme.primary + '20'
                      : theme.warning + '20',
                },
              ]}
            >
              <Ionicons
                name={schedule.mode === 'recurring' ? 'sync' : 'calendar'}
                size={10}
                color={schedule.mode === 'recurring' ? theme.primary : theme.warning}
              />
              <Text
                style={[
                  styles.modeBadgeText,
                  {
                    color:
                      schedule.mode === 'recurring' ? theme.primary : theme.warning,
                  },
                ]}
              >
                {SCHEDULE_MODE_LABELS[schedule.mode]}
              </Text>
            </View>
          )}
          {!schedule.is_active && (
            <View
              style={[styles.inactiveBadge, { backgroundColor: theme.warning }]}
            >
              <Text style={styles.inactiveBadgeText}>Неактивен</Text>
            </View>
          )}
        </View>

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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
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
