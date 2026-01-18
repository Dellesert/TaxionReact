/**
 * Analytics Screen
 * Экран аналитики (заглушка)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

export const AnalyticsScreen: React.FC = () => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Аналитика</Text>
      </View>

      <View style={styles.content}>
        <View style={[styles.placeholderCard, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="analytics-outline" size={64} color={theme.textTertiary} />
          <Text style={[styles.placeholderTitle, { color: theme.text }]}>
            Раздел в разработке
          </Text>
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            Здесь будут отображаться графики и статистика по задачам, опросам и другим метрикам
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  placeholderCard: {
    width: '100%',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholderText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default AnalyticsScreen;
