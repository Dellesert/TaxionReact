import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskPermissions } from '../../types/task.types';
import type { GroupAssigneeInfo } from '../../types/task.types';
import { TaskChecklistsView } from '../task-details/TaskChecklistsView';
import { TaskSubtasksList } from '../task-details/TaskSubtasksList';
import { Avatar } from '@shared/components/common/Avatar';
import { useTheme } from '@shared/hooks/useTheme';
import { getUserDisplayName, getPriorityConfig } from '../../utils/taskHelpers';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { FormattedText } from '@features/chat/components/common/FormattedText';

interface TaskOverviewTabProps {
  task: Task;
  subtasks: Task[];
  permissions: TaskPermissions;
  currentUserId?: number;
  isDelegatedByMe: boolean;
  onChecklistChanged: () => void;
  onSubtaskPress: (subtask: Task) => void;
  onSubtaskCreated: () => void;
  onCreateSubtaskPress?: () => void;
  onUserPress: (userId: number) => void;
}

export const TaskOverviewTab: React.FC<TaskOverviewTabProps> = ({
  task,
  subtasks,
  permissions,
  currentUserId,
  isDelegatedByMe,
  onChecklistChanged,
  onSubtaskPress,
  onSubtaskCreated,
  onCreateSubtaskPress,
  onUserPress,
}) => {
  const { theme, isDark } = useTheme();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const priorityConfig = task.priority ? getPriorityConfig(task.priority) : null;

  return (
    <View style={styles.container}>
      {/* Delegated Badge */}
      {isDelegatedByMe && (
        <View
          style={[
            styles.delegatedBadge,
            {
              backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f3e8ff',
              borderColor: isDark ? 'rgba(139, 92, 246, 0.3)' : '#e9d5ff',
            },
          ]}
        >
          <Ionicons name="eye-outline" size={16} color="#8b5cf6" />
          <Text
            style={[
              styles.delegatedBadgeText,
              { color: isDark ? '#c4b5fd' : '#8b5cf6' },
            ]}
          >
            ТОЛЬКО ПРОСМОТР
          </Text>
        </View>
      )}

      {/* Task Title and Info Card - show ONLY if no checklists */}
      {(!task.checklists || task.checklists.length === 0) && (
        <View
          style={[
            styles.descriptionContainer,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.descriptionHeader}>
            <Text style={[styles.descriptionLabel, { color: theme.text }]}>
              {task.title}
            </Text>
          </View>

          {/* Content - show description if exists */}
          {task.description && (
            <View style={styles.descriptionContent}>
              <FormattedText
                text={task.description}
                style={[
                  styles.descriptionText,
                  { color: theme.textSecondary },
                  !isDescriptionExpanded && styles.descriptionCollapsed,
                ]}
                numberOfLines={isDescriptionExpanded ? undefined : 2}
              />
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
          )}

          {/* Footer with priority and assignee */}
          {(priorityConfig || task.assignees) && (
            <View
              style={[styles.descriptionFooter, { borderTopColor: theme.border }]}
            >
              <View style={styles.descriptionFooterLeft}>
                {/* Priority Badge */}
                {priorityConfig && (
                  <View
                    style={[
                      styles.priorityBadge,
                      { backgroundColor: priorityConfig.color + '20' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityText,
                        { color: priorityConfig.color },
                      ]}
                    >
                      {priorityConfig.label}
                    </Text>
                  </View>
                )}

                {/* Progress Badge for tasks without subtasks */}
                {(!subtasks || subtasks.length === 0) && (
                  <View style={styles.progressBadge}>
                    <Ionicons
                      name="stats-chart-outline"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text
                      style={[
                        styles.progressText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {task.progress_percentage}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Assignee - Right */}
              {task.assignees && task.assignees.length > 0 && (
                <TouchableOpacity
                  style={styles.assigneeContainer}
                  onPress={() => onUserPress(task.assignees![0].id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.assigneeName,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {getUserDisplayName(
                      task.assignees[0].name,
                      task.assignees[0].id,
                      currentUserId
                    )}
                  </Text>
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

      {/* Checklists Section */}
      {permissions.can_view && (
        <View style={styles.checklistsSection}>
          <TaskChecklistsView
            key={task.id}
            taskId={task.id}
            taskTitle={task.title}
            assigneeName={
              task.assignees && task.assignees.length > 0
                ? task.assignees[0].name
                : undefined
            }
            assigneeAvatar={
              task.assignees && task.assignees.length > 0
                ? task.assignees[0].avatar
                : undefined
            }
            assigneeId={
              task.assignees && task.assignees.length > 0
                ? task.assignees[0].id
                : undefined
            }
            priority={task.priority}
            dueDate={task.due_date}
            onChecklistChanged={onChecklistChanged}
            onAssigneePress={onUserPress}
            canEdit={permissions.can_edit && task.status !== 'done'}
            canToggleOnly={
              permissions.can_check_items &&
              !permissions.can_edit &&
              task.status !== 'done'
            }
            readOnly={isDelegatedByMe || task.status === 'done'}
          />
        </View>
      )}

      {/* Group Task Progress Section */}
      {task.task_type === 'group' && task.group_assignees && task.group_assignees.length > 0 && (
        <View
          style={[
            styles.groupProgressSection,
            {
              backgroundColor: theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.groupProgressHeader}>
            <View style={styles.groupProgressHeaderLeft}>
              <Ionicons name="people-outline" size={18} color={isDark ? '#c4b5fd' : '#8B5CF6'} />
              <Text style={[styles.groupProgressTitle, { color: theme.text }]}>
                Прогресс группы
              </Text>
            </View>
            <Text style={[styles.groupProgressCount, { color: isDark ? '#c4b5fd' : '#8B5CF6' }]}>
              {task.group_completed_count ?? 0} / {task.group_total_count ?? task.group_assignees.length}
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={[styles.groupProgressBarBg, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#f3e8ff' }]}>
            <View
              style={[
                styles.groupProgressBarFill,
                {
                  backgroundColor: '#8B5CF6',
                  width: `${task.group_total_count ? ((task.group_completed_count ?? 0) / task.group_total_count) * 100 : 0}%`,
                },
              ]}
            />
          </View>

          {/* Assignee List */}
          <View style={styles.groupAssigneeList}>
            {task.group_assignees.map((assignee: GroupAssigneeInfo) => (
              <TouchableOpacity
                key={assignee.user_id}
                style={[styles.groupAssigneeRow, { borderBottomColor: theme.border }]}
                onPress={() => onUserPress(assignee.user_id)}
                activeOpacity={0.7}
              >
                <View style={styles.groupAssigneeLeft}>
                  <Avatar
                    name={assignee.user?.name || `User ${assignee.user_id}`}
                    imageUrl={assignee.user?.avatar}
                    size={32}
                  />
                  <Text style={[styles.groupAssigneeName, { color: theme.text }]}>
                    {assignee.user
                      ? getUserDisplayName(assignee.user.name, assignee.user_id, currentUserId)
                      : `User ${assignee.user_id}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.groupAssigneeStatusBadge,
                    {
                      backgroundColor: assignee.status === 'done'
                        ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5')
                        : (isDark ? 'rgba(156, 163, 175, 0.15)' : '#f3f4f6'),
                    },
                  ]}
                >
                  {assignee.status === 'done' && (
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  )}
                  <Text
                    style={[
                      styles.groupAssigneeStatusText,
                      {
                        color: assignee.status === 'done' ? '#10B981' : theme.textSecondary,
                      },
                    ]}
                  >
                    {assignee.status === 'done' ? 'Готово' : 'Ожидает'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
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
                ? format(new Date(task.updated_at), 'dd MMMM yyyy, HH:mm', {
                    locale: ru,
                  })
                : 'Дата неизвестна'}
            </Text>
          </View>
        </View>
      )}

      {/* Subtasks Section */}
      {task.status !== 'done' && permissions.can_view_subtasks && (
        <View style={styles.subtasksSection}>
          <TaskSubtasksList
            parentTaskId={task.id}
            parentTaskProgress={task.progress_percentage}
            subtaskCount={task.subtask_count}
            onSubtaskPress={onSubtaskPress}
            onSubtaskCreated={onSubtaskCreated}
            onCreateSubtaskPress={
              permissions.can_create_subtasks ? onCreateSubtaskPress : undefined
            }
            readOnly={!permissions.can_edit}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  delegatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderWidth: 1,
  },
  delegatedBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  descriptionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  descriptionLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  descriptionContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
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
  expandButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    marginTop: 4,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descriptionFooterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '500',
  },
  checklistsSection: {
    marginBottom: 8,
  },
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
  subtasksSection: {
    marginBottom: 16,
  },
  groupProgressSection: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  groupProgressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupProgressTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  groupProgressCount: {
    fontSize: 15,
    fontWeight: '700',
  },
  groupProgressBarBg: {
    height: 6,
    borderRadius: 3,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  groupProgressBarFill: {
    height: 6,
    borderRadius: 3,
    minWidth: 6,
  },
  groupAssigneeList: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  groupAssigneeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  groupAssigneeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  groupAssigneeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  groupAssigneeStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  groupAssigneeStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
