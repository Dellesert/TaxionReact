/**
 * Enhanced Task Detail Screen
 * Экран с полной информацией о задаче, включая новые функции:
 * - Подзадачи
 * - История активности
 * - Файлы
 * - Чеклисты
 * - Прогресс-бар
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Task, TaskStatus } from '@/types/task.types';
import * as taskApi from '@/api/task.api';
import { Loading } from '@/components/common/Loading';
import {
  TaskProgressBar,
  TaskActivityList,
  TaskSubtasksList,
  TaskAttachmentsList,
  TaskChecklistsView,
  CreateSubtaskModal,
  DelegateTaskModal,
} from '@/components/task';
import { useTheme } from '@/hooks/useTheme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type TaskDetailRouteParams = {
  taskId: string;
};

type TabType = 'info' | 'subtasks' | 'checklists' | 'files' | 'activity';

const TABS = [
  { key: 'info' as TabType, label: 'Инфо', icon: 'information-circle-outline' },
  { key: 'subtasks' as TabType, label: 'Подзадачи', icon: 'list-outline' },
  { key: 'checklists' as TabType, label: 'Чеклисты', icon: 'checkbox-outline' },
  { key: 'files' as TabType, label: 'Файлы', icon: 'attach-outline' },
  { key: 'activity' as TabType, label: 'История', icon: 'time-outline' },
];

// Status colors and labels
const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; bg: string }> = {
  new: { color: '#6b7280', label: 'Новая', bg: '#f3f4f6' },
  viewed: { color: '#8b5cf6', label: 'Просмотрена', bg: '#f5f3ff' },
  in_progress: { color: '#3b82f6', label: 'В работе', bg: '#eff6ff' },
  review: { color: '#f59e0b', label: 'На проверке', bg: '#fffbeb' },
  done: { color: '#10b981', label: 'Готово', bg: '#f0fdf4' },
  cancelled: { color: '#ef4444', label: 'Отменена', bg: '#fef2f2' },
};

const PRIORITY_CONFIG = {
  low: { color: '#6b7280', label: 'Низкий', bg: '#f3f4f6' },
  medium: { color: '#3b82f6', label: 'Средний', bg: '#eff6ff' },
  high: { color: '#f59e0b', label: 'Высокий', bg: '#fffbeb' },
  critical: { color: '#ef4444', label: 'Критичный', bg: '#fef2f2' },
};

export const TaskDetailScreenEnhanced: React.FC = () => {
  const route = useRoute<RouteProp<{ params: TaskDetailRouteParams }, 'params'>>();
  const navigation = useNavigation();
  const { taskId } = route.params;
  const { theme } = useTheme();

  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showCreateSubtask, setShowCreateSubtask] = useState(false);
  const [showDelegateTask, setShowDelegateTask] = useState(false);

  useEffect(() => {
    loadTask();
    markAsViewed();
  }, [taskId]);

  const loadTask = async () => {
    try {
      setIsLoading(true);
      const taskIdNum = Number(taskId);
      const response = await taskApi.getTask(taskIdNum);
      setTask(response);
    } catch (error: any) {
      console.error('Failed to load task:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить задачу');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const markAsViewed = async () => {
    try {
      const taskIdNum = Number(taskId);
      await taskApi.markTaskAsViewed(taskIdNum);
    } catch (error) {
      // Не критично, просто логируем
      console.log('Failed to mark as viewed:', error);
    }
  };

  const handleRefresh = () => {
    loadTask();
    setRefreshKey(prev => prev + 1);
  };

  const handleStatusChange = async (newStatus: TaskStatus) => {
    if (!task) return;

    try {
      await taskApi.updateTaskStatus(task.id, { status: newStatus });
      await loadTask();
      Alert.alert('Успешно', 'Статус задачи изменён');
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Ошибка', 'Не удалось изменить статус');
    }
  };

  const renderTaskInfo = () => {
    if (!task) return null;

    const statusConfig = STATUS_CONFIG[task.status];
    const priorityConfig = PRIORITY_CONFIG[task.priority];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Description */}
        {task.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.descriptionTitle}>{task.title}</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{task.description}</Text>
            </View>
          </View>
        )}

        {/* Status and Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статус и Приоритет</Text>
          <View style={styles.badgesRow}>
            <View style={[styles.badge, { backgroundColor: statusConfig.bg }]}>
              <Text style={[styles.badgeText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: priorityConfig.bg }]}>
              <Text style={[styles.badgeText, { color: priorityConfig.color }]}>
                {priorityConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick status change */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Быстрая смена статуса</Text>
          <View style={styles.statusButtons}>
            {(['in_progress', 'review', 'done'] as TaskStatus[]).map(status => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  { backgroundColor: STATUS_CONFIG[status].bg },
                  task.status === status && styles.statusButtonActive,
                ]}
                onPress={() => handleStatusChange(status)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    { color: STATUS_CONFIG[status].color },
                  ]}
                >
                  {STATUS_CONFIG[status].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date */}
        {task.due_date && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Дедлайн</Text>
            <Text style={styles.infoText}>
              {format(new Date(task.due_date), 'dd MMMM yyyy', { locale: ru })}
            </Text>
          </View>
        )}

        {/* Creator and Assignees */}
        {task.creator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Создатель</Text>
            <Text style={styles.infoText}>{task.creator.name}</Text>
          </View>
        )}

        {task.assignees && task.assignees.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Исполнители</Text>
            {task.assignees.map(assignee => (
              <Text key={assignee.id} style={styles.infoText}>
                • {assignee.name}
              </Text>
            ))}
          </View>
        )}

        {/* Delegation Chain */}
        {task.delegation_chain && task.delegation_chain.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Цепочка делегирования</Text>
            {task.delegation_chain.map((user, index) => (
              <View key={user.id} style={styles.chainItem}>
                <Text style={styles.chainText}>
                  {index + 1}. {user.name} ({user.position || 'Сотрудник'})
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  if (isLoading) {
    return <Loading />;
  }

  if (!task) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowCreateSubtask(true)}
            >
              <Ionicons name="add-circle-outline" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowDelegateTask(true)}
            >
              <Ionicons name="git-branch-outline" size={22} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRefresh}>
              <Ionicons name="refresh" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>

        {/* Progress Bar */}
        {task.progress_percentage !== undefined && (
          <View style={styles.progressContainer}>
            <TaskProgressBar progress={task.progress_percentage} />
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? '#3b82f6' : '#6b7280'}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      {activeTab === 'info' && renderTaskInfo()}
      {activeTab === 'subtasks' && (
        <TaskSubtasksList
          parentTaskId={task.id}
          onSubtaskPress={(subtask) => {
            navigation.push('TaskDetail', { taskId: subtask.id.toString() });
          }}
          onSubtaskCreated={handleRefresh}
          onCreateSubtaskPress={() => setShowCreateSubtask(true)}
        />
      )}
      {activeTab === 'checklists' && (
        <TaskChecklistsView
          taskId={task.id}
          taskTitle={task.title}
          assigneeName={task.assignees && task.assignees.length > 0 ? task.assignees[0].name : undefined}
          assigneeAvatar={task.assignees && task.assignees.length > 0 ? task.assignees[0].avatar : undefined}
          priority={task.priority}
          dueDate={task.due_date}
          onChecklistChanged={handleRefresh}
        />
      )}
      {activeTab === 'files' && (
        <TaskAttachmentsList
          taskId={task.id}
          onAttachmentAdded={handleRefresh}
        />
      )}
      {activeTab === 'activity' && (
        <TaskActivityList key={refreshKey} taskId={task.id} />
      )}

      {/* Modals */}
      <CreateSubtaskModal
        visible={showCreateSubtask}
        parentTaskId={task.id}
        onClose={() => setShowCreateSubtask(false)}
        onSubtaskCreated={handleRefresh}
      />

      <DelegateTaskModal
        visible={showDelegateTask}
        taskId={task.id}
        onClose={() => setShowDelegateTask(false)}
        onDelegated={handleRefresh}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerButton: {
    padding: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  progressContainer: {
    marginTop: 8,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionSection: {
    padding: 16,
  },
  descriptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
    color: '#111827',
    marginBottom: 10,
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusButtonActive: {
    borderColor: '#3b82f6',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  chainItem: {
    marginBottom: 4,
  },
  chainText: {
    fontSize: 14,
    color: '#4b5563',
  },
});

export default TaskDetailScreenEnhanced;
