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
      <View style={styles.tableContainer}>
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

                return (
                <TouchableOpacity
                  key={`${task.id}-${level}-${task.parent_task_id || 'root'}-${index}`}
                  style={[
                    styles.row,
                    {
                      backgroundColor: isSubtask ? theme.primary + '08' : theme.card,
                      borderColor: theme.border,
                      borderLeftColor: isSubtask ? theme.primary : theme.border,
                      borderLeftWidth: isSubtask ? 3 : 1,
                    },
                    isHovered && styles.rowHovered,
                    isSubtask && styles.subtaskRow,
                  ]}
                  onPress={() => onTaskPress(task)}
                  // @ts-ignore - web-only props
                  onMouseEnter={Platform.OS === 'web' ? () => setHoveredRowId(task.id) : undefined}
                  onMouseLeave={Platform.OS === 'web' ? () => setHoveredRowId(null) : undefined}
                >
                  <View style={[styles.cell, styles.titleColumn]}>
                    <View style={styles.titleRow}>
                      {/* Indentation with visual connector */}
                      {level > 0 && (
                        <View style={styles.indentContainer}>
                          <View style={[styles.verticalConnector, { backgroundColor: theme.primary + '40' }]} />
                          <View style={[styles.horizontalConnector, { backgroundColor: theme.primary + '40' }]} />
                          <View style={[styles.connectorDot, { backgroundColor: theme.primary }]} />
                        </View>
                      )}

                      {/* Expand/Collapse button */}
                      {hasSubtasks && !isSubtask ? (
                        <TouchableOpacity
                          style={[styles.expandButton, { backgroundColor: isExpanded ? theme.primary + '15' : 'transparent' }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleToggleExpand(task.id);
                          }}
                        >
                          <Ionicons
                            name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                            size={18}
                            color={isExpanded ? theme.primary : theme.text}
                          />
                        </TouchableOpacity>
                      ) : !isSubtask ? (
                        <View style={styles.expandButtonPlaceholder} />
                      ) : null}

                      {/* Task info */}
                      <View style={styles.titleContent}>
                        <View style={styles.taskTitleRow}>
                          {isSubtask && (
                            <View style={[styles.subtaskBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
                              <Ionicons name="git-branch-outline" size={12} color={theme.primary} />
                            </View>
                          )}
                          <Text style={[styles.cellText, styles.taskTitle, { color: theme.text }, isSubtask && styles.subtaskTitle]} numberOfLines={2}>
                            {task.title}
                          </Text>
                        </View>
                        {task.description ? (
                          <Text style={[styles.descriptionText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {task.description}
                          </Text>
                        ) : null}

                        {/* Delegation chain - always show on separate line */}
                        {(() => {
                          // Build delegation chain
                          const chain: { name: string; id?: number }[] = [];

                          if (task.delegation_chain && task.delegation_chain.length > 0) {
                            // Use delegation_chain from backend
                            task.delegation_chain.forEach(u => chain.push({ name: u.name, id: u.id }));
                          } else {
                            // Fallback: build from creator -> assignees
                            if (task.creator) {
                              chain.push({ name: task.creator.name, id: task.creator.id });
                            }

                            if (task.assignees && task.assignees.length > 0) {
                              task.assignees.forEach(a => {
                                if (!chain.find(u => u.id === a.id)) {
                                  chain.push({ name: a.name, id: a.id });
                                }
                              });
                            }
                          }

                          // Format user name (replace current user with "Я")
                          const formatUserName = (userName: string, userId?: number): string => {
                            if (user && userId === user.id) return 'Я';
                            // Extract first name (before space)
                            return userName.split(' ')[0];
                          };

                          const delegationText = chain.length > 0
                            ? chain.map(u => formatUserName(u.name, u.id)).join(' → ')
                            : '—';

                          return (
                            <View style={styles.delegationRow}>
                              <Ionicons name="person-outline" size={12} color={theme.textSecondary} />
                              <Text style={[styles.delegationRowText, { color: theme.textSecondary }]} numberOfLines={1}>
                                {delegationText}
                              </Text>
                            </View>
                          );
                        })()}

                        <View style={styles.taskMetaRow}>
                          {/* Subtasks count - always show */}
                          <View style={[styles.metaBadge, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="git-branch-outline" size={12} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              {task.subtasks?.length || task.subtask_count || 0}
                            </Text>
                          </View>

                          {/* Comments count - always show */}
                          <View style={[styles.metaBadge, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="chatbubble-outline" size={12} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              {task.comment_count || 0}
                            </Text>
                          </View>

                          {/* Attachments count - always show */}
                          <View style={[styles.metaBadge, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="attach-outline" size={12} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              {task.attachment_count || 0}
                            </Text>
                          </View>
                          {task.tags && task.tags.length > 0 && task.tags.slice(0, 2).map((tag, idx) => (
                            <View key={idx} style={[styles.tagBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary }]}>
                              <Text style={[styles.tagText, { color: theme.primary }]}>
                                {tag}
                              </Text>
                            </View>
                          ))}
                          {task.tags && task.tags.length > 2 && (
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                              +{task.tags.length - 2}
                            </Text>
                          )}
                          {task.progress_percentage > 0 && (
                            <View style={styles.progressContainer}>
                              <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                                <View
                                  style={[
                                    styles.progressFill,
                                    {
                                      width: `${task.progress_percentage}%`,
                                      backgroundColor: task.progress_percentage === 100 ? '#10B981' : theme.primary
                                    }
                                  ]}
                                />
                              </View>
                              <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                                {task.progress_percentage}%
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
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
    paddingVertical: 16,
    paddingHorizontal: 28,
    marginBottom: 8,
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
  actionsColumn: {
    width: 80,
  },
  bodyContainer: {
    flex: 1,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 20,
    paddingHorizontal: 20,
    minHeight: 80,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    ...(Platform.OS === 'web' && {
      transitionProperty: 'all',
      transitionDuration: '0.2s',
      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    }),
  },
  rowHovered: Platform.select({
    web: {
      transform: [{ translateY: -2 }],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      elevation: 6,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  }),
  subtaskRow: {
    marginLeft: 24,
    marginRight: 16,
    minHeight: 70,
    paddingVertical: 16,
  },
  cell: {
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  taskTitle: {
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 21,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    opacity: 0.8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  indentContainer: {
    width: 40,
    marginRight: 8,
    position: 'relative',
    height: '100%',
    minHeight: 40,
  },
  verticalConnector: {
    position: 'absolute',
    left: 15,
    top: 0,
    bottom: '50%',
    width: 2,
    borderRadius: 1,
  },
  horizontalConnector: {
    position: 'absolute',
    left: 15,
    top: '50%',
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  connectorDot: {
    position: 'absolute',
    left: 32,
    top: '50%',
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: -3,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  expandButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderRadius: 8,
    ...(Platform.OS === 'web' && {
      transitionProperty: 'background-color, transform',
      transitionDuration: '0.2s',
      cursor: 'pointer',
    }),
  },
  expandButtonPlaceholder: {
    width: 24,
    marginRight: 4,
  },
  titleContent: {
    flex: 1,
    gap: 4,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskBadge: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  subtaskTitle: {
    fontSize: 14,
    opacity: 0.95,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
      },
    }),
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  priorityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  deadlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deadlineIcon: {
    marginTop: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    maxWidth: 120,
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '500',
    minWidth: 32,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      transitionProperty: 'opacity, transform',
      transitionDuration: '0.15s',
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  delegationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  delegationRowText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
});
