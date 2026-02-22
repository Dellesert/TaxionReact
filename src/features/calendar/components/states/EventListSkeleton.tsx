/**
 * EventListSkeleton Component
 * Скелетон для списка событий в календаре
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const EventListSkeleton: React.FC = () => {
  const { theme } = useTheme();
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

  const renderEventSkeleton = (key: number) => (
    <View key={key} style={[styles.eventItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Color indicator */}
      <Animated.View style={[styles.colorIndicator, dynamicStyles.line]} />

      <View style={styles.eventContent}>
        {/* Title and status */}
        <View style={styles.titleRow}>
          <Animated.View style={[styles.eventTitle, dynamicStyles.line]} />
          <Animated.View style={[styles.statusBadge, dynamicStyles.line]} />
        </View>

        {/* Time and location */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Animated.View style={[styles.infoIcon, dynamicStyles.line]} />
            <Animated.View style={[styles.infoText, dynamicStyles.line]} />
          </View>
        </View>

        {/* Location (если есть) */}
        {key % 2 === 0 && (
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Animated.View style={[styles.infoIcon, dynamicStyles.line]} />
              <Animated.View style={[styles.infoText, dynamicStyles.line]} />
            </View>
          </View>
        )}

        {/* Participants */}
        <View style={styles.participantsRow}>
          <Animated.View style={[styles.participantAvatar, dynamicStyles.line]} />
          <Animated.View style={[styles.participantAvatar, dynamicStyles.line]} />
          <Animated.View style={[styles.participantAvatar, dynamicStyles.line]} />
          <Animated.View style={[styles.participantCount, dynamicStyles.line]} />
        </View>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Events */}
      {[1, 2, 3, 4, 5].map(renderEventSkeleton)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 16,
  },
  eventItem: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  colorIndicator: {
    width: 4,
  },
  eventContent: {
    flex: 1,
    padding: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eventTitle: {
    height: 18,
    flex: 1,
    borderRadius: 8,
    marginRight: 8,
  },
  statusBadge: {
    width: 28,
    height: 28,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  infoText: {
    height: 14,
    width: 120,
    borderRadius: 8,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: -8,
    marginTop: 4,
  },
  participantAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  participantCount: {
    width: 32,
    height: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
});

export default EventListSkeleton;
