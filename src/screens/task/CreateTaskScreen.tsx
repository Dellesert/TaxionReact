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
import DateTimePicker from '@react-native-community/datetimepicker';
import { TaskStackParamList } from '@navigation/types';
import { useTaskStore } from '@store/taskStore';
import { useTheme } from '@hooks/useTheme';
import { TaskPriority, CreateTaskDto } from '../../types/task.types';
import UserSelector from '@components/common/UserSelector';

type NavigationProp = NativeStackNavigationProp<TaskStackParamList, 'CreateTask'>;

const CreateTaskScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { createTask } = useTaskStore();
  const { theme } = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<number[]>([]);

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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
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

      const taskData: CreateTaskDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        due_date: dueDate?.toISOString(),
        assignee_ids: assigneeIds.length > 0 ? assigneeIds : undefined,
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
      color: theme.primary,
    },
    createButton: {
      backgroundColor: theme.primary,
    },
    createButtonDisabled: {
      backgroundColor: theme.borderLight,
    },
    createButtonText: {
      color: '#FFFFFF',
    },
    createButtonTextDisabled: {
      color: theme.textTertiary,
    },
    card: {
      backgroundColor: theme.card,
      borderColor: theme.border,
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
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
      borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.3)' : '#BFDBFE',
    },
    infoText: {
      color: theme.isDark ? '#93C5FD' : '#1E40AF',
    },
  });

  const selectedPriority = priorities.find(p => p.value === priority);

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Ionicons name="chevron-back" size={28} color={theme.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>
            Новая задача
          </Text>
          <TouchableOpacity
            onPress={handleCreateTask}
            disabled={isCreating || !title.trim()}
            style={[
              styles.createButton,
              dynamicStyles.createButton,
              (!title.trim() || isCreating) && dynamicStyles.createButtonDisabled
            ]}
          >
            <Text style={[
              styles.createButtonText,
              dynamicStyles.createButtonText,
              (!title.trim() || isCreating) && dynamicStyles.createButtonTextDisabled
            ]}>
              {isCreating ? 'Создание...' : 'Создать'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Название задачи */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={20} color={theme.primary} />
              <Text style={[styles.label, dynamicStyles.label]}>Название задачи</Text>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>*</Text>
              </View>
            </View>
            <TextInput
              style={[styles.titleInput, dynamicStyles.input]}
              placeholder="Введите название задачи"
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              autoFocus
            />
            <View style={styles.inputFooter}>
              <Text style={[styles.charCount, dynamicStyles.charCount]}>
                {title.length}/100
              </Text>
            </View>
          </View>

          {/* Описание */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.cardHeader}>
              <Ionicons name="create-outline" size={20} color={theme.primary} />
              <Text style={[styles.label, dynamicStyles.label]}>Описание</Text>
            </View>
            <Text style={[styles.labelDescription, dynamicStyles.labelDescription]}>
              Добавьте детали и контекст задачи
            </Text>
            <TextInput
              style={[styles.descriptionInput, dynamicStyles.input]}
              placeholder="Опишите задачу подробнее..."
              placeholderTextColor={theme.inputPlaceholder}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.inputFooter}>
              <Text style={[styles.charCount, dynamicStyles.charCount]}>
                {description.length}/500
              </Text>
            </View>
          </View>

          {/* Приоритет */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.cardHeader}>
              <Ionicons name="flag" size={20} color={selectedPriority?.color} />
              <Text style={[styles.label, dynamicStyles.label]}>Приоритет</Text>
            </View>
            <Text style={[styles.labelDescription, dynamicStyles.labelDescription]}>
              {selectedPriority?.description}
            </Text>
            <View style={styles.priorityGrid}>
              {priorities.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[
                    styles.priorityCard,
                    dynamicStyles.priorityButton,
                    priority === p.value && {
                      backgroundColor: p.color + '15',
                      borderColor: p.color,
                      borderWidth: 2,
                    },
                  ]}
                >
                  <Ionicons
                    name={p.icon as any}
                    size={24}
                    color={p.color}
                  />
                  <Text
                    style={[
                      styles.priorityLabel,
                      dynamicStyles.priorityButtonText,
                      priority === p.value && {
                        color: p.color,
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
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={20} color={theme.primary} />
              <Text style={[styles.label, dynamicStyles.label]}>Срок выполнения</Text>
            </View>
            <Text style={[styles.labelDescription, dynamicStyles.labelDescription]}>
              Установите дедлайн для задачи
            </Text>

            {/* Быстрые действия */}
            <View style={styles.quickActions}>
              {quickDateActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => setQuickDate(action.hours)}
                  style={[styles.quickDateButton, dynamicStyles.quickDateButton]}
                >
                  <Text style={[styles.quickDateButtonText, dynamicStyles.quickDateButtonText]}>
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

                {showDatePicker && (
                  <DateTimePicker
                    value={dueDate || new Date()}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          {/* Исполнители */}
          <View style={[styles.card, dynamicStyles.card]}>
            <View style={styles.cardHeader}>
              <Ionicons name="people" size={20} color={theme.primary} />
              <Text style={[styles.label, dynamicStyles.label]}>Исполнители</Text>
            </View>
            <Text style={[styles.labelDescription, dynamicStyles.labelDescription]}>
              Назначьте ответственных за выполнение
            </Text>
            <UserSelector
              selectedUserIds={assigneeIds}
              onSelectionChange={setAssigneeIds}
              multiSelect={true}
              placeholder="Выберите исполнителей"
              modalTitle="Выбрать исполнителей"
            />
            {assigneeIds.length === 0 && (
              <View style={[styles.infoBox, dynamicStyles.infoBox]}>
                <Ionicons name="information-circle" size={18} color={theme.isDark ? '#93C5FD' : '#3B82F6'} />
                <Text style={[styles.infoText, dynamicStyles.infoText]}>
                  Если не выбрано, задача будет назначена вам
                </Text>
              </View>
            )}
          </View>

          {/* Нижний отступ для удобства прокрутки */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
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
    flex: 1,
    marginLeft: 8,
  },
  createButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  labelDescription: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 28,
  },
  requiredBadge: {
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requiredBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  titleInput: {
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  descriptionInput: {
    fontSize: 15,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 120,
    borderWidth: 1,
    marginTop: 8,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  charCount: {
    fontSize: 12,
  },
  priorityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  priorityCard: {
    flex: 1,
    minWidth: '47%',
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  priorityLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickDateButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 12,
    marginTop: 8,
  },
  dateIconWrapper: {
    marginRight: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 15,
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default CreateTaskScreen;
