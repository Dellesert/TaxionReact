import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '../types/task.types';
import type { TasksByStatus, TotalsByStatus, LoadingByStatus, StatusTab } from '../hooks/useTaskListData';
import { useTheme } from '@shared/hooks/useTheme';
import { useAuthStore } from '@shared/store/authStore';
import { useTaskPermissions } from '../hooks/useTaskPermissions';
import { useActionModal } from '@shared/contexts/ActionModalContext';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useTaskActions } from '../hooks/useTaskActions';
import { TaskActionMenu } from './TaskActionMenu';
import EditTaskModal from './EditTaskModal';
import { DelegateTaskModal } from './DelegateTaskModal';
import { CreateSubtaskModal } from './CreateSubtaskModal';
import { STATUS_LABELS, STATUS_COLORS, STATUS_TABS_ORDER } from '../utils/taskListHelpers';

interface TaskTableViewProps {
  tasks: TasksByStatus;
  totals: TotalsByStatus;
  loading: LoadingByStatus;
  subtasksCache: Record<number, Task[]>;
  searchQuery: string;
  onTaskPress: (task: Task) => void;
  onTaskUpdated?: () => void; // Callback when task is updated/deleted
}

type SortField = 'title' | 'status' | 'deadline' | 'priority' | 'created_at';
type SortDirection = 'asc' | 'desc';

