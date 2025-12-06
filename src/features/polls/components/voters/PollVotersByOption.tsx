import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import Avatar from '@shared/components/common/Avatar';
import { PollVoter } from '../../types/poll.types';

interface PollVotersByOptionProps {
  votersByOption: { [option: string]: PollVoter[] };
}

export const PollVotersByOption: React.FC<PollVotersByOptionProps> = ({
  votersByOption,
}) => {
  const { theme } = useTheme();

  const renderCompactVoterItem = (voter: PollVoter) => (
    <View key={voter.user_id} style={styles.compactVoterItem}>
      <Avatar name={voter.user_name} imageUrl={voter.avatar} size={32} />
      <View style={styles.compactVoterInfo}>
        <Text style={[styles.compactVoterName, { color: theme.text }]}>
          {voter.user_name}
        </Text>
        {voter.comment && (
          <Text
            style={[styles.compactVoterComment, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {voter.comment}
          </Text>
        )}
      </View>
    </View>
  );

  const renderOptionGroup = (option: string, voters: PollVoter[]) => (
    <View
      key={option}
      style={[styles.optionGroup, { backgroundColor: theme.backgroundSecondary }]}
    >
      <View style={[styles.optionHeader, { borderBottomColor: theme.border }]}>
        <Text style={[styles.optionTitle, { color: theme.text }]}>{option}</Text>
        <View
          style={[styles.optionBadge, { backgroundColor: theme.primary + '20' }]}
        >
          <Text style={[styles.optionBadgeText, { color: theme.primary }]}>
            {voters.length}
          </Text>
        </View>
      </View>
      <View style={styles.optionVotersList}>
        {voters.map((voter) => renderCompactVoterItem(voter))}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {Object.entries(votersByOption).map(([option, voters]) =>
        renderOptionGroup(option, voters)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  compactVoterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactVoterInfo: {
    flex: 1,
    marginLeft: 10,
  },
  compactVoterName: {
    fontSize: 14,
    fontWeight: '500',
  },
  compactVoterComment: {
    fontSize: 12,
    marginTop: 2,
  },
  optionGroup: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  optionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  optionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  optionVotersList: {
    paddingVertical: 4,
  },
});
