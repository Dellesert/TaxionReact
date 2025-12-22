/**
 * Create Task Modal
 * Модальное окно для создания задачи с пошаговым интерфейсом
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  StatusBar,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@shared/store/authStore';
import * as taskApi from '../../api/task.api';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import { TaskPriority, CreateTaskDto } from '../../types/task.types';
import UserSelector from '@shared/components/common/UserSelector';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CreateTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
}

type TaskContentType = 'checklist' | 'description' | 'none';
type Step = 1 | 2 | 3 | 4;

const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  visible,
  onClose,
  onTaskCreated,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();
  const { showSuccess, showError } = useNotification();

  const isEmployee = currentUser?.role === 'employee';

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1: Title
  const [title, setTitle] = useState('');

  // Step 2: Content type selection
  const [contentType, setContentType] = useState<TaskContentType | null>(null);

  // Step 3: Content (checklist or description)
  const [description, setDescription] = useState('');
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [newItemText, setNewItemText] = useState('');

  // Step 4: Priority, Date, Assignee
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assigneeId, setAssigneeId] = useState<number | undefined>(undefined);

  const [isCreating, setIsCreating] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Track keyboard visibility
  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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

  // Animation when step changes
  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [currentStep]);

  // Navigation handlers
  const goToNextStep = () => {
    if (currentStep === 1 && !title.trim()) {
      // Не показываем уведомление, пользователь сам видит что поле пустое
      return;
    }

    if (currentStep === 2 && !contentType) {
      // Не показываем уведомление, пользователь сам видит что ничего не выбрано
      return;
    }

    // Skip step 3 if content type is 'none'
    if (currentStep === 2 && contentType === 'none') {
      setCurrentStep(4);
    } else if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    // Skip step 3 if going back and content type is 'none'
    if (currentStep === 4 && contentType === 'none') {
      setCurrentStep(2);
    } else if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    // Убрали setShowDatePicker(false) - теперь DatePickerModal сам управляет закрытием через onClose
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handleCreateTask = async () => {
    if (!title.trim()) {
      return; // Не должно произойти, т.к. кнопка на 4 шаге
    }

    try {
      setIsCreating(true);

      const finalAssigneeIds = isEmployee && currentUser?.id
        ? [currentUser.id]
        : assigneeId
          ? [assigneeId]
          : undefined;

      const taskData: CreateTaskDto = {
        title: title.trim(),
        description: contentType === 'description' ? description.trim() || undefined : undefined,
        priority,
        due_date: dueDate?.toISOString(),
        assignee_ids: finalAssigneeIds,
        checklists: contentType === 'checklist' && checklistItems.length > 0
          ? [{ title: 'Checklist', items: checklistItems }]
          : undefined,
      };

      const createdTask = await taskApi.createTask(taskData);

      // If backend didn't create checklist, create it manually
      if (contentType === 'checklist' && checklistItems.length > 0 && createdTask.id) {
        try {
          // Check if checklist was created by the backend
          const existingChecklists = await taskApi.getTaskChecklists(createdTask.id);

          // Only create if no checklists exist
          if (!existingChecklists || existingChecklists.length === 0) {
            const newChecklist = await taskApi.createChecklist(createdTask.id, { title: 'Checklist' });

            // Add all items to the checklist
            for (const item of checklistItems) {
              await taskApi.createChecklistItem(newChecklist.id, { title: item });
            }
          }
        } catch (checklistError) {
          console.error('Error creating checklist:', checklistError);
          // Don't fail the whole operation, just log the error
        }
      }

      // Показываем уведомление об успешном создании
      showSuccess('Задача успешно создана');

      onTaskCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create task:', error);
      showError(error.message || 'Не удалось создать задачу');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setTitle('');
    setContentType(null);
    setDescription('');
    setPriority('medium');
    setDueDate(undefined);
    setAssigneeId(undefined);
    setChecklistItems([]);
    setNewItemText('');
    slideAnim.setValue(0);
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

  // Get step info
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Название задачи';
      case 2: return 'Тип содержимого';
      case 3: return contentType === 'checklist' ? 'Чек-лист' : 'Описание';
      case 4: return 'Детали задачи';
      default: return '';
    }
  };

  const getTotalSteps = () => {
    return contentType === 'none' ? 3 : 4;
  };

  const getDisplayStep = () => {
    if (contentType === 'none' && currentStep === 4) return 3;
    return currentStep;
  };

  const contentTypes = [
    {
      type: 'checklist' as TaskContentType,
      icon: 'checkbox-outline',
      title: 'С чек-листом',
      description: 'Список пунктов для отметки',
    },
    {
      type: 'description' as TaskContentType,
      icon: 'document-text-outline',
      title: 'С описанием',
      description: 'Добавьте текстовое описание',
    },
    {
      type: 'none' as TaskContentType,
      icon: 'flash-outline',
      title: 'Быстрая задача',
      description: 'Без описания и чек-листа',
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? "fade" : "slide"}
      transparent={isDesktop}
      onRequestClose={handleClose}
      presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
    >
      <View style={[
        styles.modalOverlay,
        isDesktop && styles.modalOverlayDesktop,
        { backgroundColor: isDesktop ? 'rgba(0, 0, 0, 0.5)' : theme.card }
      ]}>
        <View style={[
          styles.container,
          { backgroundColor: theme.card },
          !isDesktop && { paddingTop: insets.top },
          isDesktop && styles.containerDesktop
        ]}>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

        {/* Header - hide when keyboard is visible */}
        {!isKeyboardVisible && (
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Создание задачи</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Шаг {getDisplayStep()} из {getTotalSteps()}
              </Text>
            </View>

            <View style={styles.headerButton} />
          </View>
        )}

        {/* Compact header when keyboard is visible */}
        {isKeyboardVisible && (
          <View style={[styles.compactHeader, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleClose} style={styles.compactHeaderButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.compactHeaderTitle, { color: theme.text }]}>{getStepTitle()}</Text>
            <View style={styles.compactHeaderButton} />
          </View>
        )}

        {/* Progress Indicator - hide when keyboard is visible */}
        {!isKeyboardVisible && (
          <View style={[styles.progressContainer, { backgroundColor: theme.card }]}>
            <View style={styles.progressBar}>
              {[1, 2, 3, 4].slice(0, getTotalSteps()).map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressStep,
                    { backgroundColor: theme.border },
                    getDisplayStep() >= step && { backgroundColor: theme.primary },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Content */}
          <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
            <ScrollView
              style={[styles.content, { backgroundColor: theme.background }]}
              contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 10 : 20 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.stepContainer, isKeyboardVisible && styles.stepContainerCompact]}>
                {!isKeyboardVisible && (
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{getStepTitle()}</Text>
                )}

                {/* Step 1: Title */}
                {currentStep === 1 && (
                  <View style={styles.stepContent}>
                    {!isKeyboardVisible && (
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                        Введите краткое и понятное название для новой задачи
                      </Text>
                    )}
                    <TextInput
                      style={[
                        styles.largeInput,
                        { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                        isKeyboardVisible && styles.largeInputCompact
                      ]}
                      placeholder="Например: Подготовить отчет..."
                      placeholderTextColor={theme.inputPlaceholder}
                      value={title}
                      onChangeText={setTitle}
                      maxLength={100}
                      autoFocus
                      multiline
                    />
                    {!isKeyboardVisible && (
                      <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                        {title.length}/100
                      </Text>
                    )}
                  </View>
                )}

                {/* Step 2: Content Type Selection */}
                {currentStep === 2 && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                      Выберите, как вы хотите структурировать задачу
                    </Text>
                    {contentTypes.map((item) => (
                      <TouchableOpacity
                        key={item.type}
                        onPress={() => setContentType(item.type)}
                        style={[
                          styles.contentTypeCard,
                          { backgroundColor: theme.card, borderColor: theme.border },
                          contentType === item.type && { borderColor: theme.primary, borderWidth: 2 },
                        ]}
                      >
                        <View style={[styles.contentTypeIcon, { backgroundColor: contentType === item.type ? theme.primary : theme.backgroundSecondary }]}>
                          <Ionicons name={item.icon as any} size={28} color={contentType === item.type ? '#FFFFFF' : theme.primary} />
                        </View>
                        <View style={styles.contentTypeInfo}>
                          <Text style={[styles.contentTypeTitle, { color: theme.text }]}>{item.title}</Text>
                          <Text style={[styles.contentTypeDescription, { color: theme.textSecondary }]}>{item.description}</Text>
                        </View>
                        {contentType === item.type && (
                          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Step 3: Content Input (Checklist or Description) */}
                {currentStep === 3 && contentType === 'checklist' && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                      Добавьте пункты в чек-лист для отслеживания прогресса выполнения
                    </Text>

                    {/* Add item input */}
                    <View style={styles.addChecklistContainer}>
                      <TextInput
                        style={[styles.checklistInput, { flex: 1, backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
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
                    {checklistItems.length > 0 && (
                      <View style={styles.checklistItemsContainer}>
                        {checklistItems.map((item, index) => (
                          <View key={index} style={[styles.checklistItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <View style={[styles.checkbox, { borderColor: theme.border }]} />
                            <Text style={[styles.itemText, { color: theme.text }]} numberOfLines={2}>{item}</Text>
                            <TouchableOpacity onPress={() => handleRemoveItem(index)} style={styles.removeButton}>
                              <Ionicons name="close-circle" size={20} color={theme.error} />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}

                    {checklistItems.length === 0 && (
                      <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                        <Ionicons name="list-outline" size={48} color={theme.textTertiary} />
                        <Text style={[styles.emptyStateText, { color: theme.textTertiary }]}>
                          Добавьте первый пункт в чек-лист
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {currentStep === 3 && contentType === 'description' && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                      Опишите детали задачи, требования или любую другую важную информацию
                    </Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Введите описание задачи..."
                      placeholderTextColor={theme.inputPlaceholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={8}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                      {description.length}/500
                    </Text>
                  </View>
                )}

                {/* Step 4: Details (Priority, Date, Assignee) */}
                {currentStep === 4 && (
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                      Укажите приоритет, срок выполнения и исполнителя
                    </Text>

                    {/* Priority */}
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: theme.text }]}>Приоритет</Text>
                      <View style={styles.priorityRow}>
                        {priorities.map((p) => (
                          <TouchableOpacity
                            key={p.value}
                            onPress={() => setPriority(p.value)}
                            style={[
                              styles.priorityChip,
                              { backgroundColor: theme.card, borderColor: theme.border },
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

                    {/* Due Date */}
                    <View style={styles.detailSection}>
                      <Text style={[styles.detailLabel, { color: theme.text }]}>Срок выполнения (необязательно)</Text>
                      <TouchableOpacity
                        style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                        <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                        <Text style={[styles.dateButtonText, { color: dueDate ? theme.text : theme.textTertiary }]}>
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

                    {/* Assignee */}
                    {!isEmployee && (
                      <View style={styles.detailSection}>
                        <Text style={[styles.detailLabel, { color: theme.text }]}>Исполнитель (необязательно)</Text>
                        <UserSelector
                          selectedUserIds={assigneeId ? [assigneeId] : []}
                          onSelectionChange={(ids) => setAssigneeId(ids[0])}
                          multiSelect={false}
                          placeholder="Выберите исполнителя"
                          modalTitle="Выбрать исполнителя"
                          filterForTaskAssignment={true}
                        />
                      </View>
                    )}

                    {isEmployee && (
                      <View style={[styles.infoSection, { backgroundColor: theme.backgroundSecondary }]}>
                        <Ionicons name="information-circle" size={20} color={theme.primary} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                          Задача будет автоматически назначена вам
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </ScrollView>
          </Animated.View>

          {/* Bottom Navigation */}
          <View style={[
            styles.bottomNav,
            isKeyboardVisible && styles.bottomNavCompact,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: isKeyboardVisible ? 8 : (isDesktop ? 20 : Math.max(insets.bottom, 16))
            }
          ]}>
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={goToPreviousStep}
                style={[
                  styles.navButton,
                  styles.backButton,
                  isKeyboardVisible && styles.navButtonCompact,
                  { borderColor: theme.border }
                ]}
              >
                <Ionicons name="arrow-back" size={isKeyboardVisible ? 18 : 20} color={theme.text} />
                <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: theme.text }]}>Назад</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.navButton, isKeyboardVisible && styles.navButtonCompact]} />
            )}

            {currentStep < 4 ? (
              <TouchableOpacity
                onPress={goToNextStep}
                style={[
                  styles.navButton,
                  styles.nextButton,
                  isKeyboardVisible && styles.navButtonCompact,
                  { backgroundColor: theme.primary }
                ]}
              >
                <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Далее</Text>
                <Ionicons name="arrow-forward" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateTask}
                disabled={isCreating}
                style={[
                  styles.navButton,
                  styles.createButton,
                  isKeyboardVisible && styles.navButtonCompact,
                  { backgroundColor: theme.primary }
                ]}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                    <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Создать</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>

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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
  },
  containerDesktop: {
    width: 700,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 60,
        elevation: 24,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  compactHeaderButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerButton: {
    width: 44,
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
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepContainerCompact: {
    padding: 12,
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  stepContent: {
    gap: 16,
  },
  largeInput: {
    fontSize: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  largeInputCompact: {
    minHeight: 60,
    paddingVertical: 12,
  },
  charCount: {
    fontSize: 13,
    textAlign: 'right',
  },
  contentTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  contentTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentTypeInfo: {
    flex: 1,
  },
  contentTypeTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentTypeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  addChecklistContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
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
    paddingVertical: 48,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 15,
    marginTop: 12,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 160,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
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
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  bottomNavCompact: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    flex: 1,
  },
  navButtonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  backButton: {
    borderWidth: 1,
  },
  nextButton: {},
  createButton: {},
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextCompact: {
    fontSize: 14,
  },
});

export default CreateTaskModal;
