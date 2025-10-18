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
import { Task, TaskComment } from '../../types/task.types';
import * as taskApi from '@api/task.api';
import { Loading } from '@components/common/Loading';
import { Avatar } from '@components/common/Avatar';
import { useTheme } from '@hooks/useTheme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type TaskDetailRouteParams = {
  taskId: string;
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;
  const { theme } = useTheme();

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

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      paddingTop: 60,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginLeft: 12,
      flex: 1,
      color: theme.text,
    },
    scrollView: {
      flex: 1,
    },
    card: {
      backgroundColor: theme.card,
      padding: 16,
      marginBottom: 12,
    },
    taskTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    taskDescription: {
      fontSize: 16,
      color: theme.textSecondary,
      marginBottom: 16,
      lineHeight: 24,
    },
    priorityBadge: {
      backgroundColor: theme.backgroundTertiary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textSecondary,
      marginBottom: 12,
    },
    statusButtonInactive: {
      backgroundColor: theme.backgroundTertiary,
    },
    statusButtonText: {
      fontSize: 14,
      color: theme.text,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      marginLeft: 8,
      marginRight: 8,
    },
    infoValue: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '500',
      marginLeft: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.text,
    },
    commentInput: {
      flex: 1,
      backgroundColor: theme.input,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 16,
      marginRight: 8,
      minHeight: 40,
      maxHeight: 100,
      color: theme.text,
    },
    commentItem: {
      flexDirection: 'row',
      marginBottom: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderLight,
    },
    commentAuthor: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    commentDate: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    commentText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    emptyComments: {
      fontSize: 14,
      color: theme.textTertiary,
      textAlign: 'center',
      paddingVertical: 16,
    },
  });

  return (
    <View style={dynamicStyles.container}>
      {/* Header */}
      <View style={dynamicStyles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={dynamicStyles.headerTitle}>Детали задачи</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={24} color={theme.info} />
        </TouchableOpacity>
      </View>

      <ScrollView style={dynamicStyles.scrollView}>
        {/* Task Info */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.taskTitle}>{task.title}</Text>

          {task.description && (
            <Text style={dynamicStyles.taskDescription}>{task.description}</Text>
          )}

          <View style={styles.badgeContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
              <Text style={styles.statusBadgeText}>{getStatusText(task.status)}</Text>
            </View>

            <View style={dynamicStyles.priorityBadge}>
              <Text style={[styles.priorityBadgeText, { color: getPriorityColor(task.priority) }]}>
                {getPriorityText(task.priority)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>Изменить статус</Text>
          <View style={styles.statusButtonContainer}>
            {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => handleStatusChange(status as Task['status'])}
                style={[
                  styles.statusButton,
                  task.status === status
                    ? { backgroundColor: getStatusColor(status) }
                    : dynamicStyles.statusButtonInactive,
                ]}
              >
                <Text
                  style={[
                    dynamicStyles.statusButtonText,
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
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>Информация</Text>

          {task.assignee && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.infoLabel}>Исполнитель:</Text>
              <Avatar source={task.assignee.avatar} name={task.assignee.full_name || 'User'} size={24} />
              <Text style={dynamicStyles.infoValue}>{task.assignee.full_name}</Text>
            </View>
          )}

          {task.project && (
            <View style={styles.infoRow}>
              <Ionicons name="folder-outline" size={20} color={theme.textSecondary} />
              <Text style={dynamicStyles.infoLabel}>Проект:</Text>
              <Text style={dynamicStyles.infoValue}>{task.project.name}</Text>
            </View>
          )}

          {task.due_date && (
            <View style={styles.infoRow}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isOverdue ? theme.error : theme.textSecondary}
              />
              <Text style={dynamicStyles.infoLabel}>Срок:</Text>
              <Text style={[dynamicStyles.infoValue, isOverdue && styles.overdueText]}>
                {format(new Date(task.due_date), 'dd MMMM yyyy, HH:mm', { locale: ru })}
                {isOverdue && ' (просрочено)'}
              </Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
            <Text style={dynamicStyles.infoLabel}>Создано:</Text>
            <Text style={dynamicStyles.infoText}>
              {format(new Date(task.created_at), 'dd MMMM yyyy, HH:mm', { locale: ru })}
            </Text>
          </View>
        </View>

        {/* Comments */}
        <View style={dynamicStyles.card}>
          <Text style={dynamicStyles.sectionTitle}>Комментарии ({comments.length})</Text>

          {/* Add Comment */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={dynamicStyles.commentInput}
              placeholder="Добавить комментарий..."
              value={newComment}
              onChangeText={setNewComment}
              multiline
              placeholderTextColor={theme.inputPlaceholder}
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
            <View key={comment.id} style={dynamicStyles.commentItem}>
              <Avatar
                source={comment.author.avatar}
                name={comment.author.full_name || 'User'}
                size={32}
              />
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={dynamicStyles.commentAuthor}>{comment.author.full_name}</Text>
                  <Text style={dynamicStyles.commentDate}>
                    {format(new Date(comment.created_at), 'dd.MM.yyyy HH:mm')}
                  </Text>
                </View>
                <Text style={dynamicStyles.commentText}>{comment.content}</Text>
              </View>
            </View>
          ))}

          {comments.length === 0 && (
            <Text style={dynamicStyles.emptyComments}>Комментариев пока нет</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
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
  priorityBadgeText: {
    fontSize: 14,
    fontWeight: '500',
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
  statusButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  overdueText: {
    color: '#DC2626',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
});

export default TaskDetailScreen;
