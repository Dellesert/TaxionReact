/**
 * Task Desktop Layout
 * Компонент для отображения деталей задачи на широких экранах
 * Layout: Три равные колонки - Обзор, Вложения, Комментарии
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import type { Task, TaskComment, TaskAttachment, TaskActivity } from '../../types/task.types';
import type { useTaskPermissions } from '../../hooks/useTaskPermissions';
import { TaskOverviewTab } from '../detail-tabs/TaskOverviewTab';
import { TaskAttachmentsTab } from '../detail-tabs/TaskAttachmentsTab';
import { TaskCommentsTab } from '../detail-tabs/TaskCommentsTab';
import { TaskHistoryTab } from '../detail-tabs/TaskHistoryTab';

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
  const [hoveredSection, setHoveredSection] = useState<'overview' | 'attachments' | 'comments' | 'history' | null>(null);

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
      {/* Main Content Area - Three Columns with Horizontal Scroll */}
      <ScrollView
        horizontal
        style={styles.mainContentScrollView}
        contentContainerStyle={styles.mainContent}
        showsHorizontalScrollIndicator={true}
      >
        {/* Left Column - Overview */}
        <View
          style={styles.column}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredSection('overview') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredSection(null) : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            <View style={[
              styles.card,
              { backgroundColor: theme.card },
              hoveredSection === 'overview' && styles.cardHovered,
            ]}>
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
        <View
          style={styles.column}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredSection('attachments') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredSection(null) : undefined}
        >
          <View style={[
            styles.card,
            styles.fullHeightCard,
            { backgroundColor: theme.card },
            hoveredSection === 'attachments' && styles.cardHovered,
          ]}>
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
              nestedScrollEnabled={true}
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
        <View
          style={styles.column}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredSection('comments') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredSection(null) : undefined}
        >
          <View style={[
            styles.card,
            styles.fullHeightCard,
            { backgroundColor: theme.card },
            hoveredSection === 'comments' && styles.cardHovered,
          ]}>
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
            <ScrollView style={styles.cardContent} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
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
      </ScrollView>

      {/* History Section (раскрывающаяся секция внизу) */}
      <View style={[styles.historySection, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.historyHeader,
            { backgroundColor: theme.card },
            hoveredSection === 'history' && styles.historyHeaderHovered,
          ]}
          onPress={handleHistoryToggle}
          activeOpacity={0.7}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredSection('history') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredSection(null) : undefined}
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
            nestedScrollEnabled={true}
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
  mainContentScrollView: {
    flex: 1,
  },
  mainContent: {
    flexDirection: 'row',
    padding: 20,
    gap: 20,
    minWidth: '100%',
    minHeight: '100%',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  column: {
    width: 360,
    minWidth: 280,
    height: '100%',
  },
  scrollView: {
    height: '100%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  card: {
    borderRadius: 16,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
        transitionProperty: 'box-shadow, transform',
        transitionDuration: '0.2s',
        transitionTimingFunction: 'ease-out',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  cardHovered: {
    ...Platform.select({
      web: {
        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12), 0 4px 10px rgba(0, 0, 0, 0.06)',
        transform: 'translateY(-2px)',
      },
      default: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
      },
    }),
  },
  fullHeightCard: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardScrollContent: {
    padding: 20,
  },
  commentsContent: {
    padding: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    height: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 18,
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        transitionProperty: 'border-color, box-shadow',
        transitionDuration: '0.2s',
        outlineStyle: 'none',
      },
    }),
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    ...Platform.select({
      web: {
        transitionProperty: 'transform, box-shadow',
        transitionDuration: '0.15s',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  historySection: {
    borderTopWidth: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    ...Platform.select({
      web: {
        transitionProperty: 'background-color',
        transitionDuration: '0.15s',
        cursor: 'pointer',
      },
    }),
  },
  historyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  historyHeaderHovered: {
    ...Platform.select({
      web: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
      },
    }),
  },
  historyContent: {
    maxHeight: 500,
  },
});
