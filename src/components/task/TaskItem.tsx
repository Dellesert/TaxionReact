/**
 * Task Item Component
 * Компонент карточки задачи
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPriority } from '@/types/task.types';
import { useTheme } from '@hooks/useTheme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  onPress: (task: Task) => void;
  onShare?: (task: Task) => void;
}

// Priority labels and colors
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'Низкий', color: '#10b981', bg: '#d1fae5' },
  medium: { label: 'Средний', color: '#3b82f6', bg: '#dbeafe' },
  high: { label: 'Высокий', color: '#f59e0b', bg: '#fef3c7' },
  critical: { label: 'Критичный', color: '#ef4444', bg: '#fee2e2' },
};

export const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, onShare }) => {
  const { theme } = useTheme();

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

  // Build delegation chain display
  const renderDelegationChain = () => {
    // Priority: use delegation_chain if available
    if (task.delegation_chain && task.delegation_chain.length > 0) {
      return (
        <View style={styles.delegationChain}>
          <Ionicons name="git-branch-outline" size={14} color="#6b7280" />
          <Text style={styles.delegationText} numberOfLines={1}>
            {task.delegation_chain.map((user) => user.name).join(' → ')}
          </Text>
        </View>
      );
    }

    // Fallback: show creator -> assignees if available
    const chain: string[] = [];

    if (task.creator) {
      chain.push(task.creator.name);
    }

    if (task.assignees && task.assignees.length > 0) {
      task.assignees.forEach((assignee) => {
        if (!chain.includes(assignee.name)) {
          chain.push(assignee.name);
        }
      });
    } else if (task.assignee) {
      if (!chain.includes(task.assignee.name)) {
        chain.push(task.assignee.name);
      }
    }

    if (chain.length > 1) {
      return (
        <View style={styles.delegationChain}>
          <Ionicons name="people-outline" size={14} color="#6b7280" />
          <Text style={styles.delegationText} numberOfLines={1}>
            {chain.join(' → ')}
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
            {task.creator.name}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Count attachments
  const attachmentCount = task.attachments?.length || 0;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.backgroundSecondary }]}
      onPress={() => onPress(task)}
      activeOpacity={0.7}
    >
      {/* Header Row: Priority Badge + Share Button */}
      <View style={styles.header}>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: priorityConfig.bg },
          ]}
        >
          <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
            {priorityConfig.label}
          </Text>
        </View>

        {onShare && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => onShare(task)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
        {task.title}
      </Text>

      {/* Deadline */}
      {task.due_date && (
        <View style={styles.deadlineRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={isOverdue ? '#ef4444' : '#6b7280'}
          />
          <Text
            style={[
              styles.deadlineText,
              { color: isOverdue ? '#ef4444' : '#6b7280' },
              isOverdue && styles.overdueText,
            ]}
          >
            {formatDeadline(task.due_date)}
          </Text>
        </View>
      )}

      {/* Footer: Delegation Chain + Attachments */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {renderDelegationChain()}
        </View>

        {attachmentCount > 0 && (
          <View style={styles.attachmentBadge}>
            <Ionicons name="attach" size={16} color="#6b7280" />
            <Text style={styles.attachmentCount}>{attachmentCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
});

export default TaskItem;
