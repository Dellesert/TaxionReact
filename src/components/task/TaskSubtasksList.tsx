/**
 * Task Subtasks List Component
 * Отображает список подзадач с возможностью создания новых
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Task, TaskStatus, CreateTaskDto } from '../../types/task.types';
import { getSubtasks, createSubtask, updateTaskStatus, deleteTask } from '../../api/task.api';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TaskSubtasksListProps {
  parentTaskId: number;
  onSubtaskPress?: (subtask: Task) => void;
  onSubtaskCreated?: () => void;
  onCreateSubtaskPress?: () => void;
}

// Status colors
const STATUS_COLORS: Record<TaskStatus, string> = {
  new: '#6b7280',
  viewed: '#8b5cf6',
  in_progress: '#3b82f6',
  review: '#f59e0b',
  done: '#10b981',
  cancelled: '#ef4444',
};

// Status labels
const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Новая',
  viewed: 'Просмотрена',
  in_progress: 'В работе',
  review: 'На проверке',
  done: 'Готово',
  cancelled: 'Отменена',
};

export const TaskSubtasksList: React.FC<TaskSubtasksListProps> = ({
  parentTaskId,
  onSubtaskPress,
  onSubtaskCreated,
  onCreateSubtaskPress,
}) => {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSubtasks = async () => {
    try {
      const data = await getSubtasks(parentTaskId);
      setSubtasks(data);
    } catch (error) {
      console.error('Error loading subtasks:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить подзадачи');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubtasks();
  }, [parentTaskId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSubtasks();
  };

  const handleStatusToggle = async (subtask: Task) => {
    try {
      const newStatus: TaskStatus = subtask.status === 'done' ? 'in_progress' : 'done';
      await updateTaskStatus(subtask.id, { status: newStatus });

      // Update local state
      setSubtasks(prev =>
        prev.map(s => (s.id === subtask.id ? { ...s, status: newStatus } : s))
      );

      // Notify parent about change (to recalculate progress)
      if (onSubtaskCreated) {
        onSubtaskCreated();
      }
    } catch (error) {
      console.error('Error updating subtask status:', error);
      Alert.alert('Ошибка', 'Не удалось обновить статус подзадачи');
    }
  };

  const handleDeleteSubtask = async (subtask: Task) => {
    const confirmDelete = async () => {
      try {
        await deleteTask(subtask.id);

        // Update local state
        setSubtasks(prev => prev.filter(s => s.id !== subtask.id));

        // Notify parent about change (to recalculate progress)
        if (onSubtaskCreated) {
          onSubtaskCreated();
        }
      } catch (error) {
        console.error('Error deleting subtask:', error);
        if (Platform.OS === 'web') {
          alert('Ошибка: Не удалось удалить подзадачу');
        } else {
          Alert.alert('Ошибка', 'Не удалось удалить подзадачу');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Вы уверены, что хотите удалить подзадачу "${subtask.title}"?`)) {
        await confirmDelete();
      }
    } else {
      Alert.alert(
        'Удалить подзадачу?',
        `Вы уверены, что хотите удалить подзадачу "${subtask.title}"?`,
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: confirmDelete,
          },
        ]
      );
    }
  };

  const renderSubtaskItem = ({ item }: { item: Task }) => {
    const isDone = item.status === 'done';
    const statusColor = STATUS_COLORS[item.status];

    return (
      <View style={styles.subtaskItem}>
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleStatusToggle(item)}
        >
          <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
            {isDone && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.subtaskContent}
          onPress={() => onSubtaskPress?.(item)}
        >
          <Text
            style={[
              styles.subtaskTitle,
              isDone && styles.subtaskTitleDone,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          <View style={styles.subtaskMeta}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>

            {item.assignees && item.assignees.length > 0 && (
              <View style={styles.assigneeInfo}>
                <Ionicons name="person" size={12} color="#6b7280" />
                <Text style={styles.assigneeName} numberOfLines={1}>
                  {item.assignees[0].name}
                </Text>
              </View>
            )}

            {item.due_date && (
              <View style={styles.dueDateInfo}>
                <Ionicons name="calendar-outline" size={12} color="#6b7280" />
                <Text style={styles.dueDateText}>
                  {format(new Date(item.due_date), 'dd MMM', { locale: ru })}
                </Text>
              </View>
            )}

            {item.progress_percentage !== undefined && item.progress_percentage > 0 && (
              <View style={styles.progressContainer}>
                <Ionicons name="stats-chart" size={12} color="#6b7280" />
                <Text style={styles.progressText}>{item.progress_percentage}%</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => {
            console.log('Delete button pressed for subtask:', item.id);
            handleDeleteSubtask(item);
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="list-outline" size={48} color="#d1d5db" />
      <Text style={styles.emptyText}>Подзадач пока нет</Text>
      <Text style={styles.emptySubtext}>
        Разбейте задачу на подзадачи для лучшего контроля
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          Подзадачи ({subtasks.length})
        </Text>
        <View style={styles.headerRight}>
          {subtasks.length > 0 && (
            <Text style={styles.headerProgress}>
              {subtasks.filter(s => s.status === 'done').length} из {subtasks.length} выполнено
            </Text>
          )}
          {onCreateSubtaskPress && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={onCreateSubtaskPress}
            >
              <Ionicons name="add-circle" size={24} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {subtasks.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={subtasks}
          renderItem={renderSubtaskItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerProgress: {
    fontSize: 14,
    color: '#6b7280',
  },
  addButton: {
    padding: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  subtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
    padding: 12,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  subtaskContent: {
    flex: 1,
  },
  subtaskTitle: {
    fontSize: 15,
    color: '#111827',
    marginBottom: 6,
  },
  subtaskTitleDone: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  subtaskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
  },
  assigneeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: 100,
  },
  assigneeName: {
    fontSize: 12,
    color: '#6b7280',
  },
  dueDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 12,
    marginLeft: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
