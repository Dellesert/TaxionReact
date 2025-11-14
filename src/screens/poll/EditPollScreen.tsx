import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '@hooks/useTheme';
import { useNotification } from '@contexts/NotificationContext';
import * as pollApi from '@api/poll.api';
import { Poll, PollVisibility } from '@/types/poll.types';
import { PollStackParamList } from '@navigation/types';
import DatePickerModal from '@components/common/DatePickerModal';

type EditPollScreenNavigationProp = StackNavigationProp<PollStackParamList, 'EditPoll'>;
type EditPollScreenRouteProp = RouteProp<PollStackParamList, 'EditPoll'>;

const EditPollScreen: React.FC = () => {
  const navigation = useNavigation<EditPollScreenNavigationProp>();
  const route = useRoute<EditPollScreenRouteProp>();
  const { theme } = useTheme();
  const { showSuccess, showError } = useNotification();
  const pollId = route.params.pollId;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poll, setPoll] = useState<Poll | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState<PollVisibility>('public');
  const [requireComment, setRequireComment] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [showResultsAfter, setShowResultsAfter] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [options, setOptions] = useState<Array<{ id?: number; text: string; description?: string }>>([]);

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  const loadPoll = async () => {
    try {
      setIsLoading(true);
      const loadedPoll = await pollApi.getPoll(pollId);
      setPoll(loadedPoll);

      // Initialize form with current poll data
      setTitle(loadedPoll.title);
      setDescription(loadedPoll.description || '');
      setCategory(loadedPoll.category || '');
      setVisibility(loadedPoll.visibility || 'public');
      setRequireComment(loadedPoll.require_comment || false);
      setShowResults(loadedPoll.show_results !== undefined ? loadedPoll.show_results : true);
      setShowResultsAfter(loadedPoll.show_results_after || false);
      if (loadedPoll.start_time) {
        setStartDate(new Date(loadedPoll.start_time));
      }
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
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      showError('Введите название опроса');
      return;
    }

    if (startDate && endDate && endDate <= startDate) {
      showError('Дата окончания должна быть позже даты начала');
      return;
    }

    try {
      setIsSubmitting(true);

      const updateData = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        visibility,
        require_comment: requireComment,
        show_results: showResults,
        show_results_after: showResultsAfter,
        start_time: startDate?.toISOString(),
        end_time: endDate?.toISOString(),
        options: options.map((opt, index) => ({
          id: opt.id,
          text: opt.text,
          description: opt.description,
          position: index,
        })),
      };

      console.log('📤 Sending update data:', JSON.stringify(updateData, null, 2));
      await pollApi.updatePoll(pollId, updateData);

      showSuccess('Опрос успешно обновлён');
      navigation.goBack();
    } catch (error: any) {
      console.error('Failed to update poll:', error);
      showError(error.message || 'Не удалось обновить опрос');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Загрузка...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!poll) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Редактирование опроса</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Название *</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            placeholder="Введите название опроса"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Описание</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
            ]}
            placeholder="Введите описание опроса (необязательно)"
            placeholderTextColor="#9CA3AF"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={1000}
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Категория</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
            placeholder="Введите категорию (необязательно)"
            placeholderTextColor="#9CA3AF"
            value={category}
            onChangeText={setCategory}
            maxLength={100}
          />
        </View>

        {/* Visibility */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Видимость</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioButton, { borderColor: theme.border }]}
              onPress={() => setVisibility('public')}
            >
              <View style={[styles.radioCircle, { borderColor: theme.primary }]}>
                {visibility === 'public' && (
                  <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioLabel, { color: theme.text }]}>Публичный</Text>
                <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                  Опрос доступен всем пользователям
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioButton, { borderColor: theme.border }]}
              onPress={() => setVisibility('department')}
            >
              <View style={[styles.radioCircle, { borderColor: theme.primary }]}>
                {visibility === 'department' && (
                  <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioLabel, { color: theme.text }]}>Только департамент</Text>
                <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                  Опрос виден только сотрудникам департамента
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioButton, { borderColor: theme.border }]}
              onPress={() => setVisibility('invite_only')}
            >
              <View style={[styles.radioCircle, { borderColor: theme.primary }]}>
                {visibility === 'invite_only' && (
                  <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioLabel, { color: theme.text }]}>Только приглашенные</Text>
                <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                  Опрос доступен только приглашенным участникам
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.radioButton, { borderColor: theme.border }]}
              onPress={() => setVisibility('private')}
            >
              <View style={[styles.radioCircle, { borderColor: theme.primary }]}>
                {visibility === 'private' && (
                  <View style={[styles.radioCircleSelected, { backgroundColor: theme.primary }]} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.radioLabel, { color: theme.text }]}>Приватный</Text>
                <Text style={[styles.radioDescription, { color: theme.textSecondary }]}>
                  Опрос виден только создателю
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Options */}
        {poll?.type && (poll.type === 'single_choice' || poll.type === 'multiple_choice') && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: theme.text }]}>Варианты ответов</Text>
            {options.map((option, index) => (
              <View key={index} style={styles.optionItem}>
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
                  ]}
                  placeholder={`Вариант ${index + 1}`}
                  placeholderTextColor="#9CA3AF"
                  value={option.text}
                  onChangeText={(text) => {
                    const newOptions = [...options];
                    newOptions[index] = { ...newOptions[index], text };
                    setOptions(newOptions);
                  }}
                />
                <TouchableOpacity
                  onPress={() => {
                    const newOptions = options.filter((_, i) => i !== index);
                    setOptions(newOptions);
                  }}
                  style={styles.deleteOptionButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={[styles.addOptionButton, { borderColor: theme.border }]}
              onPress={() => setOptions([...options, { text: '' }])}
            >
              <Ionicons name="add-circle-outline" size={20} color={theme.primary} />
              <Text style={[styles.addOptionText, { color: theme.primary }]}>Добавить вариант</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Настройки</Text>

          <View style={[styles.switchRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Требовать комментарий</Text>
              <Text style={[styles.switchDescription, { color: theme.textSecondary }]}>
                Участники должны оставить комментарий при голосовании
              </Text>
            </View>
            <Switch
              value={requireComment}
              onValueChange={setRequireComment}
              trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
              thumbColor={requireComment ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Показывать результаты</Text>
              <Text style={[styles.switchDescription, { color: theme.textSecondary }]}>
                Участники могут видеть результаты опроса
              </Text>
            </View>
            <Switch
              value={showResults}
              onValueChange={setShowResults}
              trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
              thumbColor={showResults ? theme.primary : '#F3F4F6'}
            />
          </View>

          <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Показывать результаты только после голосования</Text>
              <Text style={[styles.switchDescription, { color: theme.textSecondary }]}>
                Результаты станут доступны только после участия в опросе
              </Text>
            </View>
            <Switch
              value={showResultsAfter}
              onValueChange={setShowResultsAfter}
              trackColor={{ false: '#D1D5DB', true: theme.primary + '80' }}
              thumbColor={showResultsAfter ? theme.primary : '#F3F4F6'}
              disabled={!showResults}
            />
          </View>
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.text }]}>Период проведения</Text>

          {/* Start Date */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.sublabel, { color: theme.textSecondary, marginBottom: 8 }]}>Дата начала</Text>
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
                  <TouchableOpacity onPress={() => setStartDate(undefined)} style={styles.clearButton}>
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
                  <Text
                    style={[
                      styles.dateButtonText,
                      { color: theme.text },
                      !startDate && { color: theme.textTertiary },
                    ]}
                  >
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
                    <TouchableOpacity onPress={() => setStartDate(undefined)} style={styles.clearButton}>
                      <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <DatePickerModal
                  visible={showStartDatePicker}
                  value={startDate || new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowStartDatePicker(false);
                    }
                    if (selectedDate) {
                      setStartDate(selectedDate);
                    }
                  }}
                  onClose={() => setShowStartDatePicker(false)}
                  mode="datetime"
                />
              </>
            )}
          </View>

          {/* End Date */}
          <View>
            <Text style={[styles.sublabel, { color: theme.textSecondary, marginBottom: 8 }]}>Дата окончания</Text>
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
                  min={startDate ? startDate.toISOString().slice(0, 16) : undefined}
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
                  <TouchableOpacity onPress={() => setEndDate(undefined)} style={styles.clearButton}>
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
                  <Text
                    style={[
                      styles.dateButtonText,
                      { color: theme.text },
                      !endDate && { color: theme.textTertiary },
                    ]}
                  >
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
                    <TouchableOpacity onPress={() => setEndDate(undefined)} style={styles.clearButton}>
                      <Ionicons name="close-circle" size={20} color={theme.textTertiary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>

                <DatePickerModal
                  visible={showEndDatePicker}
                  value={endDate || (startDate ? new Date(startDate.getTime() + 86400000) : new Date())}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS === 'android') {
                      setShowEndDatePicker(false);
                    }
                    if (selectedDate) {
                      setEndDate(selectedDate);
                    }
                  }}
                  onClose={() => setShowEndDatePicker(false)}
                  minimumDate={startDate || undefined}
                  mode="datetime"
                />
              </>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: theme.primary }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Сохранить изменения</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sublabel: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
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
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginTop: 32,
    gap: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
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
    gap: 12,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  deleteOptionButton: {
    padding: 8,
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    gap: 8,
    marginTop: 4,
  },
  addOptionText: {
    fontSize: 15,
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default EditPollScreen;
