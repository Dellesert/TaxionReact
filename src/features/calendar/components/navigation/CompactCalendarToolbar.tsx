import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { CalendarView } from '../../types/calendar.types';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CompactCalendarToolbarProps {
  selectedDate: Date;
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onAddPress: () => void;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
}

export const CompactCalendarToolbar: React.FC<CompactCalendarToolbarProps> = ({
  selectedDate,
  selectedView,
  onViewChange,
  onToday,
  onPrevious,
  onNext,
  onAddPress,
  onFilterPress,
  hasActiveFilters = false,
}) => {
  const { theme } = useTheme();

  const getDateRangeText = () => {
    return format(selectedDate, 'MMMM yyyy', { locale: ru });
  };

  const viewOptions: { value: CalendarView; label: string; icon: string }[] = [
    { value: 'day', label: 'День', icon: 'today-outline' },
    { value: 'week', label: 'Неделя', icon: 'calendar-outline' },
    { value: 'month', label: 'Месяц', icon: 'apps-outline' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={styles.content}>
        {/* Left Section - Title & Navigation */}
        <View style={styles.leftSection}>
          <View style={styles.titleRow}>
            <Ionicons name="calendar" size={22} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>Календарь</Text>
          </View>

          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={onPrevious}
            >
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.dateText, { color: theme.text }]}>
              {getDateRangeText()}
            </Text>

            <TouchableOpacity
              style={[styles.navButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={onNext}
            >
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.todayButton, { backgroundColor: theme.primary }]}
              onPress={onToday}
            >
              <Text style={styles.todayButtonText}>Сегодня</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Center Section - View Mode Selector */}
        <View style={[styles.viewSelector, { backgroundColor: theme.backgroundSecondary }]}>
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
                size={16}
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

        {/* Right Section - Actions */}
        <View style={styles.rightSection}>
          {/* Filter Button */}
          {onFilterPress && (
            <TouchableOpacity
              onPress={onFilterPress}
              style={[styles.actionButton, { borderColor: theme.border }]}
            >
              <Ionicons name="filter" size={18} color={theme.text} />
              <Text style={[styles.actionButtonText, { color: theme.text }]}>
                Фильтры
              </Text>
              {hasActiveFilters && (
                <View style={[styles.filterIndicator, { backgroundColor: theme.primary }]} />
              )}
            </TouchableOpacity>
          )}

          {/* Create Event Button */}
          <TouchableOpacity
            onPress={onAddPress}
            style={[styles.actionButtonPrimary, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonPrimaryText}>Создать событие</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    minHeight: 52,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  dateText: {
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
    minWidth: 130,
    textAlign: 'center',
  },
  todayButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
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
    fontWeight: '600',
  },
  viewSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    gap: 6,
    position: 'relative',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      },
    }),
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  filterIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  actionButtonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
      },
    }),
  },
  actionButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: '#FFFFFF',
  },
});
