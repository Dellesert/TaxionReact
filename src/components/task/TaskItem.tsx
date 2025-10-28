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
}

// Priority labels and colors
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Низкий', color: '#10b981', bg: '#d1fae5' },
  medium: { label: 'Средний', color: '#3b82f6', bg: '#dbeafe' },
  high: { label: 'Высокий', color: '#f59e0b', bg: '#fef3c7' },
  critical: { label: 'Критичный', color: '#ef4444', bg: '#fee2e2' },
};

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onPress,
  onShare,
  isSubtask = false,
  subtasks = [],
  onSubtaskPress,
}) => {
  const { theme } = useTheme();
  const { user: currentUser } = useAuthStore();
  const [expanded, setExpanded] = useState(false);

  const hasSubtasks = subtasks && subtasks.length > 0;
  const completedSubtasks = subtasks.filter(st => st.status === 'done').length;

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
            {isCompleted ? (
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
            ) : (
              <Text style={styles.subtaskConnectorIcon}>└─</Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.card,
            { backgroundColor: theme.backgroundSecondary },
            isSubtask && styles.subtaskCard,
            isSubtask && isCompleted && styles.subtaskCardCompleted,
          ]}
          onPress={() => onPress(task)}
          activeOpacity={0.7}
        >
          {/* Header Row: Priority Badge + Delegated Badge + Share Button */}
          <View style={styles.header}>
            <View style={styles.badges}>
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: priorityConfig.bg },
                  isSubtask && styles.subtaskPriorityBadge,
                  isCompleted && styles.completedBadge,
                ]}
              >
                <Text style={[
                  styles.priorityText,
                  { color: priorityConfig.color },
                  isSubtask && styles.subtaskPriorityText,
                  isCompleted && styles.completedText,
                ]}>
                  {priorityConfig.label}
                </Text>
              </View>

              {isDelegatedByMe && (
                <View style={styles.delegatedBadge}>
                  <Ionicons name="eye-outline" size={12} color="#8b5cf6" />
                  <Text style={styles.delegatedText}>Делегировано</Text>
                </View>
              )}
            </View>

          {onShare && !isSubtask && (
            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => onShare(task)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="share-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}

          {/* Completed Check Icon for Subtasks */}
          {isSubtask && isCompleted && (
            <View style={styles.completedCheckBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.completedCheckText}>Выполнено</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[
          styles.title,
          { color: theme.text },
          isSubtask && styles.subtaskTitle,
          isCompleted && styles.completedTitle,
        ]} numberOfLines={2}>
          {task.title}
        </Text>

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
      </TouchableOpacity>
      </View>

    {/* Subtasks Toggle Button */}
    {hasSubtasks && !isSubtask && (
      <TouchableOpacity
        style={[styles.subtasksToggle, { backgroundColor: theme.background }]}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.subtasksToggleContent}>
          <View style={styles.subtasksToggleLeft}>
            <Ionicons
              name={expanded ? 'chevron-down-circle' : 'chevron-forward-circle'}
              size={20}
              color="#3b82f6"
            />
            <Text style={styles.subtasksToggleText}>
              {expanded ? 'Скрыть подзадачи' : 'Показать подзадачи'}
            </Text>
          </View>
          <View style={styles.subtasksProgress}>
            <View style={[
              styles.progressBar,
              { backgroundColor: theme.backgroundSecondary }
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
    )}

    {/* Expanded Subtasks */}
    {hasSubtasks && expanded && !isSubtask && (
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
    marginBottom: 8,
  },
  cardWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  subtaskCard: {
    marginLeft: 24,
    marginRight: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#3b82f6',
    shadowOpacity: 0.02,
    opacity: 0.97,
  },
  subtaskCardCompleted: {
    borderLeftColor: '#10b981',
    opacity: 0.85,
  },
  subtaskConnector: {
    position: 'absolute',
    left: 20,
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subtaskPriorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtaskPriorityText: {
    fontSize: 11,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  delegatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f3e8ff',
    borderRadius: 6,
  },
  delegatedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8b5cf6',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  shareButton: {
    padding: 4,
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
  subtasksToggle: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subtasksToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subtasksToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtasksToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  subtasksProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  subtasksCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6b7280',
    minWidth: 35,
    textAlign: 'right',
  },
  subtasksContainer: {
    marginTop: 0,
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
});

export default TaskItem;
