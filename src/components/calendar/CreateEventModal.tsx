import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { CreateEventDto } from '../../types/calendar.types';
import * as calendarApi from '@api/calendar.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import UserPicker from '@components/task/UserPicker';

// Conditional import for DateTimePicker (only for native platforms)
let DateTimePicker: any = null;
if (Platform.OS !== 'web') {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
}

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

const EVENT_COLORS = [
  { value: '#EF4444', label: 'Красный' },
  { value: '#F59E0B', label: 'Оранжевый' },
  { value: '#10B981', label: 'Зелёный' },
  { value: '#3B82F6', label: 'Синий' },
  { value: '#8B5CF6', label: 'Фиолетовый' },
  { value: '#EC4899', label: 'Розовый' },
];

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  visible,
  onClose,
  onEventCreated,
}) => {
  console.log('📅 CreateEventModal render - visible:', visible);
  const { theme } = useTheme();
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Set default time to 1 hour from now to avoid "time in the past" error
  // Use a function to get fresh date each time
  const getDefaultStartDate = () => new Date(Date.now() + 60 * 60 * 1000);
  const getDefaultEndDate = () => new Date(Date.now() + 2 * 60 * 60 * 1000);
  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(getDefaultEndDate());
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Check if user can add participants
  const canAddParticipants = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'department_head');

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название события');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Ошибка', 'Время окончания должно быть позже времени начала');
      return;
    }

    try {
      setIsLoading(true);

      const eventData: CreateEventDto = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        all_day: allDay,
        location: location.trim() || undefined,
        type: 'meeting',
        color,
        is_private: isPrivate,
        participant_ids: selectedParticipants.length > 0 ? selectedParticipants : undefined,
      };

      await calendarApi.createEvent(eventData);
      Alert.alert('Успех', 'Событие создано');
      onEventCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create event:', error);

      // Handle specific error cases
      let errorMessage = 'Не удалось создать событие';

      if (error.details?.error) {
        errorMessage = error.details.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Ошибка', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setStartDate(getDefaultStartDate());
    setEndDate(getDefaultEndDate());
    setAllDay(false);
    setLocation('');
    setColor('#3B82F6');
    setIsPrivate(false);
    setSelectedParticipants([]);
    onClose();
  };

  if (!visible) {
    console.log('📅 CreateEventModal not visible, returning null');
    return null;
  }

  console.log('📅 CreateEventModal rendering modal...');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      transparent={false}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Новое событие</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isLoading}
            style={styles.saveButton}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Text style={[styles.saveButtonText, { color: theme.primary }]}>Создать</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>НАЗВАНИЕ</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
              placeholder="Название события"
              placeholderTextColor={theme.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Date & Time */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>ДАТА И ВРЕМЯ</Text>

            {/* All Day Switch */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Весь день</Text>
              <Switch
                value={allDay}
                onValueChange={setAllDay}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {Platform.OS === 'web' ? (
              // Web version - use HTML input
              <>
                {/* Start Date & Time */}
                <View style={styles.webDateInputContainer}>
                  <Text style={[styles.webDateLabel, { color: theme.text }]}>Начало</Text>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={allDay ? format(startDate, 'yyyy-MM-dd') : format(startDate, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setStartDate(newDate);
                      }
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.input,
                      color: theme.text,
                      fontSize: 16,
                      width: '100%',
                    }}
                  />
                </View>

                {/* End Date & Time */}
                <View style={styles.webDateInputContainer}>
                  <Text style={[styles.webDateLabel, { color: theme.text }]}>Окончание</Text>
                  <input
                    type={allDay ? 'date' : 'datetime-local'}
                    value={allDay ? format(endDate, 'yyyy-MM-dd') : format(endDate, "yyyy-MM-dd'T'HH:mm")}
                    onChange={(e) => {
                      const newDate = new Date(e.target.value);
                      if (!isNaN(newDate.getTime())) {
                        setEndDate(newDate);
                      }
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      border: `1px solid ${theme.border}`,
                      backgroundColor: theme.input,
                      color: theme.text,
                      fontSize: 16,
                      width: '100%',
                    }}
                  />
                </View>
              </>
            ) : (
              // Native version - use TouchableOpacity
              <>
                {/* Start Date */}
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    {format(startDate, 'd MMMM yyyy', { locale: ru })}
                  </Text>
                </TouchableOpacity>

                {!allDay && (
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.dateButtonText, { color: theme.text }]}>
                      {format(startDate, 'HH:mm')}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.toLabel, { color: theme.textTertiary }]}>до</Text>

                {/* End Date */}
                <TouchableOpacity
                  style={[styles.dateButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                  <Text style={[styles.dateButtonText, { color: theme.text }]}>
                    {format(endDate, 'd MMMM yyyy', { locale: ru })}
                  </Text>
                </TouchableOpacity>

                {!allDay && (
                  <TouchableOpacity
                    style={[styles.dateButton, { backgroundColor: theme.input, borderColor: theme.border }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.dateButtonText, { color: theme.text }]}>
                      {format(endDate, 'HH:mm')}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Location */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>МЕСТО</Text>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
              placeholder="Добавить место"
              placeholderTextColor={theme.textTertiary}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          {/* Description */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>ОПИСАНИЕ</Text>
            <TextInput
              style={[styles.textArea, { color: theme.text, backgroundColor: theme.input, borderColor: theme.border }]}
              placeholder="Добавить описание"
              placeholderTextColor={theme.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Color */}
          <View style={[styles.section, { borderBottomColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>ЦВЕТ</Text>
            <View style={styles.colorPicker}>
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

          {/* Participants - only for admins/department heads */}
          {canAddParticipants && (
            <View style={[styles.section, { borderBottomColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>УЧАСТНИКИ</Text>
              <UserPicker
                selectedUserIds={selectedParticipants}
                onSelectionChange={setSelectedParticipants}
                multiSelect={true}
              />
            </View>
          )}

          {/* Privacy */}
          <View style={[styles.section, { borderBottomColor: 'transparent' }]}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>Приватное событие</Text>
                <Text style={[styles.rowSubtitle, { color: theme.textTertiary }]}>
                  Только вы можете видеть детали
                </Text>
              </View>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </ScrollView>

        {/* Date/Time Pickers - Only on native platforms */}
        {Platform.OS !== 'web' && DateTimePicker && (
          <>
            {showStartDatePicker && (
              <DateTimePicker
                value={startDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowStartDatePicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndDatePicker && (
              <DateTimePicker
                value={endDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowEndDatePicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
            {showStartTimePicker && (
              <DateTimePicker
                value={startDate}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowStartTimePicker(false);
                  if (date) setStartDate(date);
                }}
              />
            )}
            {showEndTimePicker && (
              <DateTimePicker
                value={endDate}
                mode="time"
                display="default"
                onChange={(event, date) => {
                  setShowEndTimePicker(false);
                  if (date) setEndDate(date);
                }}
              />
            )}
          </>
        )}
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  rowSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  toLabel: {
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 4,
  },
  colorPicker: {
    flexDirection: 'row',
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
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  webDateInputContainer: {
    marginBottom: 12,
  },
  webDateLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
});

export default CreateEventModal;
