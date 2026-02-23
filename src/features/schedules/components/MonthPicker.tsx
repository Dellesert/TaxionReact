import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface MonthPickerProps {
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
  compact?: boolean;
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
  compact = false,
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
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      <View
        style={[
          styles.container,
          compact && styles.containerCompact,
          {
            backgroundColor: theme.card,
            shadowColor: theme.shadow,
          }
        ]}
      >
        <TouchableOpacity
          onPress={handlePrevMonth}
          style={[styles.arrowButton, compact && styles.arrowButtonCompact, { backgroundColor: theme.backgroundTertiary }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={compact ? 16 : 20} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleToday}
          style={[styles.monthButton, compact && styles.monthButtonCompact]}
          activeOpacity={isCurrentMonth ? 1 : 0.6}
          disabled={isCurrentMonth}
        >
          <Text style={[styles.monthText, compact && styles.monthTextCompact, { color: theme.text }]}>
            {monthLabel}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleNextMonth}
          style={[styles.arrowButton, compact && styles.arrowButtonCompact, { backgroundColor: theme.backgroundTertiary }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={compact ? 16 : 20} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  wrapperCompact: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignSelf: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  containerCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowButtonCompact: {
    width: 32,
    height: 32,
  },
  monthButton: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    minWidth: 140,
  },
  monthButtonCompact: {
    paddingHorizontal: 46,
    paddingVertical: 8,
    minWidth: 120,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },
  monthTextCompact: {
    fontSize: 15,
  },
});
