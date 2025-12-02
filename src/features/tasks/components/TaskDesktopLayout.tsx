/**
 * Task Desktop Layout
 * Компонент для отображения деталей задачи на широких экранах
 * Layout: Три равные колонки - Обзор, Вложения, Комментарии
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task, TaskComment, TaskAttachment, TaskActivity } from '../types/task.types';
import type { useTaskPermissions } from '../hooks/useTaskPermissions';
import { TaskOverviewTab } from './TaskOverviewTab';
import { TaskAttachmentsTab } from './TaskAttachmentsTab';
import { TaskCommentsTab } from './TaskCommentsTab';
import { TaskHistoryTab } from './TaskHistoryTab';

type TaskPermissions = ReturnType<typeof useTaskPermissions>;

interface TaskDesktopLayoutProps {
  task: Task;
  subtasks: Task[];
  comments: TaskComment[];
  attachments: TaskAttachment[];
  activities: TaskActivity[];
  permissions: TaskPermissions;
  currentUserId?: number;
  isDelegatedByMe: boolean;

  // Comments props
  newComment: string;
  setNewComment: (value: string) => void;
  isSendingComment: boolean;
  hasMoreComments: boolean;
  isLoadingMoreComments: boolean;
  editingCommentId: number | null;
  editingCommentText: string;
  setEditingCommentText: (value: string) => void;

  // Attachments props
  isLoadingAttachments: boolean;
  isUploadingAttachment: boolean;

  // Activities props
  isLoadingActivities: boolean;

  // Callbacks
  onChecklistChanged: () => void;
  onSubtaskPress: (subtask: Task) => void;
  onSubtaskCreated: () => void;
  onCreateSubtaskPress: () => void;
  onUserPress: (userId: number) => void;
  onLoadMoreComments: () => void;
  onEditComment: (comment: TaskComment) => void;
  onSaveEdit: (commentId: number) => void;
  onCancelEdit: () => void;
  onDeleteComment: (commentId: number) => void;
  onAttachmentPress: (attachment: TaskAttachment) => void;
  onAttachmentLongPress: (attachment: TaskAttachment) => void;
  onPickFile: () => void;
  onSendComment: () => void;
  onLoadActivities?: () => void;
}

export const TaskDesktopLayout: React.FC<TaskDesktopLayoutProps> = ({
  task,
  subtasks,
  comments,
  attachments,
  activities,
  permissions,
  currentUserId,
  isDelegatedByMe,
  newComment,
  setNewComment,
  isSendingComment,
  hasMoreComments,
  isLoadingMoreComments,
  editingCommentId,
  editingCommentText,
  setEditingCommentText,
  isLoadingAttachments,
  isUploadingAttachment,
  isLoadingActivities,
  onChecklistChanged,
  onSubtaskPress,
  onSubtaskCreated,
  onCreateSubtaskPress,
  onUserPress,
  onLoadMoreComments,
  onEditComment,
  onSaveEdit,
  onCancelEdit,
  onDeleteComment,
  onAttachmentPress,
  onAttachmentLongPress,
  onPickFile,
  onSendComment,
  onLoadActivities,
}) => {
  const { theme } = useTheme();
  const [historyExpanded, setHistoryExpanded] = useState(false);

  // Load activities on mount to show count badge
  useEffect(() => {
    if (activities.length === 0 && onLoadActivities) {
      onLoadActivities();
    }
  }, []);

  const handleHistoryToggle = () => {
    setHistoryExpanded(!historyExpanded);
  };

  return (
    <View style={styles.container}>
      {/* Main Content Area - Three Columns */}
      <View style={styles.mainContent}>
        {/* Left Column - Overview */}
        <View style={styles.column}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.card, { backgroundColor: theme.card }]}>
              <TaskOverviewTab
                task={task}
                subtasks={subtasks}
                permissions={permissions}
                currentUserId={currentUserId}
                isDelegatedByMe={isDelegatedByMe}
                onChecklistChanged={onChecklistChanged}
                onSubtaskPress={onSubtaskPress}
                onSubtaskCreated={onSubtaskCreated}
                onCreateSubtaskPress={onCreateSubtaskPress}
                onUserPress={onUserPress}
              />
            </View>
          </ScrollView>
        </View>

        {/* Middle Column - Attachments */}
        <View style={styles.column}>
          <View style={[styles.card, styles.fullHeightCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="attach" size={20} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Вложения
                </Text>
                {attachments.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.badgeText}>{attachments.length}</Text>
                  </View>
                )}
              </View>
            </View>
            <ScrollView
              style={styles.cardContent}
              contentContainerStyle={styles.cardScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <TaskAttachmentsTab
                attachments={attachments}
                isLoading={isLoadingAttachments}
                isUploading={isUploadingAttachment}
                canUpload={!isDelegatedByMe && task.status !== 'done'}
                currentUserId={currentUserId}
                onAttachmentPress={onAttachmentPress}
                onAttachmentLongPress={onAttachmentLongPress}
                onPickFile={onPickFile}
              />
            </ScrollView>
          </View>
        </View>

        {/* Right Column - Comments */}
        <View style={styles.column}>
          <View style={[styles.card, styles.fullHeightCard, { backgroundColor: theme.card }]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <Ionicons name="chatbubble-outline" size={20} color={theme.primary} />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Комментарии
                </Text>
                {comments.length > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.badgeText}>{comments.length}</Text>
                  </View>
                )}
              </View>
            </View>
            <ScrollView style={styles.cardContent} showsVerticalScrollIndicator={false}>
              <View style={styles.commentsContent}>
                <TaskCommentsTab
                  comments={comments}
                  hasMoreComments={hasMoreComments}
                  isLoadingMore={isLoadingMoreComments}
                  editingCommentId={editingCommentId}
                  editingCommentText={editingCommentText}
                  currentUserId={currentUserId}
                  onLoadMore={onLoadMoreComments}
                  onEditComment={onEditComment}
                  onSaveEdit={onSaveEdit}
                  onCancelEdit={onCancelEdit}
                  onDeleteComment={onDeleteComment}
                  onUserPress={onUserPress}
                  setEditingCommentText={setEditingCommentText}
                />
              </View>
            </ScrollView>
            {/* Comment Input */}
            {!isDelegatedByMe && task.status !== 'done' && (
              <View style={[styles.commentInputContainer, { borderTopColor: theme.border }]}>
                <TextInput
                  style={[styles.commentInput, {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  }]}
                  placeholder="Написать комментарий..."
                  placeholderTextColor={theme.textSecondary}
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={1000}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: newComment.trim() && !isSendingComment ? theme.primary : theme.backgroundTertiary }
                  ]}
                  onPress={onSendComment}
                  disabled={!newComment.trim() || isSendingComment}
                >
                  {isSendingComment ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* History Section (раскрывающаяся секция внизу) */}
      <View style={[styles.historySection, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.historyHeader, { backgroundColor: theme.card }]}
          onPress={handleHistoryToggle}
          activeOpacity={0.7}
        >
          <View style={styles.historyHeaderLeft}>
            <Ionicons name="time-outline" size={20} color={theme.primary} />
            <Text style={[styles.historyTitle, { color: theme.text }]}>
              История изменений
            </Text>
            {activities.length > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.backgroundTertiary }]}>
                <Text style={[styles.badgeText, { color: theme.textSecondary }]}>
                  {activities.length}
                </Text>
              </View>
            )}
          </View>
          <Ionicons
            name={historyExpanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={theme.textSecondary}
          />
        </TouchableOpacity>

        {historyExpanded && (
          <ScrollView
            style={[styles.historyContent, { backgroundColor: theme.card }]}
            showsVerticalScrollIndicator={false}
          >
            <TaskHistoryTab
              activities={activities}
              isLoading={isLoadingActivities}
              task={task}
              currentUserId={currentUserId}
              onUserPress={onUserPress}
            />
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  column: {
    flex: 1,
    minWidth: 350,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  card: {
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fullHeightCard: {
    flex: 1,
    display: 'flex',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardScrollContent: {
    padding: 16,
  },
  commentsContent: {
    padding: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySection: {
    borderTopWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyContent: {
    maxHeight: 400,
  },
});
