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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CreateTaskDto, TaskPriority } from '../../types/task.types';
import { createSubtask } from '../../api/task.api';
import UserSelector from '../common/UserSelector';
import DatePickerModal from '../common/DatePickerModal';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAssigneeIds([]);
    setDueDate(undefined);
  };

  const handleClose = () => {
    handleReset();
    onClose();
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
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Новая подзадача</Text>
            <TouchableOpacity onPress={handleClose} disabled={isLoading}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Название <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Введите название подзадачи..."
                value={title}
                onChangeText={setTitle}
                editable={!isLoading}
                autoFocus
              />
            </View>

            {/* Description Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Описание</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Введите описание (необязательно)..."
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
              <Text style={styles.label}>Приоритет</Text>
              <View style={styles.priorityGrid}>
                {PRIORITY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.priorityOption,
                      priority === option.value && styles.priorityOptionActive,
                      { borderColor: option.color },
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
                        priority === option.value && { color: option.color },
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
              <Text style={styles.label}>Исполнитель</Text>
              <UserSelector
                selectedUserIds={assigneeIds}
                onSelectionChange={setAssigneeIds}
                multiSelect={false}
                placeholder="Выберите исполнителя"
                modalTitle="Выбрать исполнителя"
              />
            </View>

            {/* Due Date Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Срок выполнения</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={20} color="#6b7280" />
                <Text style={styles.dateButtonText}>
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
            date={dueDate || new Date()}
            onConfirm={(date) => {
              setDueDate(date);
              setShowDatePicker(false);
            }}
            onCancel={() => setShowDatePicker(false)}
            minimumDate={new Date()}
          />

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={styles.buttonCancelText}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonCreate,
                (isLoading || !title.trim()) && styles.buttonDisabled,
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
    backgroundColor: '#fff',
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
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
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
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  input: {
    fontSize: 15,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    color: '#111827',
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
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minWidth: '47%',
  },
  priorityOptionActive: {
    backgroundColor: '#f9fafb',
  },
  priorityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f3f4f6',
  },
  buttonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  buttonCreate: {
    backgroundColor: '#3b82f6',
  },
  buttonCreateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
});
