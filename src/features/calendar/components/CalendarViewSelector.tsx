import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CalendarView } from '../types/calendar.types';
import { getViewLabel } from '../utils/calendarHelpers';
import { useTheme } from '@shared/hooks/useTheme';

interface CalendarViewSelectorProps {
  selectedView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEWS: CalendarView[] = ['day', 'week', 'month'];

export const CalendarViewSelector: React.FC<CalendarViewSelectorProps> = ({
  selectedView,
  onViewChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.pills}>
        {VIEWS.map((view) => (
          <TouchableOpacity
            key={view}
            style={[
              styles.pill,
              { backgroundColor: theme.backgroundSecondary },
              selectedView === view && [styles.pillActive, { backgroundColor: theme.primary }],
            ]}
            onPress={() => onViewChange(view)}
          >
            <Text
              style={[
                styles.pillText,
                { color: theme.textSecondary },
                selectedView === view && styles.pillTextActive,
              ]}
            >
              {getViewLabel(view)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    // backgroundColor set dynamically
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
