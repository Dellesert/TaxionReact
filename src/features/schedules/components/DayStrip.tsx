import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { getHoliday } from '@features/absences/constants/russianHolidays.constants';

interface DayStripProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const getStartOfWeek = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  // Monday = 0, Sunday = 6
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const isToday = (date: Date): boolean => isSameDay(date, new Date());

const isWeekend = (dayIndex: number): boolean => dayIndex >= 5;

export const DayStrip: React.FC<DayStripProps> = React.memo(({
  selectedDate,
  onDateChange,
}) => {
  const { theme } = useTheme();

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  const monthYearLabel = useMemo(() => {
    const month = MONTH_NAMES[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    return `${month} ${year}`;
  }, [selectedDate]);

  const handlePrevWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 7);
    onDateChange(d);
  };

  const handleNextWeek = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 7);
    onDateChange(d);
  };

  return (
    <View style={[styles.wrapper, { borderBottomColor: theme.border }]}>
      <View style={[styles.container, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        <Text style={[styles.monthYearLabel, { color: theme.textSecondary }]}>
          {monthYearLabel}
        </Text>
        {/* Day cells with navigation arrows */}
        <View style={styles.daysRow}>
          <TouchableOpacity
            onPress={handlePrevWeek}
            style={[styles.arrowButton, { marginRight: 6 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={16} color={theme.text} />
          </TouchableOpacity>

          {weekDays.map((day, index) => {
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const weekend = isWeekend(index);
            const holiday = getHoliday(day) !== null;
            const isRedDay = weekend || holiday;

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  selected && { backgroundColor: theme.primary },
                  !selected && today && { borderColor: theme.primary, borderWidth: 1.5 },
                ]}
                onPress={() => onDateChange(day)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: selected ? '#FFFFFF' : isRedDay ? theme.error : theme.textSecondary },
                  ]}
                >
                  {DAY_NAMES[index]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: selected ? '#FFFFFF' : isRedDay ? theme.error : theme.text },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            onPress={handleNextWeek}
            style={[styles.arrowButton, { marginLeft: 6 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  monthYearLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginBottom: 6,
    marginTop: 2,
    paddingBottom: 6,
  },
  container: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 4,
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
  arrowButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: 44,
    borderRadius: 10,
    marginHorizontal: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
});
