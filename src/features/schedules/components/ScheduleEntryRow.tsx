import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { ShiftTypeBadge } from './ShiftTypeBadge';
import { formatScheduleDate } from '../utils/scheduleHelpers';
import type { ScheduleEntry } from '../types/schedule.types';

interface ScheduleEntryRowProps {
  entry: ScheduleEntry;
  showDate?: boolean;
  showUser?: boolean;
  onPress?: () => void;
  onUserPress?: (userId: number) => void;
}

export const ScheduleEntryRow: React.FC<ScheduleEntryRowProps> = ({
  entry,
  showDate = false,
  showUser = false,
  onPress,
  onUserPress,
}) => {
  const { theme } = useTheme();

  const handleUserPress = () => {
    if (onUserPress && entry.user?.id) {
      onUserPress(entry.user.id);
    }
  };

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
      <View style={styles.mainContent}>
        {/* Left side: avatar + user info */}
        <View style={styles.leftSection}>
          {showUser && entry.user && (
            <TouchableOpacity
              style={styles.userSection}
              onPress={handleUserPress}
              activeOpacity={onUserPress ? 0.7 : 1}
              disabled={!onUserPress}
            >
              <Avatar
                name={entry.user.name}
                imageUrl={entry.user.avatar}
                size={36}
              />
              <Text style={[styles.userName, { color: theme.text }]}>
                {entry.user.name}
              </Text>
            </TouchableOpacity>
          )}

          {showDate && (
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>
              {formatScheduleDate(entry.date, 'dd MMM')}
            </Text>
          )}

          {entry.title && (
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {entry.title}
            </Text>
          )}

          {entry.location && (
            <View style={styles.locationContainer}>
              <Ionicons
                name="location-outline"
                size={14}
                color={theme.textSecondary}
              />
              <Text
                style={[styles.locationText, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {entry.location}
              </Text>
            </View>
          )}
        </View>

        {/* Right side: shift badge */}
        <View style={styles.rightSection}>
          <ShiftTypeBadge shiftType={entry.shift_type} size="small" />
          {entry.is_confirmed && (
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={theme.success}
              style={styles.confirmedIcon}
            />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  mainContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 13,
    marginTop: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
  },
  confirmedIcon: {
    marginTop: 2,
  },
});
