import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';

interface DayStripProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_NAMES = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
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

  const dateLabel = useMemo(() => {
    const day = selectedDate.getDate();
    const month = MONTH_NAMES[selectedDate.getMonth()];
    const year = selectedDate.getFullYear();
    const now = new Date();
    if (year !== now.getFullYear()) {
      return `${day} ${month} ${year}`;
    }
    return `${day} ${month}`;
  }, [selectedDate]);

  const isTodaySelected = isToday(selectedDate);

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

  const handleGoToToday = () => {
    if (!isTodaySelected) {
      onDateChange(new Date());
    }
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
        {/* Week navigation row */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={handlePrevWeek}
            style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoToToday}
            style={styles.dateLabelButton}
            activeOpacity={isTodaySelected ? 1 : 0.6}
            disabled={isTodaySelected}
          >
            <Text style={[styles.dateLabel, { color: theme.text }]}>
              {dateLabel}
            </Text>
            {!isTodaySelected && (
              <Text style={[styles.todayHint, { color: theme.primary }]}>
                Сегодня
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleNextWeek}
            style={[styles.arrowButton, { backgroundColor: theme.backgroundTertiary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Day cells */}
        <View style={styles.daysRow}>
          {weekDays.map((day, index) => {
            const selected = isSameDay(day, selectedDate);
            const today = isToday(day);
            const weekend = isWeekend(index);

            return (
              <TouchableOpacity
                key={index}
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
                    { color: selected ? '#FFFFFF' : weekend ? theme.error : theme.textSecondary },
                  ]}
                >
                  {DAY_NAMES[index]}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: selected ? '#FFFFFF' : weekend ? theme.error : theme.text },
                  ]}
                >
                  {day.getDate()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  container: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
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
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateLabelButton: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  dateLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  todayHint: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 48,
    borderRadius: 10,
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
