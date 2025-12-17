import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Poll } from '../../types/poll.types';
import { spacing, hitSlop } from '@shared/constants/design-system.constants';

interface PollVotingUIProps {
  poll: Poll;
  selectedOptions: number[];
  textAnswer: string;
  ratingValue: number | null;
  isRevoting?: boolean;
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
  isRevoting = false,
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
        <Ionicons name="lock-closed" size={56} color={theme.textDisabled} />
        <Text style={[styles.closedText, { color: theme.textSecondary }]}>
          Опрос завершен
        </Text>
      </View>
    );
  }

  // Voted message (should not reach here normally, but as fallback)
  // Skip this check when revoting
  if (poll.user_has_voted && !isRevoting) {
    return (
      <View style={styles.votedContainer}>
        <Ionicons name="checkmark-circle" size={56} color={theme.success} />
        <Text style={[styles.votedText, { color: theme.success }]}>
          Вы уже проголосовали
        </Text>
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
                {
                  backgroundColor: theme.backgroundSecondary,
                  borderColor: theme.border,
                },
                selectedOptions.includes(option.id) && [
                  styles.optionSelected,
                  {
                    backgroundColor: theme.primary + '15',
                    borderColor: theme.primary,
                  },
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
                    selectedOptions.includes(option.id) ? theme.primary : theme.textTertiary
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
                <Text style={[styles.optionDescription, { color: theme.textSecondary }]}>
                  {option.description}
                </Text>
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
              {
                color: theme.text,
                borderColor: theme.border,
                backgroundColor: theme.backgroundSecondary,
              },
            ]}
            placeholder="Введите ваш ответ..."
            placeholderTextColor={theme.inputPlaceholder}
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
              <TouchableOpacity
                key={star}
                onPress={() => onRatingChange(star)}
                hitSlop={hitSlop.sm}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={ratingValue && ratingValue >= star ? 'star' : 'star-outline'}
                  size={44}
                  color={
                    ratingValue && ratingValue >= star ? theme.warning : theme.textDisabled
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
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                    selectedOptions.includes(option.id) && [
                      styles.optionSelected,
                      {
                        backgroundColor: theme.primary + '15',
                        borderColor: theme.primary,
                      },
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
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  optionButton: {
    padding: spacing.lg,
    borderRadius: 12,
    marginBottom: spacing.md,
    borderWidth: 1.5,
  },
  optionSelected: {
    borderWidth: 2,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.sm,
    marginLeft: 36,
  },
  textInputContainer: {
    padding: spacing.lg,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  ratingContainer: {
    padding: spacing.lg,
  },
  ratingStars: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  ratingOptionsContainer: {
    marginTop: spacing.xl,
  },
  closedContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  closedText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  votedContainer: {
    padding: spacing.xxxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  votedText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 26,
  },
  errorText: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
