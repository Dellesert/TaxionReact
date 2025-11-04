/**
 * Task Checklists View Component
 * Отображает чеклисты с возможностью добавления/удаления элементов
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Alert,
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

interface TaskChecklistsViewProps {
  taskId: number;
  onChecklistChanged?: () => void;
  canEdit?: boolean; // Создатель и делегировавший могут создавать/редактировать/удалять чек-листы
  canToggleOnly?: boolean; // Исполнители могут только чекать/анчекать пункты
  readOnly?: boolean; // Только просмотр, никаких изменений
}

export const TaskChecklistsView: React.FC<TaskChecklistsViewProps> = ({
  taskId,
  onChecklistChanged,
  canEdit = true,
  canToggleOnly = false,
  readOnly = false,
}) => {
  const { theme } = useTheme();
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
    } catch (error) {
      console.error('Error loading checklists:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить чеклисты');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadChecklists();
  }, [taskId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadChecklists();
  };

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
      Alert.alert('Ошибка', 'Не удалось создать чеклист');
    }
  };

  const handleDeleteChecklist = (checklist: TaskChecklist) => {
    Alert.alert(
      'Удалить чеклист?',
      `Вы уверены, что хотите удалить "${checklist.title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteChecklist(checklist.id);
              setChecklists(prev => prev.filter(c => c.id !== checklist.id));
              onChecklistChanged?.();
            } catch (error) {
              console.error('Error deleting checklist:', error);
              Alert.alert('Ошибка', 'Не удалось удалить чеклист');
            }
          },
        },
      ]
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
      Alert.alert('Ошибка', 'Не удалось добавить пункт');
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
      Alert.alert('Ошибка', 'Не удалось изменить статус');
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
      Alert.alert('Ошибка', 'Не удалось удалить пункт');
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
    return (
      <View style={styles.checklistContainer}>
        {checklist.items?.map(item => {
          const isExpanded = expandedItems.has(item.id);
          return (
            <View key={item.id} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
              <TouchableOpacity
                style={styles.itemCheckbox}
                onPress={() => handleToggleItem(item)}
                disabled={readOnly}
              >
                <View style={[styles.checkbox, { borderColor: theme.border }, item.is_completed && styles.checkboxChecked]}>
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
                  numberOfLines={isExpanded ? undefined : 3}
                >
                  {item.title}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
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
      <FlatList
        data={checklists}
        renderItem={renderChecklistItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
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
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemCheckbox: {
    paddingTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 15,
    lineHeight: 22,
  },
  itemTextCompleted: {
    textDecorationLine: 'line-through',
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
});
