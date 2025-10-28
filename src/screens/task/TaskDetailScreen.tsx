import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskComment, TaskActivity } from '../../types/task.types';
import * as taskApi from '@api/task.api';
import { Loading } from '@components/common/Loading';
import { Avatar } from '@components/common/Avatar';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ShareTaskModal from '@components/task/ShareTaskModal';
import EditTaskModal from '@components/task/EditTaskModal';
import { CreateSubtaskModal } from '@components/task/CreateSubtaskModal';
import { TaskSubtasksList } from '@components/task/TaskSubtasksList';

type TaskDetailRouteParams = {
  taskId: string;
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);

  // Activities state
  const [activities, setActivities] = useState<TaskActivity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Subtasks state
  const [subtasks, setSubtasks] = useState<Task[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Subtask modal state
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  useEffect(() => {
    loadTask();
    loadComments();
  }, [taskId]);

  // Load activities when history tab is opened
  useEffect(() => {
    if (activeTab === 'history' && activities.length === 0) {
      loadActivities();
    }
  }, [activeTab]);

  // Reload subtasks when screen gains focus (e.g., coming back from subtask detail)
  useFocusEffect(
    useCallback(() => {
      if (task && task.subtask_count && task.subtask_count > 0) {
        loadSubtasks(Number(taskId));
      }
    }, [task, taskId])
  );

  const loadTask = async () => {
    try {
      setIsLoading(true);
      setAccessDenied(false);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTask(taskIdNum);
      setTask(response);

      // Load subtasks if this is a parent task
      if (response.subtask_count && response.subtask_count > 0) {
        loadSubtasks(taskIdNum);
      }
    } catch (error: any) {
      console.error('Failed to load task:', error);
      // Check if it's a 403 error (access denied)
      if (error.status === 403) {
        setAccessDenied(true);
      } else {
        Alert.alert('Ошибка', 'Не удалось загрузить задачу');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubtasks = async (parentTaskId: number) => {
    try {
      const subtasksData = await taskApi.getSubtasks(parentTaskId);
      setSubtasks(subtasksData);
    } catch (error) {
      console.error('Failed to load subtasks:', error);
    }
  };

  const loadComments = async () => {
    try {
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskComments(taskIdNum, 20, 0);
      setComments(response.comments);
      setCommentsOffset(20);
      setHasMoreComments(response.hasMore);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadActivities = async () => {
    try {
      setIsLoadingActivities(true);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskActivities(taskIdNum, 50, 0);
      setActivities(response.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const loadMoreComments = async () => {
    if (isLoadingMoreComments || !hasMoreComments) return;

    try {
      setIsLoadingMoreComments(true);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTaskComments(taskIdNum, 20, commentsOffset);
      setComments([...comments, ...response.comments]);
      setCommentsOffset(commentsOffset + response.comments.length);
      setHasMoreComments(response.hasMore);
    } catch (error) {
      console.error('Failed to load more comments:', error);
    } finally {
      setIsLoadingMoreComments(false);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;

    // Check if trying to complete or submit for review with incomplete subtasks
    if ((newStatus === 'done' || newStatus === 'review') && !areAllSubtasksCompleted()) {
      const action = newStatus === 'done' ? 'завершить задачу' : 'сдать на проверку';
      Alert.alert(
        `Невозможно ${action}`,
        'Пожалуйста, завершите все подзадачи перед тем, как продолжить.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const taskIdNum = Number(taskId);
      await taskApi.updateTask(taskIdNum, { status: newStatus });
      setTask({ ...task, status: newStatus });
      Alert.alert('Успех', 'Статус обновлён');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить статус');
    }
  };

  const handleDeleteTask = () => {
    Alert.alert(
      'Удалить задачу?',
      'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const taskIdNum = Number(taskId);
              await taskApi.deleteTask(taskIdNum);
              Alert.alert('Успех', 'Задача удалена', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить задачу');
            }
          },
        },
      ]
    );
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || isSendingComment) return;

    try {
      setIsSendingComment(true);
      const taskIdNum = Number(taskId);
      await taskApi.addTaskComment(taskIdNum, { content: newComment });
      setNewComment('');
      await loadComments();
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось отправить комментарий');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleShareTask = async (chatId: number) => {
    console.log('Share task to chat:', chatId);
    // TODO: Implement task sharing
    Alert.alert('Успех', 'Задача отправлена в чат');
  };

  if (isLoading) {
    return <Loading text="Загрузка задачи..." fullScreen />;
  }

  // Show access denied screen if 403 error
  if (accessDenied) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.card }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          {/* Header */}
          <View style={{
            backgroundColor: theme.card,
            paddingTop: 12,
            paddingBottom: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.border,
          }}>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: theme.backgroundTertiary,
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Access Denied Content */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <Ionicons name="lock-closed" size={64} color={theme.textTertiary} />
            <Text style={{ fontSize: 24, fontWeight: '700', color: theme.text, marginTop: 24, textAlign: 'center' }}>
              Приватная задача
            </Text>
            <Text style={{ fontSize: 16, color: theme.textSecondary, marginTop: 12, textAlign: 'center', lineHeight: 24 }}>
              Эта задача является приватной. Вы не имеете доступа к её просмотру.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: theme.primary,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                marginTop: 32
              }}
              onPress={() => navigation.goBack()}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>Вернуться назад</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return <Loading text="Загрузка задачи..." fullScreen />;
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.primary,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.primary,
    },
    scrollContent: {
      paddingBottom: 120,
    },
    // Red header section
    headerSection: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Task title in header
    taskTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 16,
      lineHeight: 32,
    },
    // Progress container
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    progressBar: {
      flex: 1,
      height: 8,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 4,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#FFFFFF',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      minWidth: 40,
    },
    // Assignee and deadline row
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    assigneeText: {
      fontSize: 15,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    deadlineText: {
      fontSize: 15,
      color: '#FFFFFF',
      fontWeight: '500',
    },
    // Card with rounded corners
    card: {
      backgroundColor: theme.backgroundSecondary,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      flex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
      overflow: 'hidden',
    },
    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.backgroundSecondary,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: theme.primary,
    },
    tabText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.textSecondary,
    },
    activeTabText: {
      color: theme.primary,
      fontWeight: '600',
    },
    // Tab content
    tabContent: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    // Description section
    descriptionSection: {
      marginBottom: 16,
    },
    descriptionLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    descriptionText: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
    },
    descriptionCollapsed: {
      maxHeight: 44,
      overflow: 'hidden',
    },
    expandButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    expandButtonText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    // Completion badge
    completionBadge: {
      backgroundColor: '#10B981',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    completionIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    completionContent: {
      flex: 1,
    },
    completionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
      marginBottom: 4,
    },
    completionDate: {
      fontSize: 14,
      color: '#FFFFFF',
      opacity: 0.9,
    },
    // Action buttons
    actionButtonsContainer: {
      marginTop: 24,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      marginBottom: 12,
      gap: 8,
    },
    primaryActionButton: {
      backgroundColor: theme.primary,
    },
    disabledButton: {
      backgroundColor: '#9CA3AF',
      opacity: 0.6,
    },
    secondaryActionButton: {
      backgroundColor: theme.backgroundTertiary,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    primaryActionButtonText: {
      color: '#FFFFFF',
    },
    secondaryActionButtonText: {
      color: theme.text,
    },
    // Subtasks section
    subtasksSection: {
      marginTop: 16,
      marginBottom: 16,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    // Attachments section
    attachmentsSection: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 12,
    },
    attachmentsList: {
      gap: 8,
    },
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    attachmentIcon: {
      width: 40,
      height: 40,
      borderRadius: 8,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    attachmentInfo: {
      flex: 1,
    },
    attachmentName: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
      marginBottom: 2,
    },
    attachmentSize: {
      fontSize: 12,
      color: theme.textTertiary,
    },
    addAttachmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: 'dashed',
      marginTop: 8,
    },
    addAttachmentText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
      marginLeft: 8,
    },
    clickable: {
      color: theme.primary,
    },
    assignees: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    overdueText: {
      color: theme.error,
      fontWeight: '600',
    },
    commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      marginBottom: 12,
    },
    commentInput: {
      flex: 1,
      backgroundColor: theme.input,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      minHeight: 44,
      maxHeight: 100,
      color: theme.text,
      borderWidth: 1,
      borderColor: theme.border,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    commentItem: {
      flexDirection: 'row',
      marginBottom: 16,
    },
    commentAvatar: {
      marginRight: 12,
    },
    commentContent: {
      flex: 1,
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
      paddingVertical: 20,
    },
    loadMore: {
      paddingVertical: 10,
      alignItems: 'center',
    },
    loadMoreText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
    },
    // Activity history styles
    activityLoadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    activityLoadingText: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 12,
    },
    activitiesContainer: {
      flex: 1,
    },
    dateSeparator: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 8,
      marginBottom: 12,
      marginTop: 8,
    },
    dateSeparatorText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    activityItem: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
    },
    activityIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activityContent: {
      flex: 1,
      justifyContent: 'center',
    },
    activityText: {
      fontSize: 14,
      color: theme.text,
      lineHeight: 20,
      marginBottom: 4,
    },
    activityTime: {
      fontSize: 12,
      color: theme.textTertiary,
      fontWeight: '500',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 15,
      color: theme.textTertiary,
      marginTop: 12,
      textAlign: 'center',
    },
    accessDeniedContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
      paddingHorizontal: 32,
    },
    accessDeniedText: {
      fontSize: 15,
      color: theme.textTertiary,
      marginTop: 12,
      textAlign: 'center',
      lineHeight: 22,
    },
  });

  // Helper function to get activity icon
  const getActivityIcon = (activity: TaskActivity): any => {
    const actionType = activity.action_type;

    // Special case: if status changed to 'done', show green checkmark
    if ((actionType === 'task_status_changed' || actionType === 'subtask_status_changed') &&
        activity.new_value === 'done') {
      return 'checkmark-circle';
    }

    if (actionType === 'task_created') return 'add-circle-outline';
    if (actionType === 'task_status_changed') return 'swap-horizontal-outline';
    if (actionType === 'task_assigned') return 'person-add-outline';
    if (actionType === 'task_delegated') return 'git-branch-outline';
    if (actionType === 'task_viewed') return 'eye-outline';
    if (actionType === 'comment_added') return 'chatbubble-outline';
    if (actionType === 'attachment_added') return 'attach-outline';
    if (actionType === 'attachment_deleted') return 'trash-outline';
    if (actionType === 'checklist_added') return 'checkmark-done-outline';
    if (actionType.includes('checklist_item')) return 'checkbox-outline';
    if (actionType === 'subtask_created') return 'git-branch-outline';
    if (actionType === 'subtask_status_changed') return 'git-commit-outline';
    return 'ellipse-outline';
  };

  // Helper function to get activity icon color
  const getActivityIconColor = (activity: TaskActivity): string => {
    const actionType = activity.action_type;

    // Green for completed tasks
    if ((actionType === 'task_status_changed' || actionType === 'subtask_status_changed') &&
        activity.new_value === 'done') {
      return '#10B981';
    }

    return '#6B7280';
  };

  // Helper function to convert status to Russian
  const getStatusInRussian = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'new': 'Новая',
      'viewed': 'Просмотрена',
      'in_progress': 'В работе',
      'review': 'На проверке',
      'done': 'Завершена',
      'cancelled': 'Отменена',
    };
    return statusMap[status] || status;
  };

  // Helper function to get activity description in Russian
  const getActivityDescription = (activity: TaskActivity): string => {
    // Use user name from user object if available, otherwise use user_id
    const userName = activity.user?.name || (activity.user_id ? `Пользователь #${activity.user_id}` : 'Система');

    // Determine if this is about a subtask (task_id is different from current task)
    const taskTitle = activity.task_title || '';
    const taskPrefix = taskTitle ? `"${taskTitle}": ` : '';

    switch (activity.action_type) {
      case 'task_created':
        return `${userName} создал задачу ${taskPrefix}`;
      case 'task_status_changed': {
        const oldStatus = getStatusInRussian(activity.old_value || '');
        const newStatus = getStatusInRussian(activity.new_value || '');
        return `${taskPrefix}${userName} изменил статус: ${oldStatus} → ${newStatus}`;
      }
      case 'task_assigned':
        return `${taskPrefix}${userName} назначил задачу`;
      case 'task_delegated':
        return `${taskPrefix}${userName} делегировал задачу`;
      case 'task_viewed':
        return `${taskPrefix}${userName} ознакомился с задачей`;
      case 'comment_added':
        return `${taskPrefix}${userName} добавил комментарий`;
      case 'attachment_added':
        return `${taskPrefix}${userName} добавил файл: ${activity.new_value}`;
      case 'attachment_deleted':
        return `${taskPrefix}${userName} удалил файл: ${activity.old_value}`;
      case 'checklist_added':
        return `${taskPrefix}${userName} добавил чек-лист`;
      case 'checklist_item_completed':
        return `${taskPrefix}${userName} отметил пункт чек-листа`;
      case 'checklist_item_uncompleted':
        return `${taskPrefix}${userName} снял отметку с пункта чек-листа`;
      case 'subtask_created': {
        // Get assignee names
        let assigneeInfo = '';
        if (activity.assignees && activity.assignees.length > 0) {
          const assigneeNames = activity.assignees.map(a => a.name).join(', ');
          assigneeInfo = ` для ${assigneeNames}`;
        }
        return `${userName} создал подзадачу: ${activity.new_value}${assigneeInfo}`;
      }
      case 'subtask_status_changed': {
        const oldStatus = getStatusInRussian(activity.old_value || '');
        const newStatus = getStatusInRussian(activity.new_value || '');
        return `${userName} изменил статус подзадачи: ${oldStatus} → ${newStatus}`;
      }
      default:
        if (activity.action_type.startsWith('task_updated_')) {
          const field = activity.action_type.replace('task_updated_', '');
          return `${taskPrefix}${userName} обновил ${field}`;
        }
        return `${taskPrefix}${userName} выполнил действие: ${activity.action_type}`;
    }
  };

  // Check if all subtasks are completed
  const areAllSubtasksCompleted = (): boolean => {
    if (!subtasks || subtasks.length === 0) {
      return true; // No subtasks, so all are "completed"
    }
    return subtasks.every(subtask => subtask.status === 'done');
  };

  // Get task action button text based on status
  const getActionButtonText = () => {
    if (task.status === 'new') return 'Начать';
    if (task.status === 'in_progress') {
      // Check if all subtasks are completed
      if (!areAllSubtasksCompleted()) {
        return 'Завершите подзадачи';
      }
      return 'Сдать на проверку';
    }
    if (task.status === 'review') return 'На проверке';
    return 'Завершена';
  };

  const handleTaskAction = async () => {
    if (task.status === 'new') {
      await handleStatusChange('in_progress');
    } else if (task.status === 'in_progress') {
      // Check if all subtasks are completed before allowing to submit for review
      if (!areAllSubtasksCompleted()) {
        Alert.alert(
          'Невозможно сдать на проверку',
          'Пожалуйста, завершите все подзадачи перед тем, как сдать задачу на проверку.',
          [{ text: 'OK' }]
        );
        return;
      }
      await handleStatusChange('review');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Red Header Section */}
        <View style={styles.headerSection}>
          {/* Header Row with Back and Edit buttons */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerButtons}>
              {task.status !== 'done' && (task.created_by === user?.id || user?.role === 'admin' || user?.role === 'super_admin') && (
                <>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => setShowEditModal(true)}
                  >
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleDeleteTask}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {/* Task Title */}
          <Text style={styles.taskTitle}>{task.title}</Text>

          {/* Progress Bar - if task has progress_percentage */}
          {task.progress_percentage !== undefined && task.progress_percentage > 0 && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${task.progress_percentage}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{task.progress_percentage}%</Text>
            </View>
          )}

          {/* Assignee and Deadline Row */}
          <View style={styles.infoRow}>
            <Text style={styles.assigneeText}>
              {task.assignees && task.assignees.length > 0
                ? task.assignees[0].name
                : 'Без исполнителя'}
            </Text>
            <Text style={styles.deadlineText}>
              {task.due_date
                ? format(new Date(task.due_date), 'dd MMM', { locale: ru })
                : 'Без срока'}
            </Text>
          </View>
        </View>

        {/* Card with Tabs */}
        <View style={styles.card}>
          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
              onPress={() => setActiveTab('overview')}
            >
              <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>
                Обзор
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.activeTab]}
              onPress={() => setActiveTab('history')}
            >
              <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                История
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView
            style={styles.tabContent}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'overview' ? (
              <View style={styles.content}>
                {/* Description Section */}
                {task.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.descriptionLabel}>Описание</Text>
                    <Text
                      style={[
                        styles.descriptionText,
                        !isDescriptionExpanded && styles.descriptionCollapsed,
                      ]}
                      numberOfLines={isDescriptionExpanded ? undefined : 2}
                    >
                      {task.description}
                    </Text>
                    {task.description.length > 80 && (
                      <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                      >
                        <Text style={styles.expandButtonText}>
                          {isDescriptionExpanded ? 'Свернуть' : 'Раскрыть'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Completion Badge - shown when task is done */}
                {task.status === 'done' && (
                  <View style={styles.completionBadge}>
                    <View style={styles.completionIcon}>
                      <Ionicons name="checkmark-circle" size={32} color="#FFFFFF" />
                    </View>
                    <View style={styles.completionContent}>
                      <Text style={styles.completionTitle}>Задача завершена</Text>
                      <Text style={styles.completionDate}>
                        {task.updated_at
                          ? format(new Date(task.updated_at), 'dd MMMM yyyy, HH:mm', { locale: ru })
                          : 'Дата неизвестна'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Elements hidden when task is done */}
                {task.status !== 'done' && (
                  <>
                    {/* Subtasks Section - only for users who can create subtasks */}
                    {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'department_head') && (
                      <View style={styles.subtasksSection}>
                        <TaskSubtasksList
                          parentTaskId={task.id}
                          onSubtaskPress={(subtask) => {
                            // @ts-ignore
                            navigation.push('TaskDetail', { taskId: subtask.id.toString() });
                          }}
                          onSubtaskCreated={() => {
                            loadTask(); // Reload task to update progress
                          }}
                          onCreateSubtaskPress={() => setShowSubtaskModal(true)}
                        />
                      </View>
                    )}

                    {/* Attachments Section */}
                    <View style={styles.attachmentsSection}>
                      <Text style={styles.sectionTitle}>Вложения</Text>

                      {/* Add Attachment Button */}
                      <TouchableOpacity style={styles.addAttachmentButton}>
                        <Ionicons name="add-circle" size={24} color={theme.primary} />
                        <Text style={styles.addAttachmentText}>Добавить файл</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                      {/* Start/Submit Button - for new or in_progress tasks */}
                      {(task.status === 'new' || task.status === 'in_progress') && (
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            styles.primaryActionButton,
                            (task.status === 'in_progress' && !areAllSubtasksCompleted()) && styles.disabledButton
                          ]}
                          onPress={handleTaskAction}
                          disabled={task.status === 'in_progress' && !areAllSubtasksCompleted()}
                        >
                          <Ionicons
                            name={task.status === 'in_progress' && !areAllSubtasksCompleted() ? 'alert-circle-outline' : 'play-circle-outline'}
                            size={20}
                            color="#FFFFFF"
                          />
                          <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
                            {getActionButtonText()}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Review Buttons - for creator when task is in review */}
                      {task.status === 'review' && task.created_by === user?.id && (
                        <>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.primaryActionButton,
                              !areAllSubtasksCompleted() && styles.disabledButton
                            ]}
                            onPress={() => handleStatusChange('done')}
                            disabled={!areAllSubtasksCompleted()}
                          >
                            <Ionicons
                              name={!areAllSubtasksCompleted() ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                              size={20}
                              color="#FFFFFF"
                            />
                            <Text style={[styles.actionButtonText, styles.primaryActionButtonText]}>
                              {!areAllSubtasksCompleted() ? 'Завершите подзадачи' : 'Принять задачу'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionButton, styles.secondaryActionButton]}
                            onPress={() => handleStatusChange('in_progress')}
                          >
                            <Ionicons name="arrow-back-circle-outline" size={20} color={theme.text} />
                            <Text style={[styles.actionButtonText, styles.secondaryActionButtonText]}>
                              Отправить на переработку
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </>
                )}
              </View>
            ) : (
              // History Tab (Activities)
              <View style={styles.content}>
                {/* Check if user has permission to view history */}
                {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'department_head') ? (
                  <>
                    {isLoadingActivities ? (
                      <View style={styles.activityLoadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={styles.activityLoadingText}>Загрузка истории...</Text>
                      </View>
                    ) : activities.length > 0 ? (
                      <View style={styles.activitiesContainer}>
                        {/* Group activities by date */}
                        {(() => {
                          const groupedActivities: { [key: string]: TaskActivity[] } = {};
                          activities.forEach((activity) => {
                            const dateKey = format(new Date(activity.created_at), 'dd.MM.yyyy');
                            if (!groupedActivities[dateKey]) {
                              groupedActivities[dateKey] = [];
                            }
                            groupedActivities[dateKey].push(activity);
                          });

                          return Object.entries(groupedActivities).map(([date, dateActivities]) => (
                            <View key={date}>
                              {/* Date Separator */}
                              <View style={styles.dateSeparator}>
                                <Text style={styles.dateSeparatorText}>{date}</Text>
                              </View>

                              {/* Activities for this date */}
                              {dateActivities.map((activity) => (
                                <View key={activity.id} style={styles.activityItem}>
                                  <View style={styles.activityIcon}>
                                    <Ionicons
                                      name={getActivityIcon(activity)}
                                      size={20}
                                      color={getActivityIconColor(activity)}
                                    />
                                  </View>
                                  <View style={styles.activityContent}>
                                    <Text style={styles.activityText}>
                                      {getActivityDescription(activity)}
                                    </Text>
                                    <Text style={styles.activityTime}>
                                      {format(new Date(activity.created_at), 'HH:mm')}
                                    </Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          ));
                        })()}
                      </View>
                    ) : (
                      <View style={styles.emptyState}>
                        <Ionicons name="time-outline" size={48} color={theme.textTertiary} />
                        <Text style={styles.emptyStateText}>История пока пуста</Text>
                      </View>
                    )}
                  </>
                ) : (
                  // Access denied for employees
                  <View style={styles.accessDeniedContainer}>
                    <Ionicons name="lock-closed-outline" size={48} color={theme.textTertiary} />
                    <Text style={styles.accessDeniedText}>
                      История доступна только руководителям
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>

        {/* Share Task Modal */}
        {task && (
          <ShareTaskModal
            visible={showShareModal}
            onClose={() => setShowShareModal(false)}
            task={task}
            onShare={handleShareTask}
          />
        )}

        {/* Edit Task Modal */}
        {task && (
          <EditTaskModal
            visible={showEditModal}
            task={task}
            onClose={() => setShowEditModal(false)}
            onTaskUpdated={(updatedTask) => {
              setTask(updatedTask);
              setShowEditModal(false);
            }}
          />
        )}

        {/* Create Subtask Modal - only for users who can create subtasks */}
        {task && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'department_head') && (
          <CreateSubtaskModal
            visible={showSubtaskModal}
            parentTaskId={task.id}
            onClose={() => setShowSubtaskModal(false)}
            onSubtaskCreated={() => {
              setShowSubtaskModal(false);
              loadTask(); // Reload task to update progress
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

export default TaskDetailScreen;
