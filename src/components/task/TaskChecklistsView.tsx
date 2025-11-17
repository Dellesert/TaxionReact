/**
 * Task Checklists View Component
 * Отображает чеклисты с возможностью добавления/удаления элементов
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import {
  TaskChecklist,
  TaskChecklistItem,
  CreateChecklistDto,
  CreateChecklistItemDto,
} from '@/types/task.types';
import {
  getTaskChecklists,
  createChecklist,
  deleteChecklist,
  createChecklistItem,
  toggleChecklistItem,
  deleteChecklistItem,
} from '@/api/task.api';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { useActionModal } from '@contexts/ActionModalContext';
import { useNotification } from '@contexts/NotificationContext';

interface TaskChecklistsViewProps {
  taskId: number;
  taskTitle?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  assigneeId?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string; // Срок выполнения задачи
  onChecklistChanged?: () => void;
  onAssigneePress?: (assigneeId: number) => void;
  canEdit?: boolean; // Создатель и делегировавший могут создавать/редактировать/удалять чек-листы
  canToggleOnly?: boolean; // Исполнители могут только чекать/анчекать пункты
  readOnly?: boolean; // Только просмотр, никаких изменений
}

// Simple Progress Indicator Component (no SVG)
const ProgressIndicator: React.FC<{
  progress: number;
  size: number;
  color: string;
  backgroundColor: string;
}> = ({ progress, size, color, backgroundColor }) => {
  // Circular progress indicator using multiple layers
  const borderWidth = 2.5;
  const innerSize = size - borderWidth * 2;

  // Calculate which parts of the border to show in color based on progress
  // More granular thresholds for smoother progression
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

      {/* Progress segments - overlay colored borders */}
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

