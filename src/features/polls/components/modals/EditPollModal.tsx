/**
 * Edit Poll Modal
 * Модальное окно для редактирования опроса
 */

import React, { useState, useEffect, useRef } from 'react';
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
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useNotification } from '@shared/contexts/NotificationContext';
import * as pollApi from '../../api/poll.api';
import { Poll } from '../../types/poll.types';
import DatePickerModal from '@shared/components/common/DatePickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EditPollModalProps {
  visible: boolean;
  pollId: number;
  onClose: () => void;
  onPollUpdated: () => void;
}

const EditPollModal: React.FC<EditPollModalProps> = ({
  visible,
  pollId,
  onClose,
  onPollUpdated,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const isElectronApp = Platform.OS === 'web' && typeof window !== 'undefined' && !!(window as any).electron;
  const isDesktopElectron = isDesktop && isElectronApp;
  const animationType = useAnimationType(isDesktopElectron ? 'fade' : 'slide');
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();

  const [hoveredWindowBtn, setHoveredWindowBtn] = useState<'minimize' | 'maximize' | 'close' | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [poll, setPoll] = useState<Poll | null>(null);

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

  // Multi-step navigation
  const [currentStep, setCurrentStep] = useState(1);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const totalSteps = 3;

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requireComment, setRequireComment] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [options, setOptions] = useState<Array<{ id?: number; text: string; description?: string }>>([]);

  useEffect(() => {
    if (visible) {
      loadPoll();
    }
  }, [visible, pollId]);

  const loadPoll = async () => {
    try {
      setIsLoading(true);
      const loadedPoll = await pollApi.getPoll(pollId);
      setPoll(loadedPoll);

      // Initialize form with current poll data
      setTitle(loadedPoll.title);
      setDescription(loadedPoll.description || '');
      setRequireComment(loadedPoll.require_comment || false);
      setShowResults(loadedPoll.show_results !== undefined ? loadedPoll.show_results : true);
      if (loadedPoll.end_time) {
        setEndDate(new Date(loadedPoll.end_time));
      }
      if (loadedPoll.options) {
        setOptions(
          loadedPoll.options.map((opt) => ({
            id: opt.id,
            text: opt.text,
            description: opt.description,
          }))
        );
      }
    } catch (error: any) {
      console.error('Failed to load poll:', error);
      showError('Не удалось загрузить опрос');
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError('Введите название опроса');
      return;
    }

    if (poll?.type !== 'open_text') {
      const filledOptions = options.filter((opt) => opt.text.trim());
      if (filledOptions.length < 2) {
        showError('Добавьте минимум 2 варианта ответа');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const updateData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        require_comment: requireComment,
        show_results: showResults,
        end_time: endDate?.toISOString(),
      };

      // Add options only if not open_text type
      if (poll?.type !== 'open_text') {
        const filledOptions = options.filter((opt) => opt.text.trim());
        updateData.options = filledOptions.map((opt, index) => {
          // For new options (without id), don't include id field at all
          if (opt.id) {
            // Existing option - include id
            return {
              id: opt.id,
              text: opt.text.trim(),
              description: opt.description?.trim() || undefined,
              position: index + 1,
            };
          } else {
            // New option - no id field
            return {
              text: opt.text.trim(),
              description: opt.description?.trim() || undefined,
              position: index + 1,
            };
          }
        });
      }

      await pollApi.updatePoll(pollId, updateData);
      showSuccess('Опрос успешно обновлён');
      onPollUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to update poll:', error);
      showError(error.message || 'Не удалось обновить опрос');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    // Убрали setShowEndDatePicker(false) - теперь DatePickerModal сам управляет закрытием через onClose
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    slideAnim.setValue(0);
    onClose();
  };

  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      const nextStep = currentStep + 1;
      if (isDesktopElectron) {
        setCurrentStep(nextStep);
        return;
      }
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
      if (isDesktopElectron) {
        setCurrentStep(prevStep);
        return;
      }
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
        if (poll?.type === 'open_text') return true;
        const filledOptions = options.filter((opt) => opt.text.trim());
        return filledOptions.length >= 2;
      case 3:
        return true;
      default:
        return false;
    }
  };

  // Calculate modal width for animations
  const modalWidth = isDesktop ? 700 : SCREEN_WIDTH;

  // ===== DESKTOP ELECTRON: Full-screen two-column layout =====
  if (isDesktopElectron) {
    if (isLoading) {
      return (
        <Modal visible={visible} animationType={animationType} transparent={false} onRequestClose={handleClose} statusBarTranslucent>
          <View style={[styles.desktopElectronContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.desktopTitleBar, { backgroundColor: theme.backgroundSecondary }]}>
              <View style={styles.desktopTitleBarDragArea}>
                <Text style={[styles.desktopTitleBarTitle, { color: theme.text }]} numberOfLines={1}>
                  Редактирование опроса
                </Text>
              </View>
              <View style={[styles.desktopTitleBarBorder, { backgroundColor: theme.border }]} />
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          </View>
        </Modal>
      );
    }

    return (
      <Modal
        visible={visible}
        animationType={animationType}
        transparent={false}
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <View style={[styles.desktopElectronContainer, { backgroundColor: theme.background }]}>
          {/* Custom Title Bar */}
          <View style={[styles.desktopTitleBar, { backgroundColor: theme.backgroundSecondary }]}>
            {/* Back button */}
            <View
              style={styles.desktopTitleBarBackButton}
              // @ts-ignore
              onClick={handleClose}
              onMouseEnter={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = theme.backgroundTertiary;
              }}
              onMouseLeave={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <Ionicons name="arrow-back" size={18} color={theme.text} />
            </View>

            {/* Title — draggable area */}
            <View style={styles.desktopTitleBarDragArea}>
              <Text style={[styles.desktopTitleBarTitle, { color: theme.text }]} numberOfLines={1}>
                Редактирование опроса
              </Text>
            </View>

            {/* Save button */}
            <View
              style={[styles.desktopTitleBarSaveButton, { backgroundColor: theme.primary }]}
              // @ts-ignore
              onClick={isSubmitting || !title.trim() ? undefined : handleSubmit}
              onMouseEnter={(e: any) => {
                if (e.currentTarget?.style && !isSubmitting && title.trim()) e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
              }}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  <Text style={styles.desktopTitleBarSaveText}>Сохранить</Text>
                </>
              )}
            </View>

            {/* Window controls */}
            <View style={styles.desktopWindowControls}>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'minimize' && { backgroundColor: theme.border }]}
                // @ts-ignore
                onClick={() => window.electron?.minimize?.()}
                onMouseEnter={() => setHoveredWindowBtn('minimize')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="remove" size={14} color={theme.text} />
              </View>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'maximize' && { backgroundColor: theme.border }]}
                // @ts-ignore
                onClick={() => window.electron?.maximize?.()}
                onMouseEnter={() => setHoveredWindowBtn('maximize')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="square-outline" size={12} color={theme.text} />
              </View>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'close' && { backgroundColor: '#E81123' }]}
                // @ts-ignore
                onClick={() => window.electron?.close?.()}
                onMouseEnter={() => setHoveredWindowBtn('close')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="close" size={14} color={hoveredWindowBtn === 'close' ? '#FFFFFF' : theme.text} />
              </View>
            </View>

            {/* Bottom border */}
            <View style={[styles.desktopTitleBarBorder, { backgroundColor: theme.border }]} />
          </View>

          {/* Two-Column Content */}
          <ScrollView
            style={styles.desktopScrollView}
            contentContainerStyle={styles.desktopScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.desktopColumnsWrapper}>
              {/* === LEFT COLUMN: "что" === */}
              <View style={styles.desktopColumn}>
                {/* Section: Basic Info */}
                <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Основная информация</Text>

                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
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
                      style={[styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
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

                {/* Section: Answer Options */}
                {poll?.type !== 'open_text' && (
                  <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Варианты ответа</Text>

                    <View style={styles.cardSection}>
                      {options.map((option, index) => (
                        <View key={index} style={styles.optionRow}>
                          <TextInput
                            style={[styles.optionInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
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
                      <TouchableOpacity onPress={addOption} style={[styles.addButton, { backgroundColor: theme.background }]}>
                        <Ionicons name="add" size={20} color={theme.primary} />
                        <Text style={[styles.addButtonText, { color: theme.primary }]}>Добавить вариант</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* === RIGHT COLUMN: "когда/как" === */}
              <View style={styles.desktopColumn}>
                {/* Section: Settings */}
                <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Настройки</Text>

                  <View style={styles.cardSection}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Срок окончания</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: endDate ? theme.text : theme.textTertiary }]}>
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
              </View>
            </View>
          </ScrollView>

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
  }

  // ===== MOBILE (без изменений) =====
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={isDesktop}
      onRequestClose={handleClose}
      presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
      statusBarTranslucent
    >
      {isLoading ? (
        <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
      <View style={[
        styles.modalOverlay,
        isDesktop && styles.modalOverlayDesktop,
        { backgroundColor: isDesktop ? 'rgba(0, 0, 0, 0.5)' : theme.card }
      ]}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.card },
            !isDesktop && { paddingTop: Platform.OS === 'android' ? (insets.top || StatusBar.currentHeight || 0) : insets.top },
            isDesktop && styles.containerDesktop
          ]}
        >
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

          {/* Header - hide when keyboard is visible */}
          {!isKeyboardVisible && (
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Ionicons name="close" size={28} color={theme.textSecondary} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Редактирование опроса</Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  Шаг {currentStep} из {totalSteps}
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
              <Text style={[styles.compactHeaderTitle, { color: theme.text }]}>
                {currentStep === 1 ? 'Основная информация' : currentStep === 2 ? 'Варианты ответа' : 'Настройки'}
              </Text>
              <View style={styles.compactHeaderButton} />
            </View>
          )}

          {/* Progress Indicator - hide when keyboard is visible */}
          {!isKeyboardVisible && (
            <View style={[styles.progressContainer, { backgroundColor: theme.card }]}>
              <View style={styles.progressBar}>
                {[1, 2, 3].map((step) => (
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
          behavior="padding"
          keyboardVerticalOffset={0}
        >
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
            <View style={[styles.stepContent, isKeyboardVisible && styles.stepContentCompact, { width: modalWidth }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 20 : 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {!isKeyboardVisible && (
                  <View style={styles.stepHeader}>
                    <Text style={[styles.stepTitle, { color: theme.text }]}>Основная информация</Text>
                    <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                      Укажите название и описание опроса
                    </Text>
                  </View>
                )}

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

            {/* Step 2: Варианты ответа */}
            <View style={[styles.stepContent, { width: modalWidth }]}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 100 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.stepHeader}>
                  <Text style={[styles.stepTitle, { color: theme.text }]}>Варианты ответа</Text>
                  <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
                    {poll?.type === 'open_text'
                      ? 'Открытый опрос не требует вариантов ответа'
                      : 'Отредактируйте варианты ответа'}
                  </Text>
                </View>

                {poll?.type !== 'open_text' && (
                  <View style={[styles.card, { backgroundColor: theme.card }]}>
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
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Step 3: Настройки */}
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
          isKeyboardVisible && styles.bottomNavCompact,
          {
            backgroundColor: theme.card,
            borderTopColor: theme.border,
            paddingBottom: isKeyboardVisible ? 8 : (isDesktop ? 20 : Math.max(insets.bottom, Platform.OS === 'android' ? 74 : 16))
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

          {currentStep < totalSteps ? (
            <TouchableOpacity
              onPress={goToNextStep}
              disabled={!canProceedFromStep(currentStep)}
              style={[
                styles.navButton,
                styles.nextButton,
                isKeyboardVisible && styles.navButtonCompact,
                { backgroundColor: theme.primary },
                !canProceedFromStep(currentStep) && { backgroundColor: theme.backgroundTertiary }
              ]}
            >
              <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }, !canProceedFromStep(currentStep) && { color: theme.textTertiary }]}>
                Далее
              </Text>
              <Ionicons name="arrow-forward" size={isKeyboardVisible ? 18 : 20} color={!canProceedFromStep(currentStep) ? theme.textTertiary : '#FFFFFF'} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              style={[
                styles.navButton,
                styles.updateButton,
                isKeyboardVisible && styles.navButtonCompact,
                { backgroundColor: theme.primary }
              ]}
            >
              {isSubmitting ? (
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
      </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
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
  updateButton: {},
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Compact styles for keyboard visible state
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
  stepContentCompact: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  bottomNavCompact: {
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  navButtonCompact: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  navButtonTextCompact: {
    fontSize: 14,
  },
  // ===== Desktop Electron styles =====
  desktopElectronContainer: {
    flex: 1,
  },
  desktopTitleBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
    userSelect: 'none',
  },
  desktopTitleBarBackButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    marginLeft: 12,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    WebkitAppRegion: 'no-drag',
  },
  desktopTitleBarDragArea: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
    // @ts-ignore
    WebkitAppRegion: 'drag',
  },
  desktopTitleBarTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  desktopTitleBarSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 5,
    marginRight: 8,
    // @ts-ignore
    cursor: 'pointer',
    transition: 'opacity 0.15s ease',
    WebkitAppRegion: 'no-drag',
  },
  desktopTitleBarSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  desktopWindowControls: {
    flexDirection: 'row',
    height: '100%',
    flexShrink: 0,
    // @ts-ignore
    WebkitAppRegion: 'no-drag',
  },
  desktopWindowControlButton: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // @ts-ignore
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  desktopTitleBarBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  desktopScrollView: {
    flex: 1,
  },
  desktopScrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  desktopColumnsWrapper: {
    flexDirection: 'row',
    gap: 24,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  desktopColumn: {
    flex: 1,
    gap: 20,
  },
  desktopSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  desktopSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
});

export default EditPollModal;
