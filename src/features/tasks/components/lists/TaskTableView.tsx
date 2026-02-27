import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '../../types/task.types';
import type { TasksByStatus, TotalsByStatus, LoadingByStatus, StatusTab } from '../../hooks/useTaskListData';
import { useAuthStore } from '@shared/store/authStore';
import { useTheme } from '@shared/hooks/useTheme';
import { useTaskPermissions } from '../../hooks/useTaskPermissions';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTaskActions } from '../../hooks/useTaskActions';
import { Avatar } from '@shared/components/common/Avatar';
import { DataTable, DataTableColumn } from '@shared/components/common/DataTable';
import { TaskActionMenu } from '../common/TaskActionMenu';
import EditTaskModal from '../modals/EditTaskModal';
import { DelegateTaskModal } from '../modals/DelegateTaskModal';
import { CreateSubtaskModal } from '../modals/CreateSubtaskModal';
import { STATUS_LABELS, STATUS_COLORS, STATUS_TABS_ORDER, applyClientSideFilters, type AdvancedTaskFilters } from '../../utils/taskListHelpers';

interface TaskTableViewProps {
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  searchQuery: string;
  advancedFilters: AdvancedTaskFilters;
  expandAllSubtasks?: boolean;
  onTaskPress: (task: Task) => void;
  onTaskUpdated?: () => void;
}

