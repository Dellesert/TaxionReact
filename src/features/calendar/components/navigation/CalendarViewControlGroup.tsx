import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shared/hooks/useTheme';
import { CalendarView } from '../../types/calendar.types';

interface CalendarViewControlGroupProps {
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEW_OPTIONS: { value: CalendarView; label: string; icon: string }[] = [
  { value: 'day', label: 'День', icon: 'today-outline' },
  { value: 'week', label: 'Неделя', icon: 'calendar-outline' },
  { value: 'month', label: 'Месяц', icon: 'apps-outline' },
];

export const CalendarViewControlGroup: React.FC<CalendarViewControlGroupProps> = ({
  selectedView,
  onViewChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      {VIEW_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.button,
            selectedView === option.value && [
              styles.activeButton,
              { backgroundColor: theme.background },
            ],
          ]}
          onPress={() => onViewChange(option.value)}
          accessibilityLabel={`Вид: ${option.label}`}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedView === option.value }}
        >
          <Ionicons
            name={option.icon as any}
            size={14}
            color={selectedView === option.value ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.buttonText,
              { color: selectedView === option.value ? theme.text : theme.textSecondary },
              selectedView === option.value && styles.activeButtonText,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    minHeight: 40,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  activeButton: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 18,
    ...Platform.select({
      web: {
        userSelect: 'none',
      },
    }),
  },
  activeButtonText: {
    fontWeight: '700',
  },
});
