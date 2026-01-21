import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface MonthPickerProps {
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
}

const MONTH_NAMES = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

export const MonthPicker: React.FC<MonthPickerProps> = React.memo(({
  selectedDate,
  onMonthChange,
}) => {
  const { theme } = useTheme();

  const monthLabel = useMemo(() => {
    const month = MONTH_NAMES[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${month} ${year}`;
  }, [selectedDate]);

  const handlePrevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onMonthChange(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onMonthChange(newDate);
  };

  const handleToday = () => {
    onMonthChange(new Date());
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return (
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    );
  }, [selectedDate]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        onPress={handlePrevMonth}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-back" size={24} color={theme.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleToday}
        style={styles.monthButton}
        activeOpacity={0.7}
      >
        <Text style={[styles.monthText, { color: theme.text }]}>
          {monthLabel}
        </Text>
        {!isCurrentMonth && (
          <View style={[styles.todayBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.todayText, { color: theme.primary }]}>
              Сегодня
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleNextMonth}
        style={styles.arrowButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="chevron-forward" size={24} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  arrowButton: {
    padding: 4,
  },
  monthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthText: {
    fontSize: 17,
    fontWeight: '600',
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  todayText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
