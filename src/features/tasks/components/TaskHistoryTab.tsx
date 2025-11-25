import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskActivity, Task } from '../types/task.types';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import {
  getActivityIcon,
  getActivityIconColor,
  getActivityDescription,
} from '@shared/utils/activityHelpers';
import { format } from 'date-fns';

interface TaskHistoryTabProps {
  activities: TaskActivity[];
  isLoading: boolean;
  task: Task | null;
  currentUserId?: number;
  onUserPress: (userId: number) => void;
}

export const TaskHistoryTab: React.FC<TaskHistoryTabProps> = ({
  activities,
  isLoading,
  task,
  currentUserId,
  onUserPress,
}) => {
  const { theme, isDark } = useTheme();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Загрузка истории...
        </Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>
          История пока пуста
        </Text>
      </View>
    );
  }

  // Group activities by date
  const groupedActivities: { [key: string]: TaskActivity[] } = {};
  activities.forEach((activity) => {
    const dateKey = format(new Date(activity.created_at), 'dd.MM.yyyy');
    if (!groupedActivities[dateKey]) {
      groupedActivities[dateKey] = [];
    }
    groupedActivities[dateKey].push(activity);
  });

  return (
    <View style={styles.container}>
      {Object.entries(groupedActivities).map(([date, dateActivities]) => (
        <View key={date}>
          {/* Date Separator */}
          <View
            style={[
              styles.dateSeparator,
              {
                backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                borderLeftColor: theme.primary,
              },
            ]}
          >
            <Text style={[styles.dateSeparatorText, { color: theme.text }]}>{date}</Text>
          </View>

          {/* Activities for this date */}
          {dateActivities.map((activity) => (
            <View
              key={activity.id}
              style={[
                styles.activityItem,
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.activityAvatarContainer}>
                <Avatar
                  userId={activity.user?.id}
                  name={activity.user?.name || 'Система'}
                  imageUrl={activity.user?.avatar}
                  size={36}
                  onPress={() => activity.user && onUserPress(activity.user.id)}
                />
                <View
                  style={[
                    styles.activityIconBadge,
                    {
                      backgroundColor: theme.background,
                      borderColor: theme.backgroundSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name={getActivityIcon(activity)}
                    size={12}
                    color={getActivityIconColor(activity)}
                  />
                </View>
              </View>
              <View style={styles.activityContent}>
                <View style={{ flex: 1 }}>
                  {getActivityDescription(activity, task, currentUserId, theme)}
                </View>
              </View>
              <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
                {format(new Date(activity.created_at), 'HH:mm')}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  dateSeparator: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 12,
    marginTop: 8,
    borderLeftWidth: 3,
  },
  dateSeparatorText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1,
    alignItems: 'flex-start',
  },
  activityAvatarContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    marginTop: 2,
  },
  activityIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  activityContent: {
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 36,
  },
  activityTime: {
    fontSize: 11,
    fontWeight: '600',
    paddingTop: 4,
    minWidth: 40,
    textAlign: 'right',
  },
});
