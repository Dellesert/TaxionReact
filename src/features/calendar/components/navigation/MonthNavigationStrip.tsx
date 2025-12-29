import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface MonthNavigationStripProps {
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const MonthNavigationStrip: React.FC<MonthNavigationStripProps> = ({
  currentMonth,
  onPrevMonth,
  onNextMonth,
}) => {
  const { theme } = useTheme();

  // Format month name with year (e.g., "Декабрь 2024")
  const monthLabel = format(currentMonth, 'LLLL yyyy', { locale: ru });

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      {/* Left Arrow */}
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={onPrevMonth}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Month Label */}
      <View style={styles.monthLabelContainer}>
        <Text style={[styles.monthLabel, { color: theme.text }]}>
          {monthLabel}
        </Text>
      </View>

      {/* Right Arrow */}
      <TouchableOpacity
        style={styles.arrowButton}
        onPress={onNextMonth}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  arrowButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
