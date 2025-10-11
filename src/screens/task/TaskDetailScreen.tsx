import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskComment } from '@types/task.types';
import { taskApi } from '@api/task.api';
import { Loading } from '@components/common/Loading';
import { Avatar } from '@components/common/Avatar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type TaskDetailRouteParams = {
  taskId: string;
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);

  useEffect(() => {
    loadTask();
    loadComments();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const response = await taskApi.getTaskById(taskId);
      setTask(response);
    } catch (error) {
      console.error('Failed to load task:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить задачу');
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await taskApi.getTaskComments(taskId);
      setComments(response.data);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;

    try {
      await taskApi.updateTask(taskId, { status: newStatus });
      setTask({ ...task, status: newStatus });
      Alert.alert('Успех', 'Статус задачи обновлён');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить статус');
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || isSendingComment) return;

    try {
      setIsSendingComment(true);
      const response = await taskApi.createTaskComment(taskId, { content: newComment });
      setComments([response, ...comments]);
      setNewComment('');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить комментарий');
    } finally {
      setIsSendingComment(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'in_progress':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading || !task) {
    return <Loading text="Загрузка задачи..." fullScreen />;
  }

  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'completed';

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold ml-3 flex-1">Детали задачи</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Task Info */}
        <View className="bg-white p-4 mb-3">
          <Text className="text-2xl font-bold text-gray-900 mb-3">{task.title}</Text>

          {task.description && (
            <Text className="text-base text-gray-700 mb-4">{task.description}</Text>
          )}

          <View className="flex-row items-center flex-wrap">
            <View className={`px-3 py-1.5 rounded-full mr-2 mb-2 ${getStatusColor(task.status)}`}>
              <Text className="text-white text-sm font-medium">
                {task.status === 'completed'
                  ? 'Завершена'
                  : task.status === 'in_progress'
                  ? 'В работе'
                  : task.status === 'pending'
                  ? 'Ожидает'
                  : 'Отменена'}
              </Text>
            </View>

            <View className="bg-gray-100 px-3 py-1.5 rounded-full mb-2">
              <Text className={`text-sm font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority === 'urgent'
                  ? 'Срочно'
                  : task.priority === 'high'
                  ? 'Высокий'
                  : task.priority === 'medium'
                  ? 'Средний'
                  : 'Низкий'}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="bg-white p-4 mb-3">
          <Text className="text-sm font-semibold text-gray-700 mb-3">Изменить статус</Text>
          <View className="flex-row flex-wrap">
            {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(status as Task['status'])}
                className={`px-4 py-2 rounded-lg mr-2 mb-2 ${
                  task.status === status ? getStatusColor(status) : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm ${
                    task.status === status ? 'text-white font-semibold' : 'text-gray-700'
                  }`}
                >
                  {status === 'pending'
                    ? 'Ожидает'
                    : status === 'in_progress'
                    ? 'В работе'
                    : status === 'completed'
                    ? 'Завершена'
                    : 'Отменена'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Details */}
        <View className="bg-white p-4 mb-3">
          <Text className="text-sm font-semibold text-gray-700 mb-3">Информация</Text>

          {task.assignee && (
            <View className="flex-row items-center mb-3">
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2 mr-2">Исполнитель:</Text>
              <Avatar source={task.assignee.avatar} name={task.assignee.full_name || 'User'} size={24} />
              <Text className="text-sm text-gray-900 ml-2 font-medium">
                {task.assignee.full_name}
              </Text>
            </View>
          )}

          {task.project && (
            <View className="flex-row items-center mb-3">
              <Ionicons name="folder-outline" size={20} color="#6B7280" />
              <Text className="text-sm text-gray-600 ml-2 mr-2">Проект:</Text>
              <Text className="text-sm text-gray-900 font-medium">{task.project.name}</Text>
            </View>
          )}

          {task.due_date && (
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isOverdue ? '#EF4444' : '#6B7280'}
              />
              <Text className="text-sm text-gray-600 ml-2 mr-2">Срок:</Text>
              <Text
                className={`text-sm font-medium ${
                  isOverdue ? 'text-red-600' : 'text-gray-900'
                }`}
              >
                {format(new Date(task.due_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                {isOverdue && ' (просрочено)'}
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text className="text-sm text-gray-600 ml-2 mr-2">Создано:</Text>
            <Text className="text-sm text-gray-900">
              {format(new Date(task.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            </Text>
          </View>
        </View>

        {/* Comments */}
        <View className="bg-white p-4">
          <Text className="text-sm font-semibold text-gray-700 mb-3">
            Комментарии ({comments.length})
          </Text>

          {/* Add Comment */}
          <View className="flex-row items-center mb-4">
            <TextInput
              className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-base mr-2"
              placeholder="Добавить комментарий..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!newComment.trim() || isSendingComment}
              className={`w-10 h-10 rounded-full items-center justify-center ${
                newComment.trim() ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.map((comment) => (
            <View key={comment.id} className="flex-row mb-3 pb-3 border-b border-gray-100">
              <Avatar
                source={comment.author.avatar}
                name={comment.author.full_name || 'User'}
                size={32}
              />
              <View className="flex-1 ml-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-semibold text-gray-900">
                    {comment.author.full_name}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm')}
                  </Text>
                </View>
                <Text className="text-sm text-gray-700">{comment.content}</Text>
              </View>
            </View>
          ))}

          {comments.length === 0 && (
            <Text className="text-sm text-gray-500 text-center py-4">
              Комментариев пока нет
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default TaskDetailScreen;
