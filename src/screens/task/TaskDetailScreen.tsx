import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskComment, TaskActivity, TaskAttachment } from '../../types/task.types';
import { User } from '../../types/user.types';
import * as taskApi from '@api/task.api';
import { Loading } from '@components/common/Loading';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { getUser } from '@api/user.api';
import { getOrCreateDirectChat } from '@api/chat.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import ShareTaskModal from '@components/task/ShareTaskModal';
import EditTaskModal from '@components/task/EditTaskModal';
import { CreateSubtaskModal } from '@components/task/CreateSubtaskModal';
import { TaskSubtasksList } from '@components/task/TaskSubtasksList';
import { DelegateTaskModal } from '@components/task/DelegateTaskModal';
import { TaskChecklistsView } from '@components/task/TaskChecklistsView';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import FileViewer from 'react-native-file-viewer';
import * as Linking from 'expo-linking';
import * as secureStorage from '@utils/secureStorage';
import { STORAGE_KEYS } from '@constants/app.constants';
import { fileApi } from '@api/fileApi';
import { getFileIcon, decodeFileName } from '@utils/file.utils';

type TaskDetailRouteParams = {
  taskId: string;
};

/**
 * Check if user can edit task
 * Creator (delegator) always has edit rights even if task is delegated
 */
const canEditTask = (task: Task | null, userId: number | undefined, userRole: string | undefined): boolean => {
  if (!task || !userId) return false;

  // Admins and super admins can edit any task
  if (userRole === 'admin' || userRole === 'super_admin') return true;

  // Creator (who delegated) can always edit
  if (task.created_by === userId) return true;

  // Task is done - no one can edit except admins
  if (task.status === 'done') return false;

  return false;
};

/**
 * Check if user has access to view task (includes assignees)
 */
