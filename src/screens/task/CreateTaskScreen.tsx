/**
 * Create Task Screen
 * Современный экран создания задачи с улучшенным UX/UI
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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TaskStackParamList } from '@navigation/types';
import { useTaskStore } from '@store/taskStore';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@hooks/useTheme';
import { TaskPriority, CreateTaskDto } from '../../types/task.types';
import UserSelector from '@components/common/UserSelector';
import DatePickerModal from '@components/common/DatePickerModal';

type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'CreateTask'>;

const CreateTaskScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { createTask } = useTaskStore();
  const { user: currentUser } = useAuthStore();
  const { theme } = useTheme();

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
    icon: string;
    description: string;
  }[] = [
    {
      value: 'low',
      label: 'Низкий',
      color: '#10B981',
      icon: 'arrow-down-circle',
      description: 'Не срочная задача'
    },
    {
      value: 'medium',
      label: 'Средний',
      color: '#F59E0B',
      icon: 'remove-circle',
      description: 'Обычная задача'
    },
    {
      value: 'high',
      label: 'Высокий',
      color: '#F97316',
      icon: 'arrow-up-circle',
      description: 'Важная задача'
    },
    {
      value: 'critical',
      label: 'Критический',
      color: '#EF4444',
      icon: 'alert-circle',
      description: 'Срочно!'
    },
  ];

  // Быстрые действия для установки даты
  const quickDateActions = [
    { label: 'Сегодня', hours: 8 },
    { label: 'Завтра', hours: 32 },
    { label: 'Через неделю', hours: 168 },
  ];

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const setQuickDate = (hours: number) => {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    setDueDate(date);
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      if (Platform.OS === 'web') {
        alert('Введите название задачи');
      } else {
        Alert.alert('Ошибка', 'Введите название задачи');
      }
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

      if (Platform.OS === 'web') {
        navigation.goBack();
      } else {
        Alert.alert('Успех', 'Задача создана', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      if (Platform.OS === 'web') {
        alert(error.message || 'Не удалось создать задачу');
      } else {
        Alert.alert('Ошибка', error.message || 'Не удалось создать задачу');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const dynamicStyles = StyleSheet.create({
    safeArea: {
      backgroundColor: theme.card,
    },
    container: {
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.card,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      color: theme.text,
    },
    backButton: {
      color: theme.error,
    },
    createButton: {
      backgroundColor: theme.error,
    },
    createButtonDisabled: {
      backgroundColor: theme.backgroundTertiary,
    },
    createButtonText: {
      color: '#FFFFFF',
    },
    createButtonTextDisabled: {
      color: theme.textTertiary,
    },
    section: {
      backgroundColor: theme.background,
      borderBottomColor: theme.border,
    },
    label: {
      color: theme.text,
    },
    labelDescription: {
      color: theme.textSecondary,
    },
    input: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
      color: theme.text,
    },
    inputFocused: {
      borderColor: theme.primary,
    },
    charCount: {
      color: theme.textTertiary,
    },
    priorityButton: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
    },
    priorityButtonText: {
      color: theme.text,
    },
    dateButton: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: theme.border,
    },
    dateButtonText: {
      color: theme.text,
    },
    quickDateButton: {
      backgroundColor: theme.backgroundTertiary,
      borderColor: theme.border,
    },
    quickDateButtonText: {
      color: theme.textSecondary,
    },
    infoBox: {
      backgroundColor: '#EFF6FF',
      borderColor: '#BFDBFE',
    },
    infoText: {
      color: '#1E40AF',
    },
  });

  const selectedPriority = priorities.find(p => p.value === priority);

  return (
    <SafeAreaView style={[styles.safeArea, dynamicStyles.safeArea]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={[styles.container, dynamicStyles.container]}>
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButton}
            >
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
            Новая задача
          </Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleCreateTask}
              disabled={isCreating || !title.trim()}
              style={[
                styles.createButton,
                dynamicStyles.createButton,
                (!title.trim() || isCreating) && dynamicStyles.createButtonDisabled
              ]}
            >
              <Ionicons
                name="checkmark"
                size={24}
                color={(!title.trim() || isCreating) ? theme.textTertiary : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Название задачи */}
          <View style={[styles.section, dynamicStyles.section]}>
            <Text style={[styles.sectionLabel, dynamicStyles.label]}>Название *</Text>
            <TextInput
              style={[styles.titleInput, dynamicStyles.input]}
              placeholder="Что нужно сделать?"
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          {/* Описание */}
          <View style={[styles.section, dynamicStyles.section]}>
            <Text style={[styles.sectionLabel, dynamicStyles.label]}>Описание</Text>
            <TextInput
              style={[styles.descriptionInput, dynamicStyles.input]}
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
          <View style={[styles.section, dynamicStyles.section]}>
            <Text style={[styles.sectionLabel, dynamicStyles.label]}>Приоритет</Text>
            <View style={styles.priorityRow}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[
                    styles.priorityChip,
                    dynamicStyles.priorityButton,
                    priority === p.value && {
                      backgroundColor: p.color,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      dynamicStyles.priorityButtonText,
                      priority === p.value && {
                        color: '#FFFFFF',
                        fontWeight: '600'
                      },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Срок выполнения */}
          <View style={[styles.section, dynamicStyles.section]}>
            <Text style={[styles.sectionLabel, dynamicStyles.label]}>Срок выполнения</Text>

            {/* Быстрые действия */}
            <View style={styles.quickActions}>
              {quickDateActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => setQuickDate(action.hours)}
                  style={[styles.quickDateChip, dynamicStyles.quickDateButton]}
                >
                  <Text style={[styles.quickDateChipText, dynamicStyles.quickDateButtonText]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Выбор даты */}
            {Platform.OS === 'web' ? (
              <View style={styles.dateInputContainer}>
                <View style={styles.dateIconWrapper}>
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                </View>
                <input
                  type="datetime-local"
                  value={dueDate ? dueDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDueDate(new Date(e.target.value));
                    }
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{
                    flex: 1,
                    border: 'none',
                    padding: '12px',
                    fontSize: '14px',
                    color: theme.text,
                    backgroundColor: 'transparent',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    outline: 'none',
                  }}
                />
                {dueDate && (
                  <TouchableOpacity
                    onPress={() => setDueDate(undefined)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.dateButton, dynamicStyles.dateButton]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <Text style={[
                    styles.dateButtonText,
                    dynamicStyles.dateButtonText,
                    !dueDate && { color: theme.textTertiary }
                  ]}>
                    {dueDate
                      ? dueDate.toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
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

                <DatePickerModal
                  visible={showDatePicker}
                  value={dueDate || new Date()}
                  onChange={handleDateChange}
                  onClose={() => setShowDatePicker(false)}
                  minimumDate={new Date()}
                  mode="datetime"
                />
              </>
            )}
          </View>

          {/* Исполнитель - только для department_head, admin, super_admin */}
          {!isEmployee && (
            <View style={[styles.section, dynamicStyles.section]}>
              <Text style={[styles.sectionLabel, dynamicStyles.label]}>Исполнитель</Text>
              <UserSelector
                selectedUserIds={assigneeId ? [assigneeId] : []}
                onSelectionChange={(ids) => setAssigneeId(ids[0])}
                multiSelect={false}
                placeholder="Выберите исполнителя"
                modalTitle="Выбрать исполнителя"
              />
            </View>
          )}

          {/* Нижний отступ для удобства прокрутки */}
          <View style={{ height: 40 }} />
        </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 16,
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
  createButtonText: {
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
  titleInput: {
    fontSize: 16,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  descriptionInput: {
    fontSize: 15,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 100,
    borderWidth: 1,
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
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickDateChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickDateChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 12,
  },
  dateIconWrapper: {
    marginRight: 8,
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
    fontSize: 15,
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
});

export default CreateTaskScreen;
