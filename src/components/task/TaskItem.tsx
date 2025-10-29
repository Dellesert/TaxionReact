/**
 * Task Item Component
 * Компонент карточки задачи
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority } from '@/types/task.types';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onShare?: (task: Task) => void;
  isSubtask?: boolean;
  subtasks?: Task[];
  onSubtaskPress?: (subtask: Task) => void;
  forceExpanded?: boolean;
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
}) => {
  const { theme, isDark } = useTheme();
  const { user: currentUser } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  // Use forceExpanded if provided, otherwise use local state
  const isExpanded = forceExpanded || expanded;

  const hasSubtasks = subtasks && subtasks.length > 0;
  const completedSubtasks = subtasks.filter(st => st.status === 'done').length;

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
    // Debug: log task delegation info
    if (task.delegated_from_user_id || task.original_assignee_id) {
      console.log('📋 Task delegation info:', {
        id: task.id,
        title: task.title,
        delegation_chain: task.delegation_chain,
        delegated_from_user_id: task.delegated_from_user_id,
        original_assignee_id: task.original_assignee_id,
        assigned_to_user_id: task.assigned_to_user_id,
      });
    }

    // Priority: use delegation_chain if available
    if (task.delegation_chain && task.delegation_chain.length > 0) {
      console.log('✅ Showing delegation chain:', task.delegation_chain);
      return (
        <View style={styles.delegationChain}>
          <Ionicons name="git-branch-outline" size={14} color="#6b7280" />
          <Text style={styles.delegationText} numberOfLines={1}>
            {task.delegation_chain.map((user) => formatUserName(user.name, user.id)).join(' → ')}
          </Text>
        </View>
      );
    }

    // Fallback: show creator -> assignees if available
    const chain: string[] = [];
    const chainUserIds: (number | undefined)[] = [];

    if (task.creator) {
      chain.push(task.creator.name);
      chainUserIds.push(task.creator.id);
    }

    if (task.assignees && task.assignees.length > 0) {
      task.assignees.forEach((assignee) => {
        if (!chain.includes(assignee.name)) {
          chain.push(assignee.name);
          chainUserIds.push(assignee.id);
        }
      });
    } else if (task.assignee) {
      if (!chain.includes(task.assignee.name)) {
        chain.push(task.assignee.name);
        chainUserIds.push(task.assignee.id);
      }
    }

    if (chain.length > 1) {
      const formattedChain = chain.map((name, index) => formatUserName(name, chainUserIds[index]));
      return (
        <View style={styles.delegationChain}>
          <Ionicons name="people-outline" size={14} color="#6b7280" />
          <Text style={styles.delegationText} numberOfLines={1}>
            {formattedChain.join(' → ')}
          </Text>
        </View>
      );
    }

    // Just show creator or assignee
    if (task.creator) {
      return (
        <View style={styles.delegationChain}>
          <Ionicons name="person-outline" size={14} color="#6b7280" />
          <Text style={styles.delegationText} numberOfLines={1}>
            {formatUserName(task.creator.name, task.creator.id)}
          </Text>
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

  return (
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        {/* Subtask Connector Icon */}
        {isSubtask && (
          <View style={styles.subtaskConnector}>
            {(() => {
              const statusBadge = getSubtaskStatusBadge(task.status);
              if (statusBadge) {
                return <Ionicons name={statusBadge.icon} size={18} color={statusBadge.color} />;
              }
              return <Text style={styles.subtaskConnectorIcon}>└─</Text>;
            })()}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.backgroundSecondary },
            isSubtask && styles.subtaskCard,
            isSubtask && (() => {
              const statusBadge = getSubtaskStatusBadge(task.status);
              if (statusBadge) {
                return { borderLeftColor: statusBadge.color };
              }
              return {};
            })(),
          ]}
          onPress={() => onPress(task)}
          activeOpacity={0.7}
        >
          {/* Priority Badge - горизонтальная лента в правом верхнем углу */}
          {!isSubtask && (
            <View
              style={[
                styles.priorityBadgeCorner,
                { backgroundColor: priorityConfig.badgeColor },
                isCompleted && styles.priorityBadgeCornerCompleted,
              ]}
            >
              <Text style={styles.priorityTextCorner}>
                {priorityConfig.label}
              </Text>
            </View>
          )}

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

          {/* Priority badge для подзадач - оставляем слева */}
          {isSubtask && (
            <View style={styles.subtaskHeader}>
              <View
                style={[
                  styles.priorityBadge,
                  styles.subtaskPriorityBadge,
                  { backgroundColor: priorityConfig.bg },
                  isCompleted && styles.completedBadge,
                ]}
              >
                <Text style={[
                  styles.priorityText,
                  styles.subtaskPriorityText,
                  { color: priorityConfig.color },
                  isCompleted && styles.completedText,
                ]}>
                  {priorityConfig.label}
                </Text>
              </View>
            </View>
          )}

        {/* Title */}
        <Text style={[
          styles.title,
          { color: theme.text },
          isSubtask && styles.subtaskTitle,
          isCompleted && styles.completedTitle,
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

        {/* Deadline */}
        {task.due_date && !isCompleted && (
          <View style={styles.deadlineRow}>
            <Ionicons
              name="calendar-outline"
              size={isSubtask ? 14 : 16}
              color={isOverdue ? '#ef4444' : '#6b7280'}
            />
            <Text
              style={[
                styles.deadlineText,
                { color: isOverdue ? '#ef4444' : '#6b7280' },
                isOverdue && styles.overdueText,
                isSubtask && styles.subtaskDeadlineText,
              ]}
            >
              {formatDeadline(task.due_date)}
            </Text>
          </View>
        )}

        {/* Footer: Delegation Chain + Meta Info */}
        <View style={styles.footer}>
          <View style={[styles.footerLeft, isCompleted && styles.completedFooter]}>
            {renderDelegationChain()}
          </View>

          <View style={styles.metaInfo}>
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
                  <View style={[
                    styles.progressBar,
                    { backgroundColor: theme.backgroundTertiary }
                  ]}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${subtasks.length > 0 ? (completedSubtasks / subtasks.length) * 100 : 0}%`,
                          backgroundColor: completedSubtasks === subtasks.length ? '#10b981' : '#3b82f6',
                        }
                      ]}
                    />
                  </View>
                  <Text style={styles.subtasksCount}>
                    {completedSubtasks}/{subtasks.length}
                  </Text>
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
        {subtasks.map((subtask) => (
          <TaskItem
            key={subtask.id}
            task={subtask}
            onPress={onSubtaskPress || onPress}
            isSubtask={true}
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
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'visible',
  },
  subtaskCard: {
    marginLeft: 44,
    marginRight: 16,
    marginTop: 6,
    marginBottom: 4,
    padding: 14,
    borderRadius: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
    opacity: 0.96,
  },
  subtaskCardCompleted: {
    borderLeftColor: '#10b981',
    opacity: 0.85,
  },
  subtaskConnector: {
    position: 'absolute',
    left: 16,
    top: 20,
    zIndex: 1,
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
    right: -8,
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
  subtaskHeader: {
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 10,
  },
  subtaskTitle: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
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
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
    marginRight: 12,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 12,
  },
  progressBar: {
    width: 80,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  subtasksCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    minWidth: 32,
    textAlign: 'right',
  },
  subtasksContainer: {
    marginTop: 4,
    paddingTop: 4,
    position: 'relative',
  },
  delegationChain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  delegationText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  attachmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
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
});

export default TaskItem;