type TaskRow = {
  task: Task;
  level: number;
  isSubtask: boolean;
  isLastSubtask: boolean;
  parentTaskId?: number;
};

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  totals,
  loading,
  searchQuery,
  advancedFilters,
  expandAllSubtasks = false,
  onTaskPress,
  onTaskUpdated,
}) => {
  const { user } = useAuthStore();
  const { theme, isDark } = useTheme();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();

  // Expanded tasks state (for subtasks)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

  // Action menu state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const menuButtonRefs = useRef<{ [key: number]: any }>({});

  // Modal states
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);
  const [taskForAction, setTaskForAction] = useState<Task | null>(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  // Combine all tasks, separate top-level from subtasks
  const { topLevelTasks, orphanSubtasks } = React.useMemo(() => {
    const combined: Task[] = [];
    STATUS_TABS_ORDER.forEach(status => {
      combined.push(...tasks[status]);
    });
    const filtered = applyClientSideFilters(combined, advancedFilters);

    // Build set of all task IDs in current result
    const allTaskIds = new Set(filtered.map(t => t.id));

    const topLevel: Task[] = [];
    const orphans: Task[] = [];

    for (const task of filtered) {
      if (!task.parent_task_id) {
        // Top-level task (no parent)
        topLevel.push(task);
      } else if (!allTaskIds.has(task.parent_task_id)) {
        // Orphan subtask: parent not in current list
        orphans.push(task);
      }
      // Skip subtasks whose parent IS in the list — they appear via parent.subtasks
    }

    return { topLevelTasks: topLevel, orphanSubtasks: orphans };
  }, [tasks, advancedFilters]);

  // Sync expandedTaskIds with expandAllSubtasks prop
  useEffect(() => {
    if (expandAllSubtasks) {
      const idsToExpand = new Set<number>();
      topLevelTasks.forEach(task => {
        if ((task.subtasks && task.subtasks.length > 0) || (task.subtask_count && task.subtask_count > 0)) {
          idsToExpand.add(task.id);
        }
      });
      setExpandedTaskIds(idsToExpand);
    } else {
      setExpandedTaskIds(new Set());
    }
  }, [expandAllSubtasks, topLevelTasks]);

  // Build hierarchical list with subtasks
  const tasksWithSubtasks = React.useMemo(() => {
    const result: TaskRow[] = [];

    const addTaskWithSubtasks = (task: Task, level: number, siblings?: Task[]) => {
      const isLast = siblings ? siblings[siblings.length - 1]?.id === task.id : false;

      result.push({
        task,
        level,
        isSubtask: level > 0,
        isLastSubtask: level > 0 && isLast,
        parentTaskId: task.parent_task_id,
      });

      if (expandedTaskIds.has(task.id)) {
        const taskSubtasks = task.subtasks || [];
        taskSubtasks.forEach(subtask => {
          addTaskWithSubtasks(subtask, level + 1, taskSubtasks);
        });
      }
    };

    // Top-level tasks with expandable subtasks
    topLevelTasks.forEach(task => {
      addTaskWithSubtasks(task, 0);
    });

    // Orphan subtasks (parent not visible) — shown at top level with indicator
    orphanSubtasks.forEach(task => {
      result.push({
        task,
        level: 0,
        isSubtask: false,
        isLastSubtask: false,
        parentTaskId: task.parent_task_id,
      });
    });

    return result;
  }, [topLevelTasks, orphanSubtasks, expandedTaskIds]);

  // Get permissions for selected task
  const permissions = useTaskPermissions(selectedTask);

  // Check if task has any available actions
  const hasAvailableActions = useCallback((task: Task) => {
    if (!task || !user) return false;
    if (!task.permissions) return false;

    const hasEditAction = task.permissions.can_edit;
    const hasDelegateAction = task.permissions.can_delegate && task.status !== 'done' && task.status !== 'cancelled';
    const hasSubtaskAction = task.permissions.can_create_subtasks;
    const hasEmergencyAction = task.permissions.can_emergency_complete && task.status !== 'done';
    const hasDeleteAction = task.permissions.can_delete;

    return hasEditAction || hasDelegateAction || hasSubtaskAction || hasEmergencyAction || hasDeleteAction;
  }, [user]);

  const currentActionTask = taskForAction || editingTask || delegatingTask || parentTaskForSubtask || selectedTask;

  const { handleStatusChange, handleEmergencyComplete, handleDeleteTask } = useTaskActions(
    currentActionTask,
    currentActionTask?.subtasks || [],
    () => {
      onTaskUpdated?.();
      setShowActionMenu(false);
      setSelectedTask(null);
      setEditingTask(null);
      setDelegatingTask(null);
      setParentTaskForSubtask(null);
      setTaskForAction(null);
    },
    showError
  );

  const handleToggleExpand = useCallback((taskId: number) => {
    setExpandedTaskIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleOpenActionMenu = useCallback((task: Task, event: any) => {
    if (!hasAvailableActions(task)) return;

    setSelectedTask(task);

    const button = menuButtonRefs.current[task.id];
    if (button) {
      button.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMenuButtonPosition({ x: pageX, y: pageY, width, height });
        setShowActionMenu(true);
      });
    }
  }, [hasAvailableActions]);

  const handleCloseActionMenu = useCallback(() => {
    setShowActionMenu(false);
    setTimeout(() => {
      setSelectedTask(null);
      setMenuButtonPosition(undefined);
    }, 300);
  }, []);

  const handleEdit = useCallback(() => {
    if (selectedTask) {
      setEditingTask(selectedTask);
      setShowEditModal(true);
    }
  }, [selectedTask]);

  const handleDelegate = useCallback(() => {
    if (selectedTask) {
      setDelegatingTask(selectedTask);
      setShowDelegateModal(true);
    }
  }, [selectedTask]);

  const handleAddSubtask = useCallback(() => {
    if (selectedTask) {
      setParentTaskForSubtask(selectedTask);
      setShowSubtaskModal(true);
    }
  }, [selectedTask]);

  const handleEmergencyCompleteClick = useCallback(() => {
    if (selectedTask) {
      setTaskForAction(selectedTask);
      showConfirm(
        'Аварийное завершение',
        'Вы уверены, что хотите завершить эту задачу в аварийном режиме? Это действие будет зафиксировано в истории.',
        async () => {
          await handleEmergencyComplete();
        },
        () => {
          setTaskForAction(null);
        },
        { destructive: true }
      );
    }
  }, [handleEmergencyComplete, showConfirm, selectedTask]);

  const handleDelete = useCallback(() => {
    if (selectedTask) {
      setTaskForAction(selectedTask);
      showConfirm(
        'Удалить задачу?',
        'Эта задача будет удалена навсегда. Это действие нельзя отменить.',
        async () => {
          await handleDeleteTask();
        },
        () => {
          setTaskForAction(null);
        },
        { destructive: true }
      );
    }
  }, [handleDeleteTask, selectedTask, showConfirm]);

  const handleTaskUpdatedCallback = useCallback(() => {
    setShowEditModal(false);
    setShowDelegateModal(false);
    setShowSubtaskModal(false);
    setEditingTask(null);
    setDelegatingTask(null);
    setParentTaskForSubtask(null);
    setTaskForAction(null);
    onTaskUpdated?.();
  }, [onTaskUpdated]);

  const getStatusColor = (status: StatusTab) => {
    return STATUS_COLORS[status];
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      critical: 'Критичный',
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      critical: '#DC2626',
    };
    return colors[priority] || '#6B7280';
  };

  const getDeadlineStatus = (dueDate?: string) => {
    if (!dueDate) return null;
    const now = new Date();
    const deadline = new Date(dueDate);
    const diffTime = deadline.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'upcoming';
    return 'normal';
  };

  const getDeadlineColor = (status: string | null) => {
    switch (status) {
      case 'overdue': return '#EF4444';
      case 'upcoming': return '#F59E0B';
      default: return undefined;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isLoading = loading.new || loading.in_progress || loading.review || loading.done;

  // Client-side pagination
  const TASK_PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, advancedFilters]);

  const totalTaskItems = tasksWithSubtasks.length;
  const paginatedTasks = useMemo(() => {
    const start = (currentPage - 1) * TASK_PAGE_SIZE;
    return tasksWithSubtasks.slice(start, start + TASK_PAGE_SIZE);
  }, [tasksWithSubtasks, currentPage]);

  // Disable DataTable sorting when subtasks are expanded to preserve hierarchy
  const hasExpandedTasks = expandedTaskIds.size > 0;

  // Column definitions
  const columns: DataTableColumn<TaskRow>[] = useMemo(() => [
    {
      key: 'title',
      title: 'Название',
      flex: 3,
      minWidth: 250,
      sortable: !hasExpandedTasks,
      sortValue: (row) => row.task.title.toLowerCase(),
      render: ({ task, isSubtask, isLastSubtask, parentTaskId }, thm) => {
        const hasSubtasks = (task.subtasks?.length || 0) > 0 || (task.subtask_count || 0) > 0;
        const isExpanded = expandedTaskIds.has(task.id);
        const subtaskCount = task.subtasks?.length || task.subtask_count || 0;
        const isOrphan = !isSubtask && !!parentTaskId;

        return (
          <View style={localStyles.titleRow}>
            {/* Tree connector for subtask rows */}
            {isSubtask && (
              <View style={localStyles.treeConnectorContainer}>
                <View style={[
                  localStyles.treeVerticalLine,
                  { backgroundColor: thm.border },
                  isLastSubtask && localStyles.treeVerticalLineShort,
                ]} />
                <View style={[
                  localStyles.treeHorizontalLine,
                  { backgroundColor: thm.border },
                ]} />
              </View>
            )}

            {/* Expand/collapse button for parent tasks with subtasks */}
            {hasSubtasks && !isSubtask && (
              <TouchableOpacity
                style={localStyles.expandButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleToggleExpand(task.id);
                }}
              >
                <Ionicons
                  name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={thm.text}
                />
              </TouchableOpacity>
            )}

            {/* Spacer for tasks without subtasks (alignment) */}
            {!hasSubtasks && !isSubtask && !isOrphan && (
              <View style={{ width: 20, marginRight: 4 }} />
            )}

            {/* Orphan subtask indicator */}
            {isOrphan && (
              <View style={[localStyles.orphanBadge, { backgroundColor: thm.backgroundTertiary }]}>
                <Ionicons name="git-branch-outline" size={12} color={thm.textSecondary} />
              </View>
            )}

            {/* Task title */}
            <Text
              style={[
                localStyles.cellText,
                {
                  color: thm.text,
                  fontWeight: isSubtask ? '400' : '500',
                  fontSize: isSubtask ? 12 : 13,
                },
              ]}
              numberOfLines={1}
            >
              {task.title}
            </Text>

            {/* Subtask count badge next to parent title */}
            {hasSubtasks && !isSubtask && subtaskCount > 0 && (
              <View style={[
                localStyles.subtaskCountBadge,
                {
                  backgroundColor: isDark
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'rgba(0, 0, 0, 0.05)',
                },
              ]}>
                <Ionicons name="git-branch-outline" size={10} color={thm.textSecondary} />
                <Text style={[localStyles.subtaskCountText, { color: thm.textSecondary }]}>
                  {subtaskCount}
                </Text>
              </View>
            )}
          </View>
        );
      },
    },
    {
      key: 'status',
      title: 'Статус',
      flex: 1.5,
      minWidth: 130,
      sortable: !hasExpandedTasks,
      sortValue: (row) => {
        const order: Record<string, number> = { new: 0, in_progress: 1, review: 2, done: 3, cancelled: 4 };
        return order[row.task.status] ?? 5;
      },
      render: ({ task }) => (
        <View style={[localStyles.statusBadge, { backgroundColor: getStatusColor(task.status as StatusTab) }]}>
          <Text style={localStyles.statusText}>{STATUS_LABELS[task.status as StatusTab]}</Text>
        </View>
      ),
    },
    {
      key: 'priority',
      title: 'Приоритет',
      flex: 1,
      minWidth: 100,
      sortable: !hasExpandedTasks,
      sortValue: (row) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[row.task.priority] ?? 4;
      },
      render: ({ task }, thm) => (
        <View style={localStyles.priorityContainer}>
          <View style={[localStyles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
          <Text style={[localStyles.cellText, { color: thm.text }]}>
            {getPriorityLabel(task.priority)}
          </Text>
        </View>
      ),
    },
    {
      key: 'deadline',
      title: 'Дедлайн',
      flex: 1,
      minWidth: 100,
      sortable: !hasExpandedTasks,
      sortValue: (row) => row.task.due_date || 'zzzz',
      render: ({ task }, thm) => {
        if (task.due_date) {
          return (
            <View style={localStyles.deadlineContainer}>
              <Ionicons
                name="calendar-outline"
                size={14}
                color={getDeadlineColor(getDeadlineStatus(task.due_date)) || thm.textSecondary}
              />
              <Text style={[
                localStyles.cellText,
                {
                  color: getDeadlineColor(getDeadlineStatus(task.due_date)) || thm.text,
                  fontWeight: getDeadlineStatus(task.due_date) === 'overdue' ? '600' : '400'
                }
              ]}>
                {formatDate(task.due_date)}
              </Text>
            </View>
          );
        }
        return <Text style={[localStyles.cellText, { color: thm.textSecondary }]}>—</Text>;
      },
    },
    {
      key: 'created',
      title: 'Создано',
      flex: 1,
      minWidth: 100,
      sortable: !hasExpandedTasks,
      sortValue: (row) => row.task.created_at || '',
      render: ({ task }, thm) => (
        <Text style={[localStyles.cellText, { color: thm.text }]}>
          {formatDate(task.created_at)}
        </Text>
      ),
    },
    {
      key: 'creator',
      title: 'Автор',
      flex: 1,
      minWidth: 100,
      sortable: !hasExpandedTasks,
      sortValue: (row) => row.task.creator?.name?.toLowerCase() || '',
      render: ({ task }, thm) => (
        <View style={localStyles.creatorContainer}>
          <Avatar
            name={task.creator?.name || '?'}
            imageUrl={task.creator?.avatar}
            size={22}
          />
          <Text style={[localStyles.cellText, { color: thm.text }]} numberOfLines={1}>
            {user && task.creator?.id === user.id ? 'Я' : (task.creator?.name?.split(' ')[0] || '—')}
          </Text>
        </View>
      ),
    },
    {
      key: 'actions',
      title: 'Действия',
      width: 80,
      render: ({ task }, thm) => {
        if (!hasAvailableActions(task)) return null;
        return (
          <TouchableOpacity
            ref={(ref: any) => { menuButtonRefs.current[task.id] = ref; }}
            style={[localStyles.actionButton, { backgroundColor: thm.backgroundSecondary }]}
            onPress={(e) => handleOpenActionMenu(task, e)}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={thm.text} />
          </TouchableOpacity>
        );
      },
    },
  ], [expandedTaskIds, hasExpandedTasks, handleToggleExpand, user, hasAvailableActions, handleOpenActionMenu, isDark]);

  return (
    <View style={localStyles.container}>
      <DataTable<TaskRow>
        columns={columns}
        data={paginatedTasks}
        keyExtractor={(row, index) => `${row.task.id}-${row.level}-${row.task.parent_task_id || 'root'}-${index}`}
        onRowPress={(row) => onTaskPress(row.task)}
        isLoading={isLoading && tasksWithSubtasks.length === 0}
        emptyIcon={searchQuery ? 'search-outline' : 'document-text-outline'}
        emptyTitle={searchQuery ? 'Задачи не найдены' : 'Нет задач'}
        emptySubtitle={searchQuery ? 'Попробуйте изменить параметры поиска' : user?.role !== 'employee' ? 'Создайте новую задачу для начала работы' : 'Задачи пока не назначены'}
        getRowStyle={(row) => {
          if (row.isSubtask) {
            return {
              backgroundColor: isDark
                ? 'rgba(255, 255, 255, 0.02)'
                : 'rgba(0, 0, 0, 0.015)',
              paddingLeft: 16 + (row.level * 24),
            };
          }
          if (row.parentTaskId) {
            return {
              borderLeftWidth: 3,
              borderLeftColor: isDark ? '#4B5563' : '#D1D5DB',
            };
          }
          return undefined;
        }}
        getRowNumber={(row, index) => {
          if (row.isSubtask) return '';
          // Count parent rows up to this index
          let parentCount = 0;
          for (let i = 0; i <= index; i++) {
            if (!paginatedTasks[i]?.isSubtask) parentCount++;
          }
          return (currentPage - 1) * TASK_PAGE_SIZE + parentCount;
        }}
        pagination={{
          currentPage,
          totalItems: totalTaskItems,
          pageSize: TASK_PAGE_SIZE,
          onPageChange: setCurrentPage,
        }}
      />

      {/* Action Menu */}
      <TaskActionMenu
        visible={showActionMenu}
        task={selectedTask}
        permissions={permissions}
        onClose={handleCloseActionMenu}
        onEdit={handleEdit}
        onDelegate={handleDelegate}
        onAddSubtask={handleAddSubtask}
        onEmergencyComplete={handleEmergencyCompleteClick}
        onDelete={handleDelete}
        isDesktop={true}
        buttonPosition={menuButtonPosition}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          visible={showEditModal}
          task={editingTask}
          onClose={() => {
            setShowEditModal(false);
            setEditingTask(null);
          }}
          onTaskUpdated={handleTaskUpdatedCallback}
        />
      )}

      {/* Delegate Task Modal */}
      {delegatingTask && (
        <DelegateTaskModal
          visible={showDelegateModal}
          taskId={delegatingTask.id}
          onClose={() => {
            setShowDelegateModal(false);
            setDelegatingTask(null);
          }}
          onDelegated={handleTaskUpdatedCallback}
        />
      )}

      {/* Create Subtask Modal */}
      {parentTaskForSubtask && (
        <CreateSubtaskModal
          visible={showSubtaskModal}
          parentTaskId={parentTaskForSubtask.id}
          onClose={() => {
            setShowSubtaskModal(false);
            setParentTaskForSubtask(null);
          }}
          onSubtaskCreated={handleTaskUpdatedCallback}
        />
      )}
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cellText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  expandButton: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  // Tree connector styles
  treeConnectorContainer: {
    width: 20,
    height: 36,
    position: 'relative',
    marginRight: 4,
  },
  treeVerticalLine: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: 1.5,
    opacity: 0.4,
  },
  treeVerticalLineShort: {
    bottom: 18,
  },
  treeHorizontalLine: {
    position: 'absolute',
    left: 8,
    top: 18,
    width: 10,
    height: 1.5,
    opacity: 0.4,
  },
  // Subtask count badge
  subtaskCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    flexShrink: 0,
  },
  subtaskCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Orphan subtask indicator
  orphanBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
