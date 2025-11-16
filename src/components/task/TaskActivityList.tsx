/**
 * Task Activity List Component
 * Отображает историю действий с задачей
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { TaskActivity, TaskActivityAction } from '@/types/task.types';
import { getTaskActivities } from '@/api/task.api';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskActivityListProps {
  taskId: number;
}

// Activity action labels in Russian
const ACTION_LABELS: Record<TaskActivityAction, string> = {
  task_created: 'создал(а) задачу',
  task_updated_title: 'изменил(а) название',
  task_updated_description: 'изменил(а) описание',
  task_updated_priority: 'изменил(а) приоритет',
  task_updated_due_date: 'изменил(а) дедлайн',
  task_status_changed: 'изменил(а) статус',
  task_assigned: 'назначил(а) задачу',
  task_delegated: 'делегировал(а) задачу',
  task_viewed: 'просмотрел(а) задачу',
  comment_added: 'добавил(а) комментарий',
  attachment_added: 'добавил(а) файл',
  attachment_deleted: 'удалил(а) файл',
  checklist_added: 'добавил(а) чеклист',
  checklist_item_completed: 'отметил(а) пункт чеклиста',
  checklist_item_uncompleted: 'снял(а) отметку с пункта',
  subtask_created: 'создал(а) подзадачу',
  progress_updated: 'обновил(а) прогресс',
  task_deleted: 'удалил(а) задачу',
};

// Activity icon colors
const ACTION_COLORS: Partial<Record<TaskActivityAction, string>> = {
  task_created: '#10b981',
  task_status_changed: '#3b82f6',
  task_assigned: '#8b5cf6',
  task_delegated: '#f59e0b',
  comment_added: '#06b6d4',
  attachment_added: '#ec4899',
  attachment_deleted: '#ef4444',
  subtask_created: '#10b981',
  task_deleted: '#ef4444',
  task_updated_title: '#8b5cf6',        
  task_updated_description: '#8b5cf6',
  task_updated_priority: '#f59e0b',     
  task_updated_due_date: '#06b6d4', 
  task_viewed: '#94a3b8', 
  checklist_added: '#10b981',
  checklist_item_completed: '#10b981',
  checklist_item_uncompleted: '#94a3b8',
  progress_updated: '#3b82f6',
};

export const TaskActivityList: React.FC<TaskActivityListProps> = ({ taskId }) => {
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivities = async () => {
    try {
      const response = await getTaskActivities(taskId, 50, 0);
      setActivities(response.activities || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadActivities();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadActivities();
  };

  const renderActivityItem = ({ item }: { item: TaskActivity }) => {
    // Normalize action type in case backend sends different format
    let normalizedActionType = item.action_type;
    const actionTypeStr = item.action_type as string;

    // Handle potential backend variations
    if (actionTypeStr === 'updated_title' || actionTypeStr === 'title_updated') {
      normalizedActionType = 'task_updated_title';
    } else if (actionTypeStr === 'updated_description' || actionTypeStr === 'description_updated') {
      normalizedActionType = 'task_updated_description';
    } else if (actionTypeStr === 'updated_priority' || actionTypeStr === 'priority_updated') {
      normalizedActionType = 'task_updated_priority';
    } else if (actionTypeStr === 'updated_due_date' || actionTypeStr === 'due_date_updated') {
      normalizedActionType = 'task_updated_due_date';
    }

    const actionLabel = ACTION_LABELS[normalizedActionType] || item.action_type;
    const iconColor = ACTION_COLORS[normalizedActionType] || '#6b7280';
    const timeAgo = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: ru,
    });

    return (
      <View style={styles.activityItem}>
        <View style={[styles.activityDot, { backgroundColor: iconColor }]} />
        <View style={styles.activityContent}>
          <Text style={styles.activityText}>
            <Text style={styles.userName}>{item.user?.name || 'Пользователь'}</Text>
            {' '}
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Text>
          {item.new_value && item.action_type !== 'task_viewed' && (
            <Text style={styles.valueText}>{item.new_value}</Text>
          )}
          <Text style={styles.timeText}>{timeAgo}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>История действий пуста</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={activities}
      renderItem={renderActivityItem}
      keyExtractor={(item) => item.id.toString()}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  activityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 15,
    lineHeight: 20,
    color: '#1f2937',
    marginBottom: 4,
  },
  userName: {
    fontWeight: '600',
    color: '#111827',
  },
  actionText: {
    color: '#6b7280',
  },
  valueText: {
    fontSize: 14,
    color: '#4b5563',
    marginTop: 4,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
});
