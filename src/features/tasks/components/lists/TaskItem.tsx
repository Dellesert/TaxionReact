/**
 * Task Item Component
 * Компонент карточки задачи
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority } from '../../types/task.types';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@shared/components/common/Avatar';
import { useTaskPrefetch } from '@shared/hooks/useTaskPrefetch';

// Circular Progress Indicator Component
const ProgressIndicator: React.FC<{
  progress: number;
  size: number;
  color: string;
  backgroundColor: string;
}> = ({ progress, size, color, backgroundColor }) => {
  const borderWidth = 2.5;

  // Calculate which parts of the border to show in color based on progress
  const showTop = progress >= 5;
  const showTopRight = progress >= 15;
  const showRight = progress >= 30;
  const showBottomRight = progress >= 45;
  const showBottom = progress >= 60;
  const showBottomLeft = progress >= 75;
  const showLeft = progress >= 90;
  const showTopLeft = progress >= 95;

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: 'transparent',
      position: 'relative',
    }}>
      {/* Base circle background */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: borderWidth,
        borderColor: backgroundColor,
      }} />

      {/* Progress segments */}
      {showTop && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showTopRight && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
      {showRight && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderRightColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showBottomRight && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderRightColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
      {showBottom && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showBottomLeft && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
      {showLeft && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderLeftColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showTopLeft && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderLeftColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
    </View>
  );
};

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onShare?: (task: Task) => void;
  isSubtask?: boolean;
  subtasks?: Task[];
  onSubtaskPress?: (subtask: Task) => void;
  forceExpanded?: boolean;
  isLastSubtask?: boolean;
  isKanbanMode?: boolean;
}

// Priority labels and colors
const getPriorityConfig = (isDark: boolean): Record<TaskPriority, { label: string; color: string; bg: string; badgeColor: string }> => ({
  low: {
    label: 'Низкий',
    color: isDark ? '#34d399' : '#10b981',
    bg: isDark ? '#064e3b' : '#d1fae5',
    badgeColor: isDark ? '#059669' : '#10b981'
  },
  medium: {
    label: 'Средний',
    color: isDark ? '#60a5fa' : '#3b82f6',
    bg: isDark ? '#1e3a8a' : '#dbeafe',
    badgeColor: isDark ? '#2563eb' : '#3b82f6'
  },
  high: {
    label: 'Высокий',
    color: isDark ? '#fbbf24' : '#f59e0b',
    bg: isDark ? '#78350f' : '#fef3c7',
    badgeColor: isDark ? '#d97706' : '#f59e0b'
  },
  critical: {
    label: 'Критичный',
    color: isDark ? '#f87171' : '#ef4444',
    bg: isDark ? '#7f1d1d' : '#fee2e2',
    badgeColor: isDark ? '#dc2626' : '#ef4444'
  },
});

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onPress,
  onShare,
  isSubtask = false,
  subtasks = [],
  onSubtaskPress,
  forceExpanded = false,
  isLastSubtask = false,
  isKanbanMode = false,
}) => {
  const { theme, isDark } = useTheme();
  const { user: currentUser } = useAuthStore();
  const [expanded, setExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Prefetch hook for preloading task details
  const { prefetchTaskDelayed } = useTaskPrefetch();

  // Handle press in - start prefetch
  const handlePressIn = useCallback(() => {
    prefetchTaskDelayed(task.id);
  }, [task.id, prefetchTaskDelayed]);

  // Use forceExpanded if provided, otherwise use local state
  const isExpanded = forceExpanded || expanded;

  const hasSubtasks = subtasks && subtasks.length > 0;

  // Get priority config based on theme
  const PRIORITY_CONFIG = getPriorityConfig(isDark);

  // Helper function to get status badge info for subtasks
  const getSubtaskStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return {
          icon: 'checkmark-circle' as const,
          color: '#10b981',
          bgColor: '#d1fae5',
          label: 'Выполнено',
        };
      case 'in_progress':
        return {
          icon: 'time' as const,
          color: '#3b82f6',
          bgColor: '#dbeafe',
          label: 'В работе',
        };
      case 'review':
        return {
          icon: 'eye' as const,
          color: '#8b5cf6',
          bgColor: '#f3e8ff',
          label: 'На проверке',
        };
      case 'new':
        return {
          icon: 'radio-button-on' as const,
          color: '#f59e0b',
          bgColor: '#fef3c7',
          label: 'Новая',
        };
      case 'viewed':
        return {
          icon: 'eye-outline' as const,
          color: '#6b7280',
          bgColor: '#f3f4f6',
          label: 'Просмотрено',
        };
      default:
        return null;
    }
  };

  // Format date for deadline
  const formatDeadline = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === -1) return 'Вчера';
    if (diffDays > 1 && diffDays <= 7) return `Через ${diffDays} дн.`;
    if (diffDays < 0) return `Просрочено на ${Math.abs(diffDays)} дн.`;

    return format(date, 'd MMMM', { locale: ru });
  };

  // Check if task is overdue
  const isOverdue =
    task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done';

  // Get priority config
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  // Helper function to format user name (replace current user with "Я")
  const formatUserName = (userName: string, userId?: number): string => {
    if (currentUser && userId === currentUser.id) {
      return 'Я';
    }
    return userName;
  };

  // Build delegation chain display
  const renderDelegationChain = () => {
    const avatarSize = isKanbanMode ? 16 : 18;
    const textStyle = isKanbanMode ? styles.kanbanDelegationText : styles.delegationText;

    // Priority: use delegation_chain if available
    if (task.delegation_chain && task.delegation_chain.length > 0) {
      return (
        <View style={styles.delegationChain}>
          <View style={styles.avatarChain}>
            {task.delegation_chain.map((user, index) => (
              <View key={user.id} style={styles.chainItem}>
                <Avatar
                  name={user.name}
                  imageUrl={user.avatar}
                  size={avatarSize}
                />
                <Text style={[textStyle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {formatUserName(user.name, user.id)}
                </Text>
                {index < task.delegation_chain!.length - 1 && (
                  <Text style={[styles.chainArrow, isKanbanMode && styles.kanbanChainArrow]}>→</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Fallback: show creator -> assignees if available
    const chain: { name: string; id?: number; avatar?: string }[] = [];

    if (task.creator) {
      chain.push({
        name: task.creator.name,
        id: task.creator.id,
        avatar: task.creator.avatar,
      });
    }

    if (task.assignees && task.assignees.length > 0) {
      task.assignees.forEach((assignee) => {
        if (!chain.find(u => u.id === assignee.id)) {
          chain.push({
            name: assignee.name,
            id: assignee.id,
            avatar: assignee.avatar,
          });
        }
      });
    } else if (task.assignee) {
      if (!chain.find(u => u.id === task.assignee!.id)) {
        chain.push({
          name: task.assignee.name,
          id: task.assignee.id,
          avatar: task.assignee.avatar,
        });
      }
    }

    if (chain.length > 1) {
      return (
        <View style={styles.delegationChain}>
          <View style={styles.avatarChain}>
            {chain.map((user, index) => (
              <View key={user.id || index} style={styles.chainItem}>
                <Avatar
                  name={user.name}
                  imageUrl={user.avatar}
                  size={avatarSize}
                />
                <Text style={[textStyle, { color: theme.textSecondary }]} numberOfLines={1}>
                  {formatUserName(user.name, user.id)}
                </Text>
                {index < chain.length - 1 && (
                  <Text style={[styles.chainArrow, isKanbanMode && styles.kanbanChainArrow]}>→</Text>
                )}
              </View>
            ))}
          </View>
        </View>
      );
    }

    // Just show creator or assignee
    if (task.creator) {
      return (
        <View style={styles.delegationChain}>
          <View style={styles.chainItem}>
            <Avatar
              name={task.creator.name}
              imageUrl={task.creator.avatar}
              size={avatarSize}
            />
            <Text style={[textStyle, { color: theme.textSecondary }]} numberOfLines={1}>
              {formatUserName(task.creator.name, task.creator.id)}
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  // Count attachments
  const attachmentCount = task.attachments?.length || 0;

  const isCompleted = task.status === 'done';

  // Check if task is delegated BY current user (user delegated it to someone else)
  // Show badge if user delegated the task (delegated_from_user_id = current user)
  const isDelegatedByMe = currentUser &&
    task.delegated_from_user_id === currentUser.id;

  // Get status info for hover effect
  const STATUS_TABS = [
    { key: 'new', label: 'Новые', color: '#F59E0B', icon: 'document-text' },
    { key: 'in_progress', label: 'В работе', color: '#3B82F6', icon: 'time' },
    { key: 'review', label: 'Проверка', color: '#8B5CF6', icon: 'eye' },
    { key: 'done', label: 'Готово', color: '#10B981', icon: 'checkmark-circle' },
  ];
  const statusInfo = STATUS_TABS.find(tab => tab.key === task.status);

  return (
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        {/* Subtask Connector Icon */}
        {isSubtask && (
          <>
            {/* Vertical line segment - full for non-last, partial for last */}
            {isLastSubtask ? (
              <View style={[styles.subtaskLastVerticalLine, { backgroundColor: theme.border }]} />
            ) : (
              <View style={[styles.subtaskFullVerticalLine, { backgroundColor: theme.border }]} />
            )}
            {/* Horizontal line from vertical line to subtask */}
            <View style={[styles.subtaskHorizontalLine, { backgroundColor: theme.border }]} />
            <View style={[styles.subtaskConnector, { backgroundColor: theme.background }]}>
              {(() => {
                const statusBadge = getSubtaskStatusBadge(task.status);
                if (statusBadge) {
                  return <Ionicons name={statusBadge.icon} size={18} color={statusBadge.color} />;
                }
                return <Text style={styles.subtaskConnectorIcon}>└─</Text>;
              })()}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: isHovered ? (statusInfo?.color || theme.primary) : theme.border,
            },
            isSubtask && styles.subtaskCard,
            isKanbanMode && styles.kanbanCard,
            isHovered && styles.cardHovered,
          ]}
          onPress={() => onPress(task)}
          onPressIn={handlePressIn}
          activeOpacity={0.7}
          // @ts-ignore - web-only props
          onMouseEnter={Platform.OS === 'web' ? () => setIsHovered(true) : undefined}
          onMouseLeave={Platform.OS === 'web' ? () => setIsHovered(false) : undefined}
        >
          {/* Priority Badge - горизонтальная лента в правом верхнем углу */}
          <View
            style={[
              isSubtask ? styles.priorityBadgeCornerSubtask : styles.priorityBadgeCorner,
              { backgroundColor: priorityConfig.badgeColor },
              isCompleted && styles.priorityBadgeCornerCompleted,
            ]}
          >
            <Text style={[
              styles.priorityTextCorner,
              isSubtask && styles.priorityTextCornerSubtask,
            ]}>
              {priorityConfig.label}
            </Text>
          </View>

          {/* Share Button */}
          {onShare && !isSubtask && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => onShare(task)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}

        {/* Title */}
        <Text style={[
          styles.title,
          { color: theme.text },
          isSubtask && styles.subtaskTitle,
          isCompleted && styles.completedTitle,
          isKanbanMode && styles.kanbanTitle,
        ]} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Delegated Badge - под заголовком для основных задач */}
        {isDelegatedByMe && !isSubtask && (
          <View style={[
            styles.delegatedBadgeInline,
            { backgroundColor: isDark ? '#4c1d95' : '#f3e8ff' }
          ]}>
            <Ionicons name="eye" size={14} color={isDark ? '#a78bfa' : '#8b5cf6'} />
            <Text style={[styles.delegatedTextInline, { color: isDark ? '#a78bfa' : '#8b5cf6' }]}>Делегировано</Text>
          </View>
        )}

        {/* Divider after title in Kanban mode */}
        {isKanbanMode && !isSubtask && (
          <View style={[styles.kanbanDivider, { backgroundColor: theme.border }]} />
        )}

        {/* Delegation Chain - в отдельной строке в режиме Kanban */}
        {isKanbanMode && !isSubtask && (
          <View style={styles.kanbanDelegationRow}>
            {renderDelegationChain()}
          </View>
        )}

        {/* Deadline - aligned left in Kanban mode */}
        {task.due_date && !isCompleted && isKanbanMode && (
          <View style={styles.kanbanDeadlineRow}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={isOverdue ? '#ef4444' : '#6b7280'}
            />
            <Text
              style={[
                styles.kanbanDeadlineText,
                { color: isOverdue ? '#ef4444' : '#6b7280' },
                isOverdue && styles.overdueText,
              ]}
            >
              {formatDeadline(task.due_date)}
            </Text>
          </View>
        )}

        {/* Tags - show first 2 tags in Kanban mode */}
        {isKanbanMode && task.tags && task.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {task.tags.slice(0, 2).map((tag, index) => (
              <View key={index} style={[styles.tagBadge, {
                backgroundColor: `${statusInfo?.color || theme.primary}15`,
                borderColor: `${statusInfo?.color || theme.primary}40`,
              }]}>
                <Text style={[styles.tagText, { color: statusInfo?.color || theme.primary }]}>
                  {tag}
                </Text>
              </View>
            ))}
            {task.tags.length > 2 && (
              <Text style={[styles.tagMoreText, { color: theme.textSecondary }]}>
                +{task.tags.length - 2}
              </Text>
            )}
          </View>
        )}

        {/* Footer: Delegation Chain (non-kanban) + Meta Info */}
        <View style={[styles.footer, isKanbanMode && styles.kanbanFooter]}>
          {!isKanbanMode && (
            <View style={[styles.footerLeft, isCompleted && styles.completedFooter]}>
              {renderDelegationChain()}
            </View>
          )}

          <View style={[styles.metaInfo, isKanbanMode && styles.kanbanMetaInfo]}>
            {attachmentCount > 0 && (
              <View style={[styles.attachmentBadge, isCompleted && styles.completedAttachmentBadge]}>
                <Ionicons name="attach" size={isSubtask ? 14 : 16} color={isCompleted ? '#9ca3af' : '#6b7280'} />
                <Text style={[
                  styles.attachmentCount,
                  isSubtask && styles.subtaskAttachmentCount,
                  isCompleted && styles.completedAttachmentText,
                ]}>{attachmentCount}</Text>
              </View>
            )}
            {/* Progress for tasks without subtasks (always show) */}
            {!hasSubtasks && !isSubtask && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>
                  {task.progress_percentage}%
                </Text>
                <ProgressIndicator
                  progress={task.progress_percentage}
                  size={16}
                  color={task.progress_percentage === 100 ? '#10B981' : theme.primary}
                  backgroundColor={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}
                />
              </View>
            )}
            {task.comment_count > 0 && isKanbanMode && !hasSubtasks && (
              <View style={[styles.attachmentBadge, isCompleted && styles.completedAttachmentBadge]}>
                <Ionicons name="chatbubble-outline" size={14} color={isCompleted ? '#9ca3af' : '#6b7280'} />
                <Text style={[
                  styles.attachmentCount,
                  isSubtask && styles.subtaskAttachmentCount,
                  isCompleted && styles.completedAttachmentText,
                ]}>{task.comment_count}</Text>
              </View>
            )}
            {/* Progress for subtasks with progress > 0 */}
            {isSubtask && task.progress_percentage !== undefined && task.progress_percentage > 0 && (
              <View style={styles.progressBadge}>
                <Ionicons name="stats-chart" size={14} color={isCompleted ? '#9ca3af' : '#6b7280'} />
                <Text style={[styles.progressText, isSubtask && styles.subtaskProgressText]}>
                  {task.progress_percentage}%
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Subtasks Toggle Button - теперь внутри карточки */}
        {hasSubtasks && !isSubtask && (
          <>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <TouchableOpacity
              style={styles.subtasksToggle}
              onPress={() => setExpanded(!expanded)}
              activeOpacity={0.6}
            >
              <View style={styles.subtasksToggleContent}>
                <View style={styles.subtasksToggleLeft}>
                  <Ionicons
                    name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                    size={18}
                    color="#9ca3af"
                  />
                  <Text style={styles.subtasksToggleText}>
                    {subtasks.length} {subtasks.length === 1 ? 'подзадача' : subtasks.length < 5 ? 'подзадачи' : 'подзадач'}
                  </Text>
                </View>
                <View style={styles.subtasksProgress}>
                  {task.comment_count > 0 && isKanbanMode && (
                    <View style={[styles.attachmentBadge, isCompleted && styles.completedAttachmentBadge]}>
                      <Ionicons name="chatbubble-outline" size={14} color={isCompleted ? '#9ca3af' : '#6b7280'} />
                      <Text style={[
                        styles.attachmentCount,
                        isCompleted && styles.completedAttachmentText,
                      ]}>{task.comment_count}</Text>
                    </View>
                  )}
                  <Text style={styles.subtasksCount}>
                    {task.progress_percentage}%
                  </Text>
                  <ProgressIndicator
                    progress={task.progress_percentage}
                    size={18}
                    color={task.progress_percentage === 100 ? '#10B981' : theme.primary}
                    backgroundColor={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                </View>
              </View>
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>
      </View>

    {/* Expanded Subtasks */}
    {hasSubtasks && isExpanded && !isSubtask && (
      <View style={styles.subtasksContainer}>
        {subtasks.map((subtask, index) => (
          <TaskItem
            key={subtask.id}
            task={subtask}
            onPress={onSubtaskPress || onPress}
            isSubtask={true}
            isLastSubtask={index === subtasks.length - 1}
          />
        ))}
      </View>
    )}
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
    paddingTop: 6,
    paddingRight: 6,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    overflow: 'visible',
  },
  card: {
    flex: 1,
    borderRadius: 16,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'visible',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    ...Platform.select({
      web: {
        transitionProperty: 'transform, box-shadow, border-color',
        transitionDuration: '0.2s',
        transitionTimingFunction: 'ease-out',
        cursor: 'pointer',
      },
    }),
  },
  cardHovered: {
    ...Platform.select({
      web: {
        transform: 'translateY(-4px)',
        boxShadow: '0 8px 16px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  },
  subtaskCard: {
    marginLeft: 44,
    marginRight: 16,
    marginTop: 6,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    opacity: 0.98,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Platform.select({
      web: {
        transitionProperty: 'transform, box-shadow, border-color',
        transitionDuration: '0.2s',
        transitionTimingFunction: 'ease-out',
      },
    }),
  },
  subtaskCardCompleted: {
    borderLeftColor: '#10b981',
    opacity: 0.85,
  },
  subtaskHorizontalLine: {
    position: 'absolute',
    left: 26.5,
    top: 29,
    width: 18,
    height: 3,
    opacity: 0.6,
    borderRadius: 1.5,
  },
  subtaskFullVerticalLine: {
    position: 'absolute',
    left: 25,
    top: 0,
    bottom: -10,
    width: 3,
    opacity: 0.6,
    borderRadius: 1.5,
  },
  subtaskLastVerticalLine: {
    position: 'absolute',
    left: 25,
    top: 0,
    height: 30,
    width: 3,
    opacity: 0.6,
    borderRadius: 1.5,
  },
  subtaskConnector: {
    position: 'absolute',
    left: 17,
    top: 20,
    zIndex: 1,
    borderRadius: 9,
    padding: 1,
  },
  subtaskConnectorIcon: {
    fontSize: 16,
    color: '#9ca3af',
    fontWeight: '400',
  },
  completedBadge: {
    backgroundColor: '#d1fae5',
    opacity: 0.8,
  },
  completedText: {
    color: '#059669',
  },
  completedCheckBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#d1fae5',
    borderRadius: 6,
  },
  completedCheckText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
    textTransform: 'uppercase',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subtaskPriorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: 100,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  subtaskPriorityText: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  delegatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
  },
  delegatedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  delegatedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 10,
  },
  delegatedTextInline: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 4,
    zIndex: 2,
  },
  priorityBadgeCorner: {
    position: 'absolute',
    top: -8,
    right: -12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 10,
  },
  priorityBadgeCornerSubtask: {
    position: 'absolute',
    top: -6,
    right: -10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  priorityBadgeCornerCompleted: {
    opacity: 0.6,
  },
  priorityTextCorner: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  priorityTextCornerSubtask: {
    fontSize: 9,
    letterSpacing: 0.6,
  },
  subtaskHeader: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subtaskTitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
    letterSpacing: -0.1,
  },
  deadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  deadlineText: {
    fontSize: 14,
    fontWeight: '500',
  },
  subtaskDeadlineText: {
    fontSize: 13,
  },
  overdueText: {
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  subtaskProgressText: {
    fontSize: 11,
  },
  divider: {
    height: 1,
    opacity: 0.3,
    marginTop: 16,
    marginHorizontal: 0,
  },
  subtasksToggle: {
    paddingHorizontal: 0,
    paddingVertical: 10,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        transitionProperty: 'opacity',
        transitionDuration: '0.15s',
        cursor: 'pointer',
      },
    }),
  },
  subtasksToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtasksToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  subtasksToggleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  subtasksProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtasksCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    minWidth: 32,
    textAlign: 'right',
  },
  subtasksCommentBadge: {
    marginLeft: 8,
  },
  subtasksMetaRow: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  subtasksMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  subtasksContainer: {
    marginTop: 4,
    paddingTop: 4,
    position: 'relative',
  },
  delegationChain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
  },
  avatarChain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
    minWidth: 0,
    rowGap: 8,
  },
  chainItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    maxWidth: '48%',
  },
  chainArrow: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
    flexShrink: 0,
  },
  delegationText: {
    fontSize: 13,
    flexShrink: 1,
    maxWidth: 100,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  attachmentCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  subtaskAttachmentCount: {
    fontSize: 12,
  },
  completedFooter: {
    opacity: 0.6,
  },
  completedAttachmentBadge: {
    backgroundColor: '#f3f4f6',
    opacity: 0.7,
  },
  completedAttachmentText: {
    color: '#9ca3af',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  // Kanban mode styles
  kanbanCard: {
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginHorizontal: 0,
    borderRadius: 12,
  },
  kanbanTitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  kanbanDivider: {
    height: 1,
    marginVertical: 8,
  },
  kanbanDelegationRow: {
    marginBottom: 6,
  },
  kanbanDelegationText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  kanbanChainArrow: {
    fontSize: 11,
    marginHorizontal: 3,
  },
  kanbanDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  kanbanDeadlineText: {
    fontSize: 13,
    fontWeight: '500',
  },
  kanbanFooter: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  kanbanMetaInfo: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    justifyContent: 'flex-end',
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  tagMoreText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default TaskItem;
