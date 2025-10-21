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
  const getPriorityBgColor = () => {
    switch (task.priority) {
      case 'critical':
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
      case 'critical':
        return 'Критический';
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
      case 'new':
        return '#F59E0B'; // Янтарный/оранжевый цвет для "Новая"
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
      case 'new':
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

  const dynamicStyles = StyleSheet.create({
    container: {
      // Убрали backgroundColor и borderColor так как задача теперь внутри секции
    },
    title: {
      color: theme.text,
    },
    titleHighlight: {
      backgroundColor: theme.backgroundTertiary,
      borderLeftColor: getStatusColor(),
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
    tagText: {
      color: theme.textTertiary,
    },
    moreTagsText: {
      color: theme.textTertiary,
    },
  });

  return (
    <TouchableOpacity
      style={[styles.container, dynamicStyles.container]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      {/* Header - заголовок и приоритет */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {/* Заголовок с подсветкой */}
          <View style={[styles.titleHighlight, dynamicStyles.titleHighlight]}>
            <Text style={[styles.title, dynamicStyles.title]} numberOfLines={2}>
              {task.title}
            </Text>
          </View>
          {task.description && (
            <Text style={[styles.description, dynamicStyles.description]} numberOfLines={2}>
              {task.description}
            </Text>
          )}
        </View>

        {task.priority && task.priority !== 'low' && (
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityBgColor() }]}>
            <Ionicons name="flag" size={14} color="#FFFFFF" />
          </View>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Footer - информация */}
      <View style={styles.footer}>
        {/* Дата */}
        {task.due_date && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color={isOverdue ? theme.error : theme.textSecondary}
              />
              <Text
                style={[styles.infoText, dynamicStyles.dateText, isOverdue && styles.overdueText]}
              >
                {formatDate(task.due_date)}
              </Text>
            </View>
          </View>
        )}

        {/* Люди */}
        <View style={styles.infoSection}>
          {task.creator && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.infoText, dynamicStyles.assigneeText]} numberOfLines={1}>
                {task.creator.name}
              </Text>
            </View>
          )}

          {task.last_status_changer && task.last_status_changer.id !== task.creator?.id && (
            <View style={styles.infoRow}>
              <Ionicons name="swap-horizontal-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.infoText, dynamicStyles.assigneeText]} numberOfLines={1}>
                {task.last_status_changer.name}
              </Text>
            </View>
          )}
        </View>

        {/* Теги */}
        {task.tags && task.tags.length > 0 && (
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.infoText, dynamicStyles.tagText]} numberOfLines={1}>
                {task.tags[0]}
              </Text>
              {task.tags.length > 1 && (
                <Text style={[styles.moreTagsText, dynamicStyles.moreTagsText]}>+{task.tags.length - 1}</Text>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: 16,
    paddingLeft: 20,
    paddingRight: 20,
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
  titleHighlight: {
    paddingLeft: 12,
    paddingRight: 8,
    paddingVertical: 8,
    borderLeftWidth: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  priorityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
    opacity: 0.3,
  },
  footer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 13,
    maxWidth: 120,
  },
  overdueText: {
    color: '#EF4444',
    fontWeight: '600',
  },
  moreTagsText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default TaskItem;
