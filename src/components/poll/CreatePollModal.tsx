/**
 * Create Poll Modal
 * Модальное окно для создания опроса
 */

import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as pollApi from '@api/poll.api';
import { PollType, PollVisibility, CreatePollDto } from '@/types/poll.types';
import UserSelector from '@components/common/UserSelector';
import DatePickerModal from '@components/common/DatePickerModal';

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
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitle, { color: theme.text }]}>Новый опрос</Text>

          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              style={[
                styles.saveButton,
                { backgroundColor: theme.error },
                (!title.trim() || isSubmitting) && { backgroundColor: theme.backgroundTertiary }
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={24}
                  color={(!title.trim() || isSubmitting) ? theme.textTertiary : '#FFFFFF'}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={[styles.content, { backgroundColor: theme.background }]}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Название */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>НАЗВАНИЕ *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
              placeholder="Название опроса"
              placeholderTextColor={theme.inputPlaceholder}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />
          </View>

          {/* Описание */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>ОПИСАНИЕ</Text>
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

          {/* Тип опроса */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>ТИП ОПРОСА</Text>
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

          {/* Варианты ответа */}
          {pollType !== 'open_text' && (
            <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>ВАРИАНТЫ ОТВЕТА</Text>
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

          {/* Аудитория */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>АУДИТОРИЯ</Text>
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

          {/* Дата окончания */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>СРОК ОКОНЧАНИЯ</Text>
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

          {/* Настройки */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>НАСТРОЙКИ</Text>

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

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Требовать комментарий</Text>
              <Switch
                value={requireComment}
                onValueChange={setRequireComment}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor="#FFFFFF"
              />
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
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  sectionLabel: {
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
});

export default CreatePollModal;
