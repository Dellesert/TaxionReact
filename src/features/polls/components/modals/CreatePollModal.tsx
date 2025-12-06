/**
 * Create Poll Modal
 * Модальное окно для создания опроса
 */

import React, { useState, useRef } from 'react';
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
  Switch,
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAuthStore } from '@shared/store/authStore';
import { useNotification } from '@shared/contexts/NotificationContext';
import * as pollApi from '../../api/poll.api';
import { PollType, PollVisibility, CreatePollDto } from '../../types/poll.types';
import UserSelector from '@shared/components/common/UserSelector';
import DatePickerModal from '@shared/components/common/DatePickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CreatePollModalProps {
  visible: boolean;
  onClose: () => void;
  onPollCreated: () => void;
}

const CreatePollModal: React.FC<CreatePollModalProps> = ({
  visible,
  onClose,
  onPollCreated,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.user);
  const { showSuccess, showError } = useNotification();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-step navigation
  const [currentStep, setCurrentStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const totalSteps = 4;

  // Basic poll data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pollType, setPollType] = useState<PollType>('single_choice');

  // Audience selection
  type AudienceType = 'all' | 'department' | 'selected_users';
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // Poll options
  const [options, setOptions] = useState<Array<{ text: string; description?: string }>>([
    { text: '' },
    { text: '' },
  ]);

  // Poll settings
  const [allowAnonymous, setAllowAnonymous] = useState(false);
  const [allowMultipleVote, setAllowMultipleVote] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [showResultsAfter, setShowResultsAfter] = useState(false);

  // Dates
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const addOption = () => {
    setOptions([...options, { text: '' }]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    } else {
      showError('Минимум 2 варианта ответа');
    }
  };

  const updateOption = (index: number, field: 'text' | 'description', value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      showError('Введите название опроса');
      return false;
    }

    if (pollType !== 'open_text') {
      const filledOptions = options.filter((opt) => opt.text.trim());
      if (filledOptions.length < 2) {
        showError('Добавьте минимум 2 варианта ответа');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    // Determine visibility based on audience type
    let visibility: PollVisibility = 'public';
    let departmentId: number | undefined = undefined;
    let participantIds: number[] | undefined = undefined;

    if (audienceType === 'department') {
      visibility = 'department';
      departmentId = currentUser?.department_id;
      if (!departmentId) {
        showError('Вы не принадлежите ни к одному отделу');
        return;
      }
    } else if (audienceType === 'selected_users') {
      visibility = 'invite_only';
      participantIds = selectedUserIds;
      if (selectedUserIds.length === 0) {
        showError('Выберите хотя бы одного пользователя');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const pollData: CreatePollDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: pollType,
        status: 'active',
        visibility,
        allow_anonymous: allowAnonymous,
        allow_multiple_vote: allowMultipleVote,
        show_results: showResults,
        show_results_after: showResultsAfter,
        end_time: endDate?.toISOString(),
        department_id: departmentId,
        participant_ids: participantIds,
      };

      // Add options only if not open_text type
      if (pollType !== 'open_text') {
        const filledOptions = options.filter((opt) => opt.text.trim());
        pollData.options = filledOptions.map((opt, index) => ({
          text: opt.text.trim(),
          description: opt.description?.trim() || undefined,
          position: index + 1,
        }));
      }

      await pollApi.createPoll(pollData);
      showSuccess('Опрос успешно создан');
      onPollCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create poll:', error);
      showError(error.message || 'Не удалось создать опрос');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    slideAnim.setValue(0);
    setTitle('');
    setDescription('');
    setPollType('single_choice');
    setAudienceType('all');
    setSelectedUserIds([]);
    setOptions([{ text: '' }, { text: '' }]);
    setAllowAnonymous(false);
    setAllowMultipleVote(false);
    setShowResults(true);
    setShowResultsAfter(false);
    setEndDate(undefined);
    onClose();
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      const width = isDesktop ? 700 : SCREEN_WIDTH;
      Animated.timing(slideAnim, {
        toValue: -(nextStep - 1) * width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      const width = isDesktop ? 700 : SCREEN_WIDTH;
      Animated.timing(slideAnim, {
        toValue: -(prevStep - 1) * width,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(prevStep);
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return title.trim().length > 0;
      case 2:
        if (pollType === 'open_text') return true;
        const filledOptions = options.filter((opt) => opt.text.trim());
        return filledOptions.length >= 2;
      case 3:
        if (audienceType === 'selected_users') {
          return selectedUserIds.length > 0;
        }
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  // Calculate modal width for animations
  const modalWidth = isDesktop ? 700 : SCREEN_WIDTH;

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
        <KeyboardAvoidingView
          style={[
            styles.container,
            { backgroundColor: theme.card },
            !isDesktop && { paddingTop: insets.top },
            isDesktop && styles.containerDesktop
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
        >
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Создание опроса</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Шаг {currentStep} из {totalSteps}
            </Text>
          </View>

          <View style={styles.headerButton} />
        </View>

        {/* Progress Indicator */}
        <View style={[styles.progressContainer, { backgroundColor: theme.card }]}>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressStep,
                  { backgroundColor: theme.border },
                  currentStep >= step && { backgroundColor: theme.primary },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Multi-step Content */}
        <View style={[styles.content, { backgroundColor: theme.background }]}>
          <Animated.View
            style={[
              styles.stepsContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Step 1: Основная информация */}
            <View style={[styles.stepContent, { width: modalWidth }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>Основная информация</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    Укажите название и описание опроса
                  </Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                      placeholder="Название опроса"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={title}
                      onChangeText={setTitle}
                      maxLength={200}
                    />
                  </View>

                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Описание</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                      placeholder="Опишите детали опроса..."
                      placeholderTextColor={theme.inputPlaceholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Step 2: Тип и варианты */}
            <View style={[styles.stepContent, { width: modalWidth }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>Тип и варианты</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    Выберите тип опроса и добавьте варианты ответа
                  </Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Тип опроса</Text>
                    <View style={styles.typeRow}>
                      <TouchableOpacity
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          pollType === 'single_choice' && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setPollType('single_choice')}
                      >
                        <Text style={[styles.typeChipText, { color: theme.text }, pollType === 'single_choice' && { color: '#FFFFFF' }]}>
                          Один вариант
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          pollType === 'multiple_choice' && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setPollType('multiple_choice')}
                      >
                        <Text style={[styles.typeChipText, { color: theme.text }, pollType === 'multiple_choice' && { color: '#FFFFFF' }]}>
                          Несколько вариантов
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {pollType !== 'open_text' && (
                    <View style={styles.cardSection}>
                      <Text style={[styles.label, { color: theme.textSecondary }]}>Варианты ответа</Text>
                      {options.map((option, index) => (
                        <View key={index} style={styles.optionRow}>
                          <TextInput
                            style={[styles.optionInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                            placeholder={`Вариант ${index + 1}`}
                            placeholderTextColor={theme.inputPlaceholder}
                            value={option.text}
                            onChangeText={(text) => updateOption(index, 'text', text)}
                            maxLength={100}
                          />
                          {options.length > 2 && (
                            <TouchableOpacity onPress={() => removeOption(index)} style={styles.removeButton}>
                              <Ionicons name="close-circle" size={24} color={theme.error} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity onPress={addOption} style={[styles.addButton, { backgroundColor: theme.backgroundSecondary }]}>
                        <Ionicons name="add" size={20} color={theme.primary} />
                        <Text style={[styles.addButtonText, { color: theme.primary }]}>Добавить вариант</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Step 3: Аудитория */}
            <View style={[styles.stepContent, { width: modalWidth }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>Аудитория</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    Выберите, кто сможет участвовать в опросе
                  </Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Кто может голосовать</Text>
                    <View style={styles.typeRow}>
                      <TouchableOpacity
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          audienceType === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setAudienceType('all')}
                      >
                        <Text style={[styles.typeChipText, { color: theme.text }, audienceType === 'all' && { color: '#FFFFFF' }]}>
                          Все
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          audienceType === 'department' && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setAudienceType('department')}
                      >
                        <Text style={[styles.typeChipText, { color: theme.text }, audienceType === 'department' && { color: '#FFFFFF' }]}>
                          Мой отдел
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          audienceType === 'selected_users' && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setAudienceType('selected_users')}
                      >
                        <Text style={[styles.typeChipText, { color: theme.text }, audienceType === 'selected_users' && { color: '#FFFFFF' }]}>
                          Выбранные
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {audienceType === 'selected_users' && (
                      <View style={{ marginTop: 12 }}>
                        <UserSelector
                          selectedUserIds={selectedUserIds}
                          onSelectionChange={setSelectedUserIds}
                          multiSelect={true}
                          placeholder="Выберите участников"
                          modalTitle="Выбрать участников"
                        />
                      </View>
                    )}
                  </View>
                </View>
              </ScrollView>
            </View>

            {/* Step 4: Настройки */}
            <View style={[styles.stepContent, { width: modalWidth }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>Настройки</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    Укажите дополнительные параметры опроса
                  </Text>
                </View>

                <View style={[styles.card, { backgroundColor: theme.card }]}>
                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Срок окончания</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {endDate ? endDate.toLocaleDateString('ru-RU') : 'Выберите дату окончания'}
                      </Text>
                      {endDate && (
                        <TouchableOpacity onPress={() => setEndDate(undefined)} style={styles.clearButton}>
                          <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  </View>

                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Дополнительно</Text>

                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { color: theme.text }]}>Анонимное голосование</Text>
                      <Switch
                        value={allowAnonymous}
                        onValueChange={setAllowAnonymous}
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { color: theme.text }]}>Показывать результаты</Text>
                      <Switch
                        value={showResults}
                        onValueChange={setShowResults}
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                  </View>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </View>

        {/* Bottom Navigation */}
        <View style={[
          styles.bottomNav,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: isDesktop ? 20 : insets.bottom
          }
        ]}>
          {currentStep > 1 ? (
            <TouchableOpacity
              onPress={goToPreviousStep}
              style={[styles.navButton, styles.backButton, { borderColor: theme.border }]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.text} />
              <Text style={[styles.navButtonText, { color: theme.text }]}>Назад</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navButton} />
          )}

          {currentStep < totalSteps ? (
            <TouchableOpacity
              onPress={goToNextStep}
              disabled={!canProceedFromStep(currentStep)}
              style={[
                styles.navButton,
                styles.nextButton,
                { backgroundColor: theme.primary },
                !canProceedFromStep(currentStep) && { backgroundColor: theme.backgroundTertiary }
              ]}
            >
              <Text style={[styles.navButtonText, { color: '#FFFFFF' }, !canProceedFromStep(currentStep) && { color: theme.textTertiary }]}>
                Далее
              </Text>
              <Ionicons name="arrow-forward" size={20} color={!canProceedFromStep(currentStep) ? theme.textTertiary : '#FFFFFF'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[styles.navButton, styles.createButton, { backgroundColor: theme.primary }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  <Text style={[styles.navButtonText, { color: '#FFFFFF' }]}>Создать</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Date Picker Modal */}
        {showEndDatePicker && (
          <DatePickerModal
            visible={showEndDatePicker}
            value={endDate || new Date()}
            onChange={handleDateChange}
            onClose={() => setShowEndDatePicker(false)}
            minimumDate={new Date()}
            mode="date"
          />
        )}
      </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
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
    overflow: 'hidden',
  },
  stepsContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardSection: {
    marginBottom: 20,
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
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  optionInput: {
    flex: 1,
    fontSize: 15,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
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
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchLabel: {
    fontSize: 15,
    flex: 1,
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
  backButton: {
    borderWidth: 1,
  },
  nextButton: {},
  createButton: {},
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CreatePollModal;
