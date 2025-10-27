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

interface TaskChecklistsViewProps {
  taskId: number;
  onChecklistChanged?: () => void;
}

export const TaskChecklistsView: React.FC<TaskChecklistsViewProps> = ({
  taskId,
  onChecklistChanged,
}) => {
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newItemTexts, setNewItemTexts] = useState<Record<number, string>>({});
  const [expandedChecklists, setExpandedChecklists] = useState<Set<number>>(new Set());

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
    if (!newChecklistTitle.trim()) return;

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
    if (!text?.trim()) return;

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

  const getChecklistProgress = (checklist: TaskChecklist) => {
    if (checklist.items.length === 0) return 0;
    const completed = checklist.items.filter(i => i.is_completed).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  const renderChecklistItem = ({ item: checklist }: { item: TaskChecklist }) => {
    const isExpanded = expandedChecklists.has(checklist.id);
    const progress = getChecklistProgress(checklist);
    const completedCount = checklist.items.filter(i => i.is_completed).length;

    return (
      <View style={styles.checklistContainer}>
        <TouchableOpacity
          style={styles.checklistHeader}
          onPress={() => toggleChecklistExpanded(checklist.id)}
        >
          <View style={styles.checklistHeaderLeft}>
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={20}
              color="#6b7280"
            />
            <Text style={styles.checklistTitle}>{checklist.title}</Text>
          </View>

          <View style={styles.checklistHeaderRight}>
            <Text style={styles.checklistProgress}>
              {completedCount}/{checklist.items.length}
            </Text>
            <TouchableOpacity
              onPress={() => handleDeleteChecklist(checklist)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {progress > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}

        {isExpanded && (
          <View style={styles.itemsContainer}>
            {checklist.items.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <TouchableOpacity
                  style={styles.itemCheckbox}
                  onPress={() => handleToggleItem(item)}
                >
                  <View style={[styles.checkbox, item.is_completed && styles.checkboxChecked]}>
                    {item.is_completed && (
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>

                <Text
                  style={[styles.itemText, item.is_completed && styles.itemTextCompleted]}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <TouchableOpacity
                  onPress={() => handleDeleteItem(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={18} color="#d1d5db" />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addItemContainer}>
              <TextInput
                style={styles.addItemInput}
                placeholder="Добавить пункт..."
                value={newItemTexts[checklist.id] || ''}
                onChangeText={text =>
                  setNewItemTexts(prev => ({ ...prev, [checklist.id]: text }))
                }
                onSubmitEditing={() => handleAddItem(checklist.id)}
                returnKeyType="done"
              />
              {newItemTexts[checklist.id]?.trim() && (
                <TouchableOpacity onPress={() => handleAddItem(checklist.id)}>
                  <Ionicons name="add-circle" size={24} color="#3b82f6" />
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
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Чеклисты ({checklists.length})</Text>
      </View>

      <View style={styles.addChecklistContainer}>
        <TextInput
          style={styles.addChecklistInput}
          placeholder="Создать новый чеклист..."
          value={newChecklistTitle}
          onChangeText={setNewChecklistTitle}
          onSubmitEditing={handleCreateChecklist}
          returnKeyType="done"
        />
        {newChecklistTitle.trim() && (
          <TouchableOpacity onPress={handleCreateChecklist}>
            <Ionicons name="add-circle" size={28} color="#3b82f6" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={checklists}
        renderItem={renderChecklistItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="list-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>Чеклистов пока нет</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
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
    padding: 16,
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
    color: '#9ca3af',
    marginTop: 12,
  },
  checklistContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  checklistHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  checklistHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checklistProgress: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: '#e5e7eb',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  itemsContainer: {
    padding: 12,
    paddingTop: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  itemCheckbox: {
    padding: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  itemTextCompleted: {
    color: '#9ca3af',
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
