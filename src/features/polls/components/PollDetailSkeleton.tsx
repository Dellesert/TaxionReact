/**
 * PollDetailSkeleton Component
 * Скелетон для страницы деталей опроса
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PollDetailSkeletonProps {
  isFromChat?: boolean;
}

export const PollDetailSkeleton: React.FC<PollDetailSkeletonProps> = ({ isFromChat = false }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Пульсирующая анимация
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const dynamicStyles = {
    line: {
      backgroundColor: theme.border,
      opacity,
    },
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header (если не из чата) */}
      {!isFromChat && (
        <View style={[styles.header, { backgroundColor: theme.card, paddingTop: insets.top, borderBottomColor: theme.border }]}>
          <View style={styles.headerContent}>
            {/* Back button */}
            <Animated.View style={[styles.backButton, dynamicStyles.line]} />

            {/* Action buttons */}
            <View style={styles.headerButtons}>
              <Animated.View style={[styles.actionButton, dynamicStyles.line]} />
              <Animated.View style={[styles.actionButton, dynamicStyles.line]} />
            </View>
          </View>
        </View>
      )}

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Poll Title */}
        <Animated.View style={[styles.pollTitle, dynamicStyles.line]} />

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <Animated.View style={[styles.badge, dynamicStyles.line]} />
          <Animated.View style={[styles.badge, dynamicStyles.line]} />
        </View>

        {/* Description */}
        <View style={styles.descriptionSection}>
          <Animated.View style={[styles.descLine, styles.descLineLong, dynamicStyles.line]} />
          <Animated.View style={[styles.descLine, styles.descLineMedium, dynamicStyles.line]} />
        </View>

        {/* Meta info */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Animated.View style={[styles.metaIcon, dynamicStyles.line]} />
            <Animated.View style={[styles.metaText, dynamicStyles.line]} />
          </View>
          <View style={styles.metaItem}>
            <Animated.View style={[styles.metaIcon, dynamicStyles.line]} />
            <Animated.View style={[styles.metaText, dynamicStyles.line]} />
          </View>
        </View>

        {/* Poll Options */}
        <View style={styles.optionsSection}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={[styles.optionCard, { backgroundColor: theme.card }]}>
              <View style={styles.optionContent}>
                <Animated.View style={[styles.optionRadio, dynamicStyles.line]} />
                <Animated.View style={[styles.optionText, dynamicStyles.line]} />
              </View>
              {/* Progress bar */}
              <Animated.View style={[styles.progressBar, dynamicStyles.line]} />
              {/* Vote count */}
              <Animated.View style={[styles.voteCount, dynamicStyles.line]} />
            </View>
          ))}
        </View>

        {/* Creator info */}
        <View style={[styles.creatorSection, { backgroundColor: theme.card }]}>
          <Animated.View style={[styles.creatorAvatar, dynamicStyles.line]} />
          <View style={styles.creatorInfo}>
            <Animated.View style={[styles.creatorName, dynamicStyles.line]} />
            <Animated.View style={[styles.creatorDate, dynamicStyles.line]} />
          </View>
        </View>

        {/* Participants section */}
        <View style={[styles.participantsSection, { backgroundColor: theme.card }]}>
          <Animated.View style={[styles.sectionTitle, dynamicStyles.line]} />

          {/* Participant items */}
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.participantItem}>
              <Animated.View style={[styles.participantAvatar, dynamicStyles.line]} />
              <Animated.View style={[styles.participantName, dynamicStyles.line]} />
              <Animated.View style={[styles.participantChoice, dynamicStyles.line]} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Vote Button */}
      <View style={[styles.voteButtonContainer, { backgroundColor: theme.background, borderTopColor: theme.border }]}>
        <Animated.View style={[styles.voteButton, dynamicStyles.line]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  pollTitle: {
    height: 28,
    width: '80%',
    borderRadius: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  descriptionSection: {
    gap: 8,
  },
  descLine: {
    height: 14,
    borderRadius: 7,
  },
  descLineLong: {
    width: '90%',
  },
  descLineMedium: {
    width: '70%',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  metaText: {
    height: 14,
    width: 80,
    borderRadius: 7,
  },
  optionsSection: {
    gap: 12,
    marginTop: 8,
  },
  optionCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  optionText: {
    flex: 1,
    height: 16,
    borderRadius: 8,
  },
  progressBar: {
    height: 6,
    width: '100%',
    borderRadius: 3,
  },
  voteCount: {
    height: 12,
    width: 60,
    borderRadius: 6,
  },
  creatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  creatorInfo: {
    flex: 1,
    gap: 6,
  },
  creatorName: {
    height: 16,
    width: 120,
    borderRadius: 8,
  },
  creatorDate: {
    height: 12,
    width: 80,
    borderRadius: 6,
  },
  participantsSection: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  sectionTitle: {
    height: 18,
    width: 100,
    borderRadius: 9,
    marginBottom: 4,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  participantAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  participantName: {
    flex: 1,
    height: 14,
    borderRadius: 7,
  },
  participantChoice: {
    height: 20,
    width: 60,
    borderRadius: 10,
  },
  voteButtonContainer: {
    padding: 16,
    borderTopWidth: 1,
  },
  voteButton: {
    height: 48,
    borderRadius: 24,
  },
});

export default PollDetailSkeleton;
