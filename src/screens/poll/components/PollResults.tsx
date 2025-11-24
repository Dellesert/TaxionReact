import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@hooks/useTheme';
import { Avatar } from '@components/common/Avatar';
import { Poll } from '@/types/poll.types';

interface PollResultsProps {
  poll: Poll;
  votersPreview: any[];
  isCreatorOrAdmin: boolean;
  onViewVoters: () => void;
}

export const PollResults: React.FC<PollResultsProps> = ({
  poll,
  votersPreview,
  isCreatorOrAdmin,
  onViewVoters,
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[styles.resultsContainer, { backgroundColor: theme.backgroundSecondary }]}
    >
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Результаты:</Text>
      {poll.options.map((option) => (
        <View key={option.id} style={styles.resultItem}>
          <Text style={[styles.resultText, { color: theme.text }]}>{option.text}</Text>
          <View style={[styles.resultBar, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.resultBarFill,
                {
                  width: `${option.vote_percent || 0}%`,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>
          <Text style={styles.resultPercent}>
            {option.vote_percent?.toFixed(1) || 0}%
          </Text>
          <Text style={styles.resultCount}>({option.vote_count || 0} голосов)</Text>
        </View>
      ))}
      <View style={styles.totalVotes}>
        <Text style={styles.totalVotesText}>
          Всего голосов: {poll.total_votes || 0}
        </Text>
        {isCreatorOrAdmin && (
          <TouchableOpacity
            style={[styles.viewVotersButton, { borderColor: theme.primary }]}
            onPress={onViewVoters}
          >
            <Ionicons name="people-outline" size={18} color={theme.primary} />
            <Text style={[styles.viewVotersButtonText, { color: theme.primary }]}>
              Кто проголосовал
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Voters Preview */}
      {((isCreatorOrAdmin || poll.show_results) && votersPreview.length > 0) && (
        <View
          style={[
            styles.votersPreviewSection,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Text style={[styles.votersPreviewTitle, { color: theme.text }]}>
            Проголосовали ({poll.total_voters}):
          </Text>
          <View style={styles.votersPreviewList}>
            {votersPreview.map((voter) => (
              <View key={voter.user_id} style={styles.voterPreviewItem}>
                <Avatar name={voter.user_name} imageUrl={voter.avatar} size={32} />
                <Text
                  style={[styles.voterPreviewName, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {voter.user_name}
                </Text>
              </View>
            ))}
          </View>
          {poll.total_voters > 5 && (
            <TouchableOpacity
              style={[styles.viewAllVotersButton, { borderColor: theme.primary }]}
              onPress={onViewVoters}
            >
              <Text style={[styles.viewAllVotersText, { color: theme.primary }]}>
                Показать всех ({poll.total_voters})
              </Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  resultsContainer: {
    padding: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultItem: {
    marginBottom: 16,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  resultBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  resultBarFill: {
    height: '100%',
  },
  resultPercent: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  totalVotes: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  totalVotesText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  viewVotersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    gap: 6,
  },
  viewVotersButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  votersPreviewSection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  votersPreviewTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  votersPreviewList: {
    gap: 12,
  },
  voterPreviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voterPreviewName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  viewAllVotersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  viewAllVotersText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
