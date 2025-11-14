/**
 * Task Subtasks List Component
 * Отображает список подзадач с возможностью создания новых
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { Task, TaskStatus } from '../../types/task.types';
import { getSubtasks, updateTaskStatus } from '../../api/task.api';
import { getOrCreateDirectChat } from '@api/chat.api';
import { useTheme } from '@hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@components/common/Avatar';
import { UserProfileModal } from '@components/common/UserProfileModal';
import { useNavigation } from '@react-navigation/native';

// Simple Progress Indicator Component (no SVG)
const ProgressIndicator: React.FC<{
  progress: number;
  size: number;
  color: string;
  backgroundColor: string;
}> = ({ progress, size, color, backgroundColor }) => {
  const borderWidth = 2.5;

  // Calculate which parts of the border to show in color based on progress
  const showTop = progress >= 5;
  const showTopRight = progress >= 15;
  const showRight = progress >= 30;
  const showBottomRight = progress >= 45;
  const showBottom = progress >= 60;
  const showBottomLeft = progress >= 75;
  const showLeft = progress >= 90;
  const showTopLeft = progress >= 95;

  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: 'transparent',
      position: 'relative',
    }}>
      {/* Base circle background */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: borderWidth,
        borderColor: backgroundColor,
      }} />

      {/* Progress segments */}
      {showTop && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showTopRight && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderTopColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
      {showRight && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderRightColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showBottomRight && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderRightColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
      {showBottom && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showBottomLeft && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderBottomColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
      {showLeft && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderLeftColor: color,
          transform: [{ rotate: '-45deg' }],
        }} />
      )}
      {showTopLeft && (
        <View style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: 'transparent',
          borderLeftColor: color,
          transform: [{ rotate: '0deg' }],
        }} />
      )}
    </View>
  );
};

interface TaskSubtasksListProps {
  parentTaskId: number;
  parentTaskProgress: number; // 0-100, from backend's progress_percentage field
  onSubtaskPress?: (subtask: Task) => void;
  onSubtaskCreated?: () => void;
  onCreateSubtaskPress?: () => void;
  readOnly?: boolean; // If true, hide edit/delete buttons
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

  // For dates more than 7 days away
  const day = date.getDate();
  const month = date.toLocaleString('ru', { month: 'long' });
  return `${day} ${month}`;
};

