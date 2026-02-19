/**
 * Edit Schedule Entry Modal
 * Модальное окно для создания/редактирования записи в графике
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Modal,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import UserSelector from '@shared/components/common/UserSelector';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Schedule,
  ScheduleEntry,
  ScheduleTemplateEntry,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
  CreateTemplateEntryRequest,
  CreateBatchTemplateEntriesRequest,
  ShiftType,
} from '../types/schedule.types';

interface EditScheduleEntryModalProps {
  visible: boolean;
  schedule: Schedule | null;
  entry: ScheduleEntry | null; // null for creating new entry
  templateEntry?: ScheduleTemplateEntry | null; // for recurring mode
  onClose: () => void;
  onSave: (data: CreateScheduleEntryRequest | UpdateScheduleEntryRequest, entryId?: number) => Promise<void>;
  onSaveTemplateEntry?: (data: CreateTemplateEntryRequest, entryId?: number) => Promise<void>;
  onSaveBatchTemplateEntries?: (data: CreateBatchTemplateEntriesRequest) => Promise<void>;
  onDelete?: (entryId: number) => Promise<void>;
  onDeleteTemplateEntry?: (entryId: number) => Promise<void>;
}

const SHIFT_TYPES: { value: ShiftType; label: string; icon: string }[] = [
  { value: 'morning', label: 'Утро', icon: 'sunny-outline' },
  { value: 'evening', label: 'Вечер', icon: 'moon-outline' },
  { value: 'full_day', label: 'Полный день', icon: 'time-outline' },
  { value: 'custom', label: 'Особый', icon: 'options-outline' },
];

const DAYS_OF_WEEK: { value: number; label: string; shortLabel: string }[] = [
  { value: 1, label: 'Понедельник', shortLabel: 'Пн' },
  { value: 2, label: 'Вторник', shortLabel: 'Вт' },
  { value: 3, label: 'Среда', shortLabel: 'Ср' },
  { value: 4, label: 'Четверг', shortLabel: 'Чт' },
  { value: 5, label: 'Пятница', shortLabel: 'Пт' },
  { value: 6, label: 'Суббота', shortLabel: 'Сб' },
  { value: 0, label: 'Воскресенье', shortLabel: 'Вс' },
];

export const EditScheduleEntryModal: React.FC<EditScheduleEntryModalProps> = ({
  visible,
  schedule,
  entry,
  templateEntry,
  onClose,
  onSave,
  onSaveTemplateEntry,
  onSaveBatchTemplateEntries,
  onDelete,
  onDeleteTemplateEntry,
}) => {
  const { theme, isDark } = useTheme();
  const isDesktop = useIsWideScreen();
  const { showSuccess, showError } = useNotification();
  const insets = useSafeAreaInsets();

  const isRecurringMode = schedule?.mode === 'recurring';
  const isEditMode = isRecurringMode ? !!templateEntry : !!entry;

  // Form state
  const [userId, setUserId] = useState<number[]>([]);
  const [date, setDate] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // Multiple days support
  const [shiftType, setShiftType] = useState<ShiftType>('morning');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load entry data when modal opens
  useEffect(() => {
    if (visible) {
      setErrorMessage(null); // Clear error when modal opens

      if (isRecurringMode) {
        // Recurring mode - work with template entries
        if (templateEntry) {
          // Edit template entry - single day
          setUserId(templateEntry.user_id ? [templateEntry.user_id] : []);
          setSelectedDays([templateEntry.day_of_week]);
          setShiftType(templateEntry.shift_type || 'morning');
          // Extract time from string
          const startMatch = templateEntry.start_time.match(/(\d{2}:\d{2})/);
          const endMatch = templateEntry.end_time.match(/(\d{2}:\d{2})/);
          setStartTime(startMatch ? startMatch[1] : '');
          setEndTime(endMatch ? endMatch[1] : '');
          setTitle(templateEntry.title || '');
        } else {
          // Create template entry - reset form, allow multiple days
          setUserId([]);
          setSelectedDays([]); // No days selected by default
          setShiftType('morning');
          setStartTime(schedule?.morning_start || '08:00');
          setEndTime(schedule?.morning_end || '14:00');
          setTitle('');
        }
        setDescription('');
        setLocation('');
      } else {
        // Monthly mode - work with schedule entries
        if (entry) {
          // Edit mode
          setUserId([entry.user_id]);
          setDate(parseISO(entry.date));
          setShiftType(entry.shift_type);
          // Extract time from ISO string
          const startMatch = entry.start_time.match(/T?(\d{2}:\d{2})/);
          const endMatch = entry.end_time.match(/T?(\d{2}:\d{2})/);
          setStartTime(startMatch ? startMatch[1] : '');
          setEndTime(endMatch ? endMatch[1] : '');
          setTitle(entry.title || '');
          setDescription(entry.description || '');
          setLocation(entry.location || '');
        } else {
          // Create mode - reset form
          setUserId([]);
          setDate(new Date());
          setShiftType('morning');
          setStartTime(schedule?.morning_start || '10:00');
          setEndTime(schedule?.morning_end || '14:00');
          setTitle('');
          setDescription('');
          setLocation('');
        }
      }
    }
  }, [visible, entry, templateEntry, schedule, isRecurringMode]);

  // Update time when shift type changes (only in create mode or recurring mode)
  useEffect(() => {
    if ((!isEditMode || isRecurringMode) && schedule && visible) {
      switch (shiftType) {
        case 'morning':
          setStartTime(schedule.morning_start || '08:00');
          setEndTime(schedule.morning_end || '14:00');
          break;
        case 'evening':
          setStartTime(schedule.evening_start || '14:00');
          setEndTime(schedule.evening_end || '20:00');
          break;
        case 'full_day':
          setStartTime(schedule.morning_start || '08:00');
          setEndTime(schedule.evening_end || '20:00');
          break;
        case 'custom':
          // Keep current values for custom
          break;
      }
    }
  }, [shiftType, isEditMode, isRecurringMode, schedule, visible]);

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

  // Toggle day selection for recurring mode
  const toggleDaySelection = (day: number) => {
    if (isEditMode) {
      // In edit mode, only allow single day selection
      setSelectedDays([day]);
    } else {
      // In create mode, allow multiple days
      setSelectedDays((prev) =>
        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      );
    }
  };

  const handleSave = async () => {
    // For recurring mode, user is optional (applies to all if not set)
    if (!isRecurringMode && userId.length === 0) {
      showError('Выберите сотрудника');
      return;
    }

    // For recurring mode, at least one day must be selected
    if (isRecurringMode && selectedDays.length === 0) {
      showError('Выберите хотя бы один день недели');
      return;
    }

    if (!startTime || !endTime) {
      showError('Укажите время начала и окончания');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null); // Clear previous error

      if (isRecurringMode) {
        // Recurring mode - save template entry/entries
        if (isEditMode) {
          // Edit mode - single entry
          if (!onSaveTemplateEntry) {
            showError('Не настроен обработчик сохранения');
            return;
          }

          const templateData: CreateTemplateEntryRequest = {
            day_of_week: selectedDays[0],
            start_time: startTime,
            end_time: endTime,
            shift_type: shiftType,
            ...(userId.length > 0 ? { user_id: userId[0] } : {}),
            ...(title.trim() ? { title: title.trim() } : {}),
          };
          await onSaveTemplateEntry(templateData, templateEntry?.id);
          showSuccess('Запись обновлена');
        } else {
          // Create mode - can be single or multiple entries
          if (selectedDays.length === 1) {
            // Single entry
            if (!onSaveTemplateEntry) {
              showError('Не настроен обработчик сохранения');
              return;
            }

            const templateData: CreateTemplateEntryRequest = {
              day_of_week: selectedDays[0],
              start_time: startTime,
              end_time: endTime,
              shift_type: shiftType,
              ...(userId.length > 0 ? { user_id: userId[0] } : {}),
              ...(title.trim() ? { title: title.trim() } : {}),
            };
            await onSaveTemplateEntry(templateData);
            showSuccess('Запись добавлена');
          } else {
            // Multiple entries - use batch API
            if (!onSaveBatchTemplateEntries) {
              showError('Не настроен обработчик сохранения');
              return;
            }
            const entries: CreateTemplateEntryRequest[] = selectedDays.map((day) => ({
              day_of_week: day,
              start_time: startTime,
              end_time: endTime,
              shift_type: shiftType,
              ...(userId.length > 0 ? { user_id: userId[0] } : {}),
              ...(title.trim() ? { title: title.trim() } : {}),
            }));
            await onSaveBatchTemplateEntries({ entries });
            showSuccess(`Добавлено ${selectedDays.length} записей`);
          }
        }
      } else if (isEditMode && entry) {
        // Update existing entry
        const updateData: UpdateScheduleEntryRequest = {
          // Include user_id if it changed
          ...(userId[0] !== entry.user_id ? { user_id: userId[0] } : {}),
          shift_type: shiftType,
          start_time: startTime || undefined,
          end_time: endTime || undefined,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          location: location.trim() || undefined,
        };
        await onSave(updateData, entry.id);
        showSuccess('Запись обновлена');
      } else {
        // Create new entry - format date as ISO string with time at midnight
        const dateStr = format(date, 'yyyy-MM-dd');
        const createData: CreateScheduleEntryRequest = {
          user_id: userId[0],
          date: `${dateStr}T00:00:00Z`,
          shift_type: shiftType,
          // Always send start_time and end_time for custom shifts
          ...(shiftType === 'custom' && startTime ? { start_time: startTime } : {}),
          ...(shiftType === 'custom' && endTime ? { end_time: endTime } : {}),
          ...(title.trim() ? { title: title.trim() } : {}),
          ...(description.trim() ? { description: description.trim() } : {}),
          ...(location.trim() ? { location: location.trim() } : {}),
        };
        await onSave(createData);
        showSuccess('Запись добавлена');
      }

      onClose();
    } catch (error: any) {
      console.error('Failed to save entry:', error);
      // Extract detailed error message from API error
      const extractedMessage =
        error?.details?.details || // Backend specific error reason
        error?.details?.error ||
        error?.details ||
        error?.message ||
        'Не удалось сохранить запись';
      // Show error inside modal instead of toast (toast is hidden behind modal)
      setErrorMessage(typeof extractedMessage === 'string' ? extractedMessage : 'Не удалось сохранить запись');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (isRecurringMode) {
      if (!templateEntry || !onDeleteTemplateEntry) return;
      try {
        setIsDeleting(true);
        await onDeleteTemplateEntry(templateEntry.id);
        showSuccess('Запись удалена');
        onClose();
      } catch (error: any) {
        console.error('Failed to delete template entry:', error);
        showError(error.message || 'Не удалось удалить запись');
      } finally {
        setIsDeleting(false);
      }
    } else {
      if (!entry || !onDelete) return;
      try {
        setIsDeleting(true);
        await onDelete(entry.id);
        showSuccess('Запись удалена');
        onClose();
      } catch (error: any) {
        console.error('Failed to delete entry:', error);
        showError(error.message || 'Не удалось удалить запись');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours || 0, minutes || 0, 0, 0);
    return date;
  };

  const formatDateToTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  if (!schedule) return null;

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      transparent={isDesktop}
      onRequestClose={onClose}
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
          <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.card} />

          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButtonLeft}>
              <Ionicons name="close" size={24} color={theme.primary} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {isEditMode ? 'Редактирование записи' : 'Новая запись'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={styles.headerButtonRight}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={[styles.saveButton, { color: theme.primary }]}>Сохранить</Text>
              )}
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior="padding"
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={[styles.content, { backgroundColor: theme.background }]}
              contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 10 : 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                {/* Error Message */}
                {errorMessage && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                    <TouchableOpacity onPress={() => setErrorMessage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="close" size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* User Selector - optional for recurring mode */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Сотрудник
                  </Text>
                  <UserSelector
                    selectedUserIds={userId}
                    onSelectionChange={setUserId}
                    multiSelect={false}
                    placeholder={isRecurringMode ? 'Для всех сотрудников' : 'Выберите сотрудника'}
                    modalTitle="Выбрать сотрудника"
                    mode="radio"
                    includeCurrentUser={true}
                  />
                </View>

                {/* Day of Week (for recurring mode) or Date (for monthly mode) */}
                {isRecurringMode ? (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                      День недели
                    </Text>
                    <View style={styles.dayOfWeekRow}>
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = selectedDays.includes(day.value);
                        return (
                          <TouchableOpacity
                            key={day.value}
                            style={[
                              styles.dayOfWeekButton,
                              { backgroundColor: theme.card, borderColor: theme.border },
                              isSelected && {
                                backgroundColor: theme.primary,
                                borderColor: theme.primary,
                              },
                            ]}
                            onPress={() => toggleDaySelection(day.value)}
                          >
                            <Text
                              style={[
                                styles.dayOfWeekLabel,
                                { color: theme.text },
                                isSelected && { color: '#FFFFFF', fontWeight: '600' },
                              ]}
                            >
                              {day.shortLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {selectedDays.length > 0 && (
                      <Text style={[styles.selectedDayText, { color: theme.textSecondary }]}>
                        {selectedDays.length === 1
                          ? DAYS_OF_WEEK.find((d) => d.value === selectedDays[0])?.label
                          : `Выбрано дней: ${selectedDays.length}`}
                      </Text>
                    )}
                  </View>
                ) : !isEditMode ? (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Дата</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(date, 'EEEE, dd MMMM yyyy', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {/* Shift Type - for both modes */}
                {(
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Тип смены</Text>
                    <View style={styles.shiftTypeRow}>
                      {SHIFT_TYPES.map((item) => (
                        <TouchableOpacity
                          key={item.value}
                          style={[
                            styles.shiftTypeCard,
                            { backgroundColor: theme.card, borderColor: theme.border },
                            shiftType === item.value && {
                              backgroundColor: theme.primary + '15',
                              borderColor: theme.primary,
                              borderWidth: 2,
                            },
                          ]}
                          onPress={() => setShiftType(item.value)}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={24}
                            color={shiftType === item.value ? theme.primary : theme.textSecondary}
                          />
                          <Text
                            style={[
                              styles.shiftTypeLabel,
                              { color: theme.text },
                              shiftType === item.value && { color: theme.primary, fontWeight: '600' },
                            ]}
                          >
                            {item.label}
                          </Text>
                          {shiftType === item.value && (
                            <View style={[styles.checkmarkBadge, { backgroundColor: theme.primary }]}>
                              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Time - shown for custom shift type */}
                {shiftType === 'custom' && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Время *</Text>
                    <View style={styles.timeRow}>
                      <View style={styles.timeInputWrapper}>
                        <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Начало</Text>
                        <TouchableOpacity
                          style={[styles.timeInput, { backgroundColor: theme.card, borderColor: theme.border }]}
                          onPress={() => setShowStartTimePicker(true)}
                        >
                          <Text style={[styles.timeInputText, { color: startTime ? theme.text : theme.inputPlaceholder }]}>
                            {startTime || '10:00'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                      <View style={styles.timeInputWrapper}>
                        <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>Конец</Text>
                        <TouchableOpacity
                          style={[styles.timeInput, { backgroundColor: theme.card, borderColor: theme.border }]}
                          onPress={() => setShowEndTimePicker(true)}
                        >
                          <Text style={[styles.timeInputText, { color: endTime ? theme.text : theme.inputPlaceholder }]}>
                            {endTime || '18:00'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Time info (for non-custom shift, always show for reference) */}
                {shiftType !== 'custom' && startTime && endTime && (
                  <View style={[styles.infoSection, { backgroundColor: theme.backgroundSecondary }]}>
                    <Ionicons name="time-outline" size={20} color={theme.primary} />
                    <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                      Время: {startTime} — {endTime}
                    </Text>
                  </View>
                )}

                {/* Title */}
                {/* <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Название (необязательно)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Например: Дежурство"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={255}
                  />
                </View> */}

                {/* Location - only for monthly mode */}
                {/* {!isRecurringMode && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Место (необязательно)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Например: Кабинет 105"
                      placeholderTextColor={theme.inputPlaceholder}
                      value={location}
                      onChangeText={setLocation}
                      maxLength={500}
                    />
                  </View>
                )} */}

                {/* Description - only for monthly mode */}
                {/* {!isRecurringMode && (
                  <View style={styles.section}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Примечание (необязательно)</Text>
                    <TextInput
                      style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                      placeholder="Дополнительная информация..."
                      placeholderTextColor={theme.inputPlaceholder}
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                      maxLength={1000}
                    />
                  </View>
                )} */}

                {/* Delete Button (edit mode only) */}
                {isEditMode && (isRecurringMode ? onDeleteTemplateEntry : onDelete) && (
                  <TouchableOpacity
                    style={[styles.deleteButton, { borderColor: '#EF4444' }]}
                    onPress={handleDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.deleteButtonText}>Удалить запись</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Date Picker */}
          {showDatePicker && (
            <DatePickerModal
              visible={showDatePicker}
              value={date}
              onChange={handleDateChange}
              onClose={() => setShowDatePicker(false)}
              minimumDate={schedule ? parseISO(schedule.start_date) : undefined}
              maximumDate={schedule ? parseISO(schedule.end_date) : undefined}
              mode="date"
            />
          )}

          {/* Time Pickers */}
          {showStartTimePicker && (
            <DatePickerModal
              visible={showStartTimePicker}
              value={parseTimeToDate(startTime || '10:00')}
              onChange={(_event: any, selectedDate?: Date) => {
                if (selectedDate) {
                  setStartTime(formatDateToTime(selectedDate));
                }
              }}
              onClose={() => setShowStartTimePicker(false)}
              mode="time"
            />
          )}
          {showEndTimePicker && (
            <DatePickerModal
              visible={showEndTimePicker}
              value={parseTimeToDate(endTime || '18:00')}
              onChange={(_event: any, selectedDate?: Date) => {
                if (selectedDate) {
                  setEndTime(formatDateToTime(selectedDate));
                }
              }}
              onClose={() => setShowEndTimePicker(false)}
              mode="time"
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
    width: 550,
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
  headerButtonLeft: {
    minWidth: 80,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerButtonRight: {
    minWidth: 80,
    alignItems: 'flex-end',
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
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  formContainer: {
    padding: 20,
    gap: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#DC2626',
    fontWeight: '500',
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
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
    minHeight: 80,
    borderWidth: 1,
    textAlignVertical: 'top',
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
  shiftTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shiftTypeCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    position: 'relative',
  },
  shiftTypeLabel: {
    flex: 1,
    fontSize: 14,
  },
  checkmarkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -6,
    right: -6,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  timeInputWrapper: {
    flex: 1,
    gap: 4,
  },
  timeLabel: {
    fontSize: 13,
  },
  timeInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  timeInputText: {
    fontSize: 15,
    textAlign: 'center' as const,
  },
  timeSeparator: {
    fontSize: 16,
    paddingBottom: 14,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  hintText: {
    fontSize: 13,
    marginTop: 4,
  },
  dayOfWeekRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayOfWeekButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOfWeekLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedDayText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 16,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

export default EditScheduleEntryModal;
