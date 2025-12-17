import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { Poll } from '../../types/poll.types';

interface PollResultsProps {
  poll: Poll;
  votersPreview: any[];
  isCreatorOrAdmin: boolean;
  onViewVoters: () => void;
}

// Component for overlapping avatars
const OverlappingAvatars: React.FC<{
  voters: any[];
  maxDisplay?: number;
  onPress: () => void;
}> = ({ voters, maxDisplay = 5, onPress }) => {
  const { theme } = useTheme();
  const displayVoters = voters.slice(0, maxDisplay);
  const remainingCount = voters.length - maxDisplay;

  return (
    <TouchableOpacity
      style={styles.overlappingAvatarsContainer}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.avatarsRow}>
        {displayVoters.map((voter, index) => (
          <View
            key={voter.user_id}
            style={[
              styles.avatarWrapper,
              {
                zIndex: displayVoters.length - index,
                marginLeft: index > 0 ? -16 : 0,
              },
            ]}
          >
            <View style={[styles.avatarBorder, { borderColor: theme.backgroundSecondary }]}>
              <Avatar name={voter.user_name} imageUrl={voter.avatar} size={32} />
            </View>
          </View>
        ))}
        {remainingCount > 0 && (
          <View
            style={[
              styles.avatarWrapper,
              {
                zIndex: 0,
                marginLeft: -16,
              },
            ]}
          >
            <View style={[styles.remainingCountCircle, {
              backgroundColor: theme.primary,
              borderColor: theme.backgroundSecondary,
            }]}>
              <Text style={styles.remainingCountText}>+{remainingCount}</Text>
            </View>
          </View>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );
};

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

      {/* Scrollable results section */}
      <ScrollView
        style={styles.resultsScrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
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
      </ScrollView>

      {/* Voters Preview with overlapping avatars */}
      {((isCreatorOrAdmin || poll.show_results) && votersPreview.length > 0) && (
        <View style={[styles.votersPreviewSection, { borderTopColor: theme.border }]}>
          <OverlappingAvatars
            voters={votersPreview}
            onPress={onViewVoters}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  resultsContainer: {
    padding: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  resultsScrollView: {
    maxHeight: 300,
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
  votersPreviewSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  overlappingAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorder: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 2,
  },
  remainingCountCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
