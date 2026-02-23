/**
 * Task Desktop Layout
 * Компонент для отображения деталей задачи на широких экранах
 * Layout: Две колонки - Обзор (слева) + Табы: Вложения/Комментарии/История (справа)
 */

import React, { useState } from 'react';
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
type DesktopTabType = 'attachments' | 'comments' | 'history';

const TAB_CONFIG: { key: DesktopTabType; icon: string; label: string }[] = [
  { key: 'attachments', icon: 'attach-outline', label: 'Вложения' },
  { key: 'comments', icon: 'chatbubble-outline', label: 'Комментарии' },
  { key: 'history', icon: 'time-outline', label: 'История' },
];

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
  const { theme, isDark } = useTheme();
  const cardBgColor = isDark ? theme.card : '#FFFFFF';
  const [activeRightTab, setActiveRightTab] = useState<DesktopTabType>('attachments');
  const [hoveredCard, setHoveredCard] = useState<'left' | 'right' | null>(null);
  const [hoveredTab, setHoveredTab] = useState<DesktopTabType | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const handleTabChange = (tab: DesktopTabType) => {
    setActiveRightTab(tab);
    if (tab === 'history' && !historyLoaded && onLoadActivities) {
      onLoadActivities();
      setHistoryLoaded(true);
    }
  };

  const getBadgeCount = (tab: DesktopTabType): number => {
    switch (tab) {
      case 'attachments': return attachments.length;
      case 'comments': return comments.length;
      case 'history': return activities.length;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.columnsRow}>
        {/* LEFT COLUMN - Task Overview */}
        <View
          style={styles.leftColumn}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredCard('left') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredCard(null) : undefined}
        >
          <View style={[
            styles.leftCard,
            { backgroundColor: cardBgColor, borderColor: theme.border },
            hoveredCard === 'left' && styles.cardHovered,
          ]}>
            {/* Left card header */}
            <View style={[styles.leftCardHeader, { borderBottomColor: theme.border }]}>
              <Ionicons name="clipboard-outline" size={18} color={theme.primary} />
              <Text style={[styles.leftCardTitle, { color: theme.text }]}>Задача</Text>
            </View>
            <ScrollView
              style={[styles.leftCardScroll, { backgroundColor: theme.background }]}
              contentContainerStyle={styles.leftCardContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
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
            </ScrollView>
          </View>
        </View>

        {/* RIGHT COLUMN - Tabbed Panel */}
        <View
          style={styles.rightColumn}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setHoveredCard('right') : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setHoveredCard(null) : undefined}
        >
          <View style={[
            styles.rightCard,
            { backgroundColor: cardBgColor, borderColor: theme.border },
            hoveredCard === 'right' && styles.cardHovered,
          ]}>
            {/* Right card header */}
            <View style={[styles.rightCardHeader, { borderBottomColor: theme.border }]}>
              <Ionicons name="document-text-outline" size={18} color={theme.primary} />
              <Text style={[styles.rightCardTitle, { color: theme.text }]}>Детали</Text>
            </View>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
              {TAB_CONFIG.map(({ key, icon, label }) => {
                const isActive = activeRightTab === key;
                const isHovered = hoveredTab === key;
                const count = getBadgeCount(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.tabItem,
                      isActive && { borderBottomColor: theme.primary },
                      isHovered && !isActive && styles.tabItemHovered,
                    ]}
                    onPress={() => handleTabChange(key)}
                    activeOpacity={0.7}
                    // @ts-ignore - web-only props
                    onMouseEnter={Platform.OS === 'web' ? () => setHoveredTab(key) : undefined}
                    onMouseLeave={Platform.OS === 'web' ? () => setHoveredTab(null) : undefined}
                  >
                    <Ionicons
                      name={icon as any}
                      size={18}
                      color={isActive ? theme.primary : theme.textSecondary}
                    />
                    <Text style={[
                      styles.tabLabel,
                      { color: isActive ? theme.primary : theme.textSecondary },
                      isActive && { fontWeight: '700' },
                    ]}>
                      {label}
                    </Text>
                    {count > 0 && (
                      <View style={[
                        styles.tabBadge,
                        { backgroundColor: isActive ? theme.primary : theme.backgroundTertiary },
                      ]}>
                        <Text style={[
                          styles.tabBadgeText,
                          { color: isActive ? '#FFFFFF' : theme.textSecondary },
                        ]}>
                          {count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tab Content */}
            {activeRightTab === 'attachments' && (
              <ScrollView
                style={[styles.tabContent, { backgroundColor: theme.background }]}
                contentContainerStyle={styles.tabContentInner}
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
            )}

            {activeRightTab === 'comments' && (
              <View style={[styles.commentsContainer, { backgroundColor: theme.background }]}>
                <ScrollView
                  style={styles.tabContent}
                  contentContainerStyle={styles.commentsScrollContent}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                >
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
                </ScrollView>
                {/* Comment Input - pinned at bottom */}
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
            )}

            {activeRightTab === 'history' && (
              <ScrollView
                style={[styles.tabContent, { backgroundColor: theme.background }]}
                contentContainerStyle={styles.tabContentInner}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  columnsRow: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },

  // Left column
  leftColumn: {
    flex: 2,
    minWidth: 360,
    maxWidth: 600,
  },
  leftCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transitionProperty: 'box-shadow, transform',
        transitionDuration: '0.2s',
        transitionTimingFunction: 'ease-out',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  leftCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  leftCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  leftCardScroll: {
    flex: 1,
  },
  leftCardContent: {
    paddingBottom: 20,
  },

  // Right column
  rightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rightCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  rightColumn: {
    flex: 3,
    minWidth: 400,
  },
  rightCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        transitionProperty: 'box-shadow, transform',
        transitionDuration: '0.2s',
        transitionTimingFunction: 'ease-out',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transitionProperty: 'border-color, background-color',
        transitionDuration: '0.15s',
      },
    }),
  },
  tabItemHovered: {
    ...Platform.select({
      web: {
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
      },
    }),
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: 20,
  },

  // Comments specific
  commentsContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  commentsScrollContent: {
    padding: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
  },
  commentInput: {
    flex: 1,
    height: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 18,
    borderWidth: 1.5,
    ...Platform.select({
      web: {
        transitionProperty: 'border-color, box-shadow',
        transitionDuration: '0.2s',
        outlineStyle: 'none' as any,
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
});
