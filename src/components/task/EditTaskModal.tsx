/**
 * Edit Task Modal
 * Модальное окно для редактирования задачи
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Task, TaskPriority } from '../../types/task.types';
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
  const { theme } = useTheme();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.due_date ? new Date(task.due_date) : undefined
  );
  const [assigneeIds, setAssigneeIds] = useState<number[]>(
    task.assignees?.map(a => a.id) || []
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
      };

      const updatedTask = await taskApi.updateTask(task.id, updateData);
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
    >
      <View style={[styles.container, { backgroundColor: theme.primary }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Редактировать задачу</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving || !title.trim()}
            style={[
              styles.saveButton,
              (!title.trim() || isSaving) && styles.saveButtonDisabled
            ]}
          >
            <Text style={[
              styles.saveButtonText,
              (!title.trim() || isSaving) && styles.saveButtonTextDisabled
            ]}>
              {isSaving ? 'Сохранение...' : 'Сохранить'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Название */}
          <View style={styles.field}>
            <Text style={styles.label}>Название задачи *</Text>
            <TextInput
              style={styles.input}
              placeholder="Введите название задачи"
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Описание */}
          <View style={styles.field}>
            <Text style={styles.label}>Описание</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Опишите задачу подробнее..."
              placeholderTextColor={theme.inputPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Приоритет */}
          <View style={styles.field}>
            <Text style={styles.label}>Приоритет</Text>
            <View style={styles.priorityGrid}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[
                    styles.priorityButton,
                    priority === p.value && {
                      backgroundColor: p.color + '15',
                      borderColor: p.color,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityButtonText,
                      priority === p.value && { color: p.color, fontWeight: '600' },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Дата */}
          <View style={styles.field}>
            <Text style={styles.label}>Срок выполнения</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color={theme.primary} />
              <Text style={styles.dateButtonText}>
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

          {/* Исполнители */}
          <View style={styles.field}>
            <Text style={styles.label}>Исполнители</Text>
            <UserSelector
              selectedUserIds={assigneeIds}
              onSelectionChange={setAssigneeIds}
              multiSelect={true}
              placeholder="Выберите исполнителей"
              modalTitle="Выбрать исполнителей"
            />
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
    paddingBottom: 24,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 8,
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  content: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  field: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    textAlign: 'right',
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  clearButton: {
    padding: 4,
  },
});

export default EditTaskModal;
