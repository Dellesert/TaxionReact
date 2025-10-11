import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '@types/task.types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@components/common/Avatar';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onPress }) => {
  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
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
      case 'completed':
        return 'text-green-600';
      case 'in_progress':
        return 'text-blue-600';
      case 'pending':
        return 'text-gray-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'В работе';
      case 'pending':
        return 'Ожидает';
      case 'cancelled':
        return 'Отменена';
      default:
        return task.status;
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <TouchableOpacity
      className="bg-white p-4 mb-3 rounded-lg border border-gray-200"
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={2}>
            {task.title}
          </Text>
          {task.description && (
            <Text className="text-sm text-gray-600 mt-1" numberOfLines={2}>
              {task.description}
            </Text>
          )}
        </View>

        <View className={`px-2 py-1 rounded ml-2 ${getPriorityColor()}`}>
          <Text className="text-xs text-white font-medium">{getPriorityText()}</Text>
        </View>
      </View>

      <View className="flex-row items-center flex-wrap mt-2">
        <View className="flex-row items-center mr-4 mb-2">
          <Ionicons name="checkbox-outline" size={16} color="#6B7280" />
          <Text className={`text-sm ml-1 ${getStatusColor()}`}>{getStatusText()}</Text>
        </View>

        {task.due_date && (
          <View className="flex-row items-center mr-4 mb-2">
            <Ionicons
              name="calendar-outline"
              size={16}
              color={isOverdue ? '#EF4444' : '#6B7280'}
            />
            <Text className={`text-sm ml-1 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
              {formatDistanceToNow(new Date(task.due_date), {
                addSuffix: true,
                locale: ru,
              })}
            </Text>
          </View>
        )}

        {task.assignee && (
          <View className="flex-row items-center mb-2">
            <Avatar
              source={task.assignee.avatar}
              name={task.assignee.full_name || 'User'}
              size={20}
            />
            <Text className="text-sm text-gray-600 ml-1" numberOfLines={1}>
              {task.assignee.full_name}
            </Text>
          </View>
        )}
      </View>

      {task.project && (
        <View className="flex-row items-center mt-2 pt-2 border-t border-gray-100">
          <Ionicons name="folder-outline" size={14} color="#6B7280" />
          <Text className="text-xs text-gray-500 ml-1">{task.project.name}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
