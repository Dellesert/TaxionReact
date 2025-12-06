import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, useWindowDimensions, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation, useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '@shared/components/common/ScreenHeader';
import { TaskContentSkeleton } from '../components/states/TaskDetailSkeleton';
import { UserProfileModal } from '@shared/components/common/UserProfileModal';
import ShareTaskModal from '../components/modals/ShareTaskModal';
import EditTaskModal from '../components/modals/EditTaskModal';
import { CreateSubtaskModal } from '../components/modals/CreateSubtaskModal';
import { DelegateTaskModal } from '../components/modals/DelegateTaskModal';
import { TaskAccessDenied } from '../components/states/TaskAccessDenied';
import { TaskTabs, TabType } from '../components/common/TaskTabs';
import { TaskOverviewTab } from '../components/detail-tabs/TaskOverviewTab';
import { TaskAttachmentsTab } from '../components/detail-tabs/TaskAttachmentsTab';
import { TaskCommentsTab } from '../components/detail-tabs/TaskCommentsTab';
import { TaskHistoryTab } from '../components/detail-tabs/TaskHistoryTab';
import { TaskActionButtons } from '../components/common/TaskActionButtons';
import { TaskActionMenu } from '../components/common/TaskActionMenu';
import { TaskDesktopLayout } from '../components/task-details/TaskDesktopLayout';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAuthStore } from '@shared/store/authStore';
import { useTaskPermissions } from '../hooks/useTaskPermissions';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTaskData } from '../hooks/useTaskData';
import { useTaskComments } from '../hooks/useTaskComments';
import { useTaskAttachments } from '../hooks/useTaskAttachments';
import { useTaskActivities } from '../hooks/useTaskActivities';
import { useTaskActions } from '../hooks/useTaskActions';
import { getOrCreateDirectChat } from '@/features/chat/api/chat.api';
import * as DocumentPicker from 'expo-document-picker';
import { isDelegatedByUser, areAllSubtasksCompleted, areAllChecklistItemsCompleted } from '../utils/taskHelpers';

type TaskDetailRouteParams = {
  taskId: string;
};

const TaskDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();
  const { width } = useWindowDimensions();
  const isWideScreen = useIsWideScreen();

  // Desktop mode detection - use same logic as MainNavigator
  const isDesktop = isWideScreen;

  // Screen state
  const [isNarrowScreen, setIsNarrowScreen] = useState(Dimensions.get('window').width < 460);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();

  // Ref for the 3-dot menu button
  const menuButtonRef = useRef<any>(null);

  // Custom hooks for data management
  const {
    task,
    subtasks,
    isLoading,
    accessDenied,
    isFirstFocus,
    loadTask,
    loadTaskSilently,
    loadSubtasks,
  } = useTaskData(taskId);

  const {
    comments,
    newComment,
    setNewComment,
    isSendingComment,
    hasMoreComments,
    isLoadingMoreComments,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    loadComments,
    loadMoreComments,
    sendComment,
    editComment,
    saveEditComment,
    cancelEdit,
    deleteComment,
  } = useTaskComments(taskId);

  const {
    attachments,
    isLoadingAttachments,
    isUploadingAttachment,
    loadAttachments,
    uploadAttachment,
    openAttachment,
    deleteAttachment,
  } = useTaskAttachments(taskId);

  const {
    activities,
    isLoadingActivities,
    loadActivities,
    loadActivitiesSilently,
  } = useTaskActivities(taskId);

  // Get permissions for current task
  const permissions = useTaskPermissions(task);

  // Derived state
  const isDelegatedByMe = isDelegatedByUser(task, user?.id);
  const isCreator = user?.id === task?.created_by;
  const allSubtasksCompleted = areAllSubtasksCompleted(subtasks);
  const allChecklistItemsCompleted = areAllChecklistItemsCompleted(task);

  // Task actions hook
  const { handleStatusChange, handleEmergencyComplete, handleDeleteTask } = useTaskActions(
    task,
    subtasks,
    () => {
      loadTaskSilently();
      loadActivitiesSilently();
    },
    showError
  );

  // Update screen width on resize
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setIsNarrowScreen(window.width < 460);
    });
    return () => subscription?.remove();
  }, []);

  // Initial data load
  useEffect(() => {
    loadTask().catch(() => showError('Не удалось загрузить задачу'));
    loadComments().catch(() => showError('Не удалось загрузить комментарии'));
    loadAttachments().catch(() => showError('Не удалось загрузить вложения'));
  }, [taskId]);

  // Load activities when history tab is opened
  useEffect(() => {
    if (activeTab === 'history' && activities.length === 0) {
      loadActivities().catch(() => showError('Не удалось загрузить историю'));
    }
  }, [activeTab]);

  // Reload task when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadTaskSilently();
    }, [taskId])
  );

  // Handlers
  const handleTaskAction = async () => {
    if (!task) return;

    if (task.status === 'new') {
      await handleStatusChange('in_progress');
    } else if (task.status === 'in_progress') {
      if (!allSubtasksCompleted || !allChecklistItemsCompleted) {
        const action = isCreator ? 'завершить задачу' : 'сдать на проверку';
        const reason = !allSubtasksCompleted ? 'завершите все подзадачи' : 'завершите все пункты чек-листов';
        showError(`Невозможно ${action}. Пожалуйста, ${reason}.`);
        return;
      }
      await handleStatusChange(isCreator ? 'done' : 'review');
    }
  };

  const handleSendComment = async () => {
    try {
      await sendComment();
      await loadActivitiesSilently();
    } catch (error) {
      showError('Не удалось отправить комментарий');
    }
  };

  const handleSaveEditComment = async (commentId: number) => {
    try {
      await saveEditComment(commentId);
      await loadActivitiesSilently();
    } catch (error) {
      showError('Не удалось обновить комментарий');
    }
  };

  const handleDeleteComment = (commentId: number) => {
    showConfirm(
      'Удалить комментарий?',
      'Это действие нельзя отменить.',
      async () => {
        try {
          await deleteComment(commentId);
          await loadActivitiesSilently();
          showSuccess('Комментарий удалён');
        } catch (error) {
          showError('Не удалось удалить комментарий');
        }
      },
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
    );
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      await uploadAttachment(file);
      showSuccess('Файл загружен');
      await loadTaskSilently();
      await loadActivitiesSilently();
    } catch (error) {
      showError('Не удалось загрузить файл');
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await deleteAttachment(attachmentId);
      showSuccess('Файл удалён');
      await loadTaskSilently();
      await loadActivitiesSilently();
    } catch (error) {
      showError('Не удалось удалить файл');
    }
  };

  const handleOpenActionMenu = () => {
    if (isDesktop && menuButtonRef.current) {
      menuButtonRef.current.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonPosition({ x: pageX, y: pageY, width, height });
        setShowActionMenu(true);
      });
    } else {
      setShowActionMenu(true);
    }
  };

  const handleAttachmentLongPress = (attachment: any) => {
    const canDelete =
      !isDelegatedByMe &&
      task?.status !== 'done' &&
      user &&
      attachment.uploaded_by_user_id === user.id;

    if (!canDelete) return;

    showConfirm(
      'Удалить файл?',
      `Вы уверены, что хотите удалить "${attachment.file_name}"?`,
      async () => await handleDeleteAttachment(attachment.id),
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
    );
  };

  const handleUserPress = (userId: number) => {
    setSelectedUserId(userId);
    setShowProfileModal(true);
  };

  const handleOpenChat = async (userId: number) => {
    try {
      const chat = await getOrCreateDirectChat(userId);
      setShowProfileModal(false);
      const rootNavigation = navigation.getParent();
      if (rootNavigation) {
        // @ts-ignore
        rootNavigation.navigate('Chats', {
          screen: 'Chat',
          params: { chatId: chat.id },
        });
      }
    } catch (error: any) {
      showError(error.message || 'Не удалось открыть чат');
    }
  };

  const handleEmergencyCompleteConfirm = () => {
    showConfirm(
      'Аварийное завершение',
      'Вы собираетесь завершить просроченную задачу в аварийном режиме. Это действие будет зафиксировано в истории задачи.\n\nПродолжить?',
      async () => {
        try {
          await handleEmergencyComplete();
          showSuccess('Задача завершена в аварийном режиме');
        } catch (error) {
          showError('Не удалось завершить задачу');
        }
      },
      undefined,
      { confirmText: 'Завершить', cancelText: 'Отмена', destructive: true }
    );
  };

  const handleDeleteTaskConfirm = () => {
    showConfirm(
      'Удалить задачу?',
      'Вы уверены, что хотите удалить эту задачу? Это действие нельзя отменить.',
      async () => {
        try {
          await handleDeleteTask();
          showSuccess('Задача удалена');
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            // @ts-ignore
            navigation.navigate('Main', { screen: 'Tasks' });
          }
        } catch (error) {
          showError('Не удалось удалить задачу');
        }
      },
      undefined,
      { confirmText: 'Удалить', cancelText: 'Отмена', destructive: true }
    );
  };

  // Access denied state
  if (accessDenied) {
    return <TaskAccessDenied onGoBack={() => {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // @ts-ignore
        navigation.navigate('Main', { screen: 'Tasks' });
      }
    }} />;
  }

  // Флаг для показа контент-скелетона (нет задачи и идёт загрузка)
  const showContentSkeleton = isLoading && !task;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.card }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <ScreenHeader
            title="Задача"
            customContent={
              <View style={styles.customHeader}>
                {/* Left button */}
                <TouchableOpacity
                  onPress={() => {
                    if (navigation.canGoBack()) {
                      navigation.goBack();
                    } else {
                      // @ts-ignore
                      navigation.navigate('Main', { screen: 'Tasks' });
                    }
                  }}
                  style={styles.headerSideButton}
                >
                  <Ionicons name="close" size={24} color={theme.error} />
                </TouchableOpacity>

                {/* Title */}
                <View style={styles.headerTitleContainer}>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>Задача</Text>
                </View>

                {/* Desktop Status Action Buttons */}
                {isDesktop && task && permissions.can_change_status && !isDelegatedByMe && task.status !== 'done' && (
                  <View style={styles.headerActions}>
                    {task.status === 'new' && (
                      <TouchableOpacity
                        style={[styles.statusButton, { backgroundColor: theme.primary }]}
                        onPress={handleTaskAction}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="play-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.statusButtonText}>Начать работу</Text>
                      </TouchableOpacity>
                    )}

                    {task.status === 'in_progress' && (
                      <TouchableOpacity
                        style={[
                          styles.statusButton,
                          { backgroundColor: theme.success },
                          (!allSubtasksCompleted || !allChecklistItemsCompleted) && styles.statusButtonDisabled,
                        ]}
                        onPress={handleTaskAction}
                        disabled={!allSubtasksCompleted || !allChecklistItemsCompleted}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.statusButtonText}>
                          {isCreator ? 'Завершить' : 'Сдать на проверку'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {task.status === 'review' && isCreator && (
                      <>
                        <TouchableOpacity
                          style={[styles.statusButton, styles.statusButtonSecondary, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                          onPress={() => handleStatusChange('in_progress')}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="arrow-back-circle-outline" size={18} color={theme.text} />
                          <Text style={[styles.statusButtonText, { color: theme.text }]}>Вернуть</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.statusButton,
                            { backgroundColor: theme.success },
                            (!allSubtasksCompleted || !allChecklistItemsCompleted) && styles.statusButtonDisabled,
                          ]}
                          onPress={() => handleStatusChange('done')}
                          disabled={!allSubtasksCompleted || !allChecklistItemsCompleted}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                          <Text style={styles.statusButtonText}>Завершить</Text>
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                )}

                {/* Right button (3 dots menu) */}
                {task && (
                  permissions.can_edit ||
                  permissions.can_delegate ||
                  permissions.can_create_subtasks ||
                  permissions.can_emergency_complete ||
                  permissions.can_delete
                ) && (
                  <TouchableOpacity
                    ref={menuButtonRef}
                    onPress={handleOpenActionMenu}
                    style={styles.headerSideButton}
                  >
                    <Ionicons name="ellipsis-horizontal" size={24} color={theme.primary} />
                  </TouchableOpacity>
                )}
                {!(task && (
                  permissions.can_edit ||
                  permissions.can_delegate ||
                  permissions.can_create_subtasks ||
                  permissions.can_emergency_complete ||
                  permissions.can_delete
                )) && <View style={styles.headerSideButton} />}
              </View>
            }
            showDivider={false}
            withShadow={false}
            containerStyle={{ paddingTop: 14, paddingBottom: 14 }}
          />
        </View>

        {/* Content - Desktop Layout or Mobile Tabs */}
        {isDesktop ? (
          // Desktop Layout
          showContentSkeleton ? (
            <View style={[styles.card, { backgroundColor: theme.background }]}>
              <TaskContentSkeleton />
            </View>
          ) : task ? (
            <TaskDesktopLayout
              task={task}
              subtasks={subtasks}
              comments={comments}
              attachments={attachments}
              activities={activities}
              permissions={permissions}
              currentUserId={user?.id}
              isDelegatedByMe={isDelegatedByMe}
              newComment={newComment}
              setNewComment={setNewComment}
              isSendingComment={isSendingComment}
              hasMoreComments={hasMoreComments}
              isLoadingMoreComments={isLoadingMoreComments}
              editingCommentId={editingCommentId}
              editingCommentText={editingCommentText}
              setEditingCommentText={setEditingCommentText}
              isLoadingAttachments={isLoadingAttachments}
              isUploadingAttachment={isUploadingAttachment}
              isLoadingActivities={isLoadingActivities}
              onChecklistChanged={() => {
                loadTaskSilently();
                loadActivitiesSilently();
              }}
              onSubtaskPress={(subtask) => {
                // @ts-ignore
                navigation.push('TaskDetail', { taskId: subtask.id.toString() });
              }}
              onSubtaskCreated={() => {
                loadTaskSilently();
                loadActivitiesSilently();
              }}
              onCreateSubtaskPress={() => setShowSubtaskModal(true)}
              onUserPress={handleUserPress}
              onLoadMoreComments={loadMoreComments}
              onEditComment={editComment}
              onSaveEdit={handleSaveEditComment}
              onCancelEdit={cancelEdit}
              onDeleteComment={handleDeleteComment}
              onAttachmentPress={openAttachment}
              onAttachmentLongPress={handleAttachmentLongPress}
              onPickFile={handlePickFile}
              onSendComment={handleSendComment}
              onLoadActivities={() => {
                loadActivities().catch(() => showError('Не удалось загрузить историю'));
              }}
            />
          ) : null
        ) : (
          // Mobile Tabs Layout
          <View style={[styles.card, { backgroundColor: theme.background }]}>
            {/* Tabs */}
            <TaskTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              attachmentsCount={attachments.length}
              commentsCount={comments.length}
              isNarrowScreen={isNarrowScreen}
            />

            {/* Tab Content */}
            <ScrollView
              style={styles.tabContent}
              contentContainerStyle={{
                paddingBottom:
                  activeTab === 'comments' && !isDelegatedByMe && task?.status !== 'done'
                    ? insets.bottom + 170
                    : insets.bottom + 100,
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Показываем скелетон если нет задачи */}
              {showContentSkeleton && <TaskContentSkeleton />}

              {/* Реальный контент когда задача загружена */}
              {task && activeTab === 'overview' && (
                <TaskOverviewTab
                  task={task}
                  subtasks={subtasks}
                  permissions={permissions}
                  currentUserId={user?.id}
                  isDelegatedByMe={isDelegatedByMe}
                  onChecklistChanged={() => {
                    loadTaskSilently();
                    loadActivitiesSilently();
                  }}
                  onSubtaskPress={(subtask) => {
                    // @ts-ignore
                    navigation.push('TaskDetail', { taskId: subtask.id.toString() });
                  }}
                  onSubtaskCreated={() => {
                    loadTaskSilently();
                    loadActivitiesSilently();
                  }}
                  onCreateSubtaskPress={() => setShowSubtaskModal(true)}
                  onUserPress={handleUserPress}
                />
              )}

              {task && activeTab === 'attachments' && (
                <TaskAttachmentsTab
                  attachments={attachments}
                  isLoading={isLoadingAttachments}
                  isUploading={isUploadingAttachment}
                  canUpload={!isDelegatedByMe && task.status !== 'done'}
                  currentUserId={user?.id}
                  onAttachmentPress={openAttachment}
                  onAttachmentLongPress={handleAttachmentLongPress}
                  onPickFile={handlePickFile}
                />
              )}

              {task && activeTab === 'comments' && (
                <TaskCommentsTab
                  comments={comments}
                  hasMoreComments={hasMoreComments}
                  isLoadingMore={isLoadingMoreComments}
                  editingCommentId={editingCommentId}
                  editingCommentText={editingCommentText}
                  currentUserId={user?.id}
                  onLoadMore={loadMoreComments}
                  onEditComment={editComment}
                  onSaveEdit={handleSaveEditComment}
                  onCancelEdit={cancelEdit}
                  onDeleteComment={handleDeleteComment}
                  onUserPress={handleUserPress}
                  setEditingCommentText={setEditingCommentText}
                />
              )}

              {task && activeTab === 'history' && (
                <TaskHistoryTab
                  activities={activities}
                  isLoading={isLoadingActivities}
                  task={task}
                  currentUserId={user?.id}
                  onUserPress={handleUserPress}
                />
              )}
            </ScrollView>
          </View>
        )}

        {/* Fixed Action Buttons - только для мобильной версии */}
        {!isDesktop && task && (
          <TaskActionButtons
            task={task}
            activeTab={activeTab}
            isCreator={isCreator}
            allSubtasksCompleted={allSubtasksCompleted}
            allChecklistItemsCompleted={allChecklistItemsCompleted}
            isDelegatedByMe={isDelegatedByMe}
            canChangeStatus={permissions.can_change_status}
            newComment={newComment}
            isSendingComment={isSendingComment}
            onNewCommentChange={setNewComment}
            onSendComment={handleSendComment}
            onTaskAction={handleTaskAction}
            onStatusChange={handleStatusChange}
            bottomInset={insets.bottom}
          />
        )}

        {/* Modals */}
        {task && (
          <>
            <ShareTaskModal
              visible={showShareModal}
              onClose={() => setShowShareModal(false)}
              task={task}
              onShare={async (_chatId) => {
                showSuccess('Задача отправлена в чат');
              }}
            />

            <EditTaskModal
              visible={showEditModal}
              task={task}
              onClose={() => setShowEditModal(false)}
              onTaskUpdated={() => {
                loadTaskSilently();
                loadActivitiesSilently();
                setShowEditModal(false);
              }}
            />

            {permissions.can_create_subtasks && (
              <CreateSubtaskModal
                visible={showSubtaskModal}
                parentTaskId={task.id}
                onClose={() => setShowSubtaskModal(false)}
                onSubtaskCreated={async (subtaskId) => {
                  setShowSubtaskModal(false);
                  // Reload task data (this will also load subtasks)
                  await loadTaskSilently();
                  await loadActivitiesSilently();
                }}
              />
            )}

            {(user?.role === 'admin' ||
              user?.role === 'super_admin' ||
              user?.role === 'department_head') && (
              <DelegateTaskModal
                visible={showDelegateModal}
                taskId={task.id}
                onClose={() => setShowDelegateModal(false)}
                onDelegated={() => {
                  setShowDelegateModal(false);
                  loadTaskSilently();
                  loadActivitiesSilently();
                  showSuccess('Задача успешно делегирована');
                }}
              />
            )}
          </>
        )}

        <UserProfileModal
          visible={showProfileModal}
          userId={selectedUserId}
          onClose={() => {
            setShowProfileModal(false);
            setSelectedUserId(null);
          }}
          onOpenChat={handleOpenChat}
        />

        {task && (
          <TaskActionMenu
            visible={showActionMenu}
            task={task}
            permissions={permissions}
            onClose={() => setShowActionMenu(false)}
            onEdit={() => setShowEditModal(true)}
            onDelegate={() => setShowDelegateModal(true)}
            onAddSubtask={() => setShowSubtaskModal(true)}
            onEmergencyComplete={handleEmergencyCompleteConfirm}
            onDelete={handleDeleteTaskConfirm}
            isDesktop={isDesktop}
            buttonPosition={menuButtonPosition}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  card: {
    flex: 1,
    overflow: 'hidden',
  },
  tabContent: {
    flex: 1,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerSideButton: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusButtonSecondary: {
    borderWidth: 1,
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusButtonDisabled: {
    opacity: 0.5,
  },
});

export default TaskDetailScreen;
