import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@types/task.types';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onPress }) => {
  const getPriorityBgColor = () => {
    switch (task.priority) {
      case 'urgent':
        return '#EF4444';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#EAB308';
      case 'low':
        return '#10B981';
      default:
        return '#9CA3AF';
    }
  };

  const getPriorityText = () => {
    switch (task.priority) {
      case 'urgent':
        return 'Срочно';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (task.status) {
      case 'done':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'review':
        return '#8B5CF6';
      case 'todo':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'done':
        return 'Готово';
      case 'in_progress':
        return 'В работе';
      case 'review':
        return 'На проверке';
      case 'todo':
        return 'Новая';
      case 'cancelled':
        return 'Отменена';
      default:
        return task.status;
    }
  };

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done';

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === -1) return 'Вчера';
    if (diffDays > 1 && diffDays <= 7) return `Через ${diffDays} дн.`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} дн. назад`;

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={2}>
            {task.title}
          </Text>
          {task.description && (
            <Text style={styles.description} numberOfLines={2}>
              {task.description}
            </Text>
          )}
        </View>

        <View style={[styles.priorityBadge, { backgroundColor: getPriorityBgColor() }]}>
          <Text style={styles.priorityText}>{getPriorityText()}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.statusRow}>
          <Ionicons
            name="checkbox-outline"
            size={16}
            color={getStatusColor()}
          />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>

        {task.due_date && (
          <View style={styles.dateRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={isOverdue ? '#EF4444' : '#6B7280'}
            />
            <Text
              style={[styles.dateText, isOverdue && styles.overdueText]}
            >
              {formatDate(task.due_date)}
            </Text>
          </View>
        )}

        {task.assignee && (
          <View style={styles.assigneeRow}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <Text style={styles.assigneeText} numberOfLines={1}>
              {task.assignee.full_name}
            </Text>
          </View>
        )}

        {task.tags && task.tags.length > 0 && (
          <View style={styles.tagsRow}>
            <Ionicons name="pricetag-outline" size={14} color="#9CA3AF" />
            <Text style={styles.tagText} numberOfLines={1}>
              {task.tags[0]}
            </Text>
            {task.tags.length > 1 && (
              <Text style={styles.moreTagsText}>+{task.tags.length - 1}</Text>
            )}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 20,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '500',
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  assigneeText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
    maxWidth: 100,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
    maxWidth: 80,
  },
  moreTagsText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
});

export default TaskItem;
