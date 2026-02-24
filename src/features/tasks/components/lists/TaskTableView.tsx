import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '../../types/task.types';
import type { TasksByStatus, TotalsByStatus, LoadingByStatus, StatusTab } from '../../hooks/useTaskListData';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useTaskPermissions } from '../../hooks/useTaskPermissions';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTaskActions } from '../../hooks/useTaskActions';
import { Avatar } from '@shared/components/common/Avatar';
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
  onTaskPress: (task: Task) => void;
  onTaskUpdated?: () => void; // Callback when task is updated/deleted
}

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  totals,
  loading,
  searchQuery,
  advancedFilters,
  onTaskPress,
  onTaskUpdated,
}) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();

  // Expanded tasks state (for subtasks)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

  // Hover state for rows (web only)
  const [hoveredRowId, setHoveredRowId] = useState<number | null>(null);

  // Action menu state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [menuButtonPosition, setMenuButtonPosition] = useState<{ x: number; y: number; width: number; height: number } | undefined>();
  const menuButtonRefs = useRef<{ [key: number]: any }>({});

  // Modal states - keep task reference separate from menu state
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [delegatingTask, setDelegatingTask] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<Task | null>(null);
  const [taskForAction, setTaskForAction] = useState<Task | null>(null); // For emergency complete / delete

  const [showEditModal, setShowEditModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  // Combine all tasks from all statuses and apply client-side filters
  // Note: Server-side sorting is already applied via advancedFilters
  const allTasks = React.useMemo(() => {
    const combined: Task[] = [];
    STATUS_TABS_ORDER.forEach(status => {
      combined.push(...tasks[status]);
    });
    // Apply client-side filters (overdue deadline only - subtasks now filtered on server)
    return applyClientSideFilters(combined, advancedFilters);
  }, [tasks, advancedFilters]);

  // Build hierarchical list with subtasks
  type TaskRow = {
    task: Task;
    level: number;
    isSubtask: boolean;
  };

  const tasksWithSubtasks = React.useMemo(() => {
    const result: TaskRow[] = [];

    const addTaskWithSubtasks = (task: Task, level: number) => {
      result.push({ task, level, isSubtask: level > 0 });

      // If task is expanded and has subtasks, add them
      if (expandedTaskIds.has(task.id)) {
        const taskSubtasks = task.subtasks || [];
        taskSubtasks.forEach(subtask => {
          addTaskWithSubtasks(subtask, level + 1);
        });
      }
    };

    allTasks.forEach(task => {
      addTaskWithSubtasks(task, 0);
    });

    return result;
  }, [allTasks, expandedTaskIds]);

  // Get permissions for selected task
  const permissions = useTaskPermissions(selectedTask);

  // Check if task has any available actions
  const hasAvailableActions = useCallback((task: Task) => {
    if (!task || !user) return false;

    // Use permissions from backend
    if (!task.permissions) return false;

    const hasEditAction = task.permissions.can_edit;
    const hasDelegateAction = task.permissions.can_delegate && task.status !== 'done' && task.status !== 'cancelled';
    const hasSubtaskAction = task.permissions.can_create_subtasks;
    const hasEmergencyAction = task.permissions.can_emergency_complete && task.status !== 'done';
    const hasDeleteAction = task.permissions.can_delete;

    return hasEditAction || hasDelegateAction || hasSubtaskAction || hasEmergencyAction || hasDeleteAction;
  }, [user]);

  // Get current task for actions (prefer specific task states over selectedTask)
  const currentActionTask = taskForAction || editingTask || delegatingTask || parentTaskForSubtask || selectedTask;

  // Task actions hook
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
    // Check if task has any available actions
    if (!hasAvailableActions(task)) {
      return;
    }

    // Set the task to get permissions
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
      low: '#10B981',      // green
      medium: '#F59E0B',   // amber
      high: '#EF4444',     // red
      critical: '#DC2626', // dark red
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

  return (
    <View style={styles.container}>
      <View style={[styles.tableContainer, { borderColor: theme.border, backgroundColor: theme.card }]}>
        {/* Header */}
        <View style={[styles.headerRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={[styles.headerCell, styles.titleColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Название</Text>
          </View>

          <View style={[styles.headerCell, styles.statusColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Статус</Text>
          </View>

          <View style={[styles.headerCell, styles.priorityColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Приоритет</Text>
          </View>

          <View style={[styles.headerCell, styles.dateColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Дедлайн</Text>
          </View>

          <View style={[styles.headerCell, styles.dateColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Создано</Text>
          </View>

          <View style={[styles.headerCell, styles.creatorColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Автор</Text>
          </View>

          <View style={[styles.headerCell, styles.actionsColumn]}>
            <Text style={[styles.headerText, { color: theme.text }]}>Действия</Text>
          </View>
        </View>

        {/* Body */}
        <ScrollView style={styles.bodyContainer}>
            {isLoading && tasksWithSubtasks.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : tasksWithSubtasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={searchQuery ? 'search-outline' : 'document-text-outline'}
                  size={64}
                  color={theme.border}
                  style={styles.emptyIcon}
                />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                  {searchQuery ? 'Задачи не найдены' : 'Нет задач'}
                </Text>
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery
                    ? 'Попробуйте изменить параметры поиска'
                    : 'Создайте новую задачу для начала работы'}
                </Text>
              </View>
            ) : (
              tasksWithSubtasks.map(({ task, level, isSubtask }, index) => {
                const hasSubtasks = (task.subtasks?.length || 0) > 0;
                const isExpanded = expandedTaskIds.has(task.id);

                const isHovered = hoveredRowId === task.id;
                const isEvenRow = index % 2 === 0;
                const isLastRow = index === tasksWithSubtasks.length - 1;

                return (
                <TouchableOpacity
                  key={`${task.id}-${level}-${task.parent_task_id || 'root'}-${index}`}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isEvenRow ? theme.card : 'transparent',
                      borderBottomColor: theme.border,
                    },
                    isLastRow && { borderBottomWidth: 0 },
                    isHovered && { backgroundColor: theme.primary + '12' },
                    isSubtask && styles.subtaskRow,
                  ]}
                  onPress={() => onTaskPress(task)}
                  // @ts-ignore - web-only props
                  onMouseEnter={Platform.OS === 'web' ? () => setHoveredRowId(task.id) : undefined}
                  onMouseLeave={Platform.OS === 'web' ? () => setHoveredRowId(null) : undefined}
                >
                  <View style={[styles.cell, styles.titleColumn]}>
                    <View style={styles.titleRow}>
                      {/* Expand/Collapse button */}
                      {hasSubtasks && !isSubtask && (
                        <TouchableOpacity
                          style={styles.expandButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(task.id);
                          }}
                        >
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={14}
                            color={theme.text}
                          />
                        </TouchableOpacity>
                      )}

                      {isSubtask && (
                        <Ionicons name="return-down-forward-outline" size={12} color={theme.textSecondary} style={{ marginRight: 4 }} />
                      )}

                      <Text style={[styles.cellText, { color: theme.text, fontWeight: isSubtask ? '400' : '500' }]} numberOfLines={1}>
                        {task.title}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.statusColumn]}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status as StatusTab) }]}>
                      <Text style={styles.statusText}>{STATUS_LABELS[task.status as StatusTab]}</Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.priorityColumn]}>
                    <View style={styles.priorityContainer}>
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
                      <Text style={[styles.cellText, { color: theme.text }]}>
                        {getPriorityLabel(task.priority)}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.dateColumn]}>
                    {task.due_date ? (
                      <View style={styles.deadlineContainer}>
                        <Ionicons
                          name="calendar-outline"
                          size={14}
                          color={getDeadlineColor(getDeadlineStatus(task.due_date)) || theme.textSecondary}
                          style={styles.deadlineIcon}
                        />
                        <Text style={[
                          styles.cellText,
                          {
                            color: getDeadlineColor(getDeadlineStatus(task.due_date)) || theme.text,
                            fontWeight: getDeadlineStatus(task.due_date) === 'overdue' ? '600' : '400'
                          }
                        ]}>
                          {formatDate(task.due_date)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.cellText, { color: theme.textSecondary }]}>—</Text>
                    )}
                  </View>

                  <View style={[styles.cell, styles.dateColumn]}>
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {formatDate(task.created_at)}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.creatorColumn]}>
                    <View style={styles.creatorContainer}>
                      <Avatar
                        name={task.creator?.name || '?'}
                        imageUrl={task.creator?.avatar}
                        size={22}
                      />
                      <Text style={[styles.cellText, { color: theme.text }]} numberOfLines={1}>
                        {user && task.creator?.id === user.id ? 'Я' : (task.creator?.name?.split(' ')[0] || '—')}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.actionsColumn]}>
                    {hasAvailableActions(task) && (
                      <TouchableOpacity
                        ref={ref => menuButtonRefs.current[task.id] = ref}
                        style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={(e) => handleOpenActionMenu(task, e)}
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color={theme.text} />
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
                );
              })
            )}
        </ScrollView>
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tableContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    padding: 8,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    ...(Platform.OS === 'web' && {
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }),
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  titleColumn: {
    flex: 3,
    minWidth: 250,
  },
  statusColumn: {
    flex: 1.5,
    minWidth: 130,
  },
  priorityColumn: {
    flex: 1,
    minWidth: 100,
  },
  dateColumn: {
    flex: 1,
    minWidth: 100,
  },
  creatorColumn: {
    flex: 1,
    minWidth: 100,
  },
  actionsColumn: {
    width: 80,
  },
  bodyContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    minHeight: 40,
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
    }),
  },
  rowHovered: Platform.select({
    web: {
      opacity: 0.85,
    },
    default: {},
  }),
  subtaskRow: {
    paddingLeft: 32,
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 13,
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
  expandButtonPlaceholder: {
    width: 20,
    marginRight: 4,
  },
  titleContent: {
    flex: 1,
  },
  subtaskTitle: {
    opacity: 0.8,
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
  deadlineIcon: {
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
