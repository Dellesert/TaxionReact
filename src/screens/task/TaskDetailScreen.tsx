import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
  Platform,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Task, TaskComment, TaskPriority } from '../../types/task.types';
import * as taskApi from '@api/task.api';
import * as chatAPI from '@api/chat.api';
import { Loading } from '@components/common/Loading';
import { Avatar } from '@components/common/Avatar';
import { useTheme } from '@hooks/useTheme';
import { useTaskStore } from '@store/taskStore';
import { useAuthStore } from '@store/authStore';
import { useChatStore } from '@store/chatStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ShareTaskModal from '@components/task/ShareTaskModal';

type TaskDetailRouteParams = {
  taskId: string;
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;
  const { theme } = useTheme();
  const { deleteTask: deleteTaskFromStore } = useTaskStore();
  const { user } = useAuthStore();

  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [commentsOffset, setCommentsOffset] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [isLoadingMoreComments, setIsLoadingMoreComments] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editDueDate, setEditDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Collapsed state for sections
  const [isInfoCollapsed, setIsInfoCollapsed] = useState(true);
  const [isCommentsCollapsed, setIsCommentsCollapsed] = useState(true);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const { sendMessage } = useChatStore();

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
      // Initialize edit fields
      setEditTitle(response.title);
      setEditDescription(response.description || '');
      setEditPriority(response.priority);
      setEditDueDate(response.due_date ? new Date(response.due_date) : undefined);
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
      const response = await taskApi.getTaskComments(taskIdNum, 20, 0);
      setComments(response.comments);
      setCommentsOffset(20);
      setHasMoreComments(response.hasMore);
    } catch (error) {
      console.error('Failed to load comments:', error);
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

  const handleStartEdit = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDueDate(task.due_date ? new Date(task.due_date) : undefined);
  };

  const handleSaveEdit = async () => {
    if (!task || !editTitle.trim()) {
      Alert.alert('Ошибка', 'Название задачи не может быть пустым');
      return;
    }

    try {
      setIsSaving(true);
      const taskIdNum = Number(taskId);
      await taskApi.updateTask(taskIdNum, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        due_date: editDueDate,
      });

      // Update local state
      setTask({
        ...task,
        title: editTitle.trim(),
        description: editDescription.trim(),
        priority: editPriority,
        due_date: editDueDate?.toISOString(),
      });

      setIsEditMode(false);
      Alert.alert('Успех', 'Задача обновлена');
    } catch (error: any) {
      console.error('Failed to update task:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось обновить задачу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task) return;

    try {
      const taskIdNum = Number(taskId);
      await taskApi.updateTask(taskIdNum, { status: newStatus });
      setTask({ ...task, status: newStatus });
      setShowStatusModal(false);
      Alert.alert('Успех', 'Статус обновлён');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось обновить статус');
    }
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

  const handleOpenChatWithUser = async (userInfo: { id: number; name: string }) => {
    try {
      const chat = await chatAPI.getOrCreateDirectChat(userInfo.id);
      // @ts-ignore
      navigation.navigate('Chats', {
        screen: 'Chat',
        params: { chatId: chat.id, chatName: chat.name }
      });
    } catch (error) {
      console.error('Failed to open direct chat:', error);
      Alert.alert('Ошибка', 'Не удалось открыть чат');
    }
  };

  const handleOpenTaskGroupChat = async () => {
    if (!task?.id) return;

    try {
      const chat = await chatAPI.getOrCreateTaskChat(task.id);
      // @ts-ignore
      navigation.navigate('Chats', {
        screen: 'Chat',
        params: { chatId: chat.id, chatName: chat.name }
      });
    } catch (error) {
      console.error('Failed to open task chat:', error);
      Alert.alert('Ошибка', 'Не удалось открыть групповой чат задачи');
    }
  };

  const handleDeleteTask = () => {
    if (!task) return;

    const isCreator = task.created_by === user?.id;
    const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

    if (!isCreator && !isAdmin) {
      Alert.alert('Ошибка', 'У вас нет прав на удаление этой задачи');
      return;
    }

    // For web, use window.confirm
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.');
      if (!confirmed) return;

      // Perform deletion
      const performDelete = async () => {
        try {
          const taskIdNum = Number(taskId);
          await deleteTaskFromStore(taskIdNum);
          alert('Задача удалена');
          navigation.goBack();
        } catch (error: any) {
          alert('Ошибка: ' + (error.message || 'Не удалось удалить задачу'));
        }
      };
      performDelete();
    } else {
      // For native, use Alert
      Alert.alert(
        'Удалить задачу',
        'Вы уверены? Это действие нельзя отменить.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              try {
                const taskIdNum = Number(taskId);
                await deleteTaskFromStore(taskIdNum);
                Alert.alert('Успех', 'Задача удалена', [
                  { text: 'OK', onPress: () => navigation.goBack() },
                ]);
              } catch (error: any) {
                Alert.alert('Ошибка', error.message || 'Не удалось удалить задачу');
              }
            },
          },
        ]
      );
    }
  };

  const handleShareTask = async (chatId: number) => {
    if (!task) return;

    try {
      const taskData = {
        task_id: task.id,
        task_title: task.title,
        task_description: task.description,
        task_status: task.status,
        task_priority: task.priority,
        due_date: task.due_date,
        assigned_to: task.assignees?.map(a => a.id),
      };

      console.log('📤 Sharing task to chat:', chatId);
      console.log('📋 Task data:', JSON.stringify(taskData, null, 2));

      // Создаем специальное сообщение с данными задачи
      // Бэкенд пока не поддерживает тип "task", поэтому используем тип "text"
      // с специальным маркером для фронтенда
      const messageContent = `📋 Задача: ${task.title}\n[TASK_DATA]${JSON.stringify(taskData)}[/TASK_DATA]`;

      console.log('📦 Message content:', messageContent);

      await sendMessage(chatId, messageContent, undefined, undefined, undefined);

      console.log('✅ Task shared to chat:', chatId);
    } catch (error) {
      console.error('❌ Failed to share task:', error);
      throw error;
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEditDueDate(selectedDate);
    }
  };

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Низкий', color: '#10B981' },
    { value: 'medium', label: 'Средний', color: '#F59E0B' },
    { value: 'high', label: 'Высокий', color: '#F97316' },
    { value: 'critical', label: 'Критический', color: '#EF4444' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return '#10B981';
      case 'in_progress': return '#3B82F6';
      case 'review': return '#8B5CF6';
      case 'new': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'done': return 'Завершена';
      case 'in_progress': return 'В работе';
      case 'review': return 'На проверке';
      case 'new': return 'Новая';
      default: return 'Неизвестно';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#EA580C';
      case 'medium': return '#CA8A04';
      case 'low': return '#16A34A';
      default: return '#6B7280';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Критический';
      case 'high': return 'Высокий';
      case 'medium': return 'Средний';
      case 'low': return 'Низкий';
      default: return 'Неизвестно';
    }
  };

  if (isLoading || !task) {
    return <Loading text="Загрузка задачи..." fullScreen />;
  }

  const isCreator = task.created_by === user?.id;
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done';

  const canChangeStatus = !(
    task.status === 'review' &&
    task.created_by !== user?.id &&
    user?.role !== 'admin' &&
    user?.role !== 'super_admin'
  );

  const canCompleteTask =
    user?.role === 'admin' ||
    user?.role === 'super_admin' ||
    user?.role === 'manager' ||
    task.created_by === user?.id;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.card,
    },
    header: {
      backgroundColor: theme.card,
      paddingTop: 12,
      paddingBottom: 16,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.backgroundTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      lineHeight: 32,
    },
    titleInput: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 8,
      lineHeight: 32,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.backgroundSecondary,
    },
    description: {
      fontSize: 15,
      color: theme.textSecondary,
      lineHeight: 22,
      marginBottom: 16,
    },
    descriptionInput: {
      fontSize: 15,
      color: theme.text,
      lineHeight: 22,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.backgroundSecondary,
      minHeight: 80,
    },
    badges: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 16,
      gap: 4,
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '600',
    },
    editSection: {
      marginTop: 12,
      padding: 12,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    editLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 8,
    },
    priorityGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    priorityButton: {
      flex: 1,
      minWidth: '47%',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
    },
    priorityButtonActive: {
      borderWidth: 2,
    },
    priorityButtonText: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.text,
    },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      backgroundColor: theme.backgroundSecondary,
      gap: 8,
    },
    dateButtonText: {
      flex: 1,
      fontSize: 14,
      color: theme.text,
    },
    clearButton: {
      padding: 4,
    },
    editActions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 12,
    },
    editActionButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    saveButton: {
      backgroundColor: theme.primary,
    },
    editActionText: {
      fontSize: 15,
      fontWeight: '600',
    },
    cancelText: {
      color: theme.text,
    },
    saveText: {
      color: '#FFFFFF',
    },
    content: {
      flex: 1,
    },
    collapsibleSection: {
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.background,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
      backgroundColor: theme.backgroundSecondary,
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.text,
    },
    sectionCount: {
      fontSize: 13,
      color: theme.textTertiary,
    },
    sectionContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.background,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    infoIcon: {
      width: 32,
      alignItems: 'center',
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: 13,
      color: theme.textTertiary,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 15,
      color: theme.text,
      fontWeight: '500',
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
    actionBar: {
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      gap: 8,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    primaryButton: {
      backgroundColor: theme.primary,
    },
    secondaryButton: {
      backgroundColor: theme.backgroundTertiary,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: '600',
    },
    primaryButtonText: {
      color: '#FFFFFF',
    },
    secondaryButtonText: {
      color: theme.text,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 16,
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: theme.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 20,
    },
    statusOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundTertiary,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    statusOptionActive: {
      borderColor: theme.primary,
    },
    statusOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    statusOptionText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.text,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            {/* Кнопка поделиться */}
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowShareModal(true)}
            >
              <Ionicons name="share-outline" size={20} color={theme.primary} />
            </TouchableOpacity>
            {isCreator && !isEditMode && (
              <TouchableOpacity style={styles.headerButton} onPress={handleStartEdit}>
                <Ionicons name="create-outline" size={20} color={theme.primary} />
              </TouchableOpacity>
            )}
            {task && user && (task.created_by === user.id || user.role === 'admin' || user.role === 'super_admin') && (
              <TouchableOpacity style={styles.headerButton} onPress={handleDeleteTask}>
                <Ionicons name="trash-outline" size={20} color={theme.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isEditMode ? (
          <>
            <TextInput
              style={styles.titleInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Название задачи"
              placeholderTextColor={theme.inputPlaceholder}
              maxLength={100}
            />
            <TextInput
              style={styles.descriptionInput}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Описание задачи..."
              placeholderTextColor={theme.inputPlaceholder}
              multiline
              maxLength={500}
            />

            {/* Priority Selection */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Приоритет</Text>
              <View style={styles.priorityGrid}>
                {priorities.map((p) => (
                  <TouchableOpacity
                    key={p.value}
                    onPress={() => setEditPriority(p.value)}
                    style={[
                      styles.priorityButton,
                      editPriority === p.value && {
                        ...styles.priorityButtonActive,
                        backgroundColor: p.color + '15',
                        borderColor: p.color,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityButtonText,
                        editPriority === p.value && { color: p.color, fontWeight: '600' },
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Due Date Selection */}
            <View style={styles.editSection}>
              <Text style={styles.editLabel}>Срок выполнения</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={theme.primary} />
                <Text style={styles.dateButtonText}>
                  {editDueDate
                    ? format(editDueDate, 'dd MMMM yyyy, HH:mm', { locale: ru })
                    : 'Выберите дату и время'}
                </Text>
                {editDueDate && (
                  <TouchableOpacity
                    onPress={() => setEditDueDate(undefined)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={editDueDate || new Date()}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
            </View>

            {/* Edit Actions */}
            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.editActionButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={[styles.editActionText, styles.cancelText]}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editActionButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={isSaving || !editTitle.trim()}
              >
                <Text style={[styles.editActionText, styles.saveText]}>
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>{task.title}</Text>

            {task.description && (
              <Text style={styles.description}>{task.description}</Text>
            )}

            <View style={styles.badges}>
              <View style={[styles.badge, { backgroundColor: getStatusColor(task.status) }]}>
                <Ionicons name="ellipse" size={8} color="#FFFFFF" />
                <Text style={styles.badgeText}>{getStatusText(task.status)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: getPriorityColor(task.priority) }]}>
                <Ionicons name="flag" size={12} color="#FFFFFF" />
                <Text style={styles.badgeText}>{getPriorityText(task.priority)}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Section - Collapsible */}
        <View style={styles.collapsibleSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setIsInfoCollapsed(!isInfoCollapsed)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="information-circle-outline" size={20} color={theme.text} />
              <Text style={styles.sectionTitle}>Информация</Text>
            </View>
            <Ionicons
              name={isInfoCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={theme.textTertiary}
            />
          </TouchableOpacity>

          {!isInfoCollapsed && (
            <View style={styles.sectionContent}>
              {task.creator && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="person-outline" size={20} color={theme.textSecondary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Создатель</Text>
                    <TouchableOpacity onPress={() => handleOpenChatWithUser(task.creator!)}>
                      <Text style={[styles.infoValue, styles.clickable]}>{task.creator.name}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {task.assignees && task.assignees.length > 0 && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons name="people-outline" size={20} color={theme.textSecondary} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Исполнители</Text>
                    <View style={styles.assignees}>
                      {task.assignees.map((assignee, index) => (
                        <TouchableOpacity
                          key={assignee.id}
                          onPress={() => handleOpenChatWithUser(assignee)}
                        >
                          <Text style={[styles.infoValue, styles.clickable]}>
                            {assignee.name}{index < task.assignees!.length - 1 ? ', ' : ''}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {task.due_date && (
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={isOverdue ? theme.error : theme.textSecondary}
                    />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Срок</Text>
                    <Text style={[styles.infoValue, isOverdue && styles.overdueText]}>
                      {format(new Date(task.due_date), 'dd MMM yyyy, HH:mm', { locale: ru })}
                      {isOverdue && ' • Просрочено'}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.infoRow}>
                <View style={styles.infoIcon}>
                  <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Создано</Text>
                  <Text style={styles.infoValue}>
                    {format(new Date(task.created_at), 'dd MMM yyyy, HH:mm', { locale: ru })}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Comments Section - Collapsible */}
        <View style={styles.collapsibleSection}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setIsCommentsCollapsed(!isCommentsCollapsed)}
          >
            <View style={styles.sectionHeaderLeft}>
              <Ionicons name="chatbox-outline" size={20} color={theme.text} />
              <Text style={styles.sectionTitle}>Комментарии</Text>
              <Text style={styles.sectionCount}>({comments.length})</Text>
            </View>
            <Ionicons
              name={isCommentsCollapsed ? 'chevron-down' : 'chevron-up'}
              size={20}
              color={theme.textTertiary}
            />
          </TouchableOpacity>

          {!isCommentsCollapsed && (
            <View style={styles.sectionContent}>
              <View style={styles.commentInputContainer}>
                <TextInput
                  style={styles.commentInput}
                  placeholder="Добавить комментарий..."
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  placeholderTextColor={theme.inputPlaceholder}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: newComment.trim() ? theme.primary : theme.borderLight }
                  ]}
                  onPress={handleSendComment}
                  disabled={!newComment.trim() || isSendingComment}
                >
                  {isSendingComment ? (
                    <Ionicons name="hourglass-outline" size={20} color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>

              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentAvatar}>
                    <Avatar
                      source={comment.user?.avatar}
                      name={comment.user?.name || 'User'}
                      size={32}
                    />
                  </View>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.commentAuthor}>
                        {comment.user?.name || 'Пользователь'}
                      </Text>
                      <Text style={styles.commentDate}>
                        {format(new Date(comment.created_at), 'dd.MM HH:mm')}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                </View>
              ))}

              {hasMoreComments && (
                <TouchableOpacity
                  onPress={loadMoreComments}
                  disabled={isLoadingMoreComments}
                  style={styles.loadMore}
                >
                  <Text style={styles.loadMoreText}>
                    {isLoadingMoreComments ? 'Загрузка...' : 'Показать ещё'}
                  </Text>
                </TouchableOpacity>
              )}

              {comments.length === 0 && (
                <Text style={styles.emptyComments}>Комментариев пока нет</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Bar - Hide during editing */}
      {!isEditMode && (
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => setShowStatusModal(true)}
          >
            <Ionicons name="swap-horizontal" size={18} color={theme.text} />
            <Text style={[styles.buttonText, styles.secondaryButtonText]}>Статус</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleOpenTaskGroupChat}
          >
            <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
            <Text style={[styles.buttonText, styles.primaryButtonText]}>Обсудить</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowStatusModal(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Изменить статус</Text>

            {!canChangeStatus ? (
              <View style={styles.statusOption}>
                <View style={styles.statusOptionLeft}>
                  <Ionicons name="lock-closed" size={20} color={theme.textTertiary} />
                  <Text style={[styles.statusOptionText, { color: theme.textSecondary }]}>
                    Недостаточно прав
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    task.status === 'new' && styles.statusOptionActive,
                  ]}
                  onPress={() => handleStatusChange('new')}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.badge, { backgroundColor: getStatusColor('new') }]}>
                      <Ionicons name="ellipse" size={8} color="#FFFFFF" />
                    </View>
                    <Text style={styles.statusOptionText}>Новая</Text>
                  </View>
                  {task.status === 'new' && (
                    <Ionicons name="checkmark" size={22} color={theme.primary} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    task.status === 'in_progress' && styles.statusOptionActive,
                  ]}
                  onPress={() => handleStatusChange('in_progress')}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.badge, { backgroundColor: getStatusColor('in_progress') }]}>
                      <Ionicons name="ellipse" size={8} color="#FFFFFF" />
                    </View>
                    <Text style={styles.statusOptionText}>В работе</Text>
                  </View>
                  {task.status === 'in_progress' && (
                    <Ionicons name="checkmark" size={22} color={theme.primary} />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    task.status === 'review' && styles.statusOptionActive,
                  ]}
                  onPress={() => handleStatusChange('review')}
                >
                  <View style={styles.statusOptionLeft}>
                    <View style={[styles.badge, { backgroundColor: getStatusColor('review') }]}>
                      <Ionicons name="ellipse" size={8} color="#FFFFFF" />
                    </View>
                    <Text style={styles.statusOptionText}>На проверке</Text>
                  </View>
                  {task.status === 'review' && (
                    <Ionicons name="checkmark" size={22} color={theme.primary} />
                  )}
                </TouchableOpacity>

                {canCompleteTask && (
                  <TouchableOpacity
                    style={[
                      styles.statusOption,
                      task.status === 'done' && styles.statusOptionActive,
                    ]}
                    onPress={() => handleStatusChange('done')}
                  >
                    <View style={styles.statusOptionLeft}>
                      <View style={[styles.badge, { backgroundColor: getStatusColor('done') }]}>
                        <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                      </View>
                      <Text style={styles.statusOptionText}>Завершена</Text>
                    </View>
                    {task.status === 'done' && (
                      <Ionicons name="checkmark" size={22} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Share Task Modal */}
      {task && (
        <ShareTaskModal
          visible={showShareModal}
          onClose={() => setShowShareModal(false)}
          task={task}
          onShare={handleShareTask}
        />
      )}
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default TaskDetailScreen;
