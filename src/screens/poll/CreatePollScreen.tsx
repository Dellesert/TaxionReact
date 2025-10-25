import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '@hooks/useTheme';
import { useAuthStore } from '@store/authStore';
import * as pollApi from '@api/poll.api';
import { PollType, PollVisibility, CreatePollDto } from '@/types/poll.types';
import { PollStackParamList } from '@navigation/types';
import UserSelector from '@components/common/UserSelector';

type CreatePollScreenNavigationProp = StackNavigationProp<PollStackParamList, 'CreatePoll'>;

const CreatePollScreen: React.FC = () => {
  const navigation = useNavigation<CreatePollScreenNavigationProp>();
  const { theme } = useTheme();
  const currentUser = useAuthStore((state) => state.user);

  // Check if user has permission to create polls
  const canCreatePoll = currentUser?.role === 'manager' || currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

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
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Category and department
  const [category, setCategory] = useState('');
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);

  if (!canCreatePoll) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Создание опроса</Text>
        </View>
        <View style={styles.noAccessContainer}>
          <Ionicons name="lock-closed" size={64} color="#EF4444" />
          <Text style={styles.noAccessTitle}>Нет доступа</Text>
          <Text style={styles.noAccessText}>
            Создавать опросы могут только менеджеры и администраторы системы
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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

    if (startDate && endDate && endDate <= startDate) {
      const msg = 'Дата окончания должна быть позже даты начала';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Ошибка', msg);
      }
      return false;
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
        const msg = 'Вы не принадлежите ни к одному отделу';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Ошибка', msg);
        }
        return;
      }
    } else if (audienceType === 'selected_users') {
      visibility = 'invite_only';
      participantIds = selectedUserIds;
      if (selectedUserIds.length === 0) {
        const msg = 'Выберите хотя бы одного пользователя';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Ошибка', msg);
        }
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
        start_time: startDate?.toISOString(),
        end_time: endDate?.toISOString(),
        category: category.trim() || undefined,
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

      const createdPoll = await pollApi.createPoll(pollData);

      // Navigate to the created poll detail screen
      navigation.replace('PollDetail', { pollId: createdPoll.id });

      // Show success message
      setTimeout(() => {
        Alert.alert('Успешно', 'Опрос создан!');
      }, 500);
    } catch (error: any) {
      console.error('Failed to create poll:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось создать опрос');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollTypes: Array<{ value: PollType; label: string; icon: string; description: string }> = [
    { value: 'single_choice', label: 'Один выбор', icon: 'radio-button-on', description: 'Выбор одного варианта' },
    { value: 'multiple_choice', label: 'Множественный', icon: 'checkbox', description: 'Выбор нескольких вариантов' },
  ];

  const audienceOptions: Array<{ value: AudienceType; label: string; icon: string; description: string }> = [
    { value: 'all', label: 'Для всех', icon: 'business', description: 'Все сотрудники организации' },
    { value: 'department', label: 'Для моего отдела', icon: 'people', description: 'Только ваш отдел' },
    { value: 'selected_users', label: 'Для выбранных', icon: 'person-add', description: 'Конкретные пользователи' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Создание опроса</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, { opacity: isSubmitting ? 0.5 : 1 }]}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Text style={[styles.submitButtonText, { color: theme.primary }]}>Создать</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Название опроса *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            placeholder="Введите название опроса"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Описание</Text>
          <TextInput
            style={[styles.textArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            placeholder="Добавьте описание опроса (необязательно)"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Poll Type */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Тип опроса *</Text>
          <View style={styles.radioGroup}>
            {pollTypes.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.radioButton, { borderColor: theme.border }]}
                onPress={() => setPollType(type.value)}
              >
                <View style={[styles.radioCircle, { borderColor: theme.primary }]}>
                  {pollType === type.value && (
                    <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>
                    {type.label}
                  </Text>
                  <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                    {type.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Options (not for open_text) */}
        {pollType !== 'open_text' && (
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: theme.text }]}>Варианты ответа *</Text>
              <TouchableOpacity onPress={addOption} style={styles.addOptionButton}>
                <Ionicons name="add-circle" size={24} color={theme.primary} />
                <Text style={[styles.addOptionText, { color: theme.primary }]}>Добавить</Text>
              </TouchableOpacity>
            </View>
            {options.map((option, index) => (
              <View key={index} style={styles.optionContainer}>
                <View style={styles.optionInputContainer}>
                  <Text style={styles.optionNumber}>{index + 1}</Text>
                  <TextInput
                    style={[styles.optionInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                    placeholder={`Вариант ${index + 1}`}
                    placeholderTextColor="#9CA3AF"
                    value={option.text}
                    onChangeText={(text) => updateOption(index, 'text', text)}
                  />
                  {options.length > 2 && (
                    <TouchableOpacity onPress={() => removeOption(index)} style={styles.removeOptionButton}>
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Visibility Selection */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Видимость *</Text>
          <View style={styles.radioGroup}>
            {audienceOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.radioButton, { borderColor: theme.border }]}
                onPress={() => setAudienceType(option.value)}
              >
                <View style={[styles.radioCircle, { borderColor: theme.primary }]}>
                  {audienceType === option.value && (
                    <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.radioLabel, { color: theme.text }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                    {option.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* User Picker for selected_users */}
          {audienceType === 'selected_users' && (
            <View style={{ marginTop: 16 }}>
              <Text style={[styles.sublabel, { color: theme.textSecondary }]}>
                Выберите пользователей, которые смогут видеть и голосовать в опросе:
              </Text>
              <View style={{ marginTop: 8 }}>
                <UserSelector
                  selectedUserIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                  multiSelect={true}
                  placeholder="Выберите участников опроса"
                  modalTitle="Выбрать участников опроса"
                />
              </View>
            </View>
          )}
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Настройки</Text>

          <View style={[styles.settingRow, { borderColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Анонимное голосование</Text>
              <Text style={styles.settingDescription}>Скрыть имена проголосовавших</Text>
            </View>
            <Switch
              value={allowAnonymous}
              onValueChange={setAllowAnonymous}
              trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
              thumbColor={allowAnonymous ? theme.primary : '#F3F4F6'}
            />
          </View>

          {pollType === 'multiple_choice' && (
            <View style={[styles.settingRow, { borderColor: theme.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Множественные голоса</Text>
                <Text style={styles.settingDescription}>Разрешить голосовать несколько раз</Text>
              </View>
              <Switch
                value={allowMultipleVote}
                onValueChange={setAllowMultipleVote}
                trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
                thumbColor={allowMultipleVote ? theme.primary : '#F3F4F6'}
              />
            </View>
          )}

          <View style={[styles.settingRow, { borderColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Требовать комментарий</Text>
              <Text style={styles.settingDescription}>Обязательный комментарий при голосовании</Text>
            </View>
            <Switch
              value={requireComment}
              onValueChange={setRequireComment}
              trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
              thumbColor={requireComment ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View style={[styles.settingRow, { borderColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Показывать результаты</Text>
              <Text style={styles.settingDescription}>Отображать текущие результаты</Text>
            </View>
            <Switch
              value={showResults}
              onValueChange={setShowResults}
              trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
              thumbColor={showResults ? theme.primary : '#F3F4F6'}
            />
          </View>

          {showResults && (
            <View style={[styles.settingRow, { borderColor: theme.border }]}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: theme.text }]}>Только после голосования</Text>
                <Text style={styles.settingDescription}>Показывать результаты после голоса</Text>
              </View>
              <Switch
                value={showResultsAfter}
                onValueChange={setShowResultsAfter}
                trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
                thumbColor={showResultsAfter ? theme.primary : '#F3F4F6'}
              />
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Категория</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            placeholder="Например: HR, IT, Общее и т.д."
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
          />
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Период проведения</Text>

          {/* Start Date */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sublabel, { color: theme.textSecondary, marginBottom: 8 }]}>Дата начала (необязательно)</Text>
            {Platform.OS === 'web' ? (
              <View style={[styles.dateInputContainer, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.dateIconWrapper}>
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                </View>
                <input
                  type="datetime-local"
                  value={startDate ? startDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setStartDate(new Date(e.target.value));
                    } else {
                      setStartDate(undefined);
                    }
                  }}
                  min={new Date().toISOString().slice(0, 16)}
                  style={{
                    flex: 1,
                    border: 'none',
                    padding: '12px',
                    fontSize: '14px',
                    color: theme.text,
                    backgroundColor: 'transparent',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    outline: 'none',
                  }}
                />
                {startDate && (
                  <TouchableOpacity
                    onPress={() => setStartDate(undefined)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.dateButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <Text style={[
                    styles.dateButtonText,
                    { color: theme.text },
                    !startDate && { color: theme.textTertiary }
                  ]}>
                    {startDate
                      ? startDate.toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Выберите дату и время начала'}
                  </Text>
                  {startDate && (
                    <TouchableOpacity
                      onPress={() => setStartDate(undefined)}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showStartDatePicker && (
                  <DateTimePicker
                    value={startDate || new Date()}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setStartDate(selectedDate);
                      }
                    }}
                    minimumDate={new Date()}
                  />
                )}
              </>
            )}
          </View>

          {/* End Date */}
          <View>
            <Text style={[styles.sublabel, { color: theme.textSecondary, marginBottom: 8 }]}>Дата окончания (необязательно)</Text>
            {Platform.OS === 'web' ? (
              <View style={[styles.dateInputContainer, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.dateIconWrapper}>
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                </View>
                <input
                  type="datetime-local"
                  value={endDate ? endDate.toISOString().slice(0, 16) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setEndDate(new Date(e.target.value));
                    } else {
                      setEndDate(undefined);
                    }
                  }}
                  min={startDate ? startDate.toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                  style={{
                    flex: 1,
                    border: 'none',
                    padding: '12px',
                    fontSize: '14px',
                    color: theme.text,
                    backgroundColor: 'transparent',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    outline: 'none',
                  }}
                />
                {endDate && (
                  <TouchableOpacity
                    onPress={() => setEndDate(undefined)}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.dateButton, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons name="calendar" size={20} color={theme.primary} />
                  <Text style={[
                    styles.dateButtonText,
                    { color: theme.text },
                    !endDate && { color: theme.textTertiary }
                  ]}>
                    {endDate
                      ? endDate.toLocaleString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Выберите дату и время окончания'}
                  </Text>
                  {endDate && (
                    <TouchableOpacity
                      onPress={() => setEndDate(undefined)}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={endDate || (startDate ? new Date(startDate.getTime() + 86400000) : new Date())}
                    mode="datetime"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowEndDatePicker(Platform.OS === 'ios');
                      if (selectedDate) {
                        setEndDate(selectedDate);
                      }
                    }}
                    minimumDate={startDate || new Date()}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  submitButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  radioGroup: {
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  radioDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionContainer: {
    marginBottom: 12,
  },
  optionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    width: 24,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  removeOptionButton: {
    padding: 4,
  },
  sublabel: {
    fontSize: 13,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noAccessTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 16,
  },
  noAccessText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingLeft: 12,
  },
  dateIconWrapper: {
    marginRight: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  dateButtonText: {
    fontSize: 15,
    flex: 1,
  },
  clearButton: {
    padding: 8,
  },
});

export default CreatePollScreen;
