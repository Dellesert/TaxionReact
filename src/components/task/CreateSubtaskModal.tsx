/**
 * Create Subtask Modal Component
 * Модальное окно для создания подзадачи
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreateTaskDto, TaskPriority, CreateTaskChecklistDto } from '../../types/task.types';
import { createSubtask } from '../../api/task.api';
import UserSelector from '../common/UserSelector';
import DatePickerModal from '../common/DatePickerModal';
import { useTheme } from '@hooks/useTheme';

interface CreateSubtaskModalProps {
  visible: boolean;
  parentTaskId: number;
  onClose: () => void;
  onSubtaskCreated?: () => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Низкий', color: '#6b7280' },
  { value: 'medium', label: 'Средний', color: '#3b82f6' },
  { value: 'high', label: 'Высокий', color: '#f59e0b' },
  { value: 'critical', label: 'Критичный', color: '#ef4444' },
];

export const CreateSubtaskModal: React.FC<CreateSubtaskModalProps> = ({
  visible,
  parentTaskId,
  onClose,
  onSubtaskCreated,
}) => {
  const { theme } = useTheme();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Checklist state - single checklist with items only
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssigneeIds([]);
    setDueDate(undefined);
    setChecklistItems([]);
    setNewItemText('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Checklist handlers
  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    setChecklistItems([...checklistItems, newItemText.trim()]);
    setNewItemText('');
  };

  const handleRemoveItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название подзадачи');
      return;
    }

    try {
      setIsLoading(true);

      const subtaskData: CreateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
        due_date: dueDate?.toISOString(),
        checklists: checklistItems.length > 0 ? [{ title: 'Checklist', items: checklistItems }] : undefined,
      };

      await createSubtask(parentTaskId, subtaskData);

      Alert.alert('Успешно', 'Подзадача создана');
      handleReset();
      onSubtaskCreated?.();
      onClose();
    } catch (error) {
      console.error('Error creating subtask:', error);
      Alert.alert('Ошибка', 'Не удалось создать подзадачу');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Новая подзадача</Text>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>
                Название <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                placeholder="Введите название подзадачи..."
                placeholderTextColor={theme.inputPlaceholder}
                value={title}
                onChangeText={setTitle}
                editable={!isLoading}
                autoFocus
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                placeholder="Введите описание (необязательно)..."
                placeholderTextColor={theme.inputPlaceholder}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
              />
            </View>

            {/* Priority Selection */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Приоритет</Text>
              <View style={styles.priorityGrid}>
                {PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      { backgroundColor: theme.card, borderColor: priority === option.value ? option.color : theme.border },
                      priority === option.value && { backgroundColor: theme.backgroundSecondary },
                    ]}
                    onPress={() => setPriority(option.value)}
                    disabled={isLoading}
                  >
                    <View
                      style={[
                        styles.priorityDot,
                        { backgroundColor: option.color },
                      ]}
                    />
                    <Text
                      style={[
                        styles.priorityText,
                        { color: priority === option.value ? option.color : theme.textSecondary },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Assignee Selection */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Исполнитель</Text>
              <UserSelector
                selectedUserIds={assigneeIds}
                onSelectionChange={setAssigneeIds}
                multiSelect={false}
                placeholder="Выберите исполнителя"
                modalTitle="Выбрать исполнителя"
              />
            </View>

            {/* Checklist Section */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Чек-лист</Text>

              {/* Add New Item */}
              <View style={[styles.addChecklistContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                <TextInput
                  style={[styles.addChecklistInput, { color: theme.text }]}
                  placeholder="Добавить пункт..."
                  placeholderTextColor={theme.inputPlaceholder}
                  value={newItemText}
                  onChangeText={setNewItemText}
                  onSubmitEditing={handleAddItem}
                  returnKeyType="done"
                  editable={!isLoading}
                />
                {newItemText.trim() && (
                  <TouchableOpacity onPress={handleAddItem}>
                    <Ionicons name="add-circle" size={32} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Checklist Items */}
              {checklistItems.length > 0 && (
                <View
                  style={[styles.checklistCard, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                >
                  {checklistItems.map((item, index) => (
                    <View key={index} style={styles.checklistItemRow}>
                      <View style={styles.checklistItemDot} />
                      <Text style={[styles.checklistItemText, { color: theme.textSecondary }]} numberOfLines={2}>
                        {item}
                      </Text>
                      <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                        <Ionicons name="close-circle" size={18} color="#9ca3af" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Due Date Selection */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.text }]}>Срок выполнения</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                <Text style={[styles.dateButtonText, { color: theme.text }]}>
                  {dueDate
                    ? dueDate.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Выберите дату'}
                </Text>
                {dueDate && (
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      setDueDate(undefined);
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Date Picker Modal */}
          <DatePickerModal
            visible={showDatePicker}
            value={dueDate || new Date()}
            mode="date"
            onChange={(_event, date) => {
              if (date) setDueDate(date);
            }}
            onClose={() => setShowDatePicker(false)}
            minimumDate={new Date()}
          />

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel, { backgroundColor: theme.backgroundSecondary }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.buttonCancelText, { color: theme.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                { backgroundColor: (isLoading || !title.trim()) ? theme.border : theme.primary },
              ]}
              onPress={handleCreate}
              disabled={isLoading || !title.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonCreateText}>Создать</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    fontSize: 15,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    maxHeight: 150,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    minWidth: '47%',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    // backgroundColor applied dynamically
  },
  buttonCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  buttonCreateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  addChecklistContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  addChecklistInput: {
    flex: 1,
    fontSize: 15,
  },
  checklistCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  checklistItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#9ca3af',
  },
  checklistItemText: {
    flex: 1,
    fontSize: 14,
  },
  addItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  addItemInput: {
    flex: 1,
    fontSize: 14,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
});