export const TaskSubtasksList: React.FC<TaskSubtasksListProps> = ({
  parentTaskId,
  parentTaskProgress,
  onSubtaskPress,
  onSubtaskCreated,
  onCreateSubtaskPress,
  readOnly = false,
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation();
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  // Styles
  const styles = StyleSheet.create({
    container: {
      marginBottom: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 2,
      borderBottomWidth: 0,
    },
    headerExpanded: {
      paddingBottom: 10,
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    headerTitle: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: -0.2,
      textTransform: 'uppercase',
      color: theme.text,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerProgress: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: -0.1,
      color: theme.textSecondary,
    },
    listContent: {
      gap: 8,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    createFirstSubtaskButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      marginHorizontal: 16,
      marginVertical: 12,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.primary,
      borderStyle: 'dashed',
    },
    createFirstSubtaskText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.primary,
    },
    addSubtaskButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 8,
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
    },
    addSubtaskButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.primary,
    },
    subtaskItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.backgroundSecondary,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    },
    checkboxContainer: {
      paddingTop: 1,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#10b981',
      borderColor: '#10b981',
    },
    subtaskContent: {
      flex: 1,
    },
    subtaskTitle: {
      fontSize: 14,
      fontWeight: '500',
      lineHeight: 20,
      color: theme.text,
      marginBottom: 6,
    },
    subtaskTitleCompleted: {
      textDecorationLine: 'line-through',
      color: theme.textTertiary,
      opacity: 0.6,
    },
    subtaskMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    dueDateInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    dueDateText: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    progressText: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    assigneeAvatarContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      gap: 4,
      width: 60,
    },
    assigneeName: {
      fontSize: 10,
      color: theme.textSecondary,
      textAlign: 'center',
      width: '100%',
    },
    subtaskActions: {
      flexDirection: 'row',
      gap: 8,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 15,
      color: theme.textTertiary,
      marginTop: 12,
      textAlign: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
      backgroundColor: theme.backgroundSecondary,
      margin: 16,
      borderRadius: 12,
    },
    errorText: {
      fontSize: 15,
      color: theme.error,
      marginTop: 12,
      textAlign: 'center',
      fontWeight: '500',
    },
  });

  const loadSubtasks = async () => {
    try {
      const data = await getSubtasks(parentTaskId);
      setSubtasks(data);
    } catch (error) {
      console.error('Error loading subtasks:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить подзадачи');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubtasks();
  }, [parentTaskId]);

  const handleStatusToggle = async (subtask: Task) => {
    try {
      const newStatus: TaskStatus = subtask.status === 'done' ? 'in_progress' : 'done';
      await updateTaskStatus(subtask.id, { status: newStatus });

      // Update local state
      setSubtasks(prev =>
        prev.map(s => (s.id === subtask.id ? { ...s, status: newStatus } : s))
      );

      // Notify parent about change to reload task and update progress
      if (onSubtaskCreated) {
        onSubtaskCreated();
      }
    } catch (error) {
      console.error('Error updating subtask status:', error);
      Alert.alert('Ошибка', 'Не удалось обновить статус подзадачи');
    }
  };

  const handleOpenChat = async (userId: number) => {
    try {
      const chat = await getOrCreateDirectChat(userId);
      setIsProfileModalVisible(false);

      // Navigate to chat - need to get root navigation
      const rootNavigation = navigation.getParent();

      if (rootNavigation) {
        // @ts-ignore
        rootNavigation.navigate('Chats', {
          screen: 'Chat',
          params: {
            chatId: chat.id,
            chat: chat,
          },
        });
      } else {
        Alert.alert('Ошибка', 'Не удалось открыть чат');
      }
    } catch (error: any) {
      console.error('Error opening chat:', error);
      Alert.alert('Ошибка', 'Не удалось открыть чат');
    }
  };

  const renderSubtaskItem = ({ item }: { item: Task }) => {
    const isDone = item.status === 'done';
    const statusColor = STATUS_COLORS[item.status];

    return (
      <View style={styles.subtaskItem}>
        {/* Checkbox */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => handleStatusToggle(item)}
          disabled={readOnly}
        >
          <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
            {isDone && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        </TouchableOpacity>

        {/* Content */}
        <TouchableOpacity
          style={styles.subtaskContent}
          onPress={() => onSubtaskPress?.(item)}
        >
          <Text
            style={[
              styles.subtaskTitle,
              isDone && styles.subtaskTitleCompleted,
            ]}
            numberOfLines={2}
          >
            {item.title}
          </Text>

          {/* Meta info row */}
          <View style={styles.subtaskMeta}>
            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[item.status]}
              </Text>
            </View>

            {/* Date */}
            {item.due_date && (
              <View style={styles.dueDateInfo}>
                <Ionicons name="calendar-outline" size={12} color={theme.textSecondary} />
                <Text style={styles.dueDateText}>
                  {formatDeadline(item.due_date)}
                </Text>
              </View>
            )}

            {/* Progress */}
            {item.progress_percentage !== undefined && item.progress_percentage > 0 && (
              <View style={styles.progressContainer}>
                <Ionicons name="stats-chart" size={12} color={theme.textSecondary} />
                <Text style={styles.progressText}>{item.progress_percentage}%</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Assignee Avatar - Right */}
        {item.assignees && item.assignees.length > 0 && (
          <TouchableOpacity
            style={styles.assigneeAvatarContainer}
            onPress={() => {
              if (item.assignees && item.assignees[0]) {
                setSelectedUserId(item.assignees[0].id);
                setIsProfileModalVisible(true);
              }
            }}
          >
            <Avatar
              name={item.assignees[0].name}
              imageUrl={item.assignees[0].avatar}
              size={24}
            />
            <Text style={styles.assigneeName} numberOfLines={1}>
              {item.assignees[0].name}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // If no subtasks, show button to create first subtask (or return null if no button)
  if (subtasks.length === 0) {
    // If there's no create button permission, don't render anything
    if (!onCreateSubtaskPress) {
      return null;
    }

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.createFirstSubtaskButton}
          onPress={onCreateSubtaskPress}
        >
          <Ionicons name="git-branch-outline" size={20} color="#3b82f6" />
          <Text style={styles.createFirstSubtaskText}>Разбить на подзадачи</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If there are subtasks, show list with add button at the end
  const completedCount = subtasks.filter(s => s.status === 'done').length;
  // Use backend-calculated progress
  const progress = parentTaskProgress;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={[styles.header, isExpanded && styles.headerExpanded]}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.7}
      >
        {/* Expand/Collapse Icon */}
        <Ionicons
          name={isExpanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
          size={18}
          color={theme.textSecondary}
          style={{ marginRight: 8 }}
        />

        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>
            Подзадачи
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.headerProgress}>
            {completedCount}/{subtasks.length}
          </Text>

          {/* Progress Indicator */}
          <ProgressIndicator
            progress={progress}
            size={18}
            color={progress === 100 ? '#10B981' : theme.primary}
            backgroundColor={isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'}
          />
        </View>
      </TouchableOpacity>

      {/* Subtasks List */}
      {isExpanded && (
        <View style={styles.listContent}>
          {subtasks.map((item) => (
            <View key={item.id.toString()}>
              {renderSubtaskItem({ item })}
            </View>
          ))}

          {onCreateSubtaskPress && (
            <TouchableOpacity
              style={styles.addSubtaskButton}
              onPress={onCreateSubtaskPress}
            >
              <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
              <Text style={styles.addSubtaskButtonText}>Добавить подзадачу</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        visible={isProfileModalVisible}
        userId={selectedUserId}
        onClose={() => {
          setIsProfileModalVisible(false);
          setSelectedUserId(null);
        }}
        onOpenChat={handleOpenChat}
      />
    </View>
  );
};
