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
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useNotification } from '@shared/contexts/NotificationContext';
import { Task, TaskPriority, TaskChecklist } from '../../types/task.types';
import * as taskApi from '../../api/task.api';
import UserSelector from '@shared/components/common/UserSelector';
import DatePickerModal from '@shared/components/common/DatePickerModal';
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
  const isDesktop = useIsWideScreen();
  const isElectronApp = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;
  const isDesktopElectron = isDesktop && isElectronApp;
  const animationType = useAnimationType(isDesktopElectron ? 'fade' : 'slide');
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();

  const [hoveredWindowBtn, setHoveredWindowBtn] = useState<'minimize' | 'maximize' | 'close' | null>(null);

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [assigneeId, setAssigneeId] = useState<number | undefined>(
    task.assignees && task.assignees.length > 0 ? task.assignees[0].id : undefined
  );
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    task.assignees ? task.assignees.map(a => a.id) : []
  );
  const isGroupTask = task.task_type === 'group';
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Checklist state
  const [checklists, setChecklists] = useState<TaskChecklist[]>([]);
  const [checklistItems, setChecklistItems] = useState<{ id?: number; title: string; is_completed: boolean; _deleted?: boolean }[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loadingChecklists, setLoadingChecklists] = useState(false);

  // Track initial state to determine what can be added
  const [hasInitialDescription, setHasInitialDescription] = useState(false);
  const [hasInitialChecklists, setHasInitialChecklists] = useState(false);

  // Track what user wants to add if nothing exists
  const [selectedContentType, setSelectedContentType] = useState<'description' | 'checklist' | null>(null);

  // Load checklists when modal opens
  useEffect(() => {
    if (visible && task.id) {
      setTitle(task.title);
      setDescription(task.description || '');
      setPriority(task.priority);
      setDueDate(task.due_date ? new Date(task.due_date) : undefined);
      setAssigneeId(task.assignees && task.assignees.length > 0 ? task.assignees[0].id : undefined);
      setAssigneeIds(task.assignees ? task.assignees.map(a => a.id) : []);

      // Track initial state
      setHasInitialDescription(!!task.description);
      setSelectedContentType(null);

      loadChecklists();
    }
  }, [visible, task]);

  const loadChecklists = async () => {
    try {
      setLoadingChecklists(true);
      const data = await taskApi.getTaskChecklists(task.id);
      setChecklists(data);

      // Flatten all checklist items into a single array for editing
      const allItems = data.flatMap(checklist =>
        (checklist.items || []).map(item => ({
          id: item.id,
          title: item.title,
          is_completed: item.is_completed,
        }))
      );
      setChecklistItems(allItems);
      setHasInitialChecklists(allItems.length > 0);
    } catch (error) {
      console.error('Error loading checklists:', error);
    } finally {
      setLoadingChecklists(false);
    }
  };

  // Determine what content can be shown
  const hasNoContent = !hasInitialDescription && !hasInitialChecklists;

  const showDescription = hasInitialDescription || (hasNoContent && selectedContentType === 'description');
  const showChecklists = hasInitialChecklists || (hasNoContent && selectedContentType === 'checklist');
  const showContentChoice = hasNoContent && selectedContentType === null;

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
      return; // Кнопка сохранения уже задизейблена если нет названия
    }

    try {
      setIsSaving(true);

      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate?.toISOString(),
        assignee_ids: isGroupTask
          ? (assigneeIds.length > 0 ? assigneeIds : undefined)
          : (assigneeId ? [assigneeId] : undefined),
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

      // Показываем уведомление об успешном сохранении
      showSuccess('Задача успешно обновлена');

      onTaskUpdated(updatedTask);
      onClose();
    } catch (error: any) {
      console.error('Failed to update task:', error);
      showError(error.message || 'Не удалось обновить задачу');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    // Убрали setShowDatePicker(false) - теперь DatePickerModal сам управляет закрытием через onClose
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
      statusBarTranslucent
    >
      <View style={[styles.container, { backgroundColor: theme.card, paddingTop: Platform.OS === 'android' ? (insets.top || StatusBar.currentHeight || 0) : insets.top }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Редактирование</Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !title.trim()}
            style={styles.headerButton}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: !title.trim() ? theme.textTertiary : theme.primary }]}>
                Готово
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={[styles.content, { backgroundColor: theme.background }]}
          contentContainerStyle={{ paddingBottom: 20 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Basic Info Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Основная информация</Text>

            {/* Title */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Название</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                placeholder="Введите название задачи..."
                placeholderTextColor={theme.inputPlaceholder}
                value={title}
                onChangeText={setTitle}
                maxLength={100}
              />
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Приоритет</Text>
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
                        borderColor: p.color,
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
          </View>

          {/* Description or Checklist Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Содержимое</Text>

            {/* Choice buttons when no content exists */}
            {showContentChoice && (
              <View style={styles.contentChoiceContainer}>
                <Text style={[styles.choiceDescription, { color: theme.textSecondary }]}>
                  Выберите тип содержимого для задачи
                </Text>

                <TouchableOpacity
                  onPress={() => setSelectedContentType('description')}
                  style={[styles.choiceButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: theme.primary }]}>
                    <Ionicons name="document-text-outline" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.choiceInfo}>
                    <Text style={[styles.choiceTitle, { color: theme.text }]}>Описание</Text>
                    <Text style={[styles.choiceSubtitle, { color: theme.textSecondary }]}>
                      Добавьте текстовое описание
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSelectedContentType('checklist')}
                  style={[styles.choiceButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkbox-outline" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.choiceInfo}>
                    <Text style={[styles.choiceTitle, { color: theme.text }]}>Чек-лист</Text>
                    <Text style={[styles.choiceSubtitle, { color: theme.textSecondary }]}>
                      Список пунктов для отметки
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Description Section */}
            {showDescription && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Описание</Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                  placeholder="Добавьте описание задачи..."
                  placeholderTextColor={theme.inputPlaceholder}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                  {description.length}/500
                </Text>
              </View>
            )}

            {/* Checklist Section */}
            {showChecklists && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>Чек-лист</Text>

                {loadingChecklists ? (
                  <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 20 }} />
                ) : (
                  <>
                    {/* Add item input */}
                    <View style={styles.addChecklistContainer}>
                      <TextInput
                        style={[styles.checklistInput, { flex: 1, backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                        placeholder="Добавить пункт..."
                        placeholderTextColor={theme.inputPlaceholder}
                        value={newItemText}
                        onChangeText={setNewItemText}
                        onSubmitEditing={handleAddItem}
                        returnKeyType="done"
                        multiline
                        textAlignVertical="top"
                        maxLength={200}
                      />
                      <TouchableOpacity
                        onPress={handleAddItem}
                        style={[styles.addButton, { backgroundColor: newItemText.trim() ? theme.primary : theme.backgroundSecondary }]}
                        disabled={!newItemText.trim()}
                      >
                        <Ionicons name="add" size={24} color={newItemText.trim() ? '#FFFFFF' : theme.textTertiary} />
                      </TouchableOpacity>
                    </View>

                    {/* Render checklist items */}
                    {checklistItems.filter(item => !item._deleted).length > 0 ? (
                      <View style={styles.checklistItemsContainer}>
                        {checklistItems.filter(item => !item._deleted).map((item) => {
                          const actualIndex = checklistItems.indexOf(item);
                          return (
                            <View key={actualIndex} style={[styles.checklistItem, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                              <View style={[styles.checkbox, { borderColor: theme.border }]} />
                              <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={3}>
                                {item.title}
                              </Text>
                              <TouchableOpacity onPress={() => handleRemoveItem(actualIndex)} style={styles.removeButton}>
                                <Ionicons name="close-circle" size={20} color={theme.error} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={[styles.emptyState, { backgroundColor: theme.backgroundSecondary }]}>
                        <Ionicons name="list-outline" size={32} color={theme.textTertiary} />
                        <Text style={[styles.emptyText, { color: theme.textTertiary }]}>
                          Нет пунктов в чек-листе
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            )}
          </View>

          {/* Details Card */}
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Детали</Text>

            {/* Due Date */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Срок выполнения</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                <Text style={[styles.dateButtonText, { color: dueDate ? theme.text : theme.textTertiary }]}>
                  {dueDate
                    ? format(dueDate, 'dd MMMM yyyy, HH:mm', { locale: ru })
                    : 'Не указан'}
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

            {/* Assignee */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                {isGroupTask ? 'Исполнители' : 'Исполнитель'}
              </Text>
              {isGroupTask && (
                <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary }]}>
                  <Ionicons name="people-outline" size={18} color="#8B5CF6" />
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Групповая задача (минимум 2 исполнителя)
                  </Text>
                </View>
              )}
              <UserSelector
                selectedUserIds={isGroupTask ? assigneeIds : (assigneeId ? [assigneeId] : [])}
                onSelectionChange={isGroupTask ? setAssigneeIds : (ids) => setAssigneeId(ids[0])}
                multiSelect={isGroupTask}
                placeholder={isGroupTask ? 'Выберите исполнителей' : 'Не назначен'}
                modalTitle={isGroupTask ? 'Выбрать исполнителей' : 'Выбрать исполнителя'}
                filterForTaskAssignment={true}
              />
              {isGroupTask && assigneeIds.length > 0 && assigneeIds.length < 2 && (
                <Text style={{ color: '#EF4444', fontSize: 13, marginTop: 4 }}>
                  Выберите ещё {2 - assigneeIds.length} исполнител{assigneeIds.length === 1 ? 'я' : 'ей'}
                </Text>
              )}
            </View>
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
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  headerButton: {
    width: 80,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 120,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
  },
  priorityChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 12,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
  },
  addChecklistContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  checklistInput: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    minHeight: 48,
    maxHeight: 120,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checklistItemsContainer: {
    gap: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  contentChoiceContainer: {
    gap: 12,
  },
  choiceDescription: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  choiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  choiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceInfo: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  choiceSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default EditTaskModal;
