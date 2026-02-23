/**
 * MonthNavigator
 * Компонент навигации по месяцам для мини-календаря
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface MonthNavigatorProps {
  selectedDate: Date;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  /** Compact inline mode for use inside a header bar */
  compact?: boolean;
}

export const MonthNavigator: React.FC<MonthNavigatorProps> = ({
  selectedDate,
  onPrevious,
  onNext,
  onToday,
  compact = false,
}) => {
  const { theme } = useTheme();

  const monthText = format(selectedDate, 'LLLL yyyy', { locale: ru });

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View
          style={styles.compactArrow}
          // @ts-ignore - Web-only
          onClick={onPrevious}
        >
          <Ionicons name="chevron-back" size={16} color={theme.textSecondary} />
        </View>
        <View
          // @ts-ignore - Web-only
          onClick={onToday}
          style={styles.compactDateButton}
          title="Перейти к сегодня"
        >
          <Text style={[styles.compactMonthText, { color: theme.text }]}>{monthText}</Text>
        </View>
        <View
          style={styles.compactArrow}
          // @ts-ignore - Web-only
          onClick={onNext}
        >
          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={[styles.navButton, { backgroundColor: theme.backgroundTertiary }]}
        // @ts-ignore - Web-only
        onClick={onPrevious}
        onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
        onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
      >
        <Ionicons name="chevron-back" size={16} color={theme.text} />
      </View>

      <View
        style={styles.dateButton}
        // @ts-ignore - Web-only
        onClick={onToday}
        title="Перейти к сегодня"
        onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
        onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Text style={[styles.monthText, { color: theme.text }]}>{monthText}</Text>
      </View>

      <View
        style={[styles.navButton, { backgroundColor: theme.backgroundTertiary }]}
        // @ts-ignore - Web-only
        onClick={onNext}
        onMouseEnter={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.border)}
        onMouseLeave={(e: any) => e.currentTarget?.style && (e.currentTarget.style.backgroundColor = theme.backgroundTertiary)}
      >
        <Ionicons name="chevron-forward" size={16} color={theme.text} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  } as any,
  navButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  dateButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  } as any,
  monthText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  } as any,
  // Compact mode styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as any,
  compactArrow: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  } as any,
  compactDateButton: {
    cursor: 'pointer',
  } as any,
  compactMonthText: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
    lineHeight: 24,
    marginHorizontal: 4,
  } as any,
});
