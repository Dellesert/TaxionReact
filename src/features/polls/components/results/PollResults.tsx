import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { Avatar } from '@shared/components/common/Avatar';
import { Poll } from '../../types/poll.types';
import { spacing, hitSlop, shadows } from '@shared/constants/design-system.constants';

interface PollResultsProps {
  poll: Poll;
  votersPreview: any[];
  isCreatorOrAdmin: boolean;
  onViewVoters: () => void;
}

// Component for overlapping avatars
const OverlappingAvatars: React.FC<{
  voters: any[];
  totalVoters: number;
  maxDisplay?: number;
  onPress: () => void;
}> = ({ voters, totalVoters, maxDisplay = 5, onPress }) => {
  const { theme } = useTheme();
  const displayVoters = voters.slice(0, maxDisplay);
  const remainingCount = totalVoters - maxDisplay;

  return (
    <TouchableOpacity
      style={styles.overlappingAvatarsContainer}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={hitSlop.sm}
    >
      <View style={styles.avatarsRow}>
        {displayVoters.map((voter, index) => (
          <View
            key={voter.user_id}
            style={[
              styles.avatarWrapper,
              {
                zIndex: displayVoters.length - index,
                marginLeft: index > 0 ? -12 : 0,
              },
            ]}
          >
            <View style={[styles.avatarBorder, { borderColor: theme.backgroundSecondary }]}>
              <Avatar name={voter.user_name} imageUrl={voter.avatar} size={36} />
            </View>
          </View>
        ))}
        {remainingCount > 0 && (
          <View
            style={[
              styles.avatarWrapper,
              {
                marginLeft: -12,
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
      <Ionicons name="chevron-forward" size={20} color={theme.iconSecondary} />
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
            <View style={styles.resultHeader}>
              <Text style={[styles.resultText, { color: theme.text }]}>{option.text}</Text>
              <Text style={[styles.resultPercent, { color: theme.text }]}>
                {option.vote_percent?.toFixed(1) || 0}%
              </Text>
            </View>
            <View style={[styles.resultBar, { backgroundColor: theme.borderLight }]}>
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
            <Text style={[styles.resultCount, { color: theme.textSecondary }]}>
              {option.vote_count || 0} {option.vote_count === 1 ? 'голос' : 'голосов'}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Voters Preview with overlapping avatars */}
      {((isCreatorOrAdmin || poll.show_results) && votersPreview.length > 0) && (
        <View style={[styles.votersPreviewSection, { borderTopColor: theme.border }]}>
          <OverlappingAvatars
            voters={votersPreview}
            totalVoters={poll.total_voters || 0}
            onPress={onViewVoters}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  resultsContainer: {
    padding: spacing.lg,
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
    borderRadius: 12,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  resultsScrollView: {
    maxHeight: 300,
  },
  resultItem: {
    marginBottom: spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    flex: 1,
    marginRight: spacing.md,
  },
  resultBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: spacing.xs + 2,
  },
  resultBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  resultPercent: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  resultCount: {
    fontSize: 13,
    lineHeight: 18,
  },
  votersPreviewSection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  overlappingAvatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
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
  },
  remainingCountCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  remainingCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
