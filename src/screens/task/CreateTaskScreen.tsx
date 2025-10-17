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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TaskStackParamList } from '@navigation/types';
import { useTaskStore } from '@store/taskStore';
import { TaskPriority, CreateTaskDto } from '@types/task.types';

type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'CreateTask'>;

const CreateTaskScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { createTask } = useTaskStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const priorities: { value: TaskPriority; label: string; color: string; icon: string }[] = [
    { value: 'low', label: 'Низкий', color: '#10B981', icon: 'arrow-down' },
    { value: 'medium', label: 'Средний', color: '#F59E0B', icon: 'remove' },
    { value: 'high', label: 'Высокий', color: '#F97316', icon: 'arrow-up' },
    { value: 'urgent', label: 'Срочный', color: '#EF4444', icon: 'alert-circle' },
  ];

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
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

      const taskData: CreateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate?.toISOString(),
      };

      const newTask = await createTask(taskData);

      Alert.alert('Успех', 'Задача создана', [
        {
          text: 'OK',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      console.error('Failed to create task:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать задачу');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новая задача</Text>
        <TouchableOpacity
          onPress={handleCreateTask}
          disabled={isCreating || !title.trim()}
          style={[styles.createButton, (!title.trim() || isCreating) && styles.createButtonDisabled]}
        >
          <Text style={[styles.createButtonText, (!title.trim() || isCreating) && styles.createButtonTextDisabled]}>
            {isCreating ? 'Создание...' : 'Создать'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Название задачи *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Введите название задачи"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus
          />
          <Text style={styles.charCount}>{title.length}/100</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Описание</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Добавьте описание задачи..."
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{description.length}/500</Text>
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.label}>Приоритет</Text>
          <View style={styles.priorityContainer}>
            {priorities.map((p) => (
              <TouchableOpacity
                key={p.value}
                onPress={() => setPriority(p.value)}
                style={[
                  styles.priorityButton,
                  priority === p.value && { backgroundColor: p.color },
                ]}
              >
                <Ionicons
                  name={p.icon as any}
                  size={18}
                  color={priority === p.value ? 'white' : p.color}
                />
                <Text
                  style={[
                    styles.priorityButtonText,
                    priority === p.value && styles.priorityButtonTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Due Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Срок выполнения</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.dateButtonText}>
              {dueDate
                ? dueDate.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Выберите дату и время'}
            </Text>
            {dueDate && (
              <TouchableOpacity
                onPress={() => setDueDate(undefined)}
                style={styles.clearDateButton}
              >
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate || new Date()}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
          <Text style={styles.infoText}>
            Задача будет создана со статусом "Новая" и назначена на вас
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    marginLeft: 12,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#E94444',
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F9FAFB',
  },
  descriptionInput: {
    fontSize: 14,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 100,
    backgroundColor: '#F9FAFB',
  },
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  priorityContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  priorityButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  priorityButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  dateButtonText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  clearDateButton: {
    padding: 4,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginVertical: 16,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
});

export default CreateTaskScreen;
