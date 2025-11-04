/**
 * Edit Task Modal
 * Модальное окно для редактирования задачи
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Alert,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Task, TaskPriority, TaskChecklist, TaskChecklistItem, CreateChecklistDto, CreateChecklistItemDto } from '../../types/task.types';
import * as taskApi from '@api/task.api';
import UserSelector from '@components/common/UserSelector';
import DatePickerModal from '@components/common/DatePickerModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface EditTaskModalProps {
  visible: boolean;
  task: Task;
  onClose: () => void;
  onTaskUpdated: (updatedTask: Task) => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({
  visible,
  task,
  onClose,
  onTaskUpdated,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [assigneeId, setAssigneeId] = useState<number | undefined>(
    task.assignees && task.assignees.length > 0 ? task.assignees[0].id : undefined
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Checklist state
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ id?: number; title: string; is_completed: boolean; _deleted?: boolean }[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loadingChecklists, setLoadingChecklists] = useState(false);

  // Load checklists when modal opens
  useEffect(() => {
    if (visible && task.id) {
      loadChecklists();
    }
  }, [visible, task.id]);

  const loadChecklists = async () => {
    try {
      setLoadingChecklists(true);
      const data = await taskApi.getTaskChecklists(task.id);
      setChecklists(data);

      // Flatten all checklist items into a single array for editing
      const allItems = data.flatMap(checklist =>
        checklist.items.map(item => ({
          id: item.id,
          title: item.title,
          is_completed: item.is_completed,
        }))
      );
      setChecklistItems(allItems);
    } catch (error) {
      console.error('Error loading checklists:', error);
    } finally {
      setLoadingChecklists(false);
    }
  };

  // Checklist handlers
  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setChecklistItems([...checklistItems, { title: newItemText.trim(), is_completed: false }]);
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    const item = checklistItems[index];
    if (item.id) {
      // Mark existing item as deleted
      setChecklistItems(checklistItems.map((itm, i) =>
        i === index ? { ...itm, _deleted: true } : itm
      ));
    } else {
      // Remove new item completely
      setChecklistItems(checklistItems.filter((_, i) => i !== index));
    }
  };

  const priorities: {
    value: TaskPriority;
    label: string;
    color: string;
  }[] = [
    { value: 'low', label: 'Низкий', color: '#10B981' },
    { value: 'medium', label: 'Средний', color: '#F59E0B' },
    { value: 'high', label: 'Высокий', color: '#F97316' },
    { value: 'critical', label: 'Критический', color: '#EF4444' },
  ];

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Название задачи не может быть пустым');
      return;
    }

    try {
      setIsSaving(true);

      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate?.toISOString(),
        assignee_ids: assigneeId ? [assigneeId] : undefined,
      };

      const updatedTask = await taskApi.updateTask(task.id, updateData);

      // Handle checklist changes
      // 1. Delete marked items
      const itemsToDelete = checklistItems.filter(item => item._deleted && item.id);
      for (const item of itemsToDelete) {
        try {
          await taskApi.deleteChecklistItem(item.id!);
        } catch (error) {
          console.error('Error deleting checklist item:', error);
        }
      }

      // 2. Add new items (items without id)
      const newItems = checklistItems.filter(item => !item.id && !item._deleted);
      if (newItems.length > 0 && checklists.length > 0) {
        // Add to existing checklist
        const checklistId = checklists[0].id;
        for (const item of newItems) {
          try {
            await taskApi.createChecklistItem(checklistId, { title: item.title });
          } catch (error) {
            console.error('Error creating checklist item:', error);
          }
        }
      } else if (newItems.length > 0 && checklists.length === 0) {
        // Create new checklist if none exists
        try {
          const newChecklist = await taskApi.createChecklist(task.id, { title: 'Checklist' });
          for (const item of newItems) {
            await taskApi.createChecklistItem(newChecklist.id, { title: item.title });
          }
        } catch (error) {
          console.error('Error creating checklist:', error);
        }
      }

      onTaskUpdated(updatedTask);
      onClose();

      if (Platform.OS !== 'web') {
        Alert.alert('Успех', 'Задача обновлена');
      }
    } catch (error: any) {
      console.error('Failed to update task:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось обновить задачу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.card, paddingTop: insets.top }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitle, { color: theme.text }]}>Редактировать</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving || !title.trim()}
              style={[
                styles.saveButton,
                { backgroundColor: theme.error },
                (!title.trim() || isSaving) && { backgroundColor: theme.backgroundTertiary }
              ]}
            >
              <Ionicons
                name="checkmark"
                size={24}
                color={(!title.trim() || isSaving) ? theme.textTertiary : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={[styles.content, { backgroundColor: theme.background }]}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Название */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Название *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
              placeholder="Что нужно сделать?"
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Описание */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Описание</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
              placeholder="Добавьте детали..."
              placeholderTextColor={theme.inputPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
          </View>

          {/* Приоритет */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Приоритет</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[
                    styles.priorityChip,
                    { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                    priority === p.value && {
                      backgroundColor: p.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      { color: theme.text },
                      priority === p.value && { color: '#FFFFFF', fontWeight: '600' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Дата */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Срок выполнения</Text>
            <TouchableOpacity
              style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={[styles.dateButtonText, { color: theme.text }]}>
                {dueDate
                  ? format(dueDate, 'dd MMMM yyyy, HH:mm', { locale: ru })
                  : 'Выберите дату и время'}
              </Text>
              {dueDate && (
                <TouchableOpacity
                  onPress={() => setDueDate(undefined)}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Исполнитель */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>Исполнитель</Text>
            <UserSelector
              selectedUserIds={assigneeId ? [assigneeId] : []}
              onSelectionChange={(ids) => setAssigneeId(ids[0])}
              multiSelect={false}
              placeholder="Выберите исполнителя"
              modalTitle="Выбрать исполнителя"
            />
          </View>

          {/* Чек-лист */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="checkbox-outline" size={18} color={theme.text} style={{ marginRight: 8 }} />
              <Text style={[styles.sectionLabel, { color: theme.text, marginBottom: 0 }]}>Чек-лист</Text>
            </View>

            {loadingChecklists ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                {/* Add item input */}
                <View style={styles.addChecklistContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                    placeholder="Добавить пункт..."
                    placeholderTextColor={theme.inputPlaceholder}
                    value={newItemText}
                    onChangeText={setNewItemText}
                    onSubmitEditing={handleAddItem}
                    returnKeyType="done"
                  />
                  {newItemText.trim() && (
                    <TouchableOpacity onPress={handleAddItem} style={styles.addButton}>
                      <Ionicons name="add-circle" size={28} color={theme.primary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Render checklist items */}
                {checklistItems.filter(item => !item._deleted).length > 0 && (
                  <View style={[styles.checklistCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                    {checklistItems.filter(item => !item._deleted).map((item, index) => {
                      const actualIndex = checklistItems.indexOf(item);
                      return (
                        <View key={actualIndex} style={styles.checklistItem}>
                          <View style={[styles.checkbox, { borderColor: theme.border }]} />
                          <Text style={[styles.itemText, { color: theme.textSecondary }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveItem(actualIndex)}>
                            <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DatePickerModal
            visible={showDatePicker}
            value={dueDate || new Date()}
            onChange={handleDateChange}
            onClose={() => setShowDatePicker(false)}
            minimumDate={new Date()}
            mode="datetime"
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 100,
    alignItems: 'flex-start',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    fontSize: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    padding: 8,
  },
  // Checklist styles
  addChecklistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addButton: {
    padding: 4,
  },
  checklistCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
  },
});

export default EditTaskModal;