// Priority configuration
const PRIORITY_CONFIG = {
  low: { color: '#6b7280', label: 'Низкий', bg: '#f3f4f6' },
  medium: { color: '#3b82f6', label: 'Средний', bg: '#eff6ff' },
  high: { color: '#f59e0b', label: 'Высокий', bg: '#fffbeb' },
  critical: { color: '#ef4444', label: 'Критичный', bg: '#fef2f2' },
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

/**
 * Helper function to display user name or "Я" if it's current user
 */
const getUserDisplayName = (userName: string, userId: number, currentUserId: number | undefined): string => {
  return currentUserId && userId === currentUserId ? 'Я' : userName;
};

export const TaskChecklistsView: React.FC<TaskChecklistsViewProps> = ({
  taskId,
  taskTitle,
  assigneeName,
  assigneeAvatar,
  assigneeId,
  priority,
  dueDate,
  onChecklistChanged,
  onAssigneePress,
  canEdit = true,
  canToggleOnly = false,
  readOnly = false,
}) => {
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const { showConfirm } = useActionModal();
  const { showError } = useNotification();
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});
  const [expandedChecklists, setExpandedChecklists] = useState<Set<number>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const loadChecklists = async () => {
    try {
      const data = await getTaskChecklists(taskId);
      setChecklists(data);
      // Auto-expand all checklists initially
      setExpandedChecklists(new Set(data.map(c => c.id)));
    } catch (error: any) {
      console.error('Error loading checklists:', error);
      showError('Не удалось загрузить чеклисты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setChecklists([]);
    loadChecklists();
  }, [taskId]);

  const handleCreateChecklist = async () => {
    if (!newChecklistTitle.trim() || !canEdit) return;

    try {
      const data: CreateChecklistDto = {
        title: newChecklistTitle.trim(),
      };
      await createChecklist(taskId, data);
      setNewChecklistTitle('');
      loadChecklists();
      onChecklistChanged?.();
    } catch (error) {
      console.error('Error creating checklist:', error);
      showError('Не удалось создать чеклист');
    }
  };

  const handleDeleteChecklist = (checklist: TaskChecklist) => {
    showConfirm(
      'Удалить чеклист?',
      `Вы уверены, что хотите удалить "${checklist.title}"?`,
      async () => {
        try {
          await deleteChecklist(checklist.id);
          setChecklists(prev => prev.filter(c => c.id !== checklist.id));
          onChecklistChanged?.();
        } catch (error) {
          console.error('Error deleting checklist:', error);
          showError('Не удалось удалить чеклист');
        }
      },
      undefined,
      {
        confirmText: 'Удалить',
        cancelText: 'Отмена',
        destructive: true,
      }
    );
  };

  const handleAddItem = async (checklistId: number) => {
    const text = newItemTexts[checklistId];
    if (!text?.trim() || !canEdit) return;

    try {
      const data: CreateChecklistItemDto = {
        title: text.trim(),
      };
      await createChecklistItem(checklistId, data);
      setNewItemTexts(prev => ({ ...prev, [checklistId]: '' }));
      loadChecklists();
      onChecklistChanged?.();
    } catch (error) {
      console.error('Error adding item:', error);
      showError('Не удалось добавить пункт');
    }
  };

  const handleToggleItem = async (item: TaskChecklistItem) => {
    // Allow toggle if: canEdit OR canToggleOnly (but not readOnly)
    if (readOnly) return;

    try {
      await toggleChecklistItem(item.id);
      // Update local state optimistically
      setChecklists(prev =>
        prev.map(checklist => ({
          ...checklist,
          items: checklist.items.map(i =>
            i.id === item.id ? { ...i, is_completed: !i.is_completed } : i
          ),
        }))
      );
      onChecklistChanged?.();
    } catch (error) {
      console.error('Error toggling item:', error);
      showError('Не удалось изменить статус');
      // Reload to restore correct state
      loadChecklists();
    }
  };

  const handleDeleteItem = async (item: TaskChecklistItem) => {
    try {
      await deleteChecklistItem(item.id);
      setChecklists(prev =>
        prev.map(checklist => ({
          ...checklist,
          items: checklist.items.filter(i => i.id !== item.id),
        }))
      );
      onChecklistChanged?.();
    } catch (error) {
      console.error('Error deleting item:', error);
      showError('Не удалось удалить пункт');
    }
  };

  const toggleChecklistExpanded = (checklistId: number) => {
    setExpandedChecklists(prev => {
      const newSet = new Set(prev);
      if (newSet.has(checklistId)) {
        newSet.delete(checklistId);
      } else {
        newSet.add(checklistId);
      }
      return newSet;
    });
  };

  const toggleItemExpanded = (itemId: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const getChecklistProgress = (checklist: TaskChecklist) => {
    if (!checklist.items || checklist.items.length === 0) return 0;
    const completed = checklist.items.filter(i => i.is_completed).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  const renderChecklistItem = ({ item: checklist }: { item: TaskChecklist }) => {
    const progress = getChecklistProgress(checklist);
    const completedItems = checklist.items.filter(i => i.is_completed).length;
    const totalItems = checklist.items.length;
    const isExpanded = expandedChecklists.has(checklist.id);

    return (
      <View style={[styles.checklistContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
        {/* Checklist Header */}
        <TouchableOpacity
          style={[
            styles.checklistHeader,
            { borderBottomColor: theme.border },
            isExpanded && styles.checklistHeaderExpanded
          ]}
          onPress={() => toggleChecklistExpanded(checklist.id)}
          activeOpacity={0.7}
        >
          {/* Expand/Collapse Icon - Left */}
          <View style={{ marginRight: 8 }}>
            <Ionicons
              name={isExpanded ? 'chevron-down-outline' : 'chevron-forward-outline'}
              size={18}
              color={theme.textSecondary}
            />
          </View>

          <View style={styles.checklistHeaderLeft}>
            <Text style={[styles.checklistTitle, { color: theme.text }]}>
              {taskTitle || checklist.title}
            </Text>
          </View>

          <View style={styles.checklistHeaderRight}>
            {/* Count - Left of Progress */}
            <Text style={[styles.checklistCount, { color: theme.textSecondary }]}>
              {completedItems}/{totalItems}
            </Text>

            {/* Progress Indicator */}
            <ProgressIndicator
              progress={progress}
              size={18}
              color={progress === 100 ? '#10B981' : theme.primary}
              backgroundColor={isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)'}
            />
          </View>
        </TouchableOpacity>

        {/* Items */}
        {isExpanded && checklist.items?.map((item) => {
          const isItemExpanded = expandedItems.has(item.id);

          return (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }
              ]}
            >
              <TouchableOpacity
                style={styles.itemCheckbox}
                onPress={() => handleToggleItem(item)}
                disabled={readOnly || (!canEdit && !canToggleOnly)}
                activeOpacity={readOnly || (!canEdit && !canToggleOnly) ? 1 : 0.7}
              >
                <View style={[
                  styles.checkbox,
                  { borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)' },
                  item.is_completed && styles.checkboxChecked,
                  (readOnly || (!canEdit && !canToggleOnly)) && { opacity: 0.5 }
                ]}>
                  {item.is_completed && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.itemTextContainer}
                onPress={() => toggleItemExpanded(item.id)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.itemText,
                    { color: theme.text },
                    item.is_completed && [styles.itemTextCompleted, { color: theme.textTertiary }]
                  ]}
                  numberOfLines={isItemExpanded ? undefined : 3}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Footer with priority and assignee + due date */}
        {isExpanded && (priority || assigneeName || dueDate) && (
          <View style={[styles.checklistFooter, { borderTopColor: theme.border }]}>
            {/* Priority Badge - Left */}
            {priority && (
              <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_CONFIG[priority].color + (isDark ? '15' : '20') }]}>
                <Text style={[styles.priorityText, { color: PRIORITY_CONFIG[priority].color }]}>
                  {PRIORITY_CONFIG[priority].label}
                </Text>
              </View>
            )}

            {/* Right side: Due Date + Assignee */}
            <View style={styles.footerRight}>
              {/* Due Date */}
              {dueDate && (
                <View style={styles.dueDateContainer}>
                  <Ionicons name="calendar-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.dueDateText, { color: theme.textSecondary }]}>
                    {formatDeadline(dueDate)}
                  </Text>
                </View>
              )}

              {/* Assignee Avatar */}
              {assigneeName && (
                <TouchableOpacity
                  style={styles.assigneeContainer}
                  onPress={() => {
                    if (assigneeId && onAssigneePress) {
                      onAssigneePress(assigneeId);
                    }
                  }}
                  disabled={!assigneeId || !onAssigneePress}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.assigneeName, { color: theme.textSecondary }]}>
                    {assigneeId ? getUserDisplayName(assigneeName, assigneeId, user?.id) : assigneeName}
                  </Text>
                  {assigneeAvatar ? (
                    <Image
                      source={{ uri: assigneeAvatar }}
                      style={styles.assigneeAvatar}
                    />
                  ) : (
                    <View style={[styles.assigneeAvatarPlaceholder, { backgroundColor: theme.primary }]}>
                      <Text style={styles.assigneeAvatarText}>
                        {assigneeName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // Don't render anything if there are no checklists
  if (checklists.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {checklists.map((checklist) => (
        <React.Fragment key={checklist.id}>
          {renderChecklistItem({ item: checklist })}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
  },
  addChecklistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  addChecklistInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  list: {
  },
  listContent: {
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  checklistContainer: {
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0,
  },
  checklistHeaderExpanded: {
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  checklistHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checklistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checklistTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  checklistCount: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemCheckbox: {
    paddingTop: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  addItemInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  checklistFooter: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginTop: 4,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  assigneeAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  assigneeAvatarPlaceholder: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assigneeAvatarText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  assigneeName: {
    fontSize: 12,
    fontWeight: '500',
  },
});
