/**
 * Edit Poll Modal
 * Модальное окно для редактирования опроса
 */

import React, { useState, useEffect } from 'react';
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
import * as pollApi from '@api/poll.api';
import { Poll, PollVisibility } from '@/types/poll.types';
import DatePickerModal from '@components/common/DatePickerModal';

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
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [poll, setPoll] = useState<Poll | null>(null);

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
      Alert.alert('Ошибка', 'Не удалось загрузить опрос');
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
      Alert.alert('Ошибка', 'Минимум 2 варианта ответа');
    }
  };

  const updateOption = (index: number, field: 'text' | 'description', value: string) => {
    const newOptions = [...options];
    newOptions[index][field] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Введите название опроса');
      return;
    }

    if (poll?.type !== 'open_text') {
      const filledOptions = options.filter((opt) => opt.text.trim());
      if (filledOptions.length < 2) {
        Alert.alert('Ошибка', 'Добавьте минимум 2 варианта ответа');
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
        updateData.options = filledOptions.map((opt, index) => ({
          id: opt.id,
          text: opt.text.trim(),
          description: opt.description?.trim() || undefined,
          position: index + 1,
        }));
      }

      await pollApi.updatePoll(pollId, updateData);
      Alert.alert('Успех', 'Опрос обновлён');
      onPollUpdated();
      onClose();
    } catch (error: any) {
      console.error('Failed to update poll:', error);
      Alert.alert('Ошибка', error.message || 'Не удалось обновить опрос');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false);
    }
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  if (isLoading) {
    return (
      <Modal visible={visible} transparent>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={[styles.container, { backgroundColor: theme.card, paddingTop: insets.top }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.card} />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={28} color={theme.error} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.headerTitle, { color: theme.text }]}>Редактировать</Text>

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

          {/* Варианты ответа */}
          {poll?.type !== 'open_text' && (
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

          {/* Информация о статусе */}
          <View style={[styles.section, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
            <Text style={[styles.sectionLabel, { color: theme.text }]}>СТАТУС ОПРОСА</Text>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                Статус: {poll?.status === 'active' ? 'Активен' : poll?.status === 'completed' ? 'Завершён' : 'Черновик'}
              </Text>
            </View>
            {poll?.votes_count !== undefined && (
              <View style={styles.infoRow}>
                <Ionicons name="people" size={20} color={theme.textSecondary} />
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                  Проголосовало: {poll.votes_count}
                </Text>
              </View>
            )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
});

export default EditPollModal;
