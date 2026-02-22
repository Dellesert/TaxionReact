/**
 * Create Event Modal
 * Модальное окно для создания события с пошаговым интерфейсом
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
  Switch,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useAnimationType } from '@shared/hooks/useAnimationType';
import { useNotification } from '@shared/contexts/NotificationContext';
import { useAuthStore } from '@shared/store/authStore';
import { CreateEventDto, Event, EventType } from '../../types/calendar.types';
import * as calendarApi from '../../api/calendar.api';
import * as userApi from '@api/user.api';
import UserSelector from '@shared/components/common/UserSelector';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  editEvent?: Event | null;
}

type Step = 1 | 2 | 3 | 4;
type AudienceType = 'all' | 'department' | 'selected_users';

const EVENT_COLORS = [
  { value: '#EF4444', label: 'Красный' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#10B981', label: 'Зелёный' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
];

const EVENT_TYPES = [
  { value: 'personal' as EventType, label: 'Личные события', icon: 'person-outline' },
  { value: 'meeting' as EventType, label: 'Встречи/совещания', icon: 'people-outline' },
  { value: 'deadline' as EventType, label: 'Дедлайны/крайние сроки', icon: 'flag-outline' },
];

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
  onEventCreated,
  editEvent = null,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const isElectronApp =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !!(window as any).electron;
  const isDesktopElectron = isDesktop && isElectronApp;
  const animationType = useAnimationType(isDesktop ? 'fade' : 'slide');
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const slideAnim = useRef(new Animated.Value(0)).current;

  const isEditMode = !!editEvent;
  const canAddParticipants = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'department_head');

  const [hoveredWindowBtn, setHoveredWindowBtn] = useState<
    'minimize' | 'maximize' | 'close' | null
  >(null);

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Step 1: Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Time and location
  const getDefaultStartDate = () => new Date(Date.now() + 60 * 60 * 1000);
  const getDefaultEndDate = () => new Date(Date.now() + 2 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');

  // Step 3: Event type and color
  const [eventType, setEventType] = useState<EventType>('meeting');
  const [color, setColor] = useState('#3B82F6');

  // Step 4: Participants (only for non-personal events)
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(false);
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

  // Load event data when editing
  useEffect(() => {
    if (editEvent && visible) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || '');
      setStartDate(new Date(editEvent.start_time));
      setEndDate(new Date(editEvent.end_time));
      setAllDay(editEvent.all_day);
      setLocation(editEvent.location || '');
      setEventType(editEvent.type);
      setColor(editEvent.color);

      if (editEvent.participants && editEvent.participants.length > 0) {
        const participantIds = editEvent.participants.map(p => p.user_id);
        setSelectedParticipants(participantIds);
        setAudienceType('selected_users');
      }
    } else if (!visible) {
      // Reset when closing
      handleReset();
    }
  }, [editEvent, visible]);

  // Animation when step changes (skip on desktop Electron edit mode)
  useEffect(() => {
    if (isDesktopElectron && isEditMode) return;
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, [currentStep, isDesktopElectron, isEditMode]);

  const handleReset = () => {
    setCurrentStep(1);
    setTitle('');
    setDescription('');
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setAllDay(false);
    setLocation('');
    setEventType('meeting');
    setColor('#3B82F6');
    setAudienceType('all');
    setSelectedParticipants([]);
    slideAnim.setValue(0);
  };

  const goToNextStep = () => {
    if (currentStep === 1 && !title.trim()) {
      showError('Введите название события');
      return;
    }

    if (currentStep === 2) {
      if (endDate <= startDate) {
        showError('Время окончания должно быть позже времени начала');
        return;
      }
    }

    if (currentStep === 4) {
      if (audienceType === 'department' && !user?.department_id) {
        showError('Вы не принадлежите ни к одному отделу');
        return;
      }
      if (audienceType === 'selected_users' && selectedParticipants.length === 0) {
        showError('Выберите хотя бы одного участника');
        return;
      }
    }

    // Skip step 4 (participants) for personal events
    const maxStep = shouldShowParticipantsStep ? 4 : 3;
    if (currentStep < maxStep) {
      setCurrentStep((currentStep + 1) as Step);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Введите название события');
      return;
    }

    if (endDate <= startDate) {
      showError('Время окончания должно быть позже времени начала');
      return;
    }

    try {
      setIsLoading(true);

      // Determine participant_ids based on audience type (only if not personal event)
      let participantIds: number[] | undefined = undefined;
      const isPersonalEvent = eventType === 'personal';

      if (!isPersonalEvent) {
        if (audienceType === 'selected_users') {
          participantIds = selectedParticipants;
        } else if (audienceType === 'department') {
          if (user?.department_id) {
            try {
              const usersResponse = await userApi.getUsers(
                { department_id: user.department_id },
                { limit: 1000 }
              );
              participantIds = usersResponse.data?.map(u => u.id) || [];
            } catch (error) {
              console.error('Failed to fetch department users:', error);
              showError('Не удалось загрузить пользователей отдела');
              return;
            }
          }
        } else if (audienceType === 'all') {
          try {
            const usersResponse = await userApi.getUsers({}, { limit: 1000 });
            participantIds = usersResponse.data?.map(u => u.id) || [];
          } catch (error) {
            console.error('Failed to fetch all users:', error);
            showError('Не удалось загрузить список пользователей');
            return;
          }
        }
      }

      const eventData: CreateEventDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        all_day: allDay,
        location: location.trim() || undefined,
        type: eventType,
        color,
        is_private: isPersonalEvent,
        participant_ids: participantIds,
      };

      if (isEditMode && editEvent) {
        const { participant_ids, ...updateData } = eventData;
        await calendarApi.updateEvent(editEvent.id, updateData);

        if (participantIds && participantIds.length > 0) {
          try {
            const currentParticipantIds = editEvent.participants?.map(p => p.user_id) || [];
            const toRemove = currentParticipantIds.filter(id => !participantIds.includes(id));
            const toAdd = participantIds.filter(id => !currentParticipantIds.includes(id));

            for (const userId of toRemove) {
              await calendarApi.removeEventParticipant(editEvent.id, userId);
            }

            if (toAdd.length > 0) {
              await calendarApi.addEventParticipants(editEvent.id, { user_ids: toAdd });
            }
          } catch (error) {
            console.error('Failed to update participants:', error);
          }
        }
      } else {
        await calendarApi.createEvent(eventData);
      }

      showSuccess(isEditMode ? 'Событие успешно обновлено' : 'Событие успешно создано');
      onEventCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create event:', error);
      let errorMessage = isEditMode ? 'Не удалось обновить событие' : 'Не удалось создать событие';

      if (error.details?.error) {
        errorMessage = error.details.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleDateChange = (type: 'start' | 'end') => (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      if (type === 'start') setShowStartDatePicker(false);
      else setShowEndDatePicker(false);
    }
    if (selectedDate) {
      if (type === 'start') setStartDate(selectedDate);
      else setEndDate(selectedDate);
    }
  };

  // Check if participants step should be shown (not personal event)
  const shouldShowParticipantsStep = eventType !== 'personal';

  // Calculate actual step number for display
  const getDisplayStep = (step: Step): number => {
    if (!shouldShowParticipantsStep && step === 4) {
      return 3; // When skipping participants, step 4 becomes step 3
    }
    return step;
  };

  const getActualTotalSteps = () => shouldShowParticipantsStep ? 4 : 3;

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Основная информация';
      case 2: return 'Время и место';
      case 3: return 'Тип события';
      case 4: return 'Участники';
      default: return '';
    }
  };

  // ===== DESKTOP ELECTRON (edit mode only) =====
  if (isDesktopElectron && isEditMode) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
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
                Редактирование события
              </Text>
            </View>

            {/* Save button */}
            <View
              style={[styles.desktopTitleBarSaveButton, { backgroundColor: theme.primary }]}
              // @ts-ignore
              onClick={isLoading || !title.trim() ? undefined : handleCreate}
              onMouseEnter={(e: any) => {
                if (e.currentTarget?.style && !isLoading && title.trim()) e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e: any) => {
                if (e.currentTarget?.style) e.currentTarget.style.opacity = '1';
              }}
            >
              {isLoading ? (
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
                onClick={() => (window as any).electron?.minimize?.()}
                onMouseEnter={() => setHoveredWindowBtn('minimize')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="remove" size={14} color={theme.text} />
              </View>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'maximize' && { backgroundColor: theme.border }]}
                // @ts-ignore
                onClick={() => (window as any).electron?.maximize?.()}
                onMouseEnter={() => setHoveredWindowBtn('maximize')}
                onMouseLeave={() => setHoveredWindowBtn(null)}
              >
                <Ionicons name="square-outline" size={12} color={theme.text} />
              </View>
              <View
                style={[styles.desktopWindowControlButton, hoveredWindowBtn === 'close' && { backgroundColor: '#E81123' }]}
                // @ts-ignore
                onClick={() => (window as any).electron?.close?.()}
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
              {/* === LEFT COLUMN: основная информация + тип === */}
              <View style={styles.desktopColumn}>
                {/* Section: Basic Info */}
                <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Основная информация</Text>

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Например: Планерка команды"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={title}
                      onChangeText={setTitle}
                      maxLength={200}
                    />
                  </View>

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Описание (необязательно)</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Опишите детали события..."
                      placeholderTextColor={theme.inputPlaceholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                      {description.length}/500
                    </Text>
                  </View>
                </View>

                {/* Section: Event Type & Color */}
                <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Тип и цвет</Text>

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Тип события *</Text>
                    <View style={styles.eventTypeRow}>
                      {EVENT_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.eventTypeCard,
                            { backgroundColor: theme.background, borderColor: theme.border },
                            eventType === type.value && {
                              backgroundColor: theme.primary + '15',
                              borderColor: theme.primary,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => setEventType(type.value)}
                        >
                          <Ionicons
                            name={type.icon as any}
                            size={24}
                            color={eventType === type.value ? theme.primary : theme.textSecondary}
                          />
                          <Text style={[
                            styles.eventTypeLabel,
                            { color: theme.text },
                            eventType === type.value && { color: theme.primary, fontWeight: '600' }
                          ]}>
                            {type.label}
                          </Text>
                          {eventType === type.value && (
                            <View style={[styles.checkmarkBadge, { backgroundColor: theme.primary }]}>
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {eventType === 'personal' && (
                    <View style={[styles.infoSection, { backgroundColor: theme.background }]}>
                      <Ionicons name="information-circle" size={20} color={theme.primary} />
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Личные события видны только вам и не имеют участников
                      </Text>
                    </View>
                  )}

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Цвет</Text>
                    <View style={styles.colorRow}>
                      {EVENT_COLORS.map((c) => (
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
                </View>
              </View>

              {/* === RIGHT COLUMN: время/место + участники === */}
              <View style={styles.desktopColumn}>
                {/* Section: Time & Location */}
                <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Время и место</Text>

                  <View style={styles.switchRow}>
                    <Text style={[styles.switchLabel, { color: theme.text }]}>Весь день</Text>
                    <Switch
                      value={allDay}
                      onValueChange={setAllDay}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Начало *</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(startDate, allDay ? 'dd MMMM yyyy' : 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Окончание *</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(endDate, allDay ? 'dd MMMM yyyy' : 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Место (необязательно)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                      placeholder="Например: Конференц-зал"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={location}
                      onChangeText={setLocation}
                      maxLength={200}
                    />
                  </View>
                </View>

                {/* Section: Participants (only for non-personal events) */}
                {shouldShowParticipantsStep && (
                  <View style={[styles.desktopSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Text style={[styles.desktopSectionTitle, { color: theme.text }]}>Участники</Text>

                    {canAddParticipants && (
                      <>
                        <View>
                          <Text style={[styles.label, { color: theme.textSecondary }]}>Аудитория</Text>
                          <View style={styles.audienceRow}>
                            <TouchableOpacity
                              style={[
                                styles.audienceChip,
                                { backgroundColor: theme.background, borderColor: theme.border },
                                audienceType === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary },
                              ]}
                              onPress={() => setAudienceType('all')}
                            >
                              <Text style={[styles.audienceChipText, { color: theme.text }, audienceType === 'all' && { color: '#FFFFFF' }]}>
                                Все сотрудники
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.audienceChip,
                                { backgroundColor: theme.background, borderColor: theme.border },
                                audienceType === 'department' && { backgroundColor: theme.primary, borderColor: theme.primary },
                              ]}
                              onPress={() => setAudienceType('department')}
                            >
                              <Text style={[styles.audienceChipText, { color: theme.text }, audienceType === 'department' && { color: '#FFFFFF' }]}>
                                Мой отдел
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.audienceChip,
                                { backgroundColor: theme.background, borderColor: theme.border },
                                audienceType === 'selected_users' && { backgroundColor: theme.primary, borderColor: theme.primary },
                              ]}
                              onPress={() => setAudienceType('selected_users')}
                            >
                              <Text style={[styles.audienceChipText, { color: theme.text }, audienceType === 'selected_users' && { color: '#FFFFFF' }]}>
                                Выбрать
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        {audienceType === 'selected_users' && (
                          <View>
                            <Text style={[styles.label, { color: theme.textSecondary }]}>Участники *</Text>
                            <UserSelector
                              selectedUserIds={selectedParticipants}
                              onSelectionChange={setSelectedParticipants}
                              multiSelect={true}
                              placeholder="Выберите участников"
                              modalTitle="Выбрать участников"
                            />
                          </View>
                        )}
                      </>
                    )}

                    {!canAddParticipants && (
                      <View style={[styles.infoSection, { backgroundColor: theme.background }]}>
                        <Ionicons name="information-circle" size={20} color={theme.primary} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                          Только администраторы и руководители могут добавлять участников к событиям
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DatePickerModal
              visible={showStartDatePicker}
              value={startDate}
              onChange={handleDateChange('start')}
              onClose={() => setShowStartDatePicker(false)}
              minimumDate={new Date()}
              mode={allDay ? 'date' : 'datetime'}
            />
          )}

          {showEndDatePicker && (
            <DatePickerModal
              visible={showEndDatePicker}
              value={endDate}
              onChange={handleDateChange('end')}
              onClose={() => setShowEndDatePicker(false)}
              minimumDate={startDate}
              mode={allDay ? 'date' : 'datetime'}
            />
          )}
        </View>
      </Modal>
    );
  }

  // ===== MOBILE / CREATE MODE =====
  return (
    <Modal
      visible={visible}
      animationType={animationType}
      transparent={isDesktop}
      onRequestClose={handleClose}
      presentationStyle={isDesktop ? "overFullScreen" : "fullScreen"}
      statusBarTranslucent
    >
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
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {isEditMode ? 'Редактирование события' : 'Создание события'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Шаг {getDisplayStep(currentStep)} из {getActualTotalSteps()}
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
              {Array.from({ length: getActualTotalSteps() }, (_, i) => i + 1).map((step) => (
                <View
                  key={step}
                  style={[
                    styles.progressStep,
                    { backgroundColor: theme.border },
                    getDisplayStep(currentStep) >= step && { backgroundColor: theme.primary },
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
          {/* Content */}
          <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
            <ScrollView
              style={[styles.content, { backgroundColor: theme.background }]}
              contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 10 : 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.stepContainer, isKeyboardVisible && styles.stepContainerCompact]}>
                {!isKeyboardVisible && (
                  <Text style={[styles.stepTitle, { color: theme.text }]}>{getStepTitle()}</Text>
                )}

              {/* Step 1: Basic Info */}
              {currentStep === 1 && (
                <View style={styles.stepContent}>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    Укажите название и описание события
                  </Text>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Например: Планерка команды"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={title}
                      onChangeText={setTitle}
                      maxLength={200}
                      autoFocus
                    />
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Описание (необязательно)</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Опишите детали события..."
                      placeholderTextColor={theme.inputPlaceholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      maxLength={500}
                    />
                    <Text style={[styles.charCount, { color: theme.textTertiary }]}>
                      {description.length}/500
                    </Text>
                  </View>
                </View>
              )}

              {/* Step 2: Time and Location */}
              {currentStep === 2 && (
                <View style={styles.stepContent}>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    Выберите время и место проведения
                  </Text>

                  <View style={styles.section}>
                    <View style={styles.switchRow}>
                      <Text style={[styles.switchLabel, { color: theme.text }]}>Весь день</Text>
                      <Switch
                        value={allDay}
                        onValueChange={setAllDay}
                        trackColor={{ false: theme.border, true: theme.primary }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Начало *</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(startDate, allDay ? 'dd MMMM yyyy' : 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Окончание *</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(endDate, allDay ? 'dd MMMM yyyy' : 'dd MMMM yyyy, HH:mm', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Место (необязательно)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Например: Конференц-зал"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={location}
                      onChangeText={setLocation}
                      maxLength={200}
                    />
                  </View>
                </View>
              )}

              {/* Step 3: Event Type */}
              {currentStep === 3 && (
                <View style={styles.stepContent}>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    Выберите тип и цвет для события
                  </Text>

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Тип события *</Text>
                    <View style={styles.eventTypeRow}>
                      {EVENT_TYPES.map((type) => (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.eventTypeCard,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            eventType === type.value && {
                              backgroundColor: theme.primary + '15',
                              borderColor: theme.primary,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => setEventType(type.value)}
                        >
                          <Ionicons
                            name={type.icon as any}
                            size={24}
                            color={eventType === type.value ? theme.primary : theme.textSecondary}
                          />
                          <Text style={[
                            styles.eventTypeLabel,
                            { color: theme.text },
                            eventType === type.value && { color: theme.primary, fontWeight: '600' }
                          ]}>
                            {type.label}
                          </Text>
                          {eventType === type.value && (
                            <View style={[styles.checkmarkBadge, { backgroundColor: theme.primary }]}>
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Info about personal events */}
                  {eventType === 'personal' && (
                    <View style={[styles.infoSection, { backgroundColor: theme.backgroundSecondary }]}>
                      <Ionicons name="information-circle" size={20} color={theme.primary} />
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Личные события видны только вам и не имеют участников
                      </Text>
                    </View>
                  )}

                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Цвет</Text>
                    <View style={styles.colorRow}>
                      {EVENT_COLORS.map((c) => (
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
                </View>
              )}

              {/* Step 4: Participants (only for non-personal events) */}
              {currentStep === 4 && shouldShowParticipantsStep && (
                <View style={styles.stepContent}>
                  <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>
                    Выберите участников события
                  </Text>

                  {/* Audience selection - only shown if user can add participants */}
                  {canAddParticipants && (
                    <>
                      <View style={styles.section}>
                        <Text style={[styles.label, { color: theme.textSecondary }]}>Аудитория</Text>
                        <View style={styles.audienceRow}>
                          <TouchableOpacity
                            style={[
                              styles.audienceChip,
                              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                              audienceType === 'all' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            ]}
                            onPress={() => setAudienceType('all')}
                          >
                            <Text style={[styles.audienceChipText, { color: theme.text }, audienceType === 'all' && { color: '#FFFFFF' }]}>
                              Все сотрудники
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.audienceChip,
                              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                              audienceType === 'department' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            ]}
                            onPress={() => setAudienceType('department')}
                          >
                            <Text style={[styles.audienceChipText, { color: theme.text }, audienceType === 'department' && { color: '#FFFFFF' }]}>
                              Мой отдел
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[
                              styles.audienceChip,
                              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                              audienceType === 'selected_users' && { backgroundColor: theme.primary, borderColor: theme.primary },
                            ]}
                            onPress={() => setAudienceType('selected_users')}
                          >
                            <Text style={[styles.audienceChipText, { color: theme.text }, audienceType === 'selected_users' && { color: '#FFFFFF' }]}>
                              Выбрать
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {audienceType === 'selected_users' && (
                        <View style={styles.section}>
                          <Text style={[styles.label, { color: theme.textSecondary }]}>Участники *</Text>
                          <UserSelector
                            selectedUserIds={selectedParticipants}
                            onSelectionChange={setSelectedParticipants}
                            multiSelect={true}
                            placeholder="Выберите участников"
                            modalTitle="Выбрать участников"
                          />
                        </View>
                      )}
                    </>
                  )}

                  {/* Info message if user can't add participants */}
                  {!canAddParticipants && (
                    <View style={[styles.infoSection, { backgroundColor: theme.backgroundSecondary }]}>
                      <Ionicons name="information-circle" size={20} color={theme.primary} />
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        Только администраторы и руководители могут добавлять участников к событиям
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

            {currentStep < getActualTotalSteps() ? (
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
                onPress={handleCreate}
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
                    <Text style={[styles.navButtonText, isKeyboardVisible && styles.navButtonTextCompact, { color: '#FFFFFF' }]}>
                      {isEditMode ? 'Сохранить' : 'Создать'}
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
            onChange={handleDateChange('start')}
            onClose={() => setShowStartDatePicker(false)}
            minimumDate={new Date()}
            mode={allDay ? 'date' : 'datetime'}
          />
        )}

        {showEndDatePicker && (
          <DatePickerModal
            visible={showEndDatePicker}
            value={endDate}
            onChange={handleDateChange('end')}
            onClose={() => setShowEndDatePicker(false)}
            minimumDate={startDate}
            mode={allDay ? 'date' : 'datetime'}
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
  },
  stepContainer: {
    padding: 20,
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
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 15,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 120,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 13,
    textAlign: 'right',
    marginTop: 4,
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  helperText: {
    fontSize: 13,
    marginTop: 8,
  },
  audienceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 2,
  },
  audienceChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  eventTypeRow: {
    gap: 12,
  },
  eventTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    position: 'relative',
  },
  eventTypeLabel: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  checkmarkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  // Compact styles for keyboard visible state
  keyboardAvoidingView: {
    flex: 1,
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
  stepContainerCompact: {
    padding: 12,
    paddingTop: 8,
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

export default CreateEventModal;
