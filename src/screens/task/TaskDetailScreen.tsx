import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskComment } from '@types/task.types';
import * as taskApi from '@api/task.api';
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
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTask(taskIdNum);
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
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskComments(taskIdNum);
      setComments(response);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;

    try {
      const taskIdNum = Number(taskId);
      await taskApi.updateTask(taskIdNum, { status: newStatus });
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
      const taskIdNum = Number(taskId);
      const response = await taskApi.addTaskComment(taskIdNum, { content: newComment });
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
        return '#DC2626';
      case 'high':
        return '#EA580C';
      case 'medium':
        return '#CA8A04';
      case 'low':
        return '#16A34A';
      default:
        return '#6B7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'in_progress':
        return '#3B82F6';
      case 'pending':
        return '#6B7280';
      case 'cancelled':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Завершена';
      case 'in_progress':
        return 'В работе';
      case 'pending':
        return 'Ожидает';
      case 'cancelled':
        return 'Отменена';
      default:
        return 'Неизвестно';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'Срочно';
      case 'high':
        return 'Высокий';
      case 'medium':
        return 'Средний';
      case 'low':
        return 'Низкий';
      default:
        return 'Неизвестно';
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Детали задачи</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Task Info */}
        <View style={styles.card}>
          <Text style={styles.taskTitle}>{task.title}</Text>

          {task.description && (
            <Text style={styles.taskDescription}>{task.description}</Text>
          )}

          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusText(task.status)}</Text>
            </View>

            <View style={styles.priorityBadge}>
              <Text style={[styles.priorityBadgeText, { color: getPriorityColor(task.priority) }]}>
                {getPriorityText(task.priority)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Изменить статус</Text>
          <View style={styles.statusButtonContainer}>
            {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(status as Task['status'])}
                style={[
                  styles.statusButton,
                  task.status === status
                    ? { backgroundColor: getStatusColor(status) }
                    : styles.statusButtonInactive,
                ]}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    task.status === status && styles.statusButtonTextActive,
                  ]}
                >
                  {getStatusText(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Информация</Text>

          {task.assignee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Исполнитель:</Text>
              <Avatar source={task.assignee.avatar} name={task.assignee.full_name || 'User'} size={24} />
              <Text style={styles.infoValue}>{task.assignee.full_name}</Text>
            </View>
          )}

          {task.project && (
            <View style={styles.infoRow}>
              <Ionicons name="folder-outline" size={20} color="#6B7280" />
              <Text style={styles.infoLabel}>Проект:</Text>
              <Text style={styles.infoValue}>{task.project.name}</Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isOverdue ? '#EF4444' : '#6B7280'}
              />
              <Text style={styles.infoLabel}>Срок:</Text>
              <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
                {format(new Date(task.due_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                {isOverdue && ' (просрочено)'}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Создано:</Text>
            <Text style={styles.infoText}>
              {format(new Date(task.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            </Text>
          </View>
        </View>

        {/* Comments */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Комментарии ({comments.length})</Text>

          {/* Add Comment */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              placeholder="Добавить комментарий..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              placeholderTextColor="#9CA3AF"
            />
            <TouchableOpacity
              onPress={handleSendComment}
              disabled={!newComment.trim() || isSendingComment}
              style={[
                styles.sendButton,
                newComment.trim() ? styles.sendButtonActive : styles.sendButtonInactive,
              ]}
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentItem}>
              <Avatar
                source={comment.author.avatar}
                name={comment.author.full_name || 'User'}
                size={32}
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={styles.commentAuthor}>{comment.author.full_name}</Text>
                  <Text style={styles.commentDate}>
                    {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm')}
                  </Text>
                </View>
                <Text style={styles.commentText}>{comment.content}</Text>
              </View>
            </View>
          ))}

          {comments.length === 0 && (
            <Text style={styles.emptyComments}>Комментариев пока нет</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
    flex: 1,
    color: '#111827',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  taskDescription: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    lineHeight: 24,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  priorityBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  priorityBadgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  statusButtonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  statusButtonInactive: {
    backgroundColor: '#F3F4F6',
  },
  statusButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#111827',
  },
  overdueText: {
    color: '#DC2626',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginRight: 8,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#3B82F6',
  },
  sendButtonInactive: {
    backgroundColor: '#D1D5DB',
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  commentContent: {
    flex: 1,
    marginLeft: 12,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  commentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  commentText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  emptyComments: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
});

export default TaskDetailScreen;
