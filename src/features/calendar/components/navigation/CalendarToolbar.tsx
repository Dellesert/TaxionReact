import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { CalendarView } from '../../types/calendar.types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CalendarToolbarProps {
  selectedDate: Date;
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onDateChange: (date: Date) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  selectedDate,
  selectedView,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
}) => {
  const { theme } = useTheme();

  const getDateRangeText = () => {
    // Always show month and year (for mini calendar navigation)
    return format(selectedDate, 'MMMM yyyy', { locale: ru });
  };

  const viewOptions: { value: CalendarView; label: string; icon: string }[] = [
    { value: 'day', label: 'День', icon: 'today-outline' },
    { value: 'week', label: 'Неделя', icon: 'calendar-outline' },
    { value: 'month', label: 'Месяц', icon: 'apps-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      {/* Left Section - Navigation */}
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: theme.primary }]}
          onPress={onToday}
        >
          <Text style={styles.todayButtonText}>Сегодня</Text>
        </TouchableOpacity>

        <View style={styles.monthNavigation}>
          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={onPrevious}
          >
            <Ionicons name="chevron-back" size={20} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.dateText, { color: theme.text }]}>
            {getDateRangeText()}
          </Text>

          <TouchableOpacity
            style={[styles.navButton, { backgroundColor: theme.backgroundSecondary }]}
            onPress={onNext}
          >
            <Ionicons name="chevron-forward" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Center Section - View Mode Selector */}
      <View style={[styles.centerSection, { backgroundColor: theme.backgroundSecondary }]}>
        {viewOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.viewButton,
              selectedView === option.value && [
                styles.viewButtonActive,
                { backgroundColor: theme.card },
              ],
            ]}
            onPress={() => onViewChange(option.value)}
          >
            <Ionicons
              name={option.icon as any}
              size={18}
              color={selectedView === option.value ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.viewButtonText,
                { color: selectedView === option.value ? theme.primary : theme.textSecondary },
                selectedView === option.value && styles.viewButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 16,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      minHeight: 64,
    } : {}),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
    flex: 1,
  },
  todayButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
    minWidth: 150,
    textAlign: 'center',
  },
  centerSection: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  viewButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewButtonTextActive: {
    fontWeight: '700',
  },
});
