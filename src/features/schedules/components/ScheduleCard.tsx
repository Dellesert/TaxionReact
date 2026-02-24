import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import { getScheduleTypeColor } from '../utils/shiftColors';
import type { Schedule } from '../types/schedule.types';

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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundSecondary,
          borderColor: theme.border,
        },
        isHovered && styles.containerHovered,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      // @ts-ignore
      onMouseEnter={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
      onMouseLeave={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
    >
      <View style={[styles.colorIndicator, { backgroundColor: typeColor }]} />

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {schedule.title}
          </Text>
          {schedule.status === 'draft' && (
            <View
              style={[styles.draftBadge, { backgroundColor: theme.primary + '20' }]}
            >
              <Ionicons name="document-text-outline" size={12} color={theme.primary} />
              <Text style={[styles.draftBadgeText, { color: theme.primary }]}>Черновик</Text>
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
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transitionProperty: 'box-shadow, transform',
        transitionDuration: '0.2s',
        cursor: 'pointer',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  containerHovered: {
    transform: [{ translateY: -2 }],
    ...Platform.select({
      web: {
        // @ts-ignore
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      },
      default: {
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
    }),
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
    lineHeight: 22,
    flex: 1,
  },
  draftBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  draftBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
  },
  inactiveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inactiveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
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
    lineHeight: 16,
  },
  entriesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entriesText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
