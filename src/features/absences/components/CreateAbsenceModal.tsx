/**
 * Create Absence Modal
 * Модальное окно для создания отсутствия с пошаговым интерфейсом
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  StatusBar,
  ActivityIndicator,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import UserSelectorModal from '@shared/components/common/UserSelectorModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAbsenceStore } from '../store/absenceStore';
import { AbsenceTypeIcon } from './AbsenceTypeIcon';
import {
  AbsenceType,
  ABSENCE_TYPES,
  ABSENCE_TYPE_LABELS,
  ABSENCE_TYPE_COLORS,
  CreateAbsenceRequest,
} from '../types/absence.types';

interface CreateAbsenceModalProps {
  visible: boolean;
  onClose: () => void;
  onAbsenceCreated?: (absenceId: number) => void;
  defaultUserId?: number;
}

type Step = 1 | 2 | 3;

export const CreateAbsenceModal: React.FC<CreateAbsenceModalProps> = ({
  visible,
  onClose,
  onAbsenceCreated,
  defaultUserId,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useNotification();

  const { createAbsence, isSubmitting } = useAbsenceStore();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Step 1: User selection
  const [selectedUserId, setSelectedUserId] = useState<number | null>(defaultUserId || null);
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
  const [showUserPicker, setShowUserPicker] = useState(false);

  // Step 2: Type selection
  const [selectedType, setSelectedType] = useState<AbsenceType | null>(null);

  // Step 3: Date range and reason
  const [startDate, setStartDate] = useState(() => new Date());
  const [endDate, setEndDate] = useState(() => new Date());
  const [reason, setReason] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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

  // Reset form when modal closes
  useEffect(() => {
    if (!visible) {
      setCurrentStep(1);
      setSelectedUserId(defaultUserId || null);
      setSelectedUserName(null);
      setSelectedType(null);
      setStartDate(new Date());
      setEndDate(new Date());
      setReason('');
      slideAnim.setValue(0);
    }
  }, [visible, defaultUserId]);

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
    if (currentStep === 1 && !selectedUserId) {
      return;
    }
    if (currentStep === 2 && !selectedType) {
      return;
    }
    if (currentStep < 3) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleStartDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setStartDate(selectedDate);
      if (endDate < selectedDate) {
        setEndDate(selectedDate);
      }
    }
  };

  const handleEndDateChange = (_event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUserId) {
      showError('Выберите сотрудника');
      return;
    }
    if (!selectedType) {
      showError('Выберите тип');
      return;
    }
    if (endDate < startDate) {
      showError('Дата окончания должна быть не раньше даты начала');
      return;
    }

    try {
      // Use YYYY-MM-DD format to avoid timezone issues
      // The backend should interpret these as date-only values
      const startDateStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

      // Create UTC dates to avoid local timezone offset issues
      const startDateISO = `${startDateStr}T00:00:00.000Z`;
      const endDateISO = `${endDateStr}T23:59:59.000Z`;

      const data: CreateAbsenceRequest = {
        user_id: selectedUserId,
        type: selectedType,
        start_date: startDateISO,
        end_date: endDateISO,
        reason: reason.trim() || undefined,
      };

      const absence = await createAbsence(data);
      showSuccess('Успешно создано');
      onAbsenceCreated?.(absence.id);
      handleClose();
    } catch (error: any) {
      showError(error.message || 'Не удалось создать');
    }
  };

  const handleClose = () => {
    setCurrentStep(1);
    setSelectedUserId(defaultUserId || null);
    setSelectedUserName(null);
    setSelectedType(null);
    setStartDate(new Date());
    setEndDate(new Date());
    setReason('');
    slideAnim.setValue(0);
    onClose();
  };

  // Get step info
  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Сотрудник';
      case 2: return 'Тип отсутствия';
      case 3: return 'Период и причина';
      default: return '';
    }
  };

  const isValid = selectedUserId && selectedType && endDate >= startDate;

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      transparent={isDesktop}
      onRequestClose={handleClose}
      presentationStyle={isDesktop ? 'overFullScreen' : 'fullScreen'}
      statusBarTranslucent
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
            !isDesktop && { paddingTop: Platform.OS === 'android' ? (insets.top || StatusBar.currentHeight || 0) : insets.top },
            isDesktop && styles.containerDesktop,
          ]}
        >
          <StatusBar
            barStyle={isDark ? 'light-content' : 'dark-content'}
            backgroundColor={theme.card}
          />

          {/* Header - hide when keyboard is visible */}
          {!isKeyboardVisible && (
            <View
              style={[
                styles.header,
                { backgroundColor: theme.card, borderBottomColor: theme.border },
              ]}
            >
              <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
                <Ionicons name="close" size={28} color={theme.textSecondary} />
              </TouchableOpacity>

              <View style={styles.headerCenter}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Новое отсутствие
                </Text>
                <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                  Шаг {currentStep} из 3
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

                  {/* Step 1: User Selection */}
                  {currentStep === 1 && (
                    <View style={styles.stepContent}>
                      {!isKeyboardVisible && (
                        <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                          Выберите сотрудника, для которого нужно создать отсутствие
                        </Text>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.selectorCard,
                          { backgroundColor: theme.card, borderColor: theme.border },
                          !!selectedUserId && { borderColor: theme.primary, borderWidth: 2 },
                        ]}
                        onPress={() => setShowUserPicker(true)}
                      >
                        <View style={[styles.selectorIcon, { backgroundColor: selectedUserId ? theme.primary : theme.backgroundSecondary }]}>
                          <Ionicons name="person" size={28} color={selectedUserId ? '#FFFFFF' : theme.primary} />
                        </View>
                        <View style={styles.selectorInfo}>
                          <Text style={[styles.selectorTitle, { color: theme.text }]}>
                            {selectedUserName || (selectedUserId ? `Пользователь #${selectedUserId}` : 'Выберите сотрудника')}
                          </Text>
                          <Text style={[styles.selectorDescription, { color: theme.textSecondary }]}>
                            {selectedUserId ? 'Нажмите, чтобы изменить' : 'Нажмите для выбора'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Step 2: Type Selection */}
                  {currentStep === 2 && (
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                        Выберите тип отсутствия сотрудника
                      </Text>
                      {ABSENCE_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type}
                          onPress={() => setSelectedType(type)}
                          style={[
                            styles.typeCard,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            selectedType === type && { borderColor: ABSENCE_TYPE_COLORS[type], borderWidth: 2 },
                          ]}
                        >
                          <View style={[
                            styles.typeIconContainer,
                            { backgroundColor: selectedType === type ? ABSENCE_TYPE_COLORS[type] : theme.backgroundSecondary }
                          ]}>
                            <AbsenceTypeIcon type={type} size="medium" />
                          </View>
                          <View style={styles.typeInfo}>
                            <Text style={[styles.typeTitle, { color: theme.text }]}>
                              {ABSENCE_TYPE_LABELS[type]}
                            </Text>
                          </View>
                          {selectedType === type && (
                            <View style={[styles.typeCheck, { backgroundColor: ABSENCE_TYPE_COLORS[type] }]}>
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Step 3: Date Range and Reason */}
                  {currentStep === 3 && (
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                        Укажите период отсутствия и причину (необязательно)
                      </Text>

                      {/* Date Range */}
                      <View style={styles.detailSection}>
                        <Text style={[styles.detailLabel, { color: theme.text }]}>Период</Text>
                        <View style={styles.dateRow}>
                          <TouchableOpacity
                            style={[
                              styles.dateButton,
                              { backgroundColor: theme.card, borderColor: theme.border, flex: 1 },
                            ]}
                            onPress={() => setShowStartDatePicker(true)}
                          >
                            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                            <Text style={[styles.dateButtonText, { color: theme.text }]}>
                              {format(startDate, 'dd MMM yyyy', { locale: ru })}
                            </Text>
                          </TouchableOpacity>
                          <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>
                            —
                          </Text>
                          <TouchableOpacity
                            style={[
                              styles.dateButton,
                              { backgroundColor: theme.card, borderColor: theme.border, flex: 1 },
                            ]}
                            onPress={() => setShowEndDatePicker(true)}
                          >
                            <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                            <Text style={[styles.dateButtonText, { color: theme.text }]}>
                              {format(endDate, 'dd MMM yyyy', { locale: ru })}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Reason */}
                      <View style={styles.detailSection}>
                        <Text style={[styles.detailLabel, { color: theme.text }]}>
                          Причина (необязательно)
                        </Text>
                        <TextInput
                          style={[
                            styles.textArea,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                              color: theme.text,
                            },
                          ]}
                          placeholder="Укажите причину..."
                          placeholderTextColor={theme.inputPlaceholder}
                          value={reason}
                          onChangeText={setReason}
                          maxLength={500}
                          multiline
                          numberOfLines={3}
                          textAlignVertical="top"
                        />
                        <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                          {reason.length}/500
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            </Animated.View>

            {/* Bottom Navigation */}
            <View
              style={[
                styles.bottomNav,
                isKeyboardVisible && styles.bottomNavCompact,
                {
                  backgroundColor: theme.card,
                  borderTopColor: theme.border,
                  paddingBottom: isKeyboardVisible ? 8 : (isDesktop ? 20 : Math.max(insets.bottom, Platform.OS === 'android' ? 74 : 16)),
                },
              ]}
            >
              {currentStep > 1 ? (
                <TouchableOpacity
                  onPress={goToPreviousStep}
                  style={[
                    styles.navButton,
                    styles.backButton,
                    isKeyboardVisible && styles.navButtonCompact,
                    { borderColor: theme.border },
                  ]}
                >
                  <Ionicons name="arrow-back" size={isKeyboardVisible ? 18 : 20} color={theme.text} />
                  <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: theme.text }]}>
                    Назад
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.navButton, isKeyboardVisible && styles.navButtonCompact]} />
              )}

              {currentStep < 3 ? (
                <TouchableOpacity
                  onPress={goToNextStep}
                  style={[
                    styles.navButton,
                    styles.nextButton,
                    isKeyboardVisible && styles.navButtonCompact,
                    { backgroundColor: theme.primary },
                    ((currentStep === 1 && !selectedUserId) || (currentStep === 2 && !selectedType)) && { opacity: 0.5 },
                  ]}
                  disabled={(currentStep === 1 && !selectedUserId) || (currentStep === 2 && !selectedType)}
                >
                  <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>
                    Далее
                  </Text>
                  <Ionicons name="arrow-forward" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={isSubmitting || !isValid}
                  style={[
                    styles.navButton,
                    styles.createButton,
                    isKeyboardVisible && styles.navButtonCompact,
                    { backgroundColor: theme.primary },
                    !isValid && { opacity: 0.5 },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={isKeyboardVisible ? 18 : 20} color="#FFFFFF" />
                      <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>
                        Создать
                      </Text>
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

          {/* User Picker */}
          <UserSelectorModal
            visible={showUserPicker}
            onClose={() => setShowUserPicker(false)}
            selectedUserIds={selectedUserId ? [selectedUserId] : []}
            onSelectionChange={(userIds, selectedUsers) => {
              if (userIds.length > 0) {
                setSelectedUserId(userIds[0]);
                setSelectedUserName(selectedUsers?.[0]?.name || null);
              }
              setShowUserPicker(false);
            }}
            multiSelect={false}
            title="Выберите сотрудника"
            mode="radio"
            includeCurrentUser={true}
          />
        </View>
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
    width: 500,
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
  keyboardAvoidingView: {
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
    gap: 12,
  },
  selectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  selectorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorInfo: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectorDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  typeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
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
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 80,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
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
