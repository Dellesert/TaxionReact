import React, { useState, useEffect } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import { CreateEventDto, Event } from '../../types/calendar.types';
import * as calendarApi from '@api/calendar.api';
import * as userApi from '@api/user.api';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import UserSelector from '@components/common/UserSelector';
import DatePickerModal from '@components/common/DatePickerModal';

interface CreateEventModalProps {
  visible: boolean;
  onClose: () => void;
  onEventCreated: () => void;
  editEvent?: Event | null;
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
  editEvent = null,
}) => {
  console.log('📅 CreateEventModal render - visible:', visible, 'editEvent:', editEvent);
  const { theme, isDark } = useTheme();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const isEditMode = !!editEvent;

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

  // Audience selection - like in polls
  type AudienceType = 'all' | 'department' | 'selected_users';
  const [audienceType, setAudienceType] = useState<AudienceType>('all');
  const [selectedParticipants, setSelectedParticipants] = useState<number[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  // Check if user can add participants
  const canAddParticipants = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'department_head');

  // Load event data when editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || '');
      setStartDate(new Date(editEvent.start_time));
      setEndDate(new Date(editEvent.end_time));
      setAllDay(editEvent.all_day);
      setLocation(editEvent.location || '');
      setColor(editEvent.color);
      setIsPrivate(editEvent.is_private);

      // Set participants if available
      if (editEvent.participants && editEvent.participants.length > 0) {
        const participantIds = editEvent.participants.map(p => p.user_id);
        setSelectedParticipants(participantIds);
        setAudienceType('selected_users');
      }
    } else {
      // Reset to defaults when not editing
      setTitle('');
      setDescription('');
      setStartDate(getDefaultStartDate());
      setEndDate(getDefaultEndDate());
      setAllDay(false);
      setLocation('');
      setColor('#3B82F6');
      setIsPrivate(false);
      setAudienceType('all');
      setSelectedParticipants([]);
    }
  }, [editEvent, visible]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название события');
      return;
    }

    if (endDate <= startDate) {
      Alert.alert('Ошибка', 'Время окончания должно быть позже времени начала');
      return;
    }

    // Validate audience selection
    if (audienceType === 'department' && !user?.department_id) {
      Alert.alert('Ошибка', 'Вы не принадлежите ни к одному отделу');
      return;
    }

    if (audienceType === 'selected_users' && selectedParticipants.length === 0) {
      Alert.alert('Ошибка', 'Выберите хотя бы одного участника');
      return;
    }

    try {
      setIsLoading(true);

      // Determine participant_ids based on audience type
      let participantIds: number[] | undefined = undefined;

      if (audienceType === 'selected_users') {
        participantIds = selectedParticipants;
      } else if (audienceType === 'department') {
        // Fetch all users in current user's department
        if (user?.department_id) {
          try {
            const usersResponse = await userApi.getUsers(
              { department_id: user.department_id },
              { limit: 1000 }
            );
            participantIds = usersResponse.data.map(u => u.id);
            console.log('📅 Department users fetched:', participantIds.length);
          } catch (error) {
            console.error('Failed to fetch department users:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить пользователей отдела');
            return;
          }
        }
      } else if (audienceType === 'all') {
        // Fetch all users in the organization
        try {
          const usersResponse = await userApi.getUsers(
            {},
            { limit: 1000 }
          );
          participantIds = usersResponse.data.map(u => u.id);
          console.log('📅 All users fetched:', participantIds.length);
        } catch (error) {
          console.error('Failed to fetch all users:', error);
          Alert.alert('Ошибка', 'Не удалось загрузить список пользователей');
          return;
        }
      }

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
        participant_ids: participantIds,
      };

      if (isEditMode && editEvent) {
        // UpdateEventDto doesn't have participant_ids, so we create a separate object
        const { participant_ids, ...updateData } = eventData;
        await calendarApi.updateEvent(editEvent.id, updateData);

        // Update participants if needed
        if (participantIds && participantIds.length > 0) {
          try {
            // Get current participants
            const currentParticipantIds = editEvent.participants?.map(p => p.user_id) || [];

            // Find participants to remove (in current but not in new)
            const toRemove = currentParticipantIds.filter(id => !participantIds.includes(id));

            // Find participants to add (in new but not in current)
            const toAdd = participantIds.filter(id => !currentParticipantIds.includes(id));

            console.log('📅 Updating participants:', { toAdd, toRemove });

            // Remove old participants
            for (const userId of toRemove) {
              await calendarApi.removeEventParticipant(editEvent.id, userId);
            }

            // Add new participants
            if (toAdd.length > 0) {
              await calendarApi.addEventParticipants(editEvent.id, { user_ids: toAdd });
            }
          } catch (error) {
            console.error('Failed to update participants:', error);
            // Don't fail the whole operation, just log the error
          }
        }

      } else {
        await calendarApi.createEvent(eventData);
      }
      onEventCreated();
      handleClose();
    } catch (error: any) {
      console.error('Failed to create event:', error);

      // Handle specific error cases
      let errorMessage = isEditMode ? 'Не удалось обновить событие' : 'Не удалось создать событие';

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
    setAudienceType('all');
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
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.card, paddingTop: insets.top }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {isEditMode ? 'Редактировать' : 'Новое событие'}
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isLoading || !title.trim()}
              style={[
                styles.saveButton,
                { backgroundColor: theme.error },
                (!title.trim() || isLoading) && { backgroundColor: theme.backgroundTertiary }
              ]}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={(!title.trim() || isLoading) ? theme.textTertiary : '#FFFFFF'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={[styles.content, { backgroundColor: theme.background }]}
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          showsVerticalScrollIndicator={false}>
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
                        // Автоматически обновляем дату окончания, если она раньше новой даты начала
                        if (endDate <= newDate) {
                          const newEndDate = new Date(newDate.getTime() + 60 * 60 * 1000); // +1 час
                          setEndDate(newEndDate);
                        }
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

              {/* Audience type selection */}
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

              {/* User selector - only shown when selected_users is chosen */}
              {audienceType === 'selected_users' && (
                <View style={{ marginTop: 12 }}>
                  <UserSelector
                    selectedUserIds={selectedParticipants}
                    onSelectionChange={setSelectedParticipants}
                    multiSelect={true}
                    placeholder="Выберите участников"
                    modalTitle="Выбрать участников"
                  />
                </View>
              )}

              {/* Info message for 'all' and 'department' */}
              {audienceType === 'all' && (
                <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Событие будет видно всем пользователям организации
                  </Text>
                </View>
              )}

              {audienceType === 'department' && (
                <View style={[styles.infoBox, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
                  <Ionicons name="information-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                    Событие будет видно всем участникам вашего отдела
                  </Text>
                </View>
              )}
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

        {/* Date/Time Pickers with animation */}
        <DatePickerModal
          visible={showStartDatePicker}
          value={startDate}
          mode="date"
          onChange={(event, date) => {
            if (date) {
              setStartDate(date);
              // Автоматически обновляем дату окончания, если она раньше новой даты начала
              if (endDate <= date) {
                const newEndDate = new Date(date.getTime() + 60 * 60 * 1000); // +1 час
                setEndDate(newEndDate);
              }
            }
          }}
          onClose={() => setShowStartDatePicker(false)}
        />

        <DatePickerModal
          visible={showEndDatePicker}
          value={endDate}
          mode="date"
          onChange={(event, date) => {
            if (date) setEndDate(date);
          }}
          onClose={() => setShowEndDatePicker(false)}
          minimumDate={startDate}
        />

        <DatePickerModal
          visible={showStartTimePicker}
          value={startDate}
          mode="time"
          onChange={(event, date) => {
            if (date) {
              setStartDate(date);
              // Автоматически обновляем время окончания, если оно раньше нового времени начала
              if (endDate <= date) {
                const newEndDate = new Date(date.getTime() + 60 * 60 * 1000); // +1 час
                setEndDate(newEndDate);
              }
            }
          }}
          onClose={() => setShowStartTimePicker(false)}
        />

        <DatePickerModal
          visible={showEndTimePicker}
          value={endDate}
          mode="time"
          onChange={(event, date) => {
            if (date) setEndDate(date);
          }}
          onClose={() => setShowEndTimePicker(false)}
        />
      </View>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 100,
    alignItems: 'flex-start',
  },
  closeButton: {
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
  headerRight: {
    width: 100,
    alignItems: 'flex-end',
  },
  saveButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  typeChip: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default CreateEventModal;
