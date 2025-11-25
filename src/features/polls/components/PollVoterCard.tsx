import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import Avatar from '@components/common/Avatar';
import { PollVoter } from '../types/poll.types';

interface PollVoterCardProps {
  voter: PollVoter;
}

export const PollVoterCard: React.FC<PollVoterCardProps> = ({ voter }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.voterItem, { backgroundColor: theme.backgroundSecondary }]}>
      <View style={styles.voterHeader}>
        <Avatar name={voter.user_name} imageUrl={voter.avatar} size={48} />
        <View style={styles.voterInfo}>
          <Text style={[styles.voterName, { color: theme.text }]}>
            {voter.user_name}
          </Text>
          {voter.position && (
            <Text style={[styles.voterEmail, { color: theme.textSecondary }]}>
              {voter.position}
            </Text>
          )}
        </View>
      </View>

      {voter.options && voter.options.length > 0 && (
        <View style={styles.voterChoices}>
          <Text style={[styles.choicesLabel, { color: theme.textSecondary }]}>
            Выбрано:
          </Text>
          <View style={styles.choicesRow}>
            {voter.options.map((option, index) => (
              <View
                key={index}
                style={[
                  styles.choiceChip,
                  { backgroundColor: theme.primary + '15' },
                ]}
              >
                <Text style={[styles.choiceText, { color: theme.primary }]}>
                  {option}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {voter.comment && (
        <View style={styles.voterComment}>
          <Text style={[styles.commentLabel, { color: theme.textSecondary }]}>
            Комментарий:
          </Text>
          <Text style={[styles.commentText, { color: theme.text }]}>
            {voter.comment}
          </Text>
        </View>
      )}

      <Text style={[styles.votedDate, { color: theme.textSecondary }]}>
        Проголосовал: {new Date(voter.voted_at).toLocaleString('ru-RU')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  voterItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  voterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  voterInfo: {
    flex: 1,
    marginLeft: 12,
  },
  voterName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  voterEmail: {
    fontSize: 13,
  },
  voterChoices: {
    marginTop: 8,
    marginBottom: 8,
  },
  choicesLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  choicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '500',
  },
  voterComment: {
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  commentLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  votedDate: {
    fontSize: 12,
    marginTop: 4,
  },
});
