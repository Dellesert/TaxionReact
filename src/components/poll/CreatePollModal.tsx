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
  Alert,
  Platform,
  StatusBar,
  Switch,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as pollApi from '@api/poll.api';
import { PollType, PollVisibility, CreatePollDto } from '@/types/poll.types';
import UserSelector from '@components/common/UserSelector';
import DatePickerModal from '@components/common/DatePickerModal';

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
  const insets = useSafeAreaInsets();
  const currentUser = useAuthStore((state) => state.user);

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
  const [requireComment, setRequireComment] = useState(false);
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
      Alert.alert('Ошибка', 'Минимум 2 варианта ответа');
    }
  };

  const updateOption = (index: number, field: 'text' | 'description', value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название опроса');
      return false;
    }

    if (pollType !== 'open_text') {
      const filledOptions = options.filter((opt) => opt.text.trim());
      if (filledOptions.length < 2) {
        Alert.alert('Ошибка', 'Добавьте минимум 2 варианта ответа');
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
        Alert.alert('Ошибка', 'Вы не принадлежите ни к одному отделу');
        return;
      }
    } else if (audienceType === 'selected_users') {
      visibility = 'invite_only';
      participantIds = selectedUserIds;
      if (selectedUserIds.length === 0) {
        Alert.alert('Ошибка', 'Выберите хотя бы одного пользователя');
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
        require_comment: requireComment,
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
      Alert.alert('Успех', 'Опрос создан');
      onPollCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create poll:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать опрос');
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
    setRequireComment(false);
    setShowResults(true);
    setShowResultsAfter(false);
    setEndDate(undefined);
    onClose();
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      Animated.timing(slideAnim, {
        toValue: -(nextStep - 1) * SCREEN_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
      setCurrentStep(nextStep);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      Animated.timing(slideAnim, {
        toValue: -(prevStep - 1) * SCREEN_WIDTH,
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
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={currentStep === 1 ? handleClose : goToPreviousStep}
            >
              <Ionicons
                name={currentStep === 1 ? 'close' : 'arrow-back'}
                size={28}
                color={theme.error}
              />
            </TouchableOpacity>

            <Text style={[styles.headerTitle, { color: theme.text }]}>Новый опрос</Text>

            <View style={{ width: 40 }} />
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            {[1, 2, 3, 4].map((step) => (
              <View
                key={step}
                style={[
                  styles.progressDot,
                  { backgroundColor: step <= currentStep ? theme.error : theme.border },
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
            <View style={[styles.stepContent, { width: SCREEN_WIDTH }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
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
            <View style={[styles.stepContent, { width: SCREEN_WIDTH }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
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
                          pollType === 'single_choice' && { backgroundColor: theme.error, borderColor: theme.error },
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
                          pollType === 'multiple_choice' && { backgroundColor: theme.error, borderColor: theme.error },
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
                        <Ionicons name="add" size={20} color={theme.error} />
                        <Text style={[styles.addButtonText, { color: theme.error }]}>Добавить вариант</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>

            {/* Step 3: Аудитория */}
            <View style={[styles.stepContent, { width: SCREEN_WIDTH }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
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
                          audienceType === 'all' && { backgroundColor: theme.error, borderColor: theme.error },
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
                          audienceType === 'department' && { backgroundColor: theme.error, borderColor: theme.error },
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
                          audienceType === 'selected_users' && { backgroundColor: theme.error, borderColor: theme.error },
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
            <View style={[styles.stepContent, { width: SCREEN_WIDTH }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 20 }}
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
                      <Ionicons name="calendar" size={20} color={theme.error} />
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
                        trackColor={{ false: theme.border, true: theme.error }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { color: theme.text }]}>Показывать результаты</Text>
                      <Switch
                        value={showResults}
                        onValueChange={setShowResults}
                        trackColor={{ false: theme.border, true: theme.error }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { color: theme.text }]}>Требовать комментарий</Text>
                      <Switch
                        value={requireComment}
                        onValueChange={setRequireComment}
                        trackColor={{ false: theme.border, true: theme.error }}
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
        <View style={[styles.bottomNav, { backgroundColor: theme.card, paddingBottom: insets.bottom, borderTopColor: theme.border }]}>
          {currentStep < totalSteps ? (
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: theme.error },
                !canProceedFromStep(currentStep) && { backgroundColor: theme.backgroundTertiary }
              ]}
              onPress={goToNextStep}
              disabled={!canProceedFromStep(currentStep)}
            >
              <Text style={[styles.nextButtonText, !canProceedFromStep(currentStep) && { color: theme.textTertiary }]}>
                Далее
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.nextButton,
                { backgroundColor: theme.error },
                isSubmitting && { backgroundColor: theme.backgroundTertiary }
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.nextButtonText}>Создать опрос</Text>
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
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  stepHeader: {
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    lineHeight: 20,
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
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  nextButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default CreatePollModal;
