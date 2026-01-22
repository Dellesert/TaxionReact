/**
 * Edit Schedule Modal
 * Модальное окно для редактирования графика с пошаговым интерфейсом
 * Шаг 1: Название и описание
 * Шаг 2: Тип графика
 * Шаг 3: Период и время смен
 * Шаг 4: Настройки (видимость, цвет)
 */

import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Keyboard,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format, parseISO, addMonths, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Schedule,
  UpdateScheduleRequest,
  ScheduleType,
  ScheduleVisibility,
  ScheduleMode,
  SCHEDULE_MODE_LABELS,
  DEFAULT_SCHEDULE_COLORS,
} from '../types/schedule.types';

interface EditScheduleModalProps {
  visible: boolean;
  schedule: Schedule | null;
  onClose: () => void;
  onSave: (data: UpdateScheduleRequest) => Promise<void>;
}

type Step = 1 | 2 | 3 | 4;

const SCHEDULE_COLORS = [
  { value: '#EF4444', label: 'Красный' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#10B981', label: 'Зелёный' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
];

const SCHEDULE_TYPES: { value: ScheduleType; label: string; icon: string; description: string }[] = [
  { value: 'work', label: 'Рабочий график', icon: 'briefcase-outline', description: 'Стандартный рабочий график сотрудников' },
  { value: 'paid_services', label: 'Платные услуги', icon: 'cash-outline', description: 'График платных услуг и приёмов' },
  { value: 'on_duty', label: 'Дежурства', icon: 'medical-outline', description: 'График дежурств персонала' },
  { value: 'vk', label: 'ВК', icon: 'document-text-outline', description: 'График ВК' },
  { value: 'trips', label: 'Выезды', icon: 'car-outline', description: 'График выездов' },
];

const VISIBILITY_OPTIONS: { value: ScheduleVisibility; label: string; icon: string; description: string }[] = [
  { value: 'creator_only', label: 'Только создатель', icon: 'lock-closed-outline', description: 'Виден только вам' },
  { value: 'management', label: 'Руководство', icon: 'people-outline', description: 'Виден руководителям' },
  { value: 'participants', label: 'Участники', icon: 'globe-outline', description: 'Виден всем участникам графика' },
];

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  visible,
  schedule,
  onClose,
  onSave,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1: Title and Description
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Type selection
  const [scheduleType, setScheduleType] = useState<ScheduleType>('work');

  // Step 3: Dates and Times
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [morningStart, setMorningStart] = useState('08:00');
  const [morningEnd, setMorningEnd] = useState('14:00');
  const [eveningStart, setEveningStart] = useState('14:00');
  const [eveningEnd, setEveningEnd] = useState('20:00');

  // Step 4: Visibility, Color, and Mode
  const [visibility, setVisibility] = useState<ScheduleVisibility>('management');
  const [color, setColor] = useState('#3B82F6');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('recurring');

  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Load schedule data when modal opens
  useEffect(() => {
    if (schedule && visible) {
      setTitle(schedule.title);
      setDescription(schedule.description || '');
      setScheduleType(schedule.type);
      setVisibility(schedule.visibility);
      setStartDate(parseISO(schedule.start_date));
      setEndDate(parseISO(schedule.end_date));
      setColor(schedule.color || '#3B82F6');
      setMorningStart(schedule.morning_start || '08:00');
      setMorningEnd(schedule.morning_end || '14:00');
      setEveningStart(schedule.evening_start || '14:00');
      setEveningEnd(schedule.evening_end || '20:00');
      setScheduleMode(schedule.mode || 'recurring');
      setCurrentStep(1);
    }
  }, [schedule, visible]);

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
      showError('Введите название графика');
      return;
    }

    if (currentStep === 3) {
      if (endDate <= startDate) {
        showError('Дата окончания должна быть позже даты начала');
        return;
      }
    }

    if (currentStep < 4) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  // Navigate to previous/next month
  const goToPreviousMonth = () => {
    const newStart = startOfMonth(subMonths(startDate, 1));
    const newEnd = endOfMonth(subMonths(startDate, 1));
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const goToNextMonth = () => {
    const newStart = startOfMonth(addMonths(startDate, 1));
    const newEnd = endOfMonth(addMonths(startDate, 1));
    setStartDate(newStart);
    setEndDate(newEnd);
  };

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setStartDate(selectedDate);
      if (endDate <= selectedDate) {
        setEndDate(addMonths(selectedDate, 1));
      }
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const formatTimeInput = (value: string): string => {
    const cleaned = value.replace(/[^\d:]/g, '');
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      return cleaned + ':';
    }
    const match = cleaned.match(/^(\d{0,2}):?(\d{0,2})/);
    if (match) {
      const [, hours, minutes] = match;
      if (hours && minutes) {
        return `${hours}:${minutes}`;
      } else if (hours) {
        return cleaned.includes(':') ? `${hours}:` : hours;
      }
    }
    return cleaned.slice(0, 5);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Введите название графика');
      return;
    }

    if (endDate <= startDate) {
      showError('Дата окончания должна быть позже даты начала');
      return;
    }

    try {
      setIsLoading(true);

      const updateData: UpdateScheduleRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        type: scheduleType,
        visibility,
        mode: scheduleMode,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        color,
        morning_start: morningStart,
        morning_end: morningEnd,
        evening_start: eveningStart,
        evening_end: eveningEnd,
      };

      await onSave(updateData);
      showSuccess('График обновлён');
      handleClose();
    } catch (error: any) {
      console.error('Failed to update schedule:', error);
      showError(error.message || 'Не удалось обновить график');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    slideAnim.setValue(0);
    onClose();
  };

  // Handler for schedule type change (auto-sets color)
  const handleTypeChange = (type: ScheduleType) => {
    setScheduleType(type);
    setColor(DEFAULT_SCHEDULE_COLORS[type]);
  };

  // Get step info
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Название графика';
      case 2: return 'Тип графика';
      case 3: return 'Период и время';
      case 4: return 'Настройки';
      default: return '';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 1: return 'Введите название и описание графика';
      case 2: return 'Выберите тип графика для правильной категоризации';
      case 3: return 'Укажите период действия и время смен';
      case 4: return 'Настройте видимость и цвет графика';
      default: return '';
    }
  };

  if (!schedule) return null;

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      transparent={isDesktop}
      onRequestClose={handleClose}
      presentationStyle={isDesktop ? 'overFullScreen' : 'fullScreen'}
    >
      <View
        style={[
          styles.modalOverlay,
          isDesktop && styles.modalOverlayDesktop,
          { backgroundColor: isDesktop ? 'rgba(0, 0, 0, 0.5)' : theme.card },
        ]}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: theme.card },
            !isDesktop && { paddingTop: insets.top },
            isDesktop && styles.containerDesktop,
          ]}
        >
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />

          {/* Header - hide when keyboard is visible */}
          {!isKeyboardVisible && (
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Ionicons name="close" size={28} color={theme.textSecondary} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Редактирование</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  Шаг {currentStep} из 4
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
                    <>
                      <Text style={[styles.stepTitle, { color: theme.text }]}>{getStepTitle()}</Text>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                        {getStepDescription()}
                      </Text>
                    </>
                  )}

                  {/* Step 1: Title and Description */}
                  {currentStep === 1 && (
                    <View style={styles.stepContent}>
                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Название *</Text>
                        <TextInput
                          style={[
                            styles.input,
                            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                          ]}
                          placeholder="Например: График дежурств на январь"
                          placeholderTextColor={theme.inputPlaceholder}
                          value={title}
                          onChangeText={setTitle}
                          maxLength={255}
                          autoFocus
                        />
                        <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                          {title.length}/255
                        </Text>
                      </View>

                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Описание (необязательно)</Text>
                        <TextInput
                          style={[
                            styles.textArea,
                            { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
                          ]}
                          placeholder="Дополнительная информация о графике..."
                          placeholderTextColor={theme.inputPlaceholder}
                          value={description}
                          onChangeText={setDescription}
                          maxLength={2000}
                          multiline
                          numberOfLines={4}
                          textAlignVertical="top"
                        />
                        <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                          {description.length}/2000
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Step 2: Type Selection */}
                  {currentStep === 2 && (
                    <View style={styles.stepContent}>
                      {SCHEDULE_TYPES.map((item) => (
                        <TouchableOpacity
                          key={item.value}
                          onPress={() => handleTypeChange(item.value)}
                          style={[
                            styles.typeCard,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            scheduleType === item.value && { borderColor: theme.primary, borderWidth: 2 },
                          ]}
                        >
                          <View style={[
                            styles.typeIcon,
                            { backgroundColor: scheduleType === item.value ? theme.primary : theme.backgroundSecondary }
                          ]}>
                            <Ionicons
                              name={item.icon as any}
                              size={28}
                              color={scheduleType === item.value ? '#FFFFFF' : theme.primary}
                            />
                          </View>
                          <View style={styles.typeInfo}>
                            <Text style={[styles.typeTitle, { color: theme.text }]}>{item.label}</Text>
                            <Text style={[styles.typeDescription, { color: theme.textSecondary }]}>
                              {item.description}
                            </Text>
                          </View>
                          {scheduleType === item.value && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Step 3: Dates and Times */}
                  {currentStep === 3 && (
                    <View style={styles.stepContent}>
                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Период действия</Text>

                        {/* Month navigation */}
                        <View style={styles.monthNavigation}>
                          <TouchableOpacity
                            style={[styles.monthArrowButton, { backgroundColor: theme.backgroundSecondary }]}
                            onPress={goToPreviousMonth}
                          >
                            <Ionicons name="chevron-back" size={22} color={theme.primary} />
                          </TouchableOpacity>

                          <Text style={[styles.monthLabel, { color: theme.text }]}>
                            {format(startDate, 'LLLL yyyy', { locale: ru })}
                          </Text>

                          <TouchableOpacity
                            style={[styles.monthArrowButton, { backgroundColor: theme.backgroundSecondary }]}
                            onPress={goToNextMonth}
                          >
                            <Ionicons name="chevron-forward" size={22} color={theme.primary} />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.dateRow}>
                          <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                            onPress={() => setShowStartDatePicker(true)}
                          >
                            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                            <Text style={[styles.dateButtonText, { color: theme.text }]}>
                              {format(startDate, 'dd MMM yyyy', { locale: ru })}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>—</Text>
                          <TouchableOpacity
                            style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                            onPress={() => setShowEndDatePicker(true)}
                          >
                            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                            <Text style={[styles.dateButtonText, { color: theme.text }]}>
                              {format(endDate, 'dd MMM yyyy', { locale: ru })}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Время смен</Text>

                        <View style={[styles.shiftCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <View style={styles.shiftHeader}>
                            <Ionicons name="sunny-outline" size={20} color="#F59E0B" />
                            <Text style={[styles.shiftLabel, { color: theme.text }]}>Утренняя смена</Text>
                          </View>
                          <View style={styles.timeInputGroup}>
                            <TextInput
                              style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                              placeholder="08:00"
                              placeholderTextColor={theme.inputPlaceholder}
                              value={morningStart}
                              onChangeText={(text) => setMorningStart(formatTimeInput(text))}
                              keyboardType="numeric"
                              maxLength={5}
                            />
                            <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                            <TextInput
                              style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                              placeholder="14:00"
                              placeholderTextColor={theme.inputPlaceholder}
                              value={morningEnd}
                              onChangeText={(text) => setMorningEnd(formatTimeInput(text))}
                              keyboardType="numeric"
                              maxLength={5}
                            />
                          </View>
                        </View>

                        <View style={[styles.shiftCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                          <View style={styles.shiftHeader}>
                            <Ionicons name="moon-outline" size={20} color="#8B5CF6" />
                            <Text style={[styles.shiftLabel, { color: theme.text }]}>Вечерняя смена</Text>
                          </View>
                          <View style={styles.timeInputGroup}>
                            <TextInput
                              style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                              placeholder="14:00"
                              placeholderTextColor={theme.inputPlaceholder}
                              value={eveningStart}
                              onChangeText={(text) => setEveningStart(formatTimeInput(text))}
                              keyboardType="numeric"
                              maxLength={5}
                            />
                            <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                            <TextInput
                              style={[styles.timeInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                              placeholder="20:00"
                              placeholderTextColor={theme.inputPlaceholder}
                              value={eveningEnd}
                              onChangeText={(text) => setEveningEnd(formatTimeInput(text))}
                              keyboardType="numeric"
                              maxLength={5}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Step 4: Visibility and Color */}
                  {currentStep === 4 && (
                    <View style={styles.stepContent}>
                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Видимость</Text>
                        {VISIBILITY_OPTIONS.map((item) => (
                          <TouchableOpacity
                            key={item.value}
                            onPress={() => setVisibility(item.value)}
                            style={[
                              styles.visibilityCard,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              visibility === item.value && { borderColor: theme.primary, borderWidth: 2 },
                            ]}
                          >
                            <View style={[
                              styles.visibilityIcon,
                              { backgroundColor: visibility === item.value ? theme.primary : theme.backgroundSecondary }
                            ]}>
                              <Ionicons
                                name={item.icon as any}
                                size={20}
                                color={visibility === item.value ? '#FFFFFF' : theme.primary}
                              />
                            </View>
                            <View style={styles.visibilityInfo}>
                              <Text style={[styles.visibilityTitle, { color: theme.text }]}>{item.label}</Text>
                              <Text style={[styles.visibilityDescription, { color: theme.textSecondary }]}>
                                {item.description}
                              </Text>
                            </View>
                            {visibility === item.value && (
                              <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>

                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Режим графика</Text>
                        <View style={styles.modeRow}>
                          <TouchableOpacity
                            onPress={() => setScheduleMode('recurring')}
                            style={[
                              styles.modeCard,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              scheduleMode === 'recurring' && { borderColor: theme.primary, borderWidth: 2 },
                            ]}
                          >
                            <View style={[
                              styles.modeIconContainer,
                              { backgroundColor: scheduleMode === 'recurring' ? theme.primary : theme.backgroundSecondary }
                            ]}>
                              <Ionicons
                                name="sync-outline"
                                size={24}
                                color={scheduleMode === 'recurring' ? '#FFFFFF' : theme.textSecondary}
                              />
                            </View>
                            <Text style={[
                              styles.modeLabel,
                              { color: scheduleMode === 'recurring' ? theme.primary : theme.text }
                            ]}>
                              {SCHEDULE_MODE_LABELS.recurring}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setScheduleMode('monthly')}
                            style={[
                              styles.modeCard,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              scheduleMode === 'monthly' && { borderColor: theme.primary, borderWidth: 2 },
                            ]}
                          >
                            <View style={[
                              styles.modeIconContainer,
                              { backgroundColor: scheduleMode === 'monthly' ? theme.primary : theme.backgroundSecondary }
                            ]}>
                              <Ionicons
                                name="calendar-outline"
                                size={24}
                                color={scheduleMode === 'monthly' ? '#FFFFFF' : theme.textSecondary}
                              />
                            </View>
                            <Text style={[
                              styles.modeLabel,
                              { color: scheduleMode === 'monthly' ? theme.primary : theme.text }
                            ]}>
                              {SCHEDULE_MODE_LABELS.monthly}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.inputSection}>
                        <Text style={[styles.inputLabel, { color: theme.text }]}>Цвет графика</Text>
                        <View style={styles.colorRow}>
                          {SCHEDULE_COLORS.map((c) => (
                            <TouchableOpacity
                              key={c.value}
                              style={[
                                styles.colorOption,
                                { backgroundColor: c.value },
                                color === c.value && styles.colorOptionSelected,
                              ]}
                              onPress={() => setColor(c.value)}
                            >
                              {color === c.value && (
                                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      <View style={[styles.summaryCard, { backgroundColor: theme.backgroundSecondary }]}>
                        <Text style={[styles.summaryTitle, { color: theme.text }]}>Сводка</Text>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Название:</Text>
                          <Text style={[styles.summaryValue, { color: theme.text }]} numberOfLines={1}>{title}</Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Тип:</Text>
                          <Text style={[styles.summaryValue, { color: theme.text }]}>
                            {SCHEDULE_TYPES.find(t => t.value === scheduleType)?.label}
                          </Text>
                        </View>
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>Период:</Text>
                          <Text style={[styles.summaryValue, { color: theme.text }]}>
                            {format(startDate, 'dd.MM.yy')} — {format(endDate, 'dd.MM.yy')}
                          </Text>
                        </View>
                      </View>
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
              {/* Back button */}
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

              {/* Next/Save button */}
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
                  onPress={handleSave}
                  disabled={isLoading}
                  style={[
                    styles.navButton,
                    styles.createButton,
                    isKeyboardVisible && styles.navButtonCompact,
                    { backgroundColor: theme.primary }
                  ]}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                      <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>Сохранить</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </KeyboardAvoidingView>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DatePickerModal
              visible={showStartDatePicker}
              value={startDate}
              onChange={handleStartDateChange}
              onClose={() => setShowStartDatePicker(false)}
              mode="date"
            />
          )}

          {showEndDatePicker && (
            <DatePickerModal
              visible={showEndDatePicker}
              value={endDate}
              onChange={handleEndDateChange}
              onClose={() => setShowEndDatePicker(false)}
              minimumDate={startDate}
              mode="date"
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
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  stepContent: {
    gap: 16,
  },
  // Input sections
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  // Type cards
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  typeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Month navigation
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  monthArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '600',
    textTransform: 'capitalize',
    minWidth: 140,
    textAlign: 'center',
  },
  // Date row
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 12,
    gap: 10,
  },
  dateButtonText: {
    fontSize: 15,
  },
  dateSeparator: {
    fontSize: 16,
  },
  // Shift cards
  shiftCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  shiftLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeInput: {
    flex: 1,
    fontSize: 16,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 16,
  },
  // Visibility cards
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 14,
  },
  visibilityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityInfo: {
    flex: 1,
  },
  visibilityTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  visibilityDescription: {
    fontSize: 13,
  },
  // Mode selection
  modeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  modeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeLabel: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Color options
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  // Summary
  summaryCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    width: 80,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  // Bottom nav
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

export default EditScheduleModal;
