import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TaskActivity, Task } from '@/features/tasks/types/task.types';

/**
 * Get activity icon name
 */
export const getActivityIcon = (activity: TaskActivity): any => {
  const actionType = activity.action_type;

  // Special case: if status changed to 'done', show green checkmark
  if (
    (actionType === 'task_status_changed' || actionType === 'subtask_status_changed') &&
    activity.new_value === 'done'
  ) {
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
  if (actionType === 'task_updated_title') return 'create-outline';
  if (actionType === 'task_updated_description') return 'document-text-outline';
  if (actionType === 'task_updated_priority') return 'flag-outline';
  if (actionType === 'task_updated_due_date') return 'calendar-outline';
  if (actionType === 'progress_updated') return 'bar-chart-outline';
  if (actionType === 'task_emergency_completed') return 'warning-outline';
  return 'ellipse-outline';
};

/**
 * Get activity icon color
 */
export const getActivityIconColor = (activity: TaskActivity): string => {
  const actionType = activity.action_type;

  // Green for completed tasks
  if (
    (actionType === 'task_status_changed' || actionType === 'subtask_status_changed') &&
    activity.new_value === 'done'
  ) {
    return '#10B981';
  }

  // Color by action type
  switch (actionType) {
    case 'task_created':
    case 'subtask_created':
    case 'checklist_added':
    case 'checklist_item_completed':
      return '#10B981'; // Green
    case 'task_status_changed':
    case 'progress_updated':
      return '#3B82F6'; // Blue
    case 'task_assigned':
    case 'task_updated_title':
    case 'task_updated_description':
      return '#8B5CF6'; // Purple
    case 'task_delegated':
    case 'task_updated_priority':
      return '#F59E0B'; // Orange
    case 'comment_added':
    case 'task_updated_due_date':
      return '#06B6D4'; // Cyan
    case 'attachment_added':
      return '#EC4899'; // Pink
    case 'attachment_deleted':
    case 'task_deleted':
      return '#EF4444'; // Red
    case 'task_emergency_completed':
      return '#F59E0B'; // Orange (warning color)
    case 'task_viewed':
    case 'checklist_item_uncompleted':
      return '#94A3B8'; // Gray
    default:
      return '#6B7280'; // Default gray
  }
};

/**
 * Convert status to Russian
 */
export const getStatusInRussian = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    new: 'Новая',
    viewed: 'Просмотрена',
    in_progress: 'В работе',
    review: 'На проверке',
    done: 'Завершена',
    cancelled: 'Отменена',
  };
  return statusMap[status] || status;
};

/**
 * Get activity description in Russian with formatting
 */
