import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../types/task.types';
import { useTheme } from '@hooks/useTheme';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onPress }) => {
  const { theme } = useTheme();

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#F97316';
      case 'medium':
        return '#EAB308';
      case 'low':
        return '#10B981';
      default:
        return theme.border;
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

  const dynamicStyles = StyleSheet.create({
    container: {
      borderLeftColor: getPriorityColor(),
    },
    title: {
      color: theme.text,
    },
    description: {
      color: theme.textSecondary,
    },
    dateText: {
      color: theme.textSecondary,
    },
    assigneeText: {
      color: theme.textSecondary,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      {/* Content */}
      <View style={styles.content}>
        {/* Title */}
        <Text style={[styles.title, dynamicStyles.title]} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Description */}
        {task.description && (
          <Text style={[styles.description, dynamicStyles.description]} numberOfLines={2}>
            {task.description}
          </Text>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          {/* Date */}
          {task.due_date && (
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={isOverdue ? theme.error : theme.textTertiary}
              />
              <Text
                style={[
                  styles.metaText,
                  dynamicStyles.dateText,
                  isOverdue && { color: theme.error, fontWeight: '600' },
                ]}
              >
                {formatDate(task.due_date)}
              </Text>
            </View>
          )}

          {/* Comments count */}
          {typeof task.comment_count !== 'undefined' && (
            <View style={styles.metaItem}>
              <Ionicons name="chatbubble-outline" size={14} color={theme.textTertiary} />
              {task.comment_count > 0 && (
                <Text style={[styles.metaText, dynamicStyles.dateText]}>
                  {task.comment_count}
                </Text>
              )}
            </View>
          )}

          {/* Creator */}
          {task.creator && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.metaText, dynamicStyles.assigneeText]} numberOfLines={1}>
                {task.creator.name}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderLeftWidth: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
});

export default TaskItem;
