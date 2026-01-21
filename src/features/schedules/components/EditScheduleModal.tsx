/**
 * Edit Schedule Modal
 * Модальное окно для редактирования основных данных графика
 */

import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { useIsWideScreen } from '@shared/hooks/useIsWideScreen';
import { useNotification } from '@shared/contexts/NotificationContext';
import DatePickerModal from '@shared/components/common/DatePickerModal';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Schedule,
  UpdateScheduleRequest,
  ScheduleType,
  ScheduleVisibility,
} from '../types/schedule.types';

interface EditScheduleModalProps {
  visible: boolean;
  schedule: Schedule | null;
  onClose: () => void;
  onSave: (data: UpdateScheduleRequest) => Promise<void>;
}

const SCHEDULE_COLORS = [
  { value: '#EF4444', label: 'Красный' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#10B981', label: 'Зелёный' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
];

const SCHEDULE_TYPES: { value: ScheduleType; label: string; icon: string }[] = [
  { value: 'work', label: 'Рабочий график', icon: 'briefcase-outline' },
  { value: 'paid_services', label: 'Платные услуги', icon: 'cash-outline' },
  { value: 'on_duty', label: 'Дежурства', icon: 'medical-outline' },
  { value: 'shift', label: 'Сменный график', icon: 'swap-horizontal-outline' },
  { value: 'custom', label: 'Другое', icon: 'ellipsis-horizontal-outline' },
];

const VISIBILITY_OPTIONS: { value: ScheduleVisibility; label: string; icon: string }[] = [
  { value: 'creator_only', label: 'Только создатель', icon: 'lock-closed-outline' },
  { value: 'management', label: 'Руководство', icon: 'people-outline' },
  { value: 'participants', label: 'Участники', icon: 'globe-outline' },
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

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ScheduleType>('work');
  const [visibility, setVisibility] = useState<ScheduleVisibility>('creator_only');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [color, setColor] = useState('#3B82F6');
  const [morningStart, setMorningStart] = useState('10:00');
  const [morningEnd, setMorningEnd] = useState('14:00');
  const [eveningStart, setEveningStart] = useState('14:00');
  const [eveningEnd, setEveningEnd] = useState('18:00');

  const [isLoading, setIsLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Load schedule data when modal opens
  useEffect(() => {
    if (schedule && visible) {
      setTitle(schedule.title);
      setDescription(schedule.description || '');
      setType(schedule.type);
      setVisibility(schedule.visibility);
      setStartDate(parseISO(schedule.start_date));
      setEndDate(parseISO(schedule.end_date));
      setColor(schedule.color || '#3B82F6');
      setMorningStart(schedule.morning_start || '10:00');
      setMorningEnd(schedule.morning_end || '14:00');
      setEveningStart(schedule.evening_start || '14:00');
      setEveningEnd(schedule.evening_end || '18:00');
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
        type,
        visibility,
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
      onClose();
    } catch (error: any) {
      console.error('Failed to update schedule:', error);
      showError(error.message || 'Не удалось обновить график');
    } finally {
      setIsLoading(false);
    }
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

  const formatTimeInput = (value: string): string => {
    // Remove non-numeric characters except ':'
    const cleaned = value.replace(/[^\d:]/g, '');

    // Auto-format as HH:MM
    if (cleaned.length === 2 && !cleaned.includes(':')) {
      return cleaned + ':';
    }

    // Limit to HH:MM format
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

  if (!schedule) return null;

  return (
    <Modal
      visible={visible}
      animationType={isDesktop ? 'fade' : 'slide'}
      transparent={isDesktop}
      onRequestClose={onClose}
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

          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.textSecondary} />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Редактирование графика
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={styles.headerButton}
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
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              style={[styles.content, { backgroundColor: theme.background }]}
              contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 10 : 100 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                {/* Title */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Название *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Название графика"
                    placeholderTextColor={theme.inputPlaceholder}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={255}
                  />
                </View>

                {/* Description */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Описание</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                    placeholder="Описание графика..."
                    placeholderTextColor={theme.inputPlaceholder}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                </View>

                {/* Type */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Тип графика</Text>
                  <View style={styles.typeRow}>
                    {SCHEDULE_TYPES.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          type === item.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setType(item.value)}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={type === item.value ? '#FFFFFF' : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            { color: theme.text },
                            type === item.value && { color: '#FFFFFF' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Visibility */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Видимость</Text>
                  <View style={styles.typeRow}>
                    {VISIBILITY_OPTIONS.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.typeChip,
                          { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
                          visibility === item.value && { backgroundColor: theme.primary, borderColor: theme.primary },
                        ]}
                        onPress={() => setVisibility(item.value)}
                      >
                        <Ionicons
                          name={item.icon as any}
                          size={16}
                          color={visibility === item.value ? '#FFFFFF' : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.typeChipText,
                            { color: theme.text },
                            visibility === item.value && { color: '#FFFFFF' },
                          ]}
                        >
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Dates */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Период</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(startDate, 'dd.MM.yyyy', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.dateSeparator, { color: theme.textSecondary }]}>—</Text>
                    <TouchableOpacity
                      style={[styles.dateButton, { backgroundColor: theme.card, borderColor: theme.border, flex: 1 }]}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                      <Text style={[styles.dateButtonText, { color: theme.text }]}>
                        {format(endDate, 'dd.MM.yyyy', { locale: ru })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Color */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Цвет</Text>
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

                {/* Shift Times */}
                <View style={styles.section}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>Время смен</Text>

                  <View style={styles.shiftTimeRow}>
                    <Text style={[styles.shiftLabel, { color: theme.text }]}>Утренняя смена:</Text>
                    <View style={styles.timeInputGroup}>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="10:00"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={morningStart}
                        onChangeText={(text) => setMorningStart(formatTimeInput(text))}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="14:00"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={morningEnd}
                        onChangeText={(text) => setMorningEnd(formatTimeInput(text))}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                  </View>

                  <View style={styles.shiftTimeRow}>
                    <Text style={[styles.shiftLabel, { color: theme.text }]}>Вечерняя смена:</Text>
                    <View style={styles.timeInputGroup}>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="14:00"
                        placeholderTextColor={theme.inputPlaceholder}
                        value={eveningStart}
                        onChangeText={(text) => setEveningStart(formatTimeInput(text))}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                      <Text style={[styles.timeSeparator, { color: theme.textSecondary }]}>—</Text>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
                        placeholder="18:00"
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
            </ScrollView>
          </KeyboardAvoidingView>

          {/* Date Pickers */}
          {showStartDatePicker && (
            <DatePickerModal
              visible={showStartDatePicker}
              value={startDate}
              onChange={handleDateChange('start')}
              onClose={() => setShowStartDatePicker(false)}
              mode="date"
            />
          )}

          {showEndDatePicker && (
            <DatePickerModal
              visible={showEndDatePicker}
              value={endDate}
              onChange={handleDateChange('end')}
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
  modalOverlayDesktop: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
  },
  containerDesktop: {
    width: 600,
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
    minWidth: 80,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
  },
  dateSeparator: {
    fontSize: 14,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  shiftTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  shiftLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInput: {
    width: 70,
    fontSize: 14,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 14,
  },
});

export default EditScheduleModal;