export const getActivityDescription = (
  activity: TaskActivity,
  task: Task | null,
  currentUserId: number | undefined,
  theme: any
): React.JSX.Element => {
  // Use user name from user object if available, otherwise use user_id
  const userName =
    activity.user?.name ||
    (activity.user_id ? `Пользователь #${activity.user_id}` : 'Система');

  // Determine if this is about a subtask (task_id is different from current task)
  const taskTitle = activity.task_title || '';

  // Helper to render bold text
  const Bold = ({ children }: { children: React.ReactNode }) => (
    <Text style={{ fontWeight: '600', color: theme.text }}>{children}</Text>
  );

  // Helper to render subtask badge
  const SubtaskBadge = () =>
    taskTitle ? (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(139, 92, 246, 0.12)',
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: 8,
          marginTop: 8,
          alignSelf: 'flex-start',
          gap: 6,
          borderWidth: 1,
          borderColor: 'rgba(139, 92, 246, 0.2)',
        }}
      >
        <Ionicons name="git-branch-outline" size={14} color="#8B5CF6" />
        <Text
          style={{
            fontSize: 12,
            color: '#8B5CF6',
            fontWeight: '600',
            letterSpacing: 0.2,
          }}
        >
          {taskTitle}
        </Text>
      </View>
    ) : null;

  // Helper to get assignee info
  const getAssigneeInfo = () => {
    if (activity.assignees && activity.assignees.length > 0) {
      const hasCurrentUser = activity.assignees.some((a) => currentUserId && a.id === currentUserId);
      const otherAssignees = activity.assignees
        .filter((a) => !(currentUserId && a.id === currentUserId))
        .map((a) => a.name);

      let assigneeText = '';
      if (hasCurrentUser && otherAssignees.length > 0) {
        assigneeText = `вас и ${otherAssignees.join(', ')}`;
      } else if (hasCurrentUser) {
        assigneeText = 'вас';
      } else {
        assigneeText = otherAssignees.join(', ');
      }

      return (
        <Text>
          {' '}
          на <Bold>{assigneeText}</Bold>
        </Text>
      );
    } else if (activity.new_value) {
      // Try to extract user ID from "User 29" format
      const userIdMatch = activity.new_value.match(/User (\d+)/);
      if (userIdMatch && task?.assignees) {
        const userId = parseInt(userIdMatch[1], 10);
        const assignee = task.assignees.find((a) => a.id === userId);
        if (assignee) {
          const isCurrentUser = currentUserId && assignee.id === currentUserId;
          const assigneeText = isCurrentUser ? 'вас' : assignee.name;
          return (
            <Text>
              {' '}
              на <Bold>{assigneeText}</Bold>
            </Text>
          );
        } else {
          return (
            <Text>
              {' '}
              на <Bold>{activity.new_value}</Bold>
            </Text>
          );
        }
      } else {
        return (
          <Text>
            {' '}
            на <Bold>{activity.new_value}</Bold>
          </Text>
        );
      }
    }
    return null;
  };

  const activityTextStyle = {
    fontSize: 14,
    color: theme.text,
    lineHeight: 20,
  };

  switch (activity.action_type) {
    case 'task_created':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> создал(а) задачу
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'task_status_changed': {
      const oldStatus = getStatusInRussian(activity.old_value || '');
      const newStatus = getStatusInRussian(activity.new_value || '');
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> изменил(а) статус: <Bold>{oldStatus}</Bold> →{' '}
            <Bold>{newStatus}</Bold>
          </Text>
          <SubtaskBadge />
        </>
      );
    }
    case 'task_assigned': {
      const assigneeInfo = getAssigneeInfo();
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> назначил(а) задачу{assigneeInfo}
          </Text>
          <SubtaskBadge />
        </>
      );
    }
    case 'task_delegated': {
      const assigneeInfo = getAssigneeInfo();
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> переназначил(а) задачу{assigneeInfo}
          </Text>
          <SubtaskBadge />
        </>
      );
    }
    case 'task_viewed':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> ознакомился(лась) с задачей
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'comment_added':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> добавил(а) комментарий
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'attachment_added':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> добавил(а) файл: <Bold>{activity.new_value}</Bold>
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'attachment_deleted':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> удалил(а) файл: <Bold>{activity.old_value}</Bold>
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'checklist_added':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> добавил(а) чек-лист
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'checklist_item_completed':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> отметил(а) пункт чек-листа
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'checklist_item_uncompleted':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> снял(а) отметку с пункта чек-листа
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'subtask_created': {
      let assigneeInfo: React.JSX.Element | null = null;
      if (activity.assignees && activity.assignees.length > 0) {
        const hasCurrentUser = activity.assignees.some(
          (a) => currentUserId && a.id === currentUserId
        );
        const otherAssignees = activity.assignees
          .filter((a) => !(currentUserId && a.id === currentUserId))
          .map((a) => a.name);

        let assigneeText = '';
        if (hasCurrentUser && otherAssignees.length > 0) {
          assigneeText = `вас и ${otherAssignees.join(', ')}`;
        } else if (hasCurrentUser) {
          assigneeText = 'вас';
        } else {
          assigneeText = otherAssignees.join(', ');
        }

        assigneeInfo = (
          <Text>
            {' '}
            для <Bold>{assigneeText}</Bold>
          </Text>
        );
      }
      return (
        <Text style={activityTextStyle}>
          <Bold>{userName}</Bold> создал(а) подзадачу: <Bold>{activity.new_value}</Bold>
          {assigneeInfo}
        </Text>
      );
    }
    case 'subtask_status_changed': {
      const oldStatus = getStatusInRussian(activity.old_value || '');
      const newStatus = getStatusInRussian(activity.new_value || '');
      return (
        <Text style={activityTextStyle}>
          <Bold>{userName}</Bold> изменил(а) статус подзадачи: <Bold>{oldStatus}</Bold> →{' '}
          <Bold>{newStatus}</Bold>
        </Text>
      );
    }
    case 'task_updated_title':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> изменил(а) название
            {activity.new_value && (
              <>
                {activity.old_value && (
                  <Text style={{ color: '#9ca3af' }}>
                    {'\n'}"{activity.old_value}" →{' '}
                  </Text>
                )}
                <Text>
                  {activity.old_value ? '' : ': '}
                  <Bold>{activity.new_value}</Bold>
                </Text>
              </>
            )}
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'task_updated_description':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> изменил(а) описание
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'task_updated_priority':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> изменил(а) приоритет
            {activity.new_value && (
              <>
                {activity.old_value && (
                  <Text>
                    : <Text style={{ color: '#9ca3af' }}>{activity.old_value}</Text> →{' '}
                  </Text>
                )}
                <Text>
                  {activity.old_value ? '' : ': '}
                  <Bold>{activity.new_value}</Bold>
                </Text>
              </>
            )}
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'task_updated_due_date':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> изменил(а) дедлайн
            {activity.new_value && (
              <>
                {activity.old_value && (
                  <Text>
                    : <Text style={{ color: '#9ca3af' }}>{activity.old_value}</Text> →{' '}
                  </Text>
                )}
                <Text>
                  {activity.old_value ? '' : ': '}
                  <Bold>{activity.new_value}</Bold>
                </Text>
              </>
            )}
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'progress_updated':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> обновил(а) прогресс
            {activity.new_value && (
              <Text>
                : <Bold>{activity.new_value}%</Bold>
              </Text>
            )}
          </Text>
          <SubtaskBadge />
        </>
      );
    case 'task_emergency_completed':
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> аварийно завершил(а) задачу
          </Text>
          <SubtaskBadge />
        </>
      );
    default:
      if (activity.action_type.startsWith('task_updated_')) {
        const field = activity.action_type.replace('task_updated_', '');
        return (
          <>
            <Text style={activityTextStyle}>
              <Bold>{userName}</Bold> обновил(а) {field}
            </Text>
            <SubtaskBadge />
          </>
        );
      }
      return (
        <>
          <Text style={activityTextStyle}>
            <Bold>{userName}</Bold> выполнил(а) действие: {activity.action_type}
          </Text>
          <SubtaskBadge />
        </>
      );
  }
};
