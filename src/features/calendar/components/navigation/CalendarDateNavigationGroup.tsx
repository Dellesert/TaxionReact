import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface CalendarDateNavigationGroupProps {
  dateText: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export const CalendarDateNavigationGroup: React.FC<CalendarDateNavigationGroupProps> = ({
  dateText,
  onPrevious,
  onNext,
  onToday,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {/* Previous Button */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={onPrevious}
        accessibilityLabel="Предыдущий период"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={14} color={theme.text} />
      </TouchableOpacity>

      {/* Date Display */}
      <Text style={[styles.dateText, { color: theme.text }]}>
        {dateText}
      </Text>

      {/* Next Button */}
      <TouchableOpacity
        style={styles.navButton}
        onPress={onNext}
        accessibilityLabel="Следующий период"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-forward" size={14} color={theme.text} />
      </TouchableOpacity>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Today Button */}
      <TouchableOpacity
        style={[styles.todayButton, { backgroundColor: theme.primary }]}
        onPress={onToday}
        accessibilityLabel="Перейти к сегодня"
        accessibilityRole="button"
      >
        <Text style={styles.todayButtonText}>Сегодня</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 4,
    gap: 2,
    flexShrink: 0,
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 40,
    minWidth: 38,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
    minWidth: 110,
    textAlign: 'center',
    paddingHorizontal: 8,
    letterSpacing: -0.2,
    lineHeight: 18,
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
  divider: {
    width: 1,
    height: 24,
    marginHorizontal: 4,
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    minHeight: 40,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18,
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
});
