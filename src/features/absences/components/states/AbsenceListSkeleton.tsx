/**
 * AbsenceListSkeleton Component
 * Скелетон для представления «Список» (горизонтальные ряды карточек по типу отсутствия)
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ScrollView } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export const AbsenceListSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const line = { backgroundColor: theme.border, opacity };

  const renderTypeRow = (key: number, cardCount: number) => (
    <View key={key} style={styles.typeRow}>
      {/* Row header: color dot + title + count */}
      <View style={[styles.rowHeader, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Animated.View style={[styles.rowColorDot, line]} />
        <Animated.View style={[styles.rowTitle, line]} />
        <Animated.View style={[styles.rowCount, line]} />
      </View>
      {/* Cards row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowCards}>
        {[...Array(cardCount)].map((_, i) => (
          <View key={i} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {/* Avatar + name */}
            <View style={styles.cardHeader}>
              <Animated.View style={[styles.avatar, line]} />
              <View style={styles.cardHeaderText}>
                <Animated.View style={[styles.cardName, line]} />
                <Animated.View style={[styles.cardMeta, line]} />
              </View>
            </View>
            {/* Date range */}
            <Animated.View style={[styles.cardDate, line]} />
            {/* Duration */}
            <Animated.View style={[styles.cardDuration, line]} />
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {renderTypeRow(0, 4)}
      {renderTypeRow(1, 3)}
      {renderTypeRow(2, 2)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 20,
  },
  typeRow: {
    gap: 10,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 8,
  },
  rowColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  rowTitle: {
    height: 14,
    width: 80,
    borderRadius: 7,
  },
  rowCount: {
    height: 18,
    width: 24,
    borderRadius: 9,
  },
  rowCards: {
    gap: 10,
    paddingHorizontal: 2,
    paddingTop: 2,
    paddingBottom: 14,
  },
  card: {
    width: 280,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  cardHeaderText: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    height: 14,
    width: '70%',
    borderRadius: 7,
  },
  cardMeta: {
    height: 12,
    width: '45%',
    borderRadius: 6,
  },
  cardDate: {
    height: 14,
    width: '60%',
    borderRadius: 7,
  },
  cardDuration: {
    height: 12,
    width: '35%',
    borderRadius: 6,
  },
});
