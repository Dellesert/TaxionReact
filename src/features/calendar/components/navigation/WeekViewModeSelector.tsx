import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@shared/hooks/useTheme';
import { WeekDisplayMode } from '../../types/calendar.types';

interface WeekViewModeSelectorProps {
  selectedMode: WeekDisplayMode;
  onModeChange: (mode: WeekDisplayMode) => void;
}

export const WeekViewModeSelector: React.FC<WeekViewModeSelectorProps> = ({
  selectedMode,
  onModeChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundSecondary }]}>
      <TouchableOpacity
        style={[
          styles.pill,
          selectedMode === 'timeline' && [styles.pillActive, { backgroundColor: theme.primary }],
        ]}
        onPress={() => onModeChange('timeline')}
      >
        <Text
          style={[
            styles.pillText,
            { color: theme.textSecondary },
            selectedMode === 'timeline' && styles.pillTextActive,
          ]}
        >
          Временная шкала
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.pill,
          selectedMode === 'list' && [styles.pillActive, { backgroundColor: theme.primary }],
        ]}
        onPress={() => onModeChange('list')}
      >
        <Text
          style={[
            styles.pillText,
            { color: theme.textSecondary },
            selectedMode === 'list' && styles.pillTextActive,
          ]}
        >
          Список
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    alignSelf: 'center',
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - web only
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } : {}),
  },
  pillActive: {
    // backgroundColor set dynamically
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
});
