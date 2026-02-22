import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';

export type CalendarViewMode = 'day' | 'week';

interface CalendarViewModeSelectorProps {
  selectedMode: CalendarViewMode;
  onModeChange: (mode: CalendarViewMode) => void;
}

export const CalendarViewModeSelector: React.FC<CalendarViewModeSelectorProps> = ({
  selectedMode,
  onModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
      <View style={[styles.pills, { backgroundColor: theme.backgroundSecondary }]}>
        <TouchableOpacity
          style={[
            styles.pill,
            selectedMode === 'day' && [styles.pillActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => onModeChange('day')}
        >
          <Text
            style={[
              styles.pillText,
              { color: theme.textSecondary },
              selectedMode === 'day' && styles.pillTextActive,
            ]}
          >
            День
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pill,
            selectedMode === 'week' && [styles.pillActive, { backgroundColor: theme.primary }],
          ]}
          onPress={() => onModeChange('week')}
        >
          <Text
            style={[
              styles.pillText,
              { color: theme.textSecondary },
              selectedMode === 'week' && styles.pillTextActive,
            ]}
          >
            Неделя
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  pills: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  pill: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
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
