/**
 * TaskMessageCard
 * Компонент для отображения задачи в чате
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { MessageTaskData } from '../types/chat.types';

interface TaskMessageCardProps {
  taskData: MessageTaskData;
  onPress?: () => void;
}

const TaskMessageCard: React.FC<TaskMessageCardProps> = ({ taskData, onPress }) => {
  const { theme, isDark } = useTheme();

  // Определяем цвет приоритета
  const getPriorityColor = () => {
    switch (taskData.task_priority) {
      case 'critical':
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#CA8A04';
      case 'low':
        return '#16A34A';
      default:
        return theme.textSecondary;
    }
  };

  // Определяем текст приоритета
  const getPriorityText = () => {
    switch (taskData.task_priority) {
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

  // Определяем цвет статуса
  const getStatusColor = () => {
    switch (taskData.task_status) {
      case 'done':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'review':
        return '#8B5CF6';
      case 'new':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  // Определяем текст статуса
  const getStatusText = () => {
    switch (taskData.task_status) {
      case 'done':
        return 'Завершена';
      case 'in_progress':
        return 'В работе';
      case 'review':
        return 'На проверке';
      case 'new':
        return 'Новая';
      default:
        return 'Неизвестно';
    }
  };

  // Форматируем дату дедлайна
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMs < 0) return 'Просрочено';
    if (diffDays > 7) return `До ${date.toLocaleDateString('ru-RU')}`;
    if (diffDays > 0) return `Осталось ${diffDays} ${diffDays === 1 ? 'день' : 'дня'}`;
    if (diffHours > 0) return `Осталось ${diffHours} ${diffHours === 1 ? 'час' : 'часов'}`;
    return 'Сегодня';
  };

  const dueDateText = formatDueDate(taskData.due_date);
  const isOverdue = taskData.due_date && new Date(taskData.due_date) < new Date();

  // Создаем динамические стили на основе темы
  // Используем цвета из темы для лучшей совместимости с iOS
  const containerBackgroundColor = isDark ? theme.backgroundSecondary : '#EFF6FF';

  const dynamicStyles = StyleSheet.create({
    container: {
      backgroundColor: containerBackgroundColor,
      borderLeftWidth: 4,
      borderLeftColor: getPriorityColor(),
      borderRadius: 12,
      padding: 12,
      marginVertical: 2,
      maxWidth: '100%',
      minWidth: 280,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.25)' : theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      flexShrink: 0,
    },
    headerText: {
      flex: 1,
      minWidth: 0,
    },
    taskBadge: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 4,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
      lineHeight: 20,
      flexWrap: 'wrap',
    },
    description: {
      fontSize: 13,
      color: theme.textSecondary,
      marginBottom: 12,
      lineHeight: 18,
      marginLeft: 46,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      gap: 8,
    },
    footerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 10,
      flex: 1,
    },
    footerItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    footerText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
  });

  return (
    <View style={dynamicStyles.container}>
      <View style={dynamicStyles.header}>
        <View style={dynamicStyles.iconContainer}>
          <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
        </View>
        <View style={dynamicStyles.headerText}>
          <Text style={dynamicStyles.taskBadge}>Задача</Text>
          <Text style={dynamicStyles.title} numberOfLines={2}>
            {taskData.task_title}
          </Text>
        </View>
      </View>

      {taskData.task_description && (
        <Text style={dynamicStyles.description} numberOfLines={3}>
          {taskData.task_description}
        </Text>
      )}

      <View style={dynamicStyles.footer}>
        <View style={dynamicStyles.footerLeft}>
          {/* Статус */}
          <View style={dynamicStyles.statusBadge}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getStatusColor() }} />
            <Text style={[dynamicStyles.statusText, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>

          {/* Приоритет */}
          <View style={dynamicStyles.footerItem}>
            <Ionicons name="flag" size={12} color={getPriorityColor()} />
            <Text style={[dynamicStyles.footerText, { color: getPriorityColor() }]}>
              {getPriorityText()}
            </Text>
          </View>

          {/* Дедлайн */}
          {dueDateText && (
            <View style={dynamicStyles.footerItem}>
              <Ionicons name="calendar" size={12} color={isOverdue ? '#DC2626' : theme.textSecondary} />
              <Text style={[dynamicStyles.footerText, isOverdue && { color: '#DC2626' }]}>
                {dueDateText}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default TaskMessageCard;