const canViewTask = (task: Task | null, userId: number | undefined): boolean => {
  if (!task || !userId) return false;

  // Creator always has access
  if (task.created_by === userId) return true;

  // Assignees have access
  if (task.assignees) {
    for (const assignee of task.assignees) {
      if (assignee.id === userId) return true;
    }
  }

  return false;
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;
  const { theme, isDark } = useTheme();
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
  const [activeTab, setActiveTab] = useState<'overview' | 'attachments' | 'comments' | 'history'>('overview');
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Subtask modal state
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  // Delegate modal state
  const [showDelegateModal, setShowDelegateModal] = useState(false);

  // Action menu state
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Attachments state
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  // User profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Scroll animation - disabled due to performance issues
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadTask();
    loadComments();
    loadAttachments();
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
      console.log('🔄 Loading task:', taskId);
      setIsLoading(true);
      setAccessDenied(false);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTask(taskIdNum);
      console.log('📥 Task loaded:', {
        id: response.id,
        title: response.title,
        delegation_chain: response.delegation_chain,
        assigned_to: response.assigned_to,
      });

      // Load checklists for the task
      try {
        const checklists = await taskApi.getTaskChecklists(taskIdNum);
        response.checklists = checklists;
        console.log('📋 Loaded checklists:', checklists.length);
      } catch (error) {
        console.error('Failed to load checklists:', error);
        // Don't fail the whole task load if checklists fail
      }

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

    // Check if trying to complete or submit for review with incomplete checklist items
    if ((newStatus === 'done' || newStatus === 'review') && !areAllChecklistItemsCompleted()) {
      const action = newStatus === 'done' ? 'завершить задачу' : 'сдать на проверку';
      Alert.alert(
        `Невозможно ${action}`,
        'Пожалуйста, завершите все пункты чек-листов перед тем, как продолжить.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      const taskIdNum = Number(taskId);
      await taskApi.updateTask(taskIdNum, { status: newStatus });
      setTask({ ...task, status: newStatus });
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

  // Load attachments
  const loadAttachments = async () => {
    try {
      setIsLoadingAttachments(true);
      const taskIdNum = Number(taskId);
      const data = await taskApi.getTaskAttachments(taskIdNum);
      setAttachments(data);
    } catch (error) {
      console.error('Error loading attachments:', error);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  // Handle file picker
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      await handleUploadFile(file);
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать файл');
    }
  };

  // Upload file
  const handleUploadFile = async (file: any) => {
    try {
      setIsUploadingAttachment(true);
      const taskIdNum = Number(taskId);

      console.log('📎 Uploading file:', {
        name: file.name,
        uri: file.uri,
        mimeType: file.mimeType,
        size: file.size,
      });

      // Step 1: Upload file to file-service (like in chats)
      const fileToUpload = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      };

      console.log('📤 Step 1: Uploading to file-service...');
      // Mark task files as public so all task participants can access them
      const uploadedFile = await fileApi.uploadFile(fileToUpload, 'attachment', undefined, true);
      console.log('✅ File uploaded to file-service:', uploadedFile);

      // Step 2: Attach file to task using file_id
      console.log('📤 Step 2: Attaching to task...');
      const result = await taskApi.attachFileToTask(taskIdNum, uploadedFile.id);
      console.log('✅ File attached to task:', result);

      Alert.alert('Успех', 'Файл загружен');
      await loadAttachments();
      await loadTask();
    } catch (error: any) {
      console.error('❌ Error uploading file:', error);
      console.error('Error details:', error.response?.data || error.message);
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить файл');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  // Delete attachment
  // Open/download attachment
  const handleOpenAttachment = async (attachment: TaskAttachment) => {
    try {
      // Extract file ID from file_path (e.g., "/files/11" -> "11")
      const fileId = attachment.file_path.split('/').pop();
      if (!fileId) {
        Alert.alert('Ошибка', 'Неверный путь к файлу');
        return;
      }

      console.log('📥 Opening file:', {
        fileName: attachment.file_name,
        fileId,
      });

      // Get session ID
      const sessionId = await secureStorage.getItemAsync(STORAGE_KEYS.SESSION_ID);
      if (!sessionId) {
        Alert.alert('Ошибка', 'Не авторизован');
        return;
      }

      // Use fileApi to get file info first
      const file = await fileApi.getFileById(Number(fileId));

      // For web: create download link with session ID in header using fetch + blob
      if (Platform.OS === 'web') {
        const downloadUrl = fileApi.getDownloadUrl(file.file_name);
        const response = await fetch(downloadUrl, {
          headers: {
            'X-Session-ID': sessionId,
          },
        });

        if (!response.ok) {
          throw new Error(`Ошибка загрузки: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // For mobile: download file and open with FileViewer
        const downloadUrl = fileApi.getDownloadUrl(file.file_name);

        // Decode filename and create safe filename
        const originalFileName = decodeURIComponent(attachment.file_name);
        const fileExtension = originalFileName.split('.').pop() || '';
        const safeFileName = `file_${Date.now()}.${fileExtension}`;
        const fileUri = `${FileSystem.cacheDirectory}${safeFileName}`;

        console.log('📥 Downloading to:', fileUri);

        const downloadResult = await FileSystem.downloadAsync(
          downloadUrl,
          fileUri,
          {
            headers: {
              'X-Session-ID': sessionId,
            },
          }
        );

        console.log('✅ Downloaded:', downloadResult.uri);

        // Open file with native viewer
        try {
          await FileViewer.open(downloadResult.uri, {
            displayName: originalFileName,
            showOpenWithDialog: true,
            showAppsSuggestions: true,
          });
        } catch (viewerError: any) {
          // If FileViewer fails, fallback to sharing
          console.log('FileViewer failed, falling back to sharing:', viewerError);
          const isAvailable = await Sharing.isAvailableAsync();

          if (isAvailable) {
            await Sharing.shareAsync(downloadResult.uri, {
              UTI: attachment.mime_type,
              mimeType: attachment.mime_type,
            });
          } else {
            Alert.alert('Успех', `Файл скачан:\n${originalFileName}`);
          }
        }
      }
    } catch (error: any) {
      console.error('❌ Error opening file:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось открыть файл');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    // Use window.confirm for web, Alert.alert for mobile
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Вы уверены, что хотите удалить этот файл?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Удалить файл?',
            'Вы уверены, что хотите удалить этот файл?',
            [
              { text: 'Отмена', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Удалить',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await taskApi.deleteAttachment(attachmentId);

      if (Platform.OS === 'web') {
        alert('Файл удалён');
      } else {
        Alert.alert('Успех', 'Файл удалён');
      }

      await loadAttachments();
      await loadTask();
    } catch (error) {
      console.error('Error deleting attachment:', error);

      if (Platform.OS === 'web') {
        alert('Не удалось удалить файл');
      } else {
        Alert.alert('Ошибка', 'Не удалось удалить файл');
      }
    }
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

  // Check if task is delegated BY current user (user delegated it to someone else)
  // BUT creator (delegator) should still be able to edit
  // Only show readonly mode if user delegated task BUT is not the original creator
  const isDelegatedByMe = user &&
    task.delegated_from_user_id === user.id &&
    task.created_by !== user.id;

  // Priority config
  const priorityConfig = {
    low: { label: 'Низкий', color: '#10B981' },
    medium: { label: 'Средний', color: '#F59E0B' },
    high: { label: 'Высокий', color: '#F97316' },
    critical: { label: 'Критичный', color: '#EF4444' },
  }[task.priority];

  // Status config
  const statusConfig = {
    new: { label: 'Новая', color: '#F59E0B' },
    viewed: { label: 'Просмотрена', color: '#6B7280' },
    in_progress: { label: 'В работе', color: '#3B82F6' },
    review: { label: 'На проверке', color: '#8B5CF6' },
    done: { label: 'Выполнена', color: '#10B981' },
    cancelled: { label: 'Отменена', color: '#EF4444' },
  }[task.status];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      position: 'relative',
    },
    safeArea: {
      flex: 1,
      backgroundColor: theme.card,
    },
    scrollContent: {
      paddingBottom: Platform.OS === 'ios' ? 180 : 140,
    },
    // Header section
    headerSection: {
      backgroundColor: theme.card,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerButtons: {
      flexDirection: 'row',
      gap: 8,
    },
    headerButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Task title (now in content)
    taskTitle: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.text,
      lineHeight: 32,
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    // Progress container
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
      backgroundColor: theme.backgroundSecondary,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
    },
    progressBar: {
      flex: 1,
      height: 10,
      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      borderRadius: 5,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    },
    progressFill: {
      height: '100%',
      borderRadius: 4,
    },
    progressText: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.text,
      minWidth: 45,
      textAlign: 'right',
    },
    delegatedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f3e8ff',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      alignSelf: 'flex-start',
      marginBottom: 12,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#e9d5ff',
    },
    delegatedBadgeText: {
      fontSize: 13,
      fontWeight: '700',
      color: isDark ? '#c4b5fd' : '#8b5cf6',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Assignee and deadline row
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    assigneeContainer: {
      flex: 1,
      marginRight: 12,
    },
    delegationChainContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    delegationIcon: {
      marginRight: 2,
    },
    assigneeText: {
      fontSize: 14,
      fontWeight: '500',
      flexShrink: 1,
    },
    deadlineText: {
      fontSize: 14,
      fontWeight: '500',
    },
    // Card with rounded corners
    card: {
      backgroundColor: theme.background,
      flex: 1,
      overflow: 'hidden',
    },
    // Tabs
    tabsContainer: {
      flexDirection: 'row',
      backgroundColor: theme.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      paddingHorizontal: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    tab: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 4,
      alignItems: 'center',
      borderBottomWidth: 3,
      borderBottomColor: 'transparent',
    },
    activeTab: {
      borderBottomColor: theme.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textTertiary,
    },
    activeTabText: {
      color: theme.primary,
      fontWeight: '700',
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
    descriptionContainer: {
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    descriptionHeader: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    descriptionLabel: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: -0.2,
      textTransform: 'uppercase',
    },
    descriptionContent: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    descriptionText: {
      fontSize: 14,
      lineHeight: 20,
      fontWeight: '500',
    },
    descriptionCollapsed: {
      maxHeight: 44,
      overflow: 'hidden',
    },
    expandButton: {
      marginTop: 8,
      alignSelf: 'flex-start',
    },
    descriptionFooter: {
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 10,
      marginTop: 4,
      borderTopWidth: 1,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    priorityBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    priorityText: {
      fontSize: 12,
      fontWeight: '600',
    },
    descriptionAssigneeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    assigneeName: {
      fontSize: 14,
      fontWeight: '500',
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
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
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
    // Fixed Action Buttons at Bottom
    fixedActionsContainer: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 95 : 70,
      left: 0,
      right: 0,
      backgroundColor: theme.card,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: 'row',
      gap: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 5,
    },
    fixedActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    primaryFixedButton: {
      backgroundColor: theme.primary,
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
    },
    secondaryFixedButton: {
      backgroundColor: theme.backgroundSecondary,
      borderWidth: 1.5,
      borderColor: theme.border,
    },
    disabledButton: {
      backgroundColor: '#9CA3AF',
      opacity: 0.6,
    },
    fixedActionButtonText: {
      fontSize: 15,
      fontWeight: '600',
    },
    primaryFixedButtonText: {
      color: '#FFFFFF',
    },
    secondaryFixedButtonText: {
      color: theme.text,
    },
    // Checklists section
    checklistProgressIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      marginTop: 16,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    checklistProgressText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
    },
    checklistsSection: {
      marginBottom: 8,
    },
    // Subtasks section
    subtasksSection: {
      marginBottom: 16,
    },
    // Attachments section
    attachmentsSection: {
      marginTop: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
      letterSpacing: -0.3,
    },
    loadingAttachments: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 12,
    },
    loadingAttachmentsText: {
      fontSize: 14,
      color: '#6b7280',
    },
    attachmentsList: {
      gap: 8,
      marginBottom: 12,
    },
    attachmentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    attachmentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    attachmentDetails: {
      flex: 1,
    },
    attachmentName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    attachmentMeta: {
      fontSize: 12,
      color: '#6b7280',
    },
    deleteAttachmentButton: {
      padding: 4,
    },
    addAttachmentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 14,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.3)',
      borderStyle: 'dashed',
      marginTop: 8,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.03)',
    },
    addAttachmentText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: '600',
      marginLeft: 8,
    },
    noAttachmentsText: {
      fontSize: 14,
      color: '#9ca3af',
      fontStyle: 'italic',
      textAlign: 'center',
    },
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.textSecondary,
      marginTop: 12,
      textAlign: 'center',
      paddingVertical: 16,
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
      paddingVertical: 10,
      paddingHorizontal: 14,
      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)',
      borderRadius: 8,
      marginBottom: 12,
      marginTop: 8,
      borderLeftWidth: 3,
      borderLeftColor: theme.primary,
    },
    dateSeparatorText: {
      fontSize: 12,
      fontWeight: '800',
      color: theme.text,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    activityItem: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 12,
      marginBottom: 8,
      gap: 12,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 1,
      elevation: 1,
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
          const assigneeNames = activity.assignees
            .map(a => (user && a.id === user.id ? 'Я' : a.name))
            .join(', ');
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

  // Check if all checklist items are completed
  const areAllChecklistItemsCompleted = (): boolean => {
    if (!task?.checklists || task.checklists.length === 0) {
      return true; // No checklists, so all are "completed"
    }

    // Get all items from all checklists
    const allItems = task.checklists.flatMap(checklist => checklist.items);

    if (allItems.length === 0) {
      return true; // No items, so all are "completed"
    }

    return allItems.every(item => item.is_completed);
  };

  // Calculate overall task progress based on checklists
  const calculateChecklistProgress = (): number => {
    if (!task?.checklists || task.checklists.length === 0) {
      return 0;
    }

    const allItems = task.checklists.flatMap(checklist => checklist.items);

    if (allItems.length === 0) {
      return 0;
    }

    const completedItems = allItems.filter(item => item.is_completed).length;
    return Math.round((completedItems / allItems.length) * 100);
  };

  // Check if current user is the task creator
  const isCreator = user?.id === task.created_by;

  // Get task action button text based on status
  const getActionButtonText = () => {
    if (task.status === 'new') return 'Начать';
    if (task.status === 'in_progress') {
      // Check if all subtasks are completed
      if (!areAllSubtasksCompleted()) {
        return 'Завершите подзадачи';
      }
      // Check if all checklist items are completed
      if (!areAllChecklistItemsCompleted()) {
        return 'Завершите чек-листы';
      }
      // Creator can complete directly, assignee submits for review
      return isCreator ? 'Завершить' : 'Сдать на проверку';
    }
    if (task.status === 'review') return 'На проверке';
    return 'Завершена';
  };

  const handleTaskAction = async () => {
    if (task.status === 'new') {
      await handleStatusChange('in_progress');
    } else if (task.status === 'in_progress') {
      // Check if all subtasks are completed
      if (!areAllSubtasksCompleted()) {
        const action = isCreator ? 'завершить задачу' : 'сдать на проверку';
        Alert.alert(
          `Невозможно ${action}`,
          'Пожалуйста, завершите все подзадачи перед тем, как продолжить.',
          [{ text: 'OK' }]
        );
        return;
      }
      // Check if all checklist items are completed
      if (!areAllChecklistItemsCompleted()) {
        const action = isCreator ? 'завершить задачу' : 'сдать на проверку';
        Alert.alert(
          `Невозможно ${action}`,
          'Пожалуйста, завершите все пункты чек-листов перед тем, как продолжить.',
          [{ text: 'OK' }]
        );
        return;
      }
      // Creator completes directly, assignee submits for review
      await handleStatusChange(isCreator ? 'done' : 'review');
    }
  };

  // Handle user profile press
  const handleUserPress = async (userId: number) => {
    try {
      const userData = await getUser(userId);
      setSelectedUser(userData);
      setShowProfileModal(true);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.headerSection}>
          {/* Header Row with Back and Action buttons */}
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>

            {/* Action Menu Button - show if user has any actions available */}
            {(canEditTask(task, user?.id, user?.role) ||
              ((user?.role === 'department_head' || user?.role === 'admin' || user?.role === 'super_admin') &&
               task.status !== 'done' && task.status !== 'cancelled')) && (
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowActionMenu(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={24} color={theme.error} />
              </TouchableOpacity>
            )}
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
              style={[styles.tab, activeTab === 'attachments' && styles.activeTab]}
              onPress={() => setActiveTab('attachments')}
            >
              <Text style={[styles.tabText, activeTab === 'attachments' && styles.activeTabText]}>
                Вложения
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
              onPress={() => setActiveTab('comments')}
            >
              <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>
                Комментарии
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
                {/* Delegated Badge */}
                {isDelegatedByMe && (
                  <View style={styles.delegatedBadge}>
                    <Ionicons name="eye-outline" size={16} color="#8b5cf6" />
                    <Text style={styles.delegatedBadgeText}>Только просмотр</Text>
                  </View>
                )}

                {/* Description Section */}
                {task.description && (
                  <View style={styles.descriptionContainer}>
                    {/* Header */}
                    <View style={[styles.descriptionHeader, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.descriptionLabel, { color: theme.text }]}>{task.title}</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.descriptionContent}>
                      <Text
                        style={[
                          styles.descriptionText,
                          { color: theme.textSecondary },
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
                          <Text style={[styles.expandButtonText, { color: theme.primary }]}>
                            {isDescriptionExpanded ? 'Свернуть' : 'Раскрыть'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Footer with priority and assignee */}
                    {(task.priority || (task.assignees && task.assignees.length > 0)) && (
                      <View style={[styles.descriptionFooter, { borderTopColor: theme.border }]}>
                        {/* Priority Badge - Left */}
                        {task.priority && (
                          <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.color + '20' }]}>
                            <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                              {priorityConfig.label}
                            </Text>
                          </View>
                        )}

                        {/* Assignee - Right */}
                        {task.assignees && task.assignees.length > 0 && (
                          <TouchableOpacity
                            style={styles.descriptionAssigneeContainer}
                            onPress={() => handleUserPress(task.assignees![0].id)}
                            activeOpacity={0.7}
                          >
                            <Avatar
                              name={task.assignees[0].name}
                              imageUrl={task.assignees[0].avatar}
                              size={22}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
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

                {/* Checklists Section - show for all who have access */}
                {task.status !== 'done' && canViewTask(task, user?.id) && (
                  <View style={styles.checklistsSection}>
                    <TaskChecklistsView
                      taskId={task.id}
                      taskTitle={task.title}
                      assigneeName={task.assignees && task.assignees.length > 0 ? task.assignees[0].name : undefined}
                      assigneeAvatar={task.assignees && task.assignees.length > 0 ? task.assignees[0].avatar : undefined}
                      priority={task.priority}
                      dueDate={task.due_date}
                      onChecklistChanged={() => {
                        loadTask(); // Reload task to update progress
                      }}
                      canEdit={canEditTask(task, user?.id, user?.role)}
                      canToggleOnly={!canEditTask(task, user?.id, user?.role) && canViewTask(task, user?.id)}
                      readOnly={isDelegatedByMe}
                    />
                  </View>
                )}

                {/* Subtasks Section - show for all who have access, readonly for assignees */}
                {task.status !== 'done' && canViewTask(task, user?.id) && (
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
                      // Show create button only for managers who received delegated tasks (not creators, not employees)
                      onCreateSubtaskPress={
                        task.created_by !== user?.id &&
                        (user?.role === 'department_head' || user?.role === 'admin' || user?.role === 'super_admin') &&
                        (canEditTask(task, user?.id, user?.role) || task.assignees?.some(a => a.id === user?.id))
                          ? () => setShowSubtaskModal(true)
                          : undefined
                      }
                      // Readonly for users who can view but not edit
                      readOnly={!canEditTask(task, user?.id, user?.role)}
                    />
                  </View>
                )}


              </View>
            ) : activeTab === 'attachments' ? (
              // Attachments Tab
              <View style={styles.content}>
                {/* Display existing attachments or "no attachments" message */}
                {isLoadingAttachments ? (
                  <View style={styles.loadingAttachments}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={styles.loadingAttachmentsText}>Загрузка вложений...</Text>
                  </View>
                ) : attachments.length > 0 ? (
                  <View style={styles.attachmentsList}>
                    {attachments.map((attachment) => {
                      const fileIcon = getFileIcon(attachment.file_type || '', attachment.file_name);
                      return (
                        <View key={attachment.id} style={styles.attachmentItem}>
                          <TouchableOpacity
                            style={styles.attachmentInfo}
                            onPress={() => handleOpenAttachment(attachment)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name={fileIcon as any} size={20} color={theme.primary} />
                            <View style={styles.attachmentDetails}>
                              <Text style={styles.attachmentName} numberOfLines={1}>
                                {decodeFileName(attachment.file_name)}
                              </Text>
                              <Text style={styles.attachmentMeta}>
                                {(attachment.file_size / 1024).toFixed(1)} KB • {format(new Date(attachment.created_at), 'dd MMM yyyy', { locale: ru })}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {!isDelegatedByMe && task.status !== 'done' && (
                            <TouchableOpacity
                              style={styles.deleteAttachmentButton}
                              onPress={() => handleDeleteAttachment(attachment.id)}
                            >
                              <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons name="document-outline" size={48} color={theme.textTertiary} />
                    <Text style={styles.emptyStateText}>Нет вложений</Text>
                  </View>
                )}

                {/* Add Attachment Button - only if not delegated and task not done */}
                {!isDelegatedByMe && task.status !== 'done' && (
                  <TouchableOpacity
                    style={styles.addAttachmentButton}
                    onPress={handlePickFile}
                    disabled={isUploadingAttachment}
                  >
                    {isUploadingAttachment ? (
                      <>
                        <ActivityIndicator size="small" color={theme.primary} />
                        <Text style={styles.addAttachmentText}>Загрузка...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="add-circle" size={24} color={theme.primary} />
                        <Text style={styles.addAttachmentText}>Добавить файл</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            ) : activeTab === 'comments' ? (
              // Comments Tab (Placeholder)
              <View style={styles.content}>
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
                  <Text style={styles.emptyStateText}>Комментарии скоро появятся</Text>
                </View>
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

        {/* Fixed Action Buttons at Bottom */}
        {task.status !== 'done' && !isDelegatedByMe && activeTab === 'overview' && (
          <View style={styles.fixedActionsContainer}>
            {/* Start/Submit Button - for new or in_progress tasks */}
            {(task.status === 'new' || task.status === 'in_progress') && (
              <TouchableOpacity
                style={[
                  styles.fixedActionButton,
                  styles.primaryFixedButton,
                  (task.status === 'in_progress' && (!areAllSubtasksCompleted() || !areAllChecklistItemsCompleted())) && styles.disabledButton
                ]}
                onPress={handleTaskAction}
                disabled={task.status === 'in_progress' && (!areAllSubtasksCompleted() || !areAllChecklistItemsCompleted())}
              >
                <Ionicons
                  name={task.status === 'in_progress' && (!areAllSubtasksCompleted() || !areAllChecklistItemsCompleted()) ? 'alert-circle-outline' : 'play-circle-outline'}
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[styles.fixedActionButtonText, styles.primaryFixedButtonText]}>
                  {getActionButtonText()}
                </Text>
              </TouchableOpacity>
            )}

            {/* Review Buttons - for creator when task is in review */}
            {task.status === 'review' && task.created_by === user?.id && (
              <>
                <TouchableOpacity
                  style={[
                    styles.fixedActionButton,
                    styles.secondaryFixedButton,
                  ]}
                  onPress={() => handleStatusChange('in_progress')}
                >
                  <Ionicons name="arrow-back-circle-outline" size={20} color={theme.text} />
                  <Text style={[styles.fixedActionButtonText, styles.secondaryFixedButtonText]}>
                    Вернуть
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fixedActionButton,
                    styles.primaryFixedButton,
                    (!areAllSubtasksCompleted() || !areAllChecklistItemsCompleted()) && styles.disabledButton
                  ]}
                  onPress={() => handleStatusChange('done')}
                  disabled={!areAllSubtasksCompleted() || !areAllChecklistItemsCompleted()}
                >
                  <Ionicons
                    name={(!areAllSubtasksCompleted() || !areAllChecklistItemsCompleted()) ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={[styles.fixedActionButtonText, styles.primaryFixedButtonText]}>
                    {!areAllSubtasksCompleted() ? 'Завершите подзадачи' : !areAllChecklistItemsCompleted() ? 'Завершите чек-листы' : 'Принять'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
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

        {/* Edit Task Modal */}
        {task && (
          <EditTaskModal
            visible={showEditModal}
            task={task}
            onClose={() => setShowEditModal(false)}
            onTaskUpdated={(updatedTask) => {
              loadTask(); // Reload task to get updated checklists
              setShowEditModal(false);
            }}
          />
        )}

        {/* Create Subtask Modal - only for managers who received delegated tasks (not creators, not employees) */}
        {task && task.created_by !== user?.id &&
         (user?.role === 'department_head' || user?.role === 'admin' || user?.role === 'super_admin') &&
         (canEditTask(task, user?.id, user?.role) || task.assignees?.some(a => a.id === user?.id)) && (
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

        {/* Delegate Task Modal - only for department heads and admins */}
        {task && (user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'department_head') && (
          <DelegateTaskModal
            visible={showDelegateModal}
            taskId={task.id}
            onClose={() => setShowDelegateModal(false)}
            onDelegated={() => {
              console.log('✅ onDelegated called, reloading task...');
              setShowDelegateModal(false);
              loadTask(); // Reload task to update delegation chain
              Alert.alert('Успех', 'Задача успешно делегирована');
            }}
          />
        )}

        {/* User Profile Modal */}
        <UserProfileModal
          visible={showProfileModal}
          user={selectedUser}
          onClose={() => setShowProfileModal(false)}
          onOpenChat={async (userId) => {
            try {
              console.log('💬 Opening chat with user:', userId);
              const chat = await getOrCreateDirectChat(userId);
              console.log('✅ Got chat:', chat.id);
              setShowProfileModal(false);
              // Navigate to chat - need to get root navigation
              const rootNavigation = navigation.getParent();
              if (rootNavigation) {
                // @ts-ignore
                rootNavigation.navigate('Chats', {
                  screen: 'Chat',
                  params: { chatId: chat.id },
                });
              }
            } catch (error: any) {
              console.error('❌ Error opening chat:', error);
              Alert.alert('Ошибка', error.message || 'Не удалось открыть чат');
            }
          }}
        />

        {/* Action Menu Modal */}
        <Modal
          visible={showActionMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowActionMenu(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              justifyContent: 'flex-end',
            }}
            activeOpacity={1}
            onPress={() => setShowActionMenu(false)}
          >
            <View
              style={{
                backgroundColor: theme.card,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: Platform.OS === 'ios' ? 34 : 16,
                paddingTop: 8,
              }}
              onStartShouldSetResponder={() => true}
            >
              {/* Handle Bar */}
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <View
                  style={{
                    width: 40,
                    height: 4,
                    backgroundColor: theme.border,
                    borderRadius: 2,
                  }}
                />
              </View>

              {/* Menu Items */}
              <View style={{ paddingHorizontal: 16 }}>
                {/* Edit Task Option */}
                {canEditTask(task, user?.id, user?.role) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: theme.backgroundSecondary,
                      marginBottom: 8,
                    }}
                    onPress={() => {
                      setShowActionMenu(false);
                      setShowEditModal(true);
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="create-outline" size={20} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 2 }}>
                        Редактировать
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                        Изменить детали задачи
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* Delegate Task Option */}
                {(user?.role === 'department_head' || user?.role === 'admin' || user?.role === 'super_admin') &&
                 task.status !== 'done' && task.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: theme.backgroundSecondary,
                      marginBottom: 8,
                    }}
                    onPress={() => {
                      setShowActionMenu(false);
                      setShowDelegateModal(true);
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f5f3ff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="git-branch-outline" size={20} color="#8b5cf6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 2 }}>
                        Делегировать задачу
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                        Передать задачу другому сотруднику
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* Add Subtask Option */}
                {task.created_by !== user?.id &&
                 (user?.role === 'department_head' || user?.role === 'admin' || user?.role === 'super_admin') &&
                 (canEditTask(task, user?.id, user?.role) || task.assignees?.some(a => a.id === user?.id)) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: theme.backgroundSecondary,
                      marginBottom: 8,
                    }}
                    onPress={() => {
                      setShowActionMenu(false);
                      setShowSubtaskModal(true);
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, marginBottom: 2 }}>
                        Добавить подзадачу
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                        Разбить задачу на этапы
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* Delete Task Option */}
                {canEditTask(task, user?.id, user?.role) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 16,
                      paddingHorizontal: 16,
                      borderRadius: 12,
                      backgroundColor: theme.backgroundSecondary,
                      marginBottom: 8,
                    }}
                    onPress={() => {
                      setShowActionMenu(false);
                      handleDeleteTask();
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#ef4444', marginBottom: 2 }}>
                        Удалить задачу
                      </Text>
                      <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                        Это действие нельзя отменить
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}

                {/* Cancel Button */}
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    paddingVertical: 14,
                    marginTop: 8,
                  }}
                  onPress={() => setShowActionMenu(false)}
                >
                  <Text style={{ fontSize: 16, fontWeight: '600', color: theme.textSecondary }}>
                    Отмена
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default TaskDetailScreen;
