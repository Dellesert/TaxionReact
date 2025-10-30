/**
 * Create Task Modal
 * Модальное окно для создания задачи
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
  Modal,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTaskStore } from '@store/taskStore';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { TaskPriority, CreateTaskDto } from '../../types/task.types';
import UserSelector from '@components/common/UserSelector';
import DatePickerModal from '@components/common/DatePickerModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onTaskCreated,
}) => {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { createTask } = useTaskStore();
  const { user: currentUser } = useAuthStore();

  // Check if user is employee (can only create tasks for themselves)
  const isEmployee = currentUser?.role === 'employee';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);

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

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название задачи');
      return;
    }

    try {
      setIsCreating(true);

      // For employees, always assign task to themselves
      // For others, use single selected assignee
      const finalAssigneeIds = isEmployee && currentUser?.id
        ? [currentUser.id]
        : assigneeId
          ? [assigneeId]
          : undefined;

      const taskData: CreateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate?.toISOString(),
        assignee_ids: finalAssigneeIds,
      };

      await createTask(taskData);
      Alert.alert('Успех', 'Задача создана');
      onTaskCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать задачу');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(undefined);
    setAssigneeId(undefined);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.card, paddingTop: insets.top }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitle, { color: theme.text }]}>Новая задача</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleCreateTask}
              disabled={isCreating || !title.trim()}
              style={[
                styles.createButton,
                { backgroundColor: theme.error },
                (!title.trim() || isCreating) && { backgroundColor: theme.backgroundTertiary }
              ]}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={(!title.trim() || isCreating) ? theme.textTertiary : '#FFFFFF'}
                />
              )}
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
          {/* Название задачи */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>НАЗВАНИЕ *</Text>
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
            <Text style={[styles.label, { color: theme.text }]}>ОПИСАНИЕ</Text>
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
            <Text style={[styles.label, { color: theme.text }]}>ПРИОРИТЕТ</Text>
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

          {/* Срок выполнения */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.text }]}>СРОК ВЫПОЛНЕНИЯ</Text>
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
                <TouchableOpacity onPress={() => setDueDate(undefined)} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* Исполнитель */}
          {!isEmployee && (
            <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.text }]}>ИСПОЛНИТЕЛЬ</Text>
              <UserSelector
                selectedUserIds={assigneeId ? [assigneeId] : []}
                onSelectionChange={(ids) => setAssigneeId(ids[0])}
                multiSelect={false}
                placeholder="Выберите исполнителя"
                modalTitle="Выбрать исполнителя"
              />
            </View>
          )}

          {/* Информация для сотрудников */}
          {isEmployee && (
            <View style={[styles.infoSection, { backgroundColor: theme.backgroundSecondary }]}>
              <Ionicons name="information-circle" size={20} color={theme.primary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Задача будет автоматически назначена вам
              </Text>
            </View>
          )}
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
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  label: {
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default CreateTaskModal;
