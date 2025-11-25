import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Poll } from '../types/poll.types';

interface PollVotingUIProps {
  poll: Poll;
  selectedOptions: number[];
  textAnswer: string;
  ratingValue: number | null;
  onOptionToggle: (optionId: number) => void;
  onTextChange: (text: string) => void;
  onRatingChange: (value: number) => void;
  onSelectRatingOption: (optionId: number) => void;
}

export const PollVotingUI: React.FC<PollVotingUIProps> = ({
  poll,
  selectedOptions,
  textAnswer,
  ratingValue,
  onOptionToggle,
  onTextChange,
  onRatingChange,
  onSelectRatingOption,
}) => {
  const { theme } = useTheme();

  // Closed poll message
  if (
    poll.status === 'closed' ||
    poll.status === 'archived' ||
    poll.status === 'cancelled'
  ) {
    return (
      <View style={styles.closedContainer}>
        <Ionicons name="lock-closed" size={48} color="#6B7280" />
        <Text style={styles.closedText}>Опрос завершен</Text>
      </View>
    );
  }

  // Voted message (should not reach here normally, but as fallback)
  if (poll.user_has_voted) {
    return (
      <View style={styles.votedContainer}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        <Text style={styles.votedText}>Вы уже проголосовали</Text>
      </View>
    );
  }

  // Render voting UI based on poll type
  switch (poll.type) {
    case 'single_choice':
    case 'multiple_choice':
      return (
        <View style={styles.optionsContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Выберите вариант:
          </Text>
          {poll.options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                { backgroundColor: theme.backgroundSecondary },
                selectedOptions.includes(option.id) && [
                  styles.optionSelected,
                  { backgroundColor: theme.primary + '15' },
                ],
              ]}
              onPress={() => onOptionToggle(option.id)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <Ionicons
                  name={
                    poll.type === 'single_choice'
                      ? selectedOptions.includes(option.id)
                        ? 'radio-button-on'
                        : 'radio-button-off'
                      : selectedOptions.includes(option.id)
                      ? 'checkbox'
                      : 'square-outline'
                  }
                  size={24}
                  color={
                    selectedOptions.includes(option.id) ? theme.primary : '#9CA3AF'
                  }
                />
                <Text
                  style={[
                    styles.optionText,
                    { color: theme.text },
                    selectedOptions.includes(option.id) && styles.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
              </View>
              {option.description && (
                <Text style={styles.optionDescription}>{option.description}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      );

    case 'open_text':
      return (
        <View style={styles.textInputContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ваш ответ:</Text>
          <TextInput
            style={[
              styles.textInput,
              { color: theme.text, borderColor: theme.border },
            ]}
            placeholder="Введите ваш ответ..."
            placeholderTextColor="#9CA3AF"
            value={textAnswer}
            onChangeText={onTextChange}
            multiline
            numberOfLines={4}
          />
        </View>
      );

    case 'rating':
      return (
        <View style={styles.ratingContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Ваша оценка:</Text>
          <View style={styles.ratingStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => onRatingChange(star)}>
                <Ionicons
                  name={ratingValue && ratingValue >= star ? 'star' : 'star-outline'}
                  size={40}
                  color={
                    ratingValue && ratingValue >= star ? '#F59E0B' : '#D1D5DB'
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
          {poll.options.length > 0 && (
            <View style={styles.ratingOptionsContainer}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Что оцениваем:
              </Text>
              {poll.options.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionButton,
                    { backgroundColor: theme.backgroundSecondary },
                    selectedOptions.includes(option.id) && [
                      styles.optionSelected,
                      { backgroundColor: theme.primary + '15' },
                    ],
                  ]}
                  onPress={() => onSelectRatingOption(option.id)}
                >
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    {option.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      );

    default:
      return <Text style={styles.errorText}>Тип опроса не поддерживается</Text>;
  }
};

const styles = StyleSheet.create({
  optionsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: '#3B82F6',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
    marginLeft: 36,
  },
  textInputContainer: {
    padding: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    padding: 16,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  ratingOptionsContainer: {
    marginTop: 16,
  },
  closedContainer: {
    padding: 32,
    alignItems: 'center',
  },
  closedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  votedContainer: {
    padding: 32,
    alignItems: 'center',
  },
  votedText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginTop: 12,
    textAlign: 'center',
  },
});
