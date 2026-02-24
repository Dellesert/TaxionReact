import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface CalendarDateNavigationProps {
  dateRangeText: string;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export const CalendarDateNavigation: React.FC<CalendarDateNavigationProps> = ({
  dateRangeText,
  onPrevious,
  onNext,
  onToday,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        onPress={onPrevious}
        style={styles.navButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onToday} style={styles.todayButton}>
        <Text style={[styles.dateText, { color: theme.text }]}>{dateRangeText}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onNext}
        style={styles.navButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  todayButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
    } : {}),
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textTransform: 'capitalize',
  },
});