export const TaskTableView: React.FC<TaskTableViewProps> = ({
  tasks,
  totals,
  loading,
  subtasksCache,
  searchQuery,
  onTaskPress,
  onTaskUpdated,
}) => {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { showConfirm } = useActionModal();
  const { showSuccess, showError } = useNotification();

  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Expanded tasks state (for subtasks)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

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

  // Combine all tasks from all statuses
  const allTasks = React.useMemo(() => {
    const combined: Task[] = [];
    STATUS_TABS_ORDER.forEach(status => {
      combined.push(...tasks[status]);
    });
    return combined;
  }, [tasks]);

  // Sort tasks
  const sortedTasks = React.useMemo(() => {
    const sorted = [...allTasks];
    sorted.sort((a, b) => {
      let compareResult = 0;

      switch (sortField) {
        case 'title':
          compareResult = a.title.localeCompare(b.title);
          break;
        case 'status':
          compareResult = a.status.localeCompare(b.status);
          break;
        case 'deadline':
          const aDeadline = a.due_date || '';
          const bDeadline = b.due_date || '';
          compareResult = aDeadline.localeCompare(bDeadline);
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority] || 0;
          const bPriority = priorityOrder[b.priority] || 0;
          compareResult = aPriority - bPriority;
          break;
        case 'created_at':
          compareResult = (a.created_at || '').localeCompare(b.created_at || '');
          break;
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
    return sorted;
  }, [allTasks, sortField, sortDirection]);

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
        const taskSubtasks = subtasksCache[task.id] || [];
        taskSubtasks.forEach(subtask => {
          addTaskWithSubtasks(subtask, level + 1);
        });
      }
    };

    sortedTasks.forEach(task => {
      addTaskWithSubtasks(task, 0);
    });

    return result;
  }, [sortedTasks, expandedTaskIds, subtasksCache]);

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
    subtasksCache[currentActionTask?.id || 0] || [],
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

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <Ionicons name="swap-vertical" size={14} color={theme.textSecondary} />;
    }
    return (
      <Ionicons
        name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
        size={14}
        color={theme.primary}
      />
    );
  };

  const getStatusColor = (status: StatusTab) => {
    return STATUS_COLORS[status];
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
    };
    return labels[priority] || priority;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const isLoading = loading.new || loading.in_progress || loading.review || loading.done;

  return (
    <View style={styles.container}>
      <View style={styles.tableContainer}>
        {/* Header */}
        <View style={[styles.headerRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.headerCell, styles.titleColumn]}
            onPress={() => handleSort('title')}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>Название</Text>
            {renderSortIcon('title')}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCell, styles.statusColumn]}
            onPress={() => handleSort('status')}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>Статус</Text>
            {renderSortIcon('status')}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCell, styles.priorityColumn]}
            onPress={() => handleSort('priority')}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>Приоритет</Text>
            {renderSortIcon('priority')}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCell, styles.dateColumn]}
            onPress={() => handleSort('deadline')}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>Дедлайн</Text>
            {renderSortIcon('deadline')}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerCell, styles.dateColumn]}
            onPress={() => handleSort('created_at')}
          >
            <Text style={[styles.headerText, { color: theme.text }]}>Создано</Text>
            {renderSortIcon('created_at')}
          </TouchableOpacity>

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
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  {searchQuery ? 'Задачи не найдены' : 'Нет задач'}
                </Text>
              </View>
            ) : (
              tasksWithSubtasks.map(({ task, level, isSubtask }) => {
                const hasSubtasks = (subtasksCache[task.id]?.length || 0) > 0;
                const isExpanded = expandedTaskIds.has(task.id);

                return (
                <TouchableOpacity
                  key={`${task.id}-${level}`}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isSubtask ? theme.backgroundSecondary : theme.background,
                      borderBottomColor: theme.border
                    }
                  ]}
                  onPress={() => onTaskPress(task)}
                >
                  <View style={[styles.cell, styles.titleColumn]}>
                    <View style={styles.titleRow}>
                      {/* Indentation */}
                      {level > 0 && (
                        <View style={{ width: level * 20 }}>
                          {Array.from({ length: level }).map((_, i) => (
                            <View
                              key={i}
                              style={[styles.indentLine, { backgroundColor: theme.border }]}
                            />
                          ))}
                        </View>
                      )}

                      {/* Expand/Collapse button */}
                      {hasSubtasks ? (
                        <TouchableOpacity
                          style={styles.expandButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(task.id);
                          }}
                        >
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={16}
                            color={theme.text}
                          />
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.expandButtonPlaceholder} />
                      )}

                      {/* Task info */}
                      <View style={styles.titleContent}>
                        <Text style={[styles.cellText, { color: theme.text }]} numberOfLines={2}>
                          {task.title}
                        </Text>
                        {task.description ? (
                          <Text style={[styles.descriptionText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {task.description}
                          </Text>
                        ) : null}
                        {hasSubtasks && (
                          <View style={styles.subtaskBadge}>
                            <Ionicons name="list" size={12} color={theme.textSecondary} />
                            <Text style={[styles.subtaskText, { color: theme.textSecondary }]}>
                              {subtasksCache[task.id].length}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.statusColumn]}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status as StatusTab) }]}>
                      <Text style={styles.statusText}>{STATUS_LABELS[task.status as StatusTab]}</Text>
                    </View>
                  </View>

                  <View style={[styles.cell, styles.priorityColumn]}>
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {getPriorityLabel(task.priority)}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.dateColumn]}>
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {formatDate(task.due_date)}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.dateColumn]}>
                    <Text style={[styles.cellText, { color: theme.text }]}>
                      {formatDate(task.created_at)}
                    </Text>
                  </View>

                  <View style={[styles.cell, styles.actionsColumn]}>
                    {hasAvailableActions(task) && (
                      <TouchableOpacity
                        ref={ref => menuButtonRefs.current[task.id] = ref}
                        style={[styles.actionButton, { backgroundColor: theme.backgroundSecondary }]}
                        onPress={(e) => handleOpenActionMenu(task, e)}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color={theme.text} />
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
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
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
  actionsColumn: {
    width: 80,
  },
  bodyContainer: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
  },
  descriptionText: {
    fontSize: 12,
    marginTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  indentLine: {
    position: 'absolute',
    left: 10,
    top: 0,
    bottom: 0,
    width: 1,
  },
  expandButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  expandButtonPlaceholder: {
    width: 24,
    marginRight: 4,
  },
  titleContent: {
    flex: 1,
  },
  subtaskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  subtaskText: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
  },
});
